/**
 * Story 5.1: Template Library
 * Story 5.2: Subtree Template Save & Reuse
 * Templates Service - Business logic for template operations
 */

import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Inject,
    Logger,
    Optional,
    ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { prisma, NodeType, Prisma } from '@cdm/database';
import { TemplatesRepository } from './templates.repository';
import {
    MAX_CLIPBOARD_NODES,
    DependencyTypeSchema,
} from '@cdm/types';
import type {
    Template,
    TemplateListItem,
    TemplateCategory,
    TemplateQueryOptions,
    TemplateNode,
    TemplateStructure,
    CreateFromTemplateResponse,
    CreateTemplateRequest,
    CreateTemplateResponse,
    DeleteTemplateResponse,
} from '@cdm/types';

/**
 * Token for optional DemoSeedService injection
 */
export const DEMO_SEED_SERVICE = 'DEMO_SEED_SERVICE';

/**
 * Interface for DemoSeedService
 */
export interface IDemoSeedService {
    getOrCreateDefaultProject(userId: string): Promise<string>;
    ensureUser(userId: string): Promise<unknown>;
}

// Node type mapping from template to Prisma enum
const NODE_TYPE_MAP: Record<string, NodeType> = {
    TASK: NodeType.TASK,
    REQUIREMENT: NodeType.REQUIREMENT,
    PBS: NodeType.PBS,
    DATA: NodeType.DATA,
    APP: NodeType.APP,
};

interface GeneratedNode {
    id: string;
    label: string;
    type: NodeType;
    x: number;
    y: number;
    parentId: string | null;
    metadata: Prisma.InputJsonValue;
    _tempId?: string; // Template _tempId for edge reference mapping
}

@Injectable()
export class TemplatesService {
    private readonly logger = new Logger(TemplatesService.name);

    constructor(
        private readonly repository: TemplatesRepository,
        @Optional()
        @Inject(DEMO_SEED_SERVICE)
        private readonly demoSeedService?: IDemoSeedService
    ) { }

    /**
     * List templates with optional filtering
     */
    async listTemplates(options?: TemplateQueryOptions): Promise<TemplateListItem[]> {
        return this.repository.findAll(options);
    }

    /**
     * Get template by ID
     */
    async getTemplate(id: string, userId?: string): Promise<Template> {
        const template = await this.repository.findById(id);
        if (!template) {
            throw new NotFoundException(`Template ${id} not found`);
        }
        // Story 5.2: Visibility control - private templates only accessible by creator
        if (template.isPublic === false) {
            if (!userId || template.creatorId !== userId) {
                throw new ForbiddenException('Template is private');
            }
        }
        return template;
    }

    /**
     * Get all template categories
     */
    async getCategories(): Promise<TemplateCategory[]> {
        return this.repository.findCategories();
    }

    /**
     * Instantiate a template to create a new graph with nodes
     */
    async instantiate(
        templateId: string,
        userId: string,
        graphName?: string
    ): Promise<CreateFromTemplateResponse> {
        // Get template
        const template = await this.getTemplate(templateId, userId);

        // Validate template is published
        if (template.status !== 'PUBLISHED') {
            throw new BadRequestException('Template is not available for use');
        }

        if (!this.demoSeedService) {
            throw new ServiceUnavailableException('Template instantiation is not configured');
        }

        // Get or create the user's default project
        const projectId = await this.demoSeedService.getOrCreateDefaultProject(userId);

        // Generate graph and nodes from template
        const result = await this.generateGraphFromTemplate(
            template,
            projectId,
            graphName || template.name
        );

        // Log usage
        await this.repository.logUsage(templateId, userId, result.graphId);

        this.logger.log(
            `Created graph ${result.graphId} from template ${templateId} for user ${userId}`
        );

        return result;
    }

