import { HttpCodes, Status } from '@app/shared';

export class ExplorerError extends Error {
  statusCode?: HttpCodes;
  status?: Status;
  name: string;

  public constructor(explorerError: { name?: string; message: string; status?: Status; statusCode?: HttpCodes }) {
    super(explorerError.message);
    this.name = explorerError.name || 'ExplorerError';
    this.status = explorerError.status || Status.STATUS_ERROR;
    this.statusCode = explorerError.statusCode || HttpCodes.CODE_INTERNAL_ERROR;
  }
}

export class ExplorerBadRequestError extends ExplorerError {
  public constructor(message: string) {
    super({ message, statusCode: HttpCodes.CODE_BAD_REQUEST, status: Status.STATUS_ERROR });
  }
}

export class ExplorerInternalServerError extends ExplorerError {
  public constructor(message: string) {
    super({ message, statusCode: HttpCodes.CODE_INTERNAL_ERROR, status: Status.STATUS_ERROR });
  }
}
