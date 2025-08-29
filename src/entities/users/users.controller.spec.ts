import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, IdentityStatus, UserRoles } from './user.entity';
import { UserResponseDto } from './dto/UserResponseDto';
import { CreateUserDto } from './dto/CreateUserDto';
import { UpdateUserDto } from './dto/UpdateUserDto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<
    Pick<UsersService, 'findAll' | 'findById' | 'create' | 'update' | 'delete'>
  >;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as typeof service;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAll returns users from service', async () => {
    const users: User[] = [
      {
        id: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
        auth0Sub: 'auth0|1',
        email: 'u1@example.com',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
        birthYear: 1990,
      } as User,
    ];
    service.findAll.mockResolvedValueOnce(users);
    await expect(controller.getAll()).resolves.toBe(users);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('getById returns dto from service', async () => {
    const id = 'c56a4180-65aa-42ec-a945-5fd21dec0538';
    const dto: UserResponseDto = {
      id,
      auth0Sub: 'auth0|1',
      email: 'u1@example.com',
      role: UserRoles.USER,
      identityStatus: IdentityStatus.VERIFIED,
      firstName: 'A',
      lastName: 'B',
      country: 'DE',
      birthYear: 1988,
    };
    service.findById.mockResolvedValueOnce(dto);
    await expect(controller.getById(id)).resolves.toBe(dto);
    expect(service.findById).toHaveBeenCalledWith(id);
  });

  it('create calls service and returns created dto', async () => {
    const body: CreateUserDto = {
      auth0Sub: 'auth0|new',
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      country: 'US',
      birthYear: 1995,
    };
    const created: UserResponseDto = {
      id: 'uuid-1',
      auth0Sub: body.auth0Sub,
      email: body.email,
      role: UserRoles.USER,
      identityStatus: IdentityStatus.PENDING,
      firstName: body.firstName,
      lastName: body.lastName,
      country: body.country,
      birthYear: body.birthYear,
    };
    service.create.mockResolvedValueOnce(created);
    await expect(controller.create(body)).resolves.toBe(created);
    expect(service.create).toHaveBeenCalledWith(body);
  });

  it('update calls service and returns updated dto', async () => {
    const id = 'c56a4180-65aa-42ec-a945-5fd21dec0538';
    const body: UpdateUserDto = { firstName: 'Changed' } as UpdateUserDto;
    const updated: UserResponseDto = {
      id,
      auth0Sub: 'auth0|1',
      email: 'u1@example.com',
      role: UserRoles.USER,
      identityStatus: IdentityStatus.PENDING,
      firstName: 'Changed',
      lastName: 'B',
      country: 'DE',
      birthYear: 1990,
    };
    service.update.mockResolvedValueOnce(updated);
    await expect(controller.update(id, body)).resolves.toBe(updated);
    expect(service.update).toHaveBeenCalledWith(id, body);
  });

  it('delete calls service and resolves', async () => {
    const id = 'c56a4180-65aa-42ec-a945-5fd21dec0538';
    service.delete.mockResolvedValueOnce(undefined);
    await expect(controller.delete(id)).resolves.toBeUndefined();
    expect(service.delete).toHaveBeenCalledWith(id);
  });
});
