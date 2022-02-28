import { HttpCodes, Status } from 'src/utils/http-constants';

export class ExplorerError extends Error {
  statusCode?: HttpCodes;
  status?: Status;
  name: string;

  constructor(explorerError:{name?: string, message: string, status?: Status, statusCode?: HttpCodes}) {
    super(explorerError.message);
    this.name = explorerError.name || 'ExplorerError';
    this.status = explorerError.status;
    this.statusCode = explorerError.statusCode;
  }
}
