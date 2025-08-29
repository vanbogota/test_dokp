import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeleteResult, Repository, UpdateResult } from 'typeorm';
import { IdentityStatus, User, UserRoles } from './user.entity';
import { CreateUserDto } from './dto/CreateUserDto';
import { UpdateUserDto } from './dto/UpdateUserDto';
import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<
    Pick<Repository<User>, 'find' | 'findOne' | 'create' | 'save' | 'update' | 'delete'>
  >;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as typeof repo;

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(User), useValue: repo }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns all users', async () => {
      const users: User[] = [
        {
          id: '1',
          auth0Sub: 'a|1',
          email: 'u1@example.com',
          role: UserRoles.USER,
          identityStatus: IdentityStatus.PENDING,
          birthYear: 1990,
        } as User,
      ];
      repo.find.mockResolvedValueOnce(users);
      await expect(service.findAll()).resolves.toBe(users);
      expect(repo.find).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns a UserResponseDto when found', async () => {
      const user: User = {
        id: '1',
        auth0Sub: 'a|1',
        email: 'u1@example.com',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.VERIFIED,
        birthYear: 1988,
        firstName: 'A',
        lastName: 'B',
        country: 'DE',
      } as User;
      repo.findOne.mockResolvedValueOnce(user);
      const dto = await service.findById('1');
      expect(dto).toMatchObject({
        id: '1',
        auth0Sub: 'a|1',
        email: 'u1@example.com',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.VERIFIED,
        birthYear: 1988,
        firstName: 'A',
        lastName: 'B',
        country: 'DE',
      });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundException when user missing', async () => {
      repo.findOne.mockResolvedValueOnce(null);
      await expect(service.findById('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    const dto: CreateUserDto = {
      auth0Sub: 'auth0|123',
      email: 'new@example.com',
      birthYear: 1995,
      firstName: 'New',
      lastName: 'User',
      country: 'US',
    };

    it('creates a user with default role and pending identity', async () => {
      const entity: User = {
        ...dto,
        id: 'uuid-1',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
      } as User;
      repo.create.mockReturnValueOnce(entity);
      repo.save.mockResolvedValueOnce(entity);

      const result = await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith({
        ...dto,
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
      });
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(result).toMatchObject({
        id: 'uuid-1',
        email: 'new@example.com',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
      });
    });

    it('maps unique violation to ConflictException (auth0Sub/email)', async () => {
      repo.create.mockReturnValueOnce({} as User);
      const err = { code: '23505', detail: 'Key (email) already exists' };
      repo.save.mockRejectedValueOnce(err);
      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps other errors to InternalServerErrorException', async () => {
      repo.create.mockReturnValueOnce({} as User);
      repo.save.mockRejectedValueOnce(new Error('db down'));
      await expect(service.create(dto)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('update', () => {
    it('updates user and returns findById result', async () => {
      const dto: UpdateUserDto = { firstName: 'Changed' } as UpdateUserDto;
      const updateResult: UpdateResult = { raw: {}, generatedMaps: [], affected: 1 };
      repo.update.mockResolvedValueOnce(updateResult);
      const expected = {
        id: 'uuid-2',
        firstName: 'Changed',
      };
      // mock findOne path through findById
      repo.findOne.mockResolvedValueOnce({
        id: 'uuid-2',
        auth0Sub: 'a|2',
        email: 'u2@example.com',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
        birthYear: 1990,
        firstName: 'Changed',
      } as User);

      const res = await service.update('uuid-2', dto);
      expect(repo.update).toHaveBeenCalledWith('uuid-2', dto);
      expect(res).toMatchObject(expected);
    });

    it('maps unique violation to ConflictException on update', async () => {
      repo.update.mockRejectedValueOnce({ code: '23505', detail: 'Key (auth0Sub) already exists' });
      const dto: UpdateUserDto = { email: 'x' };
      await expect(service.update('id', dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows other errors from update', async () => {
      const error = new Error('unexpected');
      repo.update.mockRejectedValueOnce(error);
      const emptyDto: UpdateUserDto = {};
      await expect(service.update('id', emptyDto)).rejects.toBe(error);
    });
  });

  describe('delete', () => {
    it('deletes when affected > 0', async () => {
      const delRes: DeleteResult = { raw: {}, affected: 1 } as DeleteResult;
      repo.delete.mockResolvedValueOnce(delRes);
      await expect(service.delete('id')).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith('id');
    });

    it('throws NotFoundException when no rows affected', async () => {
      const delRes0: DeleteResult = { raw: {}, affected: 0 } as DeleteResult;
      repo.delete.mockResolvedValueOnce(delRes0);
      await expect(service.delete('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByAuth0Sub', () => {
    it('returns user by auth0Sub', async () => {
      const user = {
        id: '1',
        auth0Sub: 'auth0|abc',
        email: 'a@b.c',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
        birthYear: 1990,
      } as User;
      repo.findOne.mockResolvedValueOnce(user);
      await expect(service.findByAuth0Sub('auth0|abc')).resolves.toBe(user);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { auth0Sub: 'auth0|abc' } });
    });
  });
});
