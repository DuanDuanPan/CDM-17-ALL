
import * as fs from 'fs';
import * as path from 'path';

// Manually load env before importing prisma
function loadEnv() {
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
        console.log(`Loading env from ${envPath}`);
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            // Simple parsing: KEY=VALUE
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                // Remove framing quotes
                if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                } else if (value.length > 1 && value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1);
                }

                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    } else {
        console.warn('No root .env file found at: ' + envPath);
    }
}

loadEnv();

import { prisma } from '@cdm/database';

async function main() {
    console.log('Starting detailed database cleanup (Users are preserved)...');

    try {
        // 1. Delete Notifications
        console.log('Deleting Notifications...');
        const notifs = await prisma.notification.deleteMany({});
        console.log(`- Deleted ${notifs.count} notifications`);

        // 2. Delete Edges (Child of Graph)
        console.log('Deleting Edges...');
        const edges = await prisma.edge.deleteMany({});
        console.log(`- Deleted ${edges.count} edges`);

        // 3. Delete Node Extension Tables (Children of Node)
        console.log('Deleting Node Extensions...');

        // Note: NodeTask, NodeRequirement, etc. are 1:1 with Node, deleteMany works.
        const tasks = await prisma.nodeTask.deleteMany({});
        console.log(`- Deleted ${tasks.count} node tasks`);

        const reqs = await prisma.nodeRequirement.deleteMany({});
        console.log(`- Deleted ${reqs.count} node requirements`);

        const pbs = await prisma.nodePBS.deleteMany({});
        console.log(`- Deleted ${pbs.count} node PBS items`);

        const dataProps = await prisma.nodeData.deleteMany({});
        console.log(`- Deleted ${dataProps.count} node data props`);

        // 4. Delete Nodes (Child of Graph)
        console.log('Deleting Nodes...');
        const nodes = await prisma.node.deleteMany({});
        console.log(`- Deleted ${nodes.count} nodes`);

        // 5. Delete Graphs (Child of Project)
        console.log('Deleting Graphs...');
        const graphs = await prisma.graph.deleteMany({});
        console.log(`- Deleted ${graphs.count} graphs`);

        // 6. Delete Projects
        console.log('Deleting Projects...');
        const projects = await prisma.project.deleteMany({});
        console.log(`- Deleted ${projects.count} projects`);

        console.log('Database cleanup completed successfully.');
    } catch (error) {
        console.error('Error during database cleanup:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
