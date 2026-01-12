/**
 * Story 9.1 ~ 9.4 Data Seed Script
 *
 * This script:
 * 1. Clears all existing data for the target graph
 * 2. Creates comprehensive test data for Stories 9.1 through 9.4
 *
 * Usage: npx ts-node scripts/create-story-9-data.ts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient, NodeType, DataAssetFormat } from '@cdm/database';

const prisma = new PrismaClient();

// Fixed IDs for deterministic testing
const GRAPH_ID = 'cmk52kw320001a05iot66tre1';
const PROJECT_ID = 'seed-project-story9';
const USER_ID = 'seed-user-story9';

// ============================================================================
// Data Definitions
// ============================================================================

const FOLDERS_DATA = [
    { name: 'Mechanical', desc: '机械结构相关模型和文档' },
    { name: 'Electrical', desc: '电气系统资料' },
    { name: 'Documents', desc: '技术文档' },
    { name: 'Test Models', desc: 'Story 9.3 3D预览测试模型' },
    { name: 'Mesh Models', desc: 'Story 9.4 网格模型' },
    { name: 'Contour Data', desc: 'Story 9.4 云图数据' },
];

/**
 * Assets covering Stories 9.1 ~ 9.4:
 * - 9.1: Basic data library assets (PDF, DOCX, CSV, JSON, etc.)
 * - 9.3: STEP/glTF/glb preview models
 * - 9.4: STL/OBJ mesh + VTP/VTK/JSON contour files
 */
const ASSETS_DATA = [
    // === Story 9.1: Basic Data Assets ===
    {
        name: 'Satellite.step',
        format: DataAssetFormat.STEP,
        folder: 'Mechanical',
        size: 5866,
        desc: '卫星主体3D模型 (STEP格式)',
        tags: ['3D模型', 'CAD', '卫星'],
    },
    {
        name: 'Specs.pdf',
        format: DataAssetFormat.PDF,
        folder: 'Documents',
        size: 13264,
        desc: '系统规格说明书',
        tags: ['文档', '规格'],
    },

    // === Story 9.3: glTF/GLB Preview Models ===
    {
        name: 'Box.glb',
        format: DataAssetFormat.GLTF,
        folder: 'Test Models',
        size: 1664,
        desc: '最小几何体测试 - 立方体',
        tags: ['3D模型', 'glTF', '测试'],
    },
    {
        name: 'Duck.glb',
        format: DataAssetFormat.GLTF,
        folder: 'Test Models',
        size: 120484,
        desc: '简单GLB测试模型 - 经典鸭子',
        tags: ['3D模型', 'glTF', '测试'],
    },
    {
        name: 'DamagedHelmet.glb',
        format: DataAssetFormat.GLTF,
        folder: 'Test Models',
        size: 3773916,
        desc: 'PBR材质测试模型 - 损坏的头盔',
        tags: ['3D模型', 'glTF', 'PBR', '测试'],
    },
    {
        name: 'Avocado.glb',
        format: DataAssetFormat.GLTF,
        folder: 'Test Models',
        size: 8110040,
        desc: '高精度纹理测试模型 - 牛油果',
        tags: ['3D模型', 'glTF', '测试'],
    },
    {
        name: 'AntiqueCamera.glb',
        format: DataAssetFormat.GLTF,
        folder: 'Test Models',
        size: 17540348,
        desc: '复杂装配体测试 - 古董相机 (含层级结构)',
        tags: ['3D模型', 'glTF', '装配体', '测试'],
    },
    {
        name: 'SolarPanel.glb',
        format: DataAssetFormat.GLTF,
        folder: 'Electrical',
        size: 586652,
        desc: '太阳能电池板3D模型',
        tags: ['3D模型', 'glTF', '电源'],
    },

    // === Story 9.4: Mesh Models (STL/OBJ) ===
    {
        name: '帆板网格模型.stl',
        format: DataAssetFormat.STL,
        folder: 'Mesh Models',
        size: 1214,
        desc: '卫星帆板网格模型 (ASCII STL)',
        tags: ['MESH', '3D模型', '帆板'],
    },
    {
        name: 'SolarPanel.obj',
        format: DataAssetFormat.OBJ,
        folder: 'Mesh Models',
        size: 723,
        desc: '太阳能电池板网格模型 (OBJ格式)',
        tags: ['MESH', '3D模型', '电源'],
    },

    // === Story 9.4: Contour Data (VTP/VTK/JSON Scalar Field) ===
    {
        name: '热控系统温度场.vtp',
        format: DataAssetFormat.OTHER, // VTP not in enum, use OTHER
        folder: 'Contour Data',
        size: 843,
        desc: '热控系统VTP云图 - 温度分布场',
        tags: ['CONTOUR', '热控', '云图'],
    },
    {
        name: '结构应力分析.scalar.json',
        format: DataAssetFormat.JSON,
        folder: 'Contour Data',
        size: 282,
        desc: '结构应力标量场 (JSON格式)',
        tags: ['CONTOUR', '应力', '云图'],
    },
];

const NODES_DATA = {
    pbs: [
        { label: 'Satellite System', code: 'PBS-001', x: 0, y: 0 },
        { label: 'Power Subsystem', code: 'PBS-002', x: 200, y: 100, parentIndex: 0 },
        { label: 'Thermal Control', code: 'PBS-003', x: 200, y: 200, parentIndex: 0 },
    ],
    tasks: [
        { label: 'Design Phase', status: 'in-progress', priority: 'high', x: -200, y: 0 },
        { label: 'Review Phase', status: 'todo', priority: 'medium', x: -200, y: 150 },
    ],
};

