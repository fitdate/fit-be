import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    id?: string;
    sub?: string;
    role?: string;
    type?: string;
    iat?: number;
    exp?: number;
  };
}
