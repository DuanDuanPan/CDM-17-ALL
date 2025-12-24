/**
 * Story 4.3: Contextual Comments & Mentions
 * Comments Gateway - WebSocket events for real-time comment updates
 *
 * HIGH-3 Fix: Added join handler and CORS configuration for real-time sync
 */

import { Injectable, Logger } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { Comment } from '@cdm/types';
import { COMMENT_SOCKET_EVENTS } from '@cdm/types';

@WebSocketGateway({
    namespace: '/',
    cors: {
        origin: '*', // In production, specify allowed origins
        credentials: true,
    },
})
@Injectable()
export class CommentsGateway {
    private readonly logger = new Logger(CommentsGateway.name);

    @WebSocketServer()
    server!: Server;

    /**
     * Handle client joining a mindmap room
     * Room naming pattern: mindmap:${mindmapId}
     */
    @SubscribeMessage('join')
    handleJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() roomName: string
    ): void {
        if (!roomName || typeof roomName !== 'string') {
            this.logger.warn(`Invalid room name from client ${client.id}`);
            return;
        }

        // Validate room name format
        if (!roomName.startsWith('mindmap:')) {
            this.logger.warn(`Invalid room format: ${roomName}`);
            return;
        }

        client.join(roomName);
        this.logger.debug(`Client ${client.id} joined room ${roomName}`);
    }

    /**
     * Handle client leaving a room
     */
    @SubscribeMessage('leave')
    handleLeave(
        @ConnectedSocket() client: Socket,
        @MessageBody() roomName: string
    ): void {
        if (!roomName || typeof roomName !== 'string') {
            return;
        }

        client.leave(roomName);
        this.logger.debug(`Client ${client.id} left room ${roomName}`);
    }

    /**
     * Emit a comment created event to all users viewing the mindmap
     * Uses room naming pattern: mindmap:${mindmapId}
     */
    emitCommentCreated(mindmapId: string, comment: Comment): void {
        this.server
            .to(`mindmap:${mindmapId}`)
            .emit(COMMENT_SOCKET_EVENTS.CREATED, comment);
    }

    /**
     * Emit a comment updated event
     */
    emitCommentUpdated(mindmapId: string, comment: Comment): void {
        this.server
            .to(`mindmap:${mindmapId}`)
            .emit(COMMENT_SOCKET_EVENTS.UPDATED, comment);
    }

    /**
     * Emit a comment deleted event
     */
    emitCommentDeleted(
        mindmapId: string,
        payload: { commentId: string; nodeId: string }
    ): void {
        this.server
            .to(`mindmap:${mindmapId}`)
            .emit(COMMENT_SOCKET_EVENTS.DELETED, payload);
    }
}
