import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, IdentityStatus, UserRoles } from './user.entity';
import { CreateUserDto } from './dto/CreateUserDto';
import { UpdateUserDto } from './dto/UpdateUserDto';
import { UserResponseDto } from './dto/UserResponseDto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async create(user: CreateUserDto): Promise<string> {
    try {
      const newUser = this.usersRepository.create({
        ...user,
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
      });
      const { id } = await this.usersRepository.save(newUser);
      return id;
    } catch (error) {
      const pgError = error as {
        code?: string;
        detail?: string;
      };
      if (pgError?.code === '23505') {
        let field = 'unknown';
        if (pgError.detail?.includes('auth0Sub')) {
          field = 'auth0Sub';
        } else if (pgError.detail?.includes('email')) {
          field = 'email';
        }
        throw new ConflictException(`Unique constraint violated for field: ${field}`);
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async update(id: string, user: UpdateUserDto): Promise<UserResponseDto> {
    const entity = await this.usersRepository.preload({ id, ...user });
    if (!entity) throw new NotFoundException('User not found.');

    try {
      const updatedUser = await this.usersRepository.save(entity);
      return plainToInstance(UserResponseDto, updatedUser, { excludeExtraneousValues: true });
    } catch (error) {
      const pgError = error as {
        code?: string;
        detail?: string;
      };
      if (pgError?.code === '23505') {
        let field = 'unknown';
        if (pgError.detail?.includes('auth0Sub')) {
          field = 'auth0Sub';
        } else if (pgError.detail?.includes('email')) {
          field = 'email';
        }
        throw new ConflictException(`Unique constraint violated for field: ${field}`);
      }
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async delete(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  async findByAuth0Sub(auth0Sub: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { auth0Sub } });
  }
}
