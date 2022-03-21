import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { corsConfig } from '../configurations';

@WebSocketGateway({ cors: { ...corsConfig } })
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  logger: Logger = new Logger('AppGateway');

  @WebSocketServer() wss: Server;

  afterInit(server: Server) {
    this.logger.log('afterInit');
  }

  handleConnection(client: Socket, ...args: any[]) {
    try {
      this.logger.log(`[handleConnection][socketId: ${client.id}], subscribe to public events`);
      client.join(`client.id_${client.id}`);
    } catch (e) {
      this.logger.warn('socket connection failed');
    }
  }

  handleDisconnect(client: Socket) {
    try {
      this.logger.log(`[handleDisconnect][socketId: ${client.id}]`);
    } catch (error) {
      this.logger.warn('socket disconnection failed');
    }
  }

  @SubscribeMessage('subscribe')
  subscribe(client: Socket, payload: { address?: string; hash?: string }) {
    try {
      if (!payload) return;
      const { address, hash } = payload;
      if (address) {
        client.join(address);
      }
      if (hash) {
        client.join(hash);
      }
      this.logger.log(`[subscribe][socketId: ${client.id}]`);
    } catch (error) {
      this.logger.warn('socket subscribe failed');
    }
  }

  @SubscribeMessage('unsubscribe')
  unsubscribe(client: Socket, payload: { address?: string; hash?: string }) {
    try {
      const { address, hash } = payload;
      if (address) client.leave(address);
      if (hash) client.leave(hash);
      this.logger.log(`[unsubscribe][socketId: ${client.id}]`);
    } catch (error) {
      this.logger.warn('socket unsubscribe failed');
    }
  }

  async sendMessageToRoom(room: string, event: string, data: any) {
    this.wss.to(room).emit(event, data);
  }

  async sendBroadcast(event: string, data: any) {
    this.wss.sockets.emit(event, data);
  }
}
