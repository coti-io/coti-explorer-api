import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { corsConfig } from '../configurations';
import { SocketEvents } from '../../../live-app/src/services';

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
  subscribe(
    client: Socket,
    payload: {
      address?: string;
      hash?: string;
      nodeHash?: string;
      tokenHash?: string;
      nodeUpdates?: boolean;
      treasuryTotals?: boolean;
      activeWallets?: boolean;
      transactionConfirmationUpdates?: boolean;
      transactions?: boolean;
      tokens?: boolean;
      cotiPrice?: boolean;
    },
  ) {
    try {
      if (!payload) return;
      const { address, hash, nodeHash, tokenHash, nodeUpdates, treasuryTotals, activeWallets, transactionConfirmationUpdates, transactions, cotiPrice, tokens } = payload;
      let addressLog = '';
      let hashLog = '';
      let nodeHashLog = '';
      let tokenLog = '';
      let nodeUpdatesLog = '';
      let treasuryTotalsLog = '';
      let activeWalletsLog = '';
      let transactionConfirmationUpdatesLog = '';
      let transactionsLog = '';
      let cotiPriceLog = '';
      const tokensLog = '';
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
        tokenLog = `[token ${tokenHash}]`;
      }
      if (nodeUpdates) {
        client.join(SocketEvents.NodeUpdates);
        nodeUpdatesLog = `[nodeUpdates ${nodeUpdates}]`;
      }
      if (treasuryTotals) {
        client.join(SocketEvents.TreasuryTotalsUpdates);
        treasuryTotalsLog = `[treasuryTotals ${treasuryTotals}]`;
      }
      if (activeWallets) {
        client.join(SocketEvents.NumberOfActiveAddresses);
        activeWalletsLog = `[activeWallets ${activeWallets}]`;
      }
      if (transactionConfirmationUpdates) {
        client.join(SocketEvents.TransactionConfirmationUpdate);
        transactionConfirmationUpdatesLog = `[transactionConfirmationUpdate ${transactionConfirmationUpdates}]`;
      }
      if (transactions) {
        client.join(SocketEvents.GeneralTransactionsNotification);
        transactionsLog = `[transactions ${transactions}]`;
      }
      if (cotiPrice) {
        client.join(SocketEvents.CotiPrice);
        cotiPriceLog = `[cotiPrice ${cotiPrice}]`;
      }
      if (tokens) {
        client.join(SocketEvents.Tokens);
        cotiPriceLog = `[tokens ${tokens}]`;
      }
      this.logger.log(
        `[subscribe][socketId: ${client.id}]${addressLog}${hashLog}${nodeHashLog}${tokenLog}${nodeUpdatesLog}${treasuryTotalsLog}${activeWalletsLog}${transactionConfirmationUpdatesLog}${transactionsLog}${cotiPriceLog}${tokensLog}`,
      );
    } catch (error) {
      this.logger.warn('socket subscribe failed');
    }
  }

  @SubscribeMessage('unsubscribe')
  unsubscribe(
    client: Socket,
    payload: {
      address?: string;
      hash?: string;
      nodeHash?: string;
      tokenHash?: string;
      nodeUpdates?: boolean;
      treasuryTotals?: boolean;
      activeWallets?: boolean;
      transactionConfirmationUpdates?: boolean;
      transactions?: boolean;
      cotiPrice?: boolean;
      tokens?: boolean;
    },
  ) {
    try {
      const { address, hash, nodeHash, tokenHash, nodeUpdates, treasuryTotals, activeWallets, transactionConfirmationUpdates, transactions, cotiPrice, tokens } = payload;
      let addressLog = '';
      let hashLog = '';
      let nodeHashLog = '';
      let tokenLog = '';
      let nodeUpdatesLog = '';
      let treasuryTotalsLog = '';
      let activeWalletsLog = '';
      let transactionConfirmationUpdatesLog = '';
      let transactionsLog = '';
      let cotiPriceLog = '';
      let tokensLog = '';
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
        nodeHashLog = `[hash ${nodeHash}]`;
      }
      if (tokenHash) {
        client.leave(tokenHash);
        tokenLog = `[token ${tokenHash}]`;
      }
      if (nodeUpdates) {
        client.leave(SocketEvents.NodeUpdates);
        nodeUpdatesLog = `[nodeUpdates ${nodeUpdates}]`;
      }
      if (treasuryTotals) {
        client.leave(SocketEvents.TreasuryTotalsUpdates);
        treasuryTotalsLog = `[treasuryTotals ${treasuryTotals}]`;
      }
      if (activeWallets) {
        client.leave(SocketEvents.NumberOfActiveAddresses);
        activeWalletsLog = `[activeWallets ${activeWallets}]`;
      }
      if (transactionConfirmationUpdates) {
        client.leave(SocketEvents.TransactionConfirmationUpdate);
        transactionConfirmationUpdatesLog = `[transactionConfirmationUpdate ${transactionConfirmationUpdates}]`;
      }
      if (transactions) {
        client.leave(SocketEvents.GeneralTransactionsNotification);
        transactionsLog = `[transactions ${transactions}]`;
      }
      if (cotiPrice) {
        client.leave(SocketEvents.CotiPrice);
        cotiPriceLog = `[cotiPrice ${cotiPrice}]`;
      }
      if (tokens) {
        client.leave(SocketEvents.Tokens);
        tokensLog = `[tokens ${tokens}]`;
      }
      this.logger.log(
        `[unsubscribe][socketId: ${client.id}]${addressLog}${hashLog}${nodeHashLog}${tokenLog}${nodeUpdatesLog}${treasuryTotalsLog}${nodeUpdatesLog}${treasuryTotalsLog}${activeWalletsLog}${transactionConfirmationUpdatesLog}${transactionsLog}${cotiPriceLog}${tokensLog}`,
      );
    } catch (error) {
      this.logger.warn('socket unsubscribe failed');
    }
  }
}