    /**
     * Generate graph and nodes from template structure
     */
    private async generateGraphFromTemplate(
        template: Template,
        projectId: string,
        graphName: string
    ): Promise<CreateFromTemplateResponse> {
        // Generate all nodes from template structure
        const nodes = this.generateNodesFromStructure(template.structure.rootNode);

        // Build _tempId -> nodeId mapping for edge creation
        const tempIdToNodeId = new Map<string, string>();
        for (const node of nodes) {
            if (node._tempId) {
                tempIdToNodeId.set(node._tempId, node.id);
            }
        }

        // Create graph with nodes and edges in a transaction
        const graph = await prisma.$transaction(async (tx) => {
            // Create graph
            const newGraph = await tx.graph.create({
                data: {
                    name: graphName,
                    projectId,
                    data: {
                        templateId: template.id,
                        classification: template.defaultClassification,
                    },
                },
            });

            // Create all nodes
            for (const node of nodes) {
                const createdNode = await tx.node.create({
                    data: {
                        id: node.id,
                        graphId: newGraph.id,
                        label: node.label,
                        type: node.type,
                        x: node.x,
                        y: node.y,
                        parentId: node.parentId,
                        metadata: node.metadata,
                    },
                });

                // Create extension table records for typed nodes
                if (node.type === NodeType.TASK) {
                    await tx.nodeTask.create({
                        data: { nodeId: createdNode.id },
                    });
                } else if (node.type === NodeType.REQUIREMENT) {
                    await tx.nodeRequirement.create({
                        data: { nodeId: createdNode.id },
                    });
                } else if (node.type === NodeType.PBS) {
                    await tx.nodePBS.create({
                        data: { nodeId: createdNode.id },
                    });
                } else if (node.type === NodeType.DATA) {
                    await tx.nodeData.create({
                        data: { nodeId: createdNode.id },
                    });
                } else if (node.type === NodeType.APP) {
                    await tx.nodeApp.create({
                        data: { nodeId: createdNode.id },
                    });
                }
            }

            // Create dependency edges from template structure
            const templateEdges = template.structure.edges || [];
            for (const edge of templateEdges) {
                const sourceId = tempIdToNodeId.get(edge.sourceRef);
                const targetId = tempIdToNodeId.get(edge.targetRef);

                if (sourceId && targetId) {
                    await tx.edge.create({
                        data: {
                            graphId: newGraph.id,
                            sourceId,
                            targetId,
                            type: 'dependency',
                            metadata: {
                                kind: 'dependency',
                                dependencyType: edge.dependencyType || 'FS',
                            },
                        },
                    });
                } else {
                    this.logger.warn(
                        `Skipped edge: sourceRef=${edge.sourceRef} -> targetRef=${edge.targetRef} (missing node mapping)`
                    );
                }
            }

            return newGraph;
        });

        return {
            graphId: graph.id,
            graphName: graph.name,
            nodeCount: nodes.length,
        };
    }

    /**
     * Generate flat node list from recursive template structure
     */
    private generateNodesFromStructure(
        rootNode: TemplateNode,
        parentId: string | null = null,
        depth: number = 0,
        siblingIndex: number = 0
    ): GeneratedNode[] {
        const nodes: GeneratedNode[] = [];

        // Generate unique ID
        const nodeId = this.generateNodeId();

        // Calculate position (simple horizontal/vertical layout)
        const x = depth * 200;
        const y = siblingIndex * 80;

        // Map node type
        const nodeType: NodeType = rootNode.type && NODE_TYPE_MAP[rootNode.type]
            ? NODE_TYPE_MAP[rootNode.type]
            : NodeType.ORDINARY;

        // Create node data
        nodes.push({
            id: nodeId,
            label: rootNode.label,
            type: nodeType,
            x,
            y,
            parentId,
            metadata: (rootNode.metadata || {}) as Prisma.InputJsonValue,
            _tempId: rootNode._tempId, // Capture _tempId for edge mapping
        });

        // Recursively process children
        if (rootNode.children && rootNode.children.length > 0) {
            rootNode.children.forEach((child, index) => {
                const childNodes = this.generateNodesFromStructure(
                    child,
                    nodeId,
                    depth + 1,
                    index
                );
                nodes.push(...childNodes);
            });
        }

        return nodes;
    }

    /**
     * Generate a unique node ID
     */
    private generateNodeId(): string {
        return `n_${randomUUID()}`;
    }

    // ===========================
    // Story 5.2: Subtree Template Save & Reuse
    // ===========================

    /**
     * Save a subtree as a reusable template
     */
    async saveSubtreeAsTemplate(
        data: CreateTemplateRequest & { creatorId: string }
    ): Promise<CreateTemplateResponse> {
        // Validate name
        if (!data.name || data.name.trim() === '') {
            throw new BadRequestException('Template name is required');
        }

        // Validate template structure
        this.validateTemplateStructure(data.structure);

        // Validate category if provided
        if (data.categoryId) {
            const categories = await this.repository.findCategories();
            if (!categories.find((c) => c.id === data.categoryId)) {
                throw new BadRequestException('Invalid category ID');
            }
        }

        // Create template with defaults
        const template = await this.repository.create({
            ...data,
            isPublic: data.isPublic ?? true, // Default to public
        });

        this.logger.log(
            `Created template ${template.id} "${template.name}" by user ${data.creatorId}`
        );

        return {
            id: template.id,
            name: template.name,
            createdAt: template.createdAt!,
        };
    }

