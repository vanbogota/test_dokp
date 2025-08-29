import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.error(`User not found: ${id}`);
      throw new NotFoundException('User not found.');
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async create(user: CreateUserDto): Promise<UserResponseDto> {
    try {
      const newUser = this.usersRepository.create({
        ...user,
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
      });
      const result = await this.usersRepository.save(newUser);

      this.logger.log(`User created: ${result.id}`);

      return plainToInstance(UserResponseDto, result, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      //check for unique constraint violation in PostgreSQL
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
        this.logger.error(`Unique constraint violated for field: ${field}`);
        throw new ConflictException(`Unique constraint violated for field: ${field}`);
      }
      this.logger.error('Failed to create user');
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async update(id: string, user: UpdateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Updating user: ${id}`);
    try {
      await this.usersRepository.update(id, user);
      return await this.findById(id);
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
        this.logger.error(`Unique constraint violated for field: ${field}`);
        throw new ConflictException(`Unique constraint violated for field: ${field}`);
      }
      this.logger.error('Failed to update user');
      throw error;
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
