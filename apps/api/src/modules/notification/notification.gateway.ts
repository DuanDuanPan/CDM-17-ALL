/**
 * Story 2.4: Task Dispatch & Feedback
 * Notification Gateway - WebSocket server for real-time notifications
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/notifications', cors: true })
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log(`[NotificationGateway] Client connected: ${client.id}`);
  }

  /**
   * Send notification to specific user
   * @param userId - Recipient user ID
   * @param event - Event name (e.g., 'notification:new')
   * @param data - Notification payload
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Client joins their user room for targeted notifications
   * @param client - Socket client
   * @param userId - User ID to join
   */
  @SubscribeMessage('join')
  handleJoin(client: Socket, userId: string) {
    client.join(`user:${userId}`);
    console.log(`[NotificationGateway] User ${userId} joined their room`);
    return { status: 'joined', userId };
  }
}
