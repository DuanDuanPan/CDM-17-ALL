import { Module } from '@nestjs/common';
import { CollabService } from './collab.service';
import { GraphsModule } from '../graphs';

/**
 * CollabModule - Real-time Collaboration Module
 *
 * Provides real-time collaboration capabilities using:
 * - Hocuspocus WebSocket server
 * - Yjs CRDT for conflict-free synchronization
 * - PostgreSQL persistence for Yjs state
 *
 * Story 1.4: Real-time Collaboration Engine
 * Story 7.5: Uses prisma directly to avoid coupling to migrated modules
 */
@Module({
    imports: [GraphsModule],
    providers: [CollabService],
    exports: [CollabService],
})
export class CollabModule { }
