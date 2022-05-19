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
  subscribe(client: Socket, payload: { address?: string; hash?: string; nodeHash?: string; tokenHash?: string; nodeUpdates?: string; treasuryTotals?: string }) {
    try {
      if (!payload) return;
      const { address, hash, nodeHash, tokenHash, nodeUpdates, treasuryTotals } = payload;
      let addressLog = '';
      let hashLog = '';
      let nodeHashLog = '';
      let nodeUpdatesLog = '';
      let treasuryTotalsLog = '';
      if (address) {
        client.join(address);
        addressLog = `[address ${address}]`;
      }
      if (hash) {
        client.join(hash);
        hashLog = `[hash ${hash}]`;
      }
      if (nodeHash) {
        client.join(nodeHash);
        nodeHashLog = `[hash ${nodeHash}]`;
      }
      if (tokenHash) {
        client.join(tokenHash);
        hashLog = `[hash ${tokenHash}]`;
      }
      if (nodeUpdates) {
        client.join(nodeUpdates);
        nodeUpdatesLog = `[hash ${nodeUpdates}]`;
      }
      if (treasuryTotals) {
        client.join(treasuryTotals);
        treasuryTotalsLog = `[treasuryTotals ${treasuryTotals}]`;
      }
      this.logger.log(`[subscribe][socketId: ${client.id}]${addressLog}${hashLog}${nodeHashLog}${nodeUpdatesLog}${treasuryTotalsLog}`);
    } catch (error) {
      this.logger.warn('socket subscribe failed');
    }
  }

  @SubscribeMessage('unsubscribe')
  unsubscribe(client: Socket, payload: { address?: string; hash?: string; nodeHash?: string; tokenHash?: string; nodeUpdates?: string; treasuryTotals?: string }) {
    try {
      const { address, hash, nodeHash, tokenHash, nodeUpdates, treasuryTotals } = payload;
      let addressLog = '';
      let hashLog = '';
      const nodeHashLog = '';
      let nodeUpdatesLog = '';
      let treasuryTotalsLog = '';
      if (address) {
        client.leave(address);
        addressLog = `[address ${address}]`;
      }
      if (hash) {
        client.leave(hash);
        hashLog = `[hash ${hash}]`;
      }
      if (nodeHash) {
        client.leave(nodeHash);
        hashLog = `[hash ${nodeHash}]`;
      }
      if (tokenHash) {
        client.leave(tokenHash);
        hashLog = `[hash ${tokenHash}]`;
      }
      if (nodeUpdates) {
        client.leave(nodeUpdates);
        nodeUpdatesLog = `[nodeUpdates ${nodeUpdates}]`;
      }
      if (treasuryTotals) {
        client.leave(treasuryTotals);
        treasuryTotalsLog = `[treasuryTotals ${treasuryTotals}]`;
      }
      this.logger.log(`[unsubscribe][socketId: ${client.id}]${addressLog}${hashLog}${nodeHashLog}${nodeUpdatesLog}${treasuryTotalsLog}${nodeUpdatesLog}${treasuryTotalsLog}`);
    } catch (error) {
      this.logger.warn('socket unsubscribe failed');
    }
  }
}
