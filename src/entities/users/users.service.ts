import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityStatus, User, UserRoles } from './user.entity';
import { CreateUserDto } from './dto/CreateUserDto';
import { UpdateUserDto } from './dto/UpdateUserDto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async findById(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { id } });
  }

  async create(user: CreateUserDto): Promise<User> {
    try {
      const newUser = this.usersRepository.create({
        ...user,
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
      });
      return await this.usersRepository.save(newUser);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw error;
      }
    }
  }

  async update(id: string, user: UpdateUserDto): Promise<User> {
    try {
      return await this.usersRepository.save({ ...user, id });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw error;
      }
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
