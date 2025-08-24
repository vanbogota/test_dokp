import { Injectable } from '@nestjs/common';
import { UsersService } from '../entities/users/users.service';
import { User, UserRoles } from '../entities/users/user.entity';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateUser(auth0Sub: string): Promise<User | null> {
    const user = await this.usersService.findByAuth0Sub(auth0Sub);
    if (!user) {
      return null;
    }
    return user;
  }

  async createUserFromAuth0(auth0User: any): Promise<User> {
    const newUser = {
      auth0Sub: auth0User.sub,
      email: auth0User.email,
      role: UserRoles.USER,
      firstName: auth0User.given_name || '',
      lastName: auth0User.family_name || '',
      country: '',
      birthYear: 0,
    };

    return this.usersService.create(newUser);
  }
}
