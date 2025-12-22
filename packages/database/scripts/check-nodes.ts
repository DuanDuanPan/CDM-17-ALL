
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking nodes in database...');
    const nodes = await prisma.node.findMany({
        include: {
            graph: true
        }
    });
    console.log(`Found ${nodes.length} nodes:`);
    nodes.forEach(n => {
        console.log(`- [${n.id}] ${n.label} (Graph: ${n.graphId}, Archived: ${n.isArchived})`);
    });

    const edges = await prisma.edge.findMany({});
    console.log(`Found ${edges.length} edges.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
