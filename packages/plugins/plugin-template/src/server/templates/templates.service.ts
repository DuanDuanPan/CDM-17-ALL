/**
 * Story 5.1: Template Library
 * Templates Service - Business logic for template operations
 */

import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Inject,
    Logger,
    Optional,
    ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { prisma, NodeType, Prisma } from '@cdm/database';
import { TemplatesRepository } from './templates.repository';
import type {
    Template,
    TemplateListItem,
    TemplateCategory,
    TemplateQueryOptions,
    TemplateNode,
    CreateFromTemplateResponse,
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
}

@Injectable()
export class TemplatesService {
    private readonly logger = new Logger(TemplatesService.name);

    constructor(
        private readonly repository: TemplatesRepository,
        @Optional()
        @Inject(DEMO_SEED_SERVICE)
        private readonly demoSeedService?: IDemoSeedService
    ) {}

    /**
     * List templates with optional filtering
     */
    async listTemplates(options?: TemplateQueryOptions): Promise<TemplateListItem[]> {
        return this.repository.findAll(options);
    }

    /**
     * Get template by ID
     */
    async getTemplate(id: string): Promise<Template> {
        const template = await this.repository.findById(id);
        if (!template) {
            throw new NotFoundException(`Template ${id} not found`);
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
        const template = await this.repository.findById(templateId);
        if (!template) {
            throw new NotFoundException(`Template ${templateId} not found`);
        }

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

        // Create graph with nodes in a transaction
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
}
