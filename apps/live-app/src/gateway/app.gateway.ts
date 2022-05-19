import { Logger } from '@nestjs/common';
import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { corsConfig } from '../configurations';

@WebSocketGateway({ cors: { ...corsConfig } })
export class AppGateway implements OnGatewayInit {
  logger: Logger = new Logger('AppGateway');

  @WebSocketServer() wss: Server;

  afterInit(server: Server) {
    this.logger.log('afterInit');
  }

  async sendMessageToRoom(room: string, event: string, data: any) {
    this.wss.to(room).emit(event, data);
  }

  async sendBroadcast(event: string, data: any) {
    this.wss.sockets.emit(event, data);
  }
}
