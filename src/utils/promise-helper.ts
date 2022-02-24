import { AxiosResponse, AxiosError } from 'axios';

export const exec = <T>(p: Promise<T>): Promise<[any, T]> => p.then((res: T): [any, T] => [null, res]).catch((error: any): [any, T] => [error, null]);

export const handleAxiosResponse = <T>(p: Promise<AxiosResponse<T>>): Promise<[AxiosError, T]> =>
  p.then((res: { data: T }): [AxiosError, T] => [null, res.data]).catch((error: AxiosError): [AxiosError, T] => [error, null]);