// Links: [nodeLabel, assetName]
const LINKS_DATA = [
    ['Satellite System', 'Satellite.step'],
    ['Power Subsystem', 'SolarPanel.glb'],
    ['Thermal Control', '热控系统温度场.vtp'],
    ['Design Phase', 'Specs.pdf'],
];

// ============================================================================
// Helper Functions
// ============================================================================

async function clearGraphData(graphId: string) {
    console.log(`🧹 Clearing existing data for graph: ${graphId}`);

    // Delete in correct order to respect foreign key constraints
    await prisma.nodeDataLink.deleteMany({ where: { node: { graphId } } });
    await prisma.dataAsset.deleteMany({ where: { graphId } });
    await prisma.dataFolder.deleteMany({ where: { graphId } });
    await prisma.node.deleteMany({ where: { graphId } });

    console.log('✅ Cleared: NodeDataLinks, DataAssets, DataFolders, Nodes');
}

// ============================================================================
// Main Seed Function
// ============================================================================

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Story 9.1 ~ 9.4 Data Seed Script');
    console.log('  Target Graph ID:', GRAPH_ID);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 1. Ensure User exists
    const user = await prisma.user.upsert({
        where: { id: USER_ID },
        create: { id: USER_ID, email: 'story9-seed@example.com', name: 'Story 9 Data Seeder' },
        update: {},
    });
    console.log(`👤 User ensured: ${user.id}`);

    // 2. Ensure Project exists
    const project = await prisma.project.upsert({
        where: { id: PROJECT_ID },
        create: { id: PROJECT_ID, name: 'Story 9 Verification Project', ownerId: user.id },
        update: {},
    });
    console.log(`📁 Project ensured: ${project.id}`);

    // 3. Ensure Graph exists
    const graph = await prisma.graph.upsert({
        where: { id: GRAPH_ID },
        create: {
            id: GRAPH_ID,
            name: 'Story 9.1~9.4 Test Graph',
            projectId: project.id,
            data: {},
        },
        update: { name: 'Story 9.1~9.4 Test Graph' },
    });
    console.log(`📊 Graph ensured: ${graph.id}`);

    // 4. Clear existing data
    await clearGraphData(GRAPH_ID);

    // 5. Create Folders
    console.log('\n📂 Creating folders...');
    const folderMap = new Map<string, string>();
    for (const f of FOLDERS_DATA) {
        const folder = await prisma.dataFolder.create({
            data: {
                name: f.name,
                description: f.desc,
                graphId: GRAPH_ID,
            },
        });
        folderMap.set(f.name, folder.id);
        console.log(`   ✓ ${f.name}`);
    }

    // 6. Create Assets
    console.log('\n📦 Creating assets...');
    const assetMap = new Map<string, string>();
    for (const a of ASSETS_DATA) {
        const asset = await prisma.dataAsset.create({
            data: {
                name: a.name,
                format: a.format,
                fileSize: a.size,
                description: a.desc,
                tags: a.tags,
                graphId: GRAPH_ID,
                folderId: folderMap.get(a.folder),
                storagePath: `/mock/storage/${a.name}`,
                secretLevel: 'internal',
                version: 'v1.0.0',
            },
        });
        assetMap.set(a.name, asset.id);
        console.log(`   ✓ ${a.name} (${a.format})`);
    }

    // 7. Create PBS Nodes
    console.log('\n🌲 Creating PBS nodes...');
    const pbsNodes: string[] = [];
    for (const n of NODES_DATA.pbs) {
        const node = await prisma.node.create({
            data: {
                label: n.label,
                type: NodeType.PBS,
                graphId: GRAPH_ID,
                parentId: n.parentIndex !== undefined ? pbsNodes[n.parentIndex] : null,
                x: n.x,
                y: n.y,
                pbsProps: { create: { code: n.code, version: 'v1.0' } },
            },
        });
        pbsNodes.push(node.id);
        console.log(`   ✓ ${n.label} (${n.code})`);
    }

    // 8. Create Task Nodes
    console.log('\n✅ Creating Task nodes...');
    const taskNodes: string[] = [];
    for (const t of NODES_DATA.tasks) {
        const node = await prisma.node.create({
            data: {
                label: t.label,
                type: NodeType.TASK,
                graphId: GRAPH_ID,
                x: t.x,
                y: t.y,
                taskProps: { create: { status: t.status, priority: t.priority } },
            },
        });
        taskNodes.push(node.id);
        console.log(`   ✓ ${t.label} (${t.status})`);
    }

    // Build node lookup by label
    const nodeLabelToId = new Map<string, string>();
    NODES_DATA.pbs.forEach((n, i) => nodeLabelToId.set(n.label, pbsNodes[i]!));
    NODES_DATA.tasks.forEach((t, i) => nodeLabelToId.set(t.label, taskNodes[i]!));

    // 9. Create Links
    console.log('\n🔗 Creating node-data links...');
    for (const [nodeLabel, assetName] of LINKS_DATA) {
        const nodeId = nodeLabelToId.get(nodeLabel);
        const assetId = assetMap.get(assetName);
        if (nodeId && assetId) {
            await prisma.nodeDataLink.create({
                data: { nodeId, assetId, linkType: 'reference' },
            });
            console.log(`   ✓ ${nodeLabel} <-> ${assetName}`);
        }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ Data seed complete!');
    console.log(`  📂 Folders: ${FOLDERS_DATA.length}`);
    console.log(`  📦 Assets:  ${ASSETS_DATA.length}`);
    console.log(`  🌲 PBS:     ${NODES_DATA.pbs.length}`);
    console.log(`  ✅ Tasks:   ${NODES_DATA.tasks.length}`);
    console.log(`  🔗 Links:   ${LINKS_DATA.length}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n🌐 Access: http://localhost:3000/graph/${GRAPH_ID}`);
}

// ============================================================================
// Execute
// ============================================================================

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
