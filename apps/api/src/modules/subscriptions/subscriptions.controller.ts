/**
 * Story 4.4: Watch & Subscription
 * Subscription Controller - REST API endpoints for subscriptions
 */

import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionService } from './subscriptions.service';
import type {
  CreateSubscriptionDto,
  CheckSubscriptionResponse,
  SubscriptionListResponse,
  Subscription,
} from '@cdm/types';

// Mock user ID header for development (replace with auth in production)
const MOCK_USER_ID = 'mock-user-1';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * POST /subscriptions - Subscribe to a node
   * AC#1: User can subscribe via context menu
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Body() dto: CreateSubscriptionDto,
    @Headers('x-user-id') userId?: string
  ): Promise<{ success: boolean; subscription: Subscription }> {
    const effectiveUserId = userId || MOCK_USER_ID;
    const subscription = await this.subscriptionService.subscribe(
      effectiveUserId,
      dto.nodeId
    );

    return {
      success: true,
      subscription: {
        id: subscription.id,
        userId: subscription.userId,
        nodeId: subscription.nodeId,
        mindmapId: subscription.mindmapId,
        createdAt: subscription.createdAt.toISOString(),
      },
    };
  }

  /**
   * DELETE /subscriptions - Unsubscribe from a node
   * AC#3: User can unsubscribe
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async unsubscribe(
    @Query('nodeId') nodeId: string,
    @Headers('x-user-id') userId?: string
  ): Promise<{ success: boolean }> {
    const effectiveUserId = userId || MOCK_USER_ID;
    await this.subscriptionService.unsubscribe(effectiveUserId, nodeId);

    return { success: true };
  }

  /**
   * GET /subscriptions/check - Check subscription status
   * Used by frontend to determine watch/unwatch button state
   */
  @Get('check')
  async checkSubscription(
    @Query('nodeId') nodeId: string,
    @Headers('x-user-id') userId?: string
  ): Promise<CheckSubscriptionResponse> {
    const effectiveUserId = userId || MOCK_USER_ID;
    return this.subscriptionService.checkSubscription(effectiveUserId, nodeId);
  }

  /**
   * GET /subscriptions - List user's subscriptions
   */
  @Get()
  async listSubscriptions(
    @Headers('x-user-id') userId?: string
  ): Promise<SubscriptionListResponse> {
    const effectiveUserId = userId || MOCK_USER_ID;
    return this.subscriptionService.listUserSubscriptions(effectiveUserId);
  }
}
