import { UserRole } from '../../../common/enum/user-role.enum';
import { User } from '../../user/entities/user.entity';
import { Entity } from 'typeorm';

@Entity()
export class Admin extends User {
  constructor() {
    super();
    this.role = UserRole.ADMIN;
  }
}
