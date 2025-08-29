import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { SessionsService } from './sessions.service';
import { UserVerificationSession } from './session.entity';
import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

describe('SessionsService', () => {
  let service: SessionsService;
  let repo: jest.Mocked<
    Pick<
      Repository<UserVerificationSession>,
      'create' | 'save' | 'find' | 'findOne' | 'update' | 'delete'
    >
  >;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as typeof repo;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getRepositoryToken(UserVerificationSession), useValue: repo },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a new session successfully', async () => {
      const dto = { userId: 'u1', sessionId: 's1' };
      const entity = { id: 'id1', ...dto } as UserVerificationSession;
      repo.create.mockReturnValueOnce(entity);
      repo.save.mockResolvedValueOnce(entity);

      await expect(service.create(dto)).resolves.toBe(entity);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(entity);
    });

    it('maps unique violation to ConflictException (sessionId)', async () => {
      const dto = { userId: 'u1', sessionId: 'dup' };
      const entity = { ...dto } as UserVerificationSession;
      repo.create.mockReturnValueOnce(entity);
      repo.save.mockRejectedValueOnce({ code: '23505', detail: 'Key (sessionId) already exists' });

      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps other errors to InternalServerErrorException', async () => {
      const dto = { userId: 'u1', sessionId: 's1' };
      repo.create.mockReturnValueOnce({} as UserVerificationSession);
      repo.save.mockRejectedValueOnce(new Error('db down'));

      await expect(service.create(dto)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('returns all sessions', async () => {
      const list: UserVerificationSession[] = [
        { id: '1', userId: 'u1', sessionId: 's1' } as UserVerificationSession,
      ];
      repo.find.mockResolvedValueOnce(list);
      await expect(service.findAll()).resolves.toBe(list);
      expect(repo.find).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('returns session for user id', async () => {
      const sess = { id: '1', userId: 'u1', sessionId: 's1' } as UserVerificationSession;
      repo.findOne.mockResolvedValueOnce(sess);
      await expect(service.findByUserId('u1')).resolves.toBe(sess);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValueOnce(null);
      await expect(service.findByUserId('nope')).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('returns by id when found', async () => {
      const sess = { id: 'id1', userId: 'u1', sessionId: 's1' } as UserVerificationSession;
      repo.findOne.mockResolvedValueOnce(sess);
      await expect(service.findById('id1')).resolves.toBe(sess);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'id1' } });
    });

    it('throws NotFoundException when missing', async () => {
      repo.findOne.mockResolvedValueOnce(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates and returns fresh session via findById', async () => {
      const dto = { sessionId: 'newS' };
      const upd: UpdateResult = { raw: {}, generatedMaps: [], affected: 1 };
      repo.update.mockResolvedValueOnce(upd);
      const sess = { id: 'id1', userId: 'u1', sessionId: 'newS' } as UserVerificationSession;
      repo.findOne.mockResolvedValueOnce(sess);

      await expect(service.update('id1', dto)).resolves.toBe(sess);
      expect(repo.update).toHaveBeenCalledWith('id1', dto);
    });

    it('maps unique violation to ConflictException', async () => {
      repo.update.mockRejectedValueOnce({
        code: '23505',
        detail: 'Key (sessionId) already exists',
      });
      await expect(service.update('id', { sessionId: 'x' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('maps other errors to InternalServerErrorException', async () => {
      repo.update.mockRejectedValueOnce(new Error('unexpected'));
      await expect(service.update('id', { sessionId: 'keep' })).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    it('deletes when affected > 0', async () => {
      const del: DeleteResult = { raw: {}, affected: 1 } as DeleteResult;
      repo.delete.mockResolvedValueOnce(del);
      await expect(service.remove('id')).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith('id');
    });

    it('throws NotFoundException when no rows affected', async () => {
      const del0: DeleteResult = { raw: {}, affected: 0 } as DeleteResult;
      repo.delete.mockResolvedValueOnce(del0);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
