import { SetMetadata } from '@nestjs/common';

export const PUBLIC_KEY = 'auth:isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
