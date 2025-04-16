import { Entity } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { UserRole } from 'src/common/enum/user-role.enum';

@Entity()
export class Admin extends User {
  constructor() {
    super();
    this.role = UserRole.ADMIN;
  }
}
