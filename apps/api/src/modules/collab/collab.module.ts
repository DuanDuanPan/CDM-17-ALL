import { Module } from '@nestjs/common';
import { CollabService } from './collab.service';
import { GraphsModule } from '../graphs';
import { NodesModule } from '../nodes/nodes.module';

/**
 * CollabModule - Real-time Collaboration Module
 *
 * Provides real-time collaboration capabilities using:
 * - Hocuspocus WebSocket server
 * - Yjs CRDT for conflict-free synchronization
 * - PostgreSQL persistence for Yjs state
 *
 * Story 1.4: Real-time Collaboration Engine
 * Story 7.1: Imports GraphsModule and NodesModule for Repository pattern
 */
@Module({
    imports: [GraphsModule, NodesModule],
    providers: [CollabService],
    exports: [CollabService],
})
export class CollabModule { }
