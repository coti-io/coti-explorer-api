import { HttpCodes, Status } from '../utils/http-constants';

export class ExplorerResponse<T> {
  httpCode: HttpCodes;
  status: Status;
  data: T;
  constructor(res: { data?: T; status?: Status; httpCode?: HttpCodes }) {
    this.status = res.status || Status.STATUS_SUCCESS;
    this.httpCode = res.httpCode || HttpCodes.CODE_OK;
    this.data = res.data;
  }
}
