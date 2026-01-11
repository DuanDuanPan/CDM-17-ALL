
import { PrismaClient, NodeType, DataAssetFormat } from '@cdm/database';

const prisma = new PrismaClient();

const GRAPH_ID = 'cmk89jo2s0003as6lpn7qckxt';
const PROJECT_ID = 'seed-project-1';
const USER_ID = 'seed-user-1';

async function main() {
    console.log('Starting data generation for stories 9.1, 9.2, 9.3...');

    // 1. Ensure User exists
    const user = await prisma.user.upsert({
        where: { id: USER_ID },
        create: { id: USER_ID, email: 'dataseed@example.com', name: 'Data Seeder' },
        update: {},
    });
    console.log(`User ensured: ${user.id}`);

    // 2. Ensure Project exists
    const project = await prisma.project.upsert({
        where: { id: PROJECT_ID },
        create: { id: PROJECT_ID, name: 'Story 9 Verification Project', ownerId: user.id },
        update: {},
    });
    console.log(`Project ensured: ${project.id}`);

    // 3. Ensure Graph exists
    const graph = await prisma.graph.upsert({
        where: { id: GRAPH_ID },
        create: {
            id: GRAPH_ID,
            name: 'Story 9 Graph',
            projectId: project.id,
            data: {},
        },
        update: {},
    });
    console.log(`Graph ensured: ${graph.id}`);

    // 4. Create Folders (Story 9.1)
    const foldersToCreate = ['Mechanical', 'Electrical', 'Documents', 'Test Models'];
    const folderMap = new Map<string, string>();

    for (const name of foldersToCreate) {
        const folder = await prisma.dataFolder.upsert({
            where: { id: `folder-${name}` }, // Using deterministic ID for idempotency if possible, but schema defaults to cuid. 
            // Upsert by unique constraints is tricky if name isn't unique per graph. 
            // Here we'll try to find first or create.
            create: {
                id: `folder-${name}`, // Trying to set ID manually if allowed, else remove. cuid usually allows string.
                name,
                graphId: graph.id,
                description: `${name} Folder for Story 9`,
            },
            update: {},
        }).catch(async () => {
            // Fallback if ID conflict or other issue, try find existing by name/graph
            const existing = await prisma.dataFolder.findFirst({
                where: { graphId: graph.id, name }
            });
            if (existing) return existing;
            return prisma.dataFolder.create({
                data: {
                    name,
                    graphId: graph.id,
                    description: `${name} Folder for Story 9`
                }
            });
        });
        folderMap.set(name, folder.id);
        console.log(`Folder ensured: ${name} (${folder.id})`);
    }

    // 5. Create Assets (Story 9.1 & 9.3)
    const assetsData = [
        {
            name: 'Satellite.step',
            format: DataAssetFormat.STEP,
            folder: 'Mechanical',
            size: 5734, // Actual file size
            desc: '3D Model of the main satellite body (STEP format)',
        },
        {
            name: 'SolarPanel.glb',
            format: DataAssetFormat.GLTF,
            folder: 'Electrical',
            size: 586652, // Actual file size
            desc: 'GLB model of solar arrays',
        },
        {
            name: 'Specs.pdf',
            format: DataAssetFormat.PDF,
            folder: 'Documents',
            size: 13264, // Actual file size
            desc: 'System specifications document',
        },
        // Story 9.3 Test Models (from Khronos glTF-Sample-Assets)
        {
            name: 'DamagedHelmet.glb',
            format: DataAssetFormat.GLTF,
            folder: 'Test Models',
            size: 3773916,
            desc: 'PBR材质测试模型 - 损坏的头盔',
        },
        {
            name: 'Duck.glb',
            format: DataAssetFormat.GLTF,
            folder: 'Test Models',
            size: 120484,
            desc: '简单GLB测试模型 - 经典鸭子',
        },
        {
            name: 'Box.glb',
            format: DataAssetFormat.GLTF,
            folder: 'Test Models',
            size: 1664,
            desc: '最小几何体测试 - 立方体',
        },
        {
            name: 'Avocado.glb',
            format: DataAssetFormat.GLTF,
            folder: 'Test Models',
            size: 8110040,
            desc: '高精度纹理测试模型 - 牛油果',
        },
        {
            name: 'AntiqueCamera.glb',
            format: DataAssetFormat.GLTF,
            folder: 'Test Models',
            size: 17540348,
            desc: '复杂装配体测试 - 古董相机 (含层级结构)',
        },
    ];

    const assetMap = new Map<string, string>();

    for (const asset of assetsData) {
        const createdAsset = await prisma.dataAsset.create({
            data: {
                name: asset.name,
                format: asset.format,
                fileSize: asset.size,
                description: asset.desc,
                graphId: graph.id,
                folderId: folderMap.get(asset.folder),
                // Mocking storage path
                storagePath: `/mock/storage/${asset.name}`,
                thumbnail: asset.format === DataAssetFormat.GLTF || asset.format === DataAssetFormat.STEP
                    ? '/thumbnails/mock-3d.png'
                    : undefined
            }
        });
        assetMap.set(asset.name, createdAsset.id);
        console.log(`Asset created: ${asset.name} (${createdAsset.id})`);
    }

    // 6. Create Nodes (PBS & Task) (Story 9.2)

    // PBS Root
    const pbsRoot = await prisma.node.create({
        data: {
            label: 'Satellite System',
            type: NodeType.PBS,
            graphId: graph.id,
            x: 0,
            y: 0,
            pbsProps: {
                create: {
                    code: 'PBS-001',
                    version: 'v1.0'
                }
            }
        }
    });
    console.log(`PBS Node created: Satellite System (${pbsRoot.id})`);

    // PBS Child
    const pbsChild = await prisma.node.create({
        data: {
            label: 'Power Subsystem',
            type: NodeType.PBS,
            graphId: graph.id,
            parentId: pbsRoot.id,
            x: 200,
            y: 100,
            pbsProps: {
                create: {
                    code: 'PBS-002',
                    version: 'v1.0'
                }
            }
        }
    });
    console.log(`PBS Child created: Power Subsystem (${pbsChild.id})`);

    // Task Node 1
    const task1 = await prisma.node.create({
        data: {
            label: 'Design Phase',
            type: NodeType.TASK,
            graphId: graph.id,
            x: -200,
            y: 0,
            taskProps: {
                create: {
                    status: 'in-progress',
                    priority: 'high'
                }
            }
        }
    });
    console.log(`Task Node created: Design Phase (${task1.id})`);

    // Task Node 2
    const task2 = await prisma.node.create({
        data: {
            label: 'Review Phase',
            type: NodeType.TASK,
            graphId: graph.id,
            x: -200,
            y: 150,
            taskProps: {
                create: {
                    status: 'todo',
                    priority: 'medium'
                }
            }
        }
    });
    console.log(`Task Node created: Review Phase (${task2.id})`);

    // 7. Create Links (Story 9.2)

    // Link PBS Root <-> Satellite.step
    await prisma.nodeDataLink.create({
        data: {
            nodeId: pbsRoot.id,
            assetId: assetMap.get('Satellite.step')!,
            linkType: 'reference'
        }
    });
    console.log(`Linked ${pbsRoot.label} <-> Satellite.step`);

    // Link PBS Child <-> SolarPanel.glb
    await prisma.nodeDataLink.create({
        data: {
            nodeId: pbsChild.id,
            assetId: assetMap.get('SolarPanel.glb')!,
            linkType: 'reference' // Corrected from part-of to reference or appropriate enum string if strictly typed
        }
    });
    console.log(`Linked ${pbsChild.label} <-> SolarPanel.glb`);

    // Link Task 1 <-> Specs.pdf
    await prisma.nodeDataLink.create({
        data: {
            nodeId: task1.id,
            assetId: assetMap.get('Specs.pdf')!,
            linkType: 'reference'
        }
    });
    console.log(`Linked ${task1.label} <-> Specs.pdf`);

    console.log('Data generation complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
