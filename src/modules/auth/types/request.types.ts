import { Request } from 'express';
import { TokenPayload } from '../../token/types/token-payload.types';

export interface RequestWithUser extends Request {
  user?: TokenPayload;
  headers: {
    origin?: string;
    [key: string]: string | undefined;
  };
}
