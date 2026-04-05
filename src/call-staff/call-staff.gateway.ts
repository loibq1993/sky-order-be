import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { socketIoCorsOrigin } from '../cors/socket-cors';

const RESTAURANT_ROOM_PREFIX = 'restaurant:';
const ROLES_ALLOWED = [
  'super_admin',
  'restaurant_owner',
  'restaurant_manager',
  'restaurant_staff',
  'staff_reception',
  'staff_kitchen',
  'staff_waiter',
];

export interface StaffCallPayload {
  tableNumber: string;
  calledAt: number;
}

export interface RequestPaymentPayload {
  tableNumber: string;
  requestedAt: number;
}

@WebSocketGateway({
  cors: { origin: socketIoCorsOrigin, credentials: true },
  transports: ['websocket', 'polling'],
})
export class CallStaffGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: any): Promise<void> {
    try {
      const token = client.handshake?.auth?.token ?? client.handshake?.query?.token;
      const restaurantIdFromAuth = client.handshake?.auth?.restaurantId ?? client.handshake?.query?.restaurantId;
      if (!token) {
        client.disconnect();
        return;
      }
      const secret =
        this.configService.get<string>('app.security.jwtSecret') ||
        this.configService.get<string>('JWT_SECRET') ||
        'your-secret-key';
      const payload = await this.jwtService.verifyAsync(token, { secret });
      const role = payload?.role;
      if (!role || !ROLES_ALLOWED.includes(role)) {
        client.disconnect();
        return;
      }
      let restaurantId: string | null = payload.restaurantId ?? null;
      if (!restaurantId && role === 'super_admin' && restaurantIdFromAuth) {
        const rid = typeof restaurantIdFromAuth === 'string' ? restaurantIdFromAuth.trim() : '';
        if (rid && rid !== 'undefined' && rid !== 'null') restaurantId = rid;
      }
      if (!restaurantId) {
        client.disconnect();
        return;
      }
      const room = RESTAURANT_ROOM_PREFIX + restaurantId;
      await client.join(room);
      client.data.restaurantId = restaurantId;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: any): void {
    // room leave is automatic
  }

  emitCallToRestaurant(restaurantId: string, payload: StaffCallPayload): void {
    const room = RESTAURANT_ROOM_PREFIX + restaurantId;
    this.server.to(room).emit('call_staff', payload);
  }

  emitRequestPaymentToRestaurant(restaurantId: string, payload: RequestPaymentPayload): void {
    const room = RESTAURANT_ROOM_PREFIX + restaurantId;
    this.server.to(room).emit('request_payment', payload);
  }
}
