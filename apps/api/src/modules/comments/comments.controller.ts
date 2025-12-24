/**
 * Story 4.3: Contextual Comments & Mentions
 * Comments Controller - HTTP endpoints for comments
 */

import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    Headers,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentSchema } from '@cdm/types';

@Controller('comments')
export class CommentsController {
    constructor(private readonly service: CommentsService) { }

    /**
     * Create a new comment
     * POST /comments
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() body: unknown,
        @Headers('x-user-id') userId?: string
    ) {
        if (!userId) {
            throw new UnauthorizedException('User ID required');
        }

        // Validate request body
        const parseResult = CreateCommentSchema.safeParse(body);
        if (!parseResult.success) {
            throw new UnauthorizedException(
                `Invalid request: ${parseResult.error.message}`
            );
        }

        return this.service.create(parseResult.data, userId);
    }

    /**
     * Get comments for a node
     * GET /comments?nodeId=xxx&limit=50&cursor=xxx
     */
    @Get()
    async findByNode(
        @Query('nodeId') nodeId: string,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
        @Headers('x-user-id') userId?: string
    ) {
        if (!userId) {
            throw new UnauthorizedException('User ID required');
        }

        if (!nodeId) {
            throw new UnauthorizedException('Node ID required');
        }

        // SECURITY: Validate access before returning comments
        await this.service.assertNodeReadAccess(nodeId, userId);

        return this.service.findByNode(nodeId, {
            limit: limit ? parseInt(limit, 10) : undefined,
            cursor,
        });
    }

    /**
     * Get unread comment counts for a mindmap
     * GET /comments/unread?mindmapId=xxx
     */
    @Get('unread')
    async getUnreadCounts(
        @Query('mindmapId') mindmapId: string,
        @Headers('x-user-id') userId?: string
    ) {
        if (!userId) {
            throw new UnauthorizedException('User ID required');
        }

        if (!mindmapId) {
            throw new UnauthorizedException('Mindmap ID required');
        }

        return this.service.getUnreadCounts(mindmapId, userId);
    }

    /**
     * Mark comments on a node as read
     * POST /comments/:nodeId/read
     */
    @Post(':nodeId/read')
    @HttpCode(HttpStatus.OK)
    async markAsRead(
        @Param('nodeId') nodeId: string,
        @Headers('x-user-id') userId?: string
    ) {
        if (!userId) {
            throw new UnauthorizedException('User ID required');
        }

        await this.service.markAsRead(nodeId, userId);
        return { success: true };
    }

    /**
     * Delete a comment
     * DELETE /comments/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(
        @Param('id') id: string,
        @Headers('x-user-id') userId?: string
    ) {
        if (!userId) {
            throw new UnauthorizedException('User ID required');
        }

        await this.service.delete(id, userId);
        return { success: true };
    }
}
