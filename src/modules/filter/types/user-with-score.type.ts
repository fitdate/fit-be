import { User } from '../../user/entities/user.entity';

export interface UserWithScore extends User {
  compatibilityScore: number;
}
