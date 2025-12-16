import { Module } from '@nestjs/common';
import { CollabService } from './collab.service';

/**
 * CollabModule - Real-time Collaboration Module
 *
 * Provides real-time collaboration capabilities using:
 * - Hocuspocus WebSocket server
 * - Yjs CRDT for conflict-free synchronization
 * - PostgreSQL persistence for Yjs state
 *
 * Story 1.4: Real-time Collaboration Engine
 */
@Module({
    providers: [CollabService],
    exports: [CollabService],
})
export class CollabModule { }