    /**
     * Validate template structure integrity
     * Story 5.2 Code Review Fix: Added node count and dependencyType validation
     */
    private validateTemplateStructure(structure: TemplateStructure): void {
        if (!structure) {
            throw new BadRequestException('Template structure is required');
        }

        if (!structure.rootNode) {
            throw new BadRequestException('Template must have a root node');
        }

        if (!structure.rootNode.label || structure.rootNode.label.trim() === '') {
            throw new BadRequestException('Root node must have a label');
        }

        // HIGH-1 Fix: Validate node count to prevent oversized templates
        const nodeCount = this.countTemplateNodes(structure.rootNode);
        if (nodeCount > MAX_CLIPBOARD_NODES) {
            throw new BadRequestException(
                `Template too large (${nodeCount}/${MAX_CLIPBOARD_NODES} nodes). Please reduce selection.`
            );
        }

        // Collect all _tempIds and check for duplicates
        const allTempIds = new Set<string>();
        this.collectTempIdsWithDuplicateCheck(structure.rootNode, allTempIds);

        // Validate edge references if edges are present
        if (structure.edges && structure.edges.length > 0) {
            for (const edge of structure.edges) {
                if (!edge.sourceRef || !edge.targetRef) {
                    throw new BadRequestException('Edge must have sourceRef and targetRef');
                }
                if (!allTempIds.has(edge.sourceRef)) {
                    throw new BadRequestException(
                        `Edge sourceRef "${edge.sourceRef}" references non-existent node`
                    );
                }
                if (!allTempIds.has(edge.targetRef)) {
                    throw new BadRequestException(
                        `Edge targetRef "${edge.targetRef}" references non-existent node`
                    );
                }
                if (edge.kind !== 'dependency') {
                    throw new BadRequestException(
                        'Template edges must have kind "dependency"'
                    );
                }
                // HIGH-2 Fix: Validate dependencyType using shared schema
                if (edge.dependencyType !== undefined) {
                    const parsed = DependencyTypeSchema.safeParse(edge.dependencyType);
                    if (!parsed.success) {
                        throw new BadRequestException(
                            `Invalid dependencyType "${edge.dependencyType}". Must be one of: FS, SS, FF, SF`
                        );
                    }
                }
            }
        }
    }

    /**
     * Count total nodes in a template structure (recursive)
     * HIGH-1 Fix: Helper for node count validation
     */
    private countTemplateNodes(node: TemplateNode): number {
        let count = 1;
        if (node.children) {
            for (const child of node.children) {
                count += this.countTemplateNodes(child);
            }
        }
        return count;
    }

    /**
     * Collect all _tempId values from the node tree and check for duplicates
     */
    private collectTempIdsWithDuplicateCheck(node: TemplateNode, ids: Set<string>): void {
        if (node._tempId) {
            if (ids.has(node._tempId)) {
                throw new BadRequestException(
                    `Duplicate _tempId found: "${node._tempId}"`
                );
            }
            ids.add(node._tempId);
        }
        if (node.children) {
            for (const child of node.children) {
                this.collectTempIdsWithDuplicateCheck(child, ids);
            }
        }
    }

    // ===========================
    // Story 5.3: Delete Template
    // ===========================

    /**
     * Delete a template by ID
     * Authorization: Only the creator can delete their own templates.
     * System templates (creatorId = null) cannot be deleted.
     */
    async deleteTemplate(id: string, userId: string): Promise<DeleteTemplateResponse> {
        // 1. Find template (lightweight query for authorization check)
        const template = await this.repository.findByIdForDelete(id);
        if (!template) {
            throw new NotFoundException(`Template ${id} not found`);
        }

        // 2. Authorization: System templates cannot be deleted
        if (template.creatorId === null) {
            throw new ForbiddenException('System templates cannot be deleted');
        }

        // 3. Authorization: Only the creator can delete
        if (template.creatorId !== userId) {
            throw new ForbiddenException('Only the creator can delete this template');
        }

        // 4. Execute deletion (TemplateUsageLog entries are cascade-deleted)
        await this.repository.delete(id);

        this.logger.log(`Deleted template ${id} by user ${userId}`);

        return {
            success: true,
            deletedId: id,
        };
    }
}
