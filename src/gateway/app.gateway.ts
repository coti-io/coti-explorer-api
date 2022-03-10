import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { corsConfig } from '../configurations';

const signatureExpiration = 10000;

@WebSocketGateway({ cors: { ...corsConfig } })
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  logger: Logger = new Logger('AppGateway');
  addressSubscribersMap: { [key: string]: string } = {};
  transactionSubscribersMap: { [key: string]: string } = {};
  publicSocketIds = [];

  @WebSocketServer() wss: Server;

  afterInit(server: Server) {
    this.logger.log('afterInit');
  }

  handleConnection(client: Socket, ...args: any[]) {
    try {
      this.logger.log(`[connection][socketId: ${client.id}], subscribe to public events`);
      this.publicSocketIds.push(`client.id_${client.id}`);
      client.join(`client.id_${client.id}`);
    } catch (e) {
      this.logger.warn('socket connection failed');
    }
  }

  handleDisconnect(client: Socket) {
    delete this.addressSubscribersMap[client.id];
    delete this.transactionSubscribersMap[client.id];
    client.leave(`client.id_${client.id}`);
    this.logger.log(`[connection][socketId: ${client.id}]`);
  }

  @SubscribeMessage('subscribe')
  subscribe(client: Socket, payload: { address?: string; hash?: string }) {
    if (!payload) return;
    const { address, hash } = payload;
    if (address) {
      this.addressSubscribersMap[client.id] = address;
    } else if (hash) {
      this.transactionSubscribersMap[client.id] = hash;
    }
    this.logger.log(`[subscribe][socketId: ${client.id}]`);
  }

  @SubscribeMessage('unsubscribe')
  unsubscribe(client: Socket) {
    delete this.addressSubscribersMap[client.id];
    delete this.transactionSubscribersMap[client.id];
    this.logger.log(`[unsubscribe][socketId: ${client.id}]`);
  }

  async sendMessageToRoom(room: string, event: string, data: any) {
    this.wss.to(room).emit(event, data);
  }

  async sendBroadcast(event: string, data: any) {
    this.wss.sockets.emit(event, data);
  }
}
