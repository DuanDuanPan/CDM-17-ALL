import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { prisma } from '@cdm/database';

const DEMO_USER_ID = 'demo-user-1';
const DEMO_PROJECT_ID = 'demo-project-1';
export const DEMO_GRAPH_ID = 'demo-graph-1';

/**
 * Seeds minimal demo data so that the frontend's default graphId
 * (see apps/web/app/page.tsx) always exists in the database.
 *
 * This prevents P2003 foreign key errors when creating nodes during demos.
 */
@Injectable()
export class DemoSeedService implements OnModuleInit {
  private readonly logger = new Logger(DemoSeedService.name);

  async onModuleInit() {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.upsert({
          where: { id: DEMO_USER_ID },
          update: {},
          create: {
            id: DEMO_USER_ID,
            email: 'demo@example.com',
            name: 'Demo User',
          },
        });

        await tx.project.upsert({
          where: { id: DEMO_PROJECT_ID },
          update: {},
          create: {
            id: DEMO_PROJECT_ID,
            name: 'Demo Project',
            ownerId: DEMO_USER_ID,
          },
        });

        await tx.graph.upsert({
          where: { id: DEMO_GRAPH_ID },
          update: {},
          create: {
            id: DEMO_GRAPH_ID,
            name: 'Demo Graph',
            projectId: DEMO_PROJECT_ID,
            data: {},
          },
        });
      });

      this.logger.log(`Demo data ready (graphId=${DEMO_GRAPH_ID})`);
    } catch (error) {
      this.logger.error('Failed to seed demo data', error);
    }
  }
}
