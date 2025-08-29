import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserVerificationSession } from './session.entity';
import { CreateSessionDto } from './dto/CreateSessionDto';
import { UpdateSessionDto } from './dto/UpdateSessionDto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(UserVerificationSession)
    private readonly sessionsRepository: Repository<UserVerificationSession>,
  ) {}

  async create(newSession: CreateSessionDto): Promise<UserVerificationSession> {
    try {
      const session = this.sessionsRepository.create(newSession);
      return await this.sessionsRepository.save(session);
    } catch (error) {
      //check for unique constraint violation in PostgreSQL
      const pgError = error as {
        code?: string;
        detail?: string;
      };
      if (pgError?.code === '23505') {
        let field = 'unknown';
        if (pgError.detail?.includes('userId')) {
          field = 'userId';
        } else if (pgError.detail?.includes('sessionId')) {
          field = 'sessionId';
        }
        this.logger.error(`Unique constraint violated for field: ${field}`);
        throw new ConflictException(`Unique constraint violated for field: ${field}`);
      }
      this.logger.error('Failed to create verification session');
      throw new InternalServerErrorException('Failed to create verification session');
    }
  }

  async findAll(): Promise<UserVerificationSession[]> {
    return await this.sessionsRepository.find();
  }

  async findByUserId(userId: string): Promise<UserVerificationSession | null> {
    const session = await this.sessionsRepository.findOne({ where: { userId } });
    return session;
  }

  async findById(id: string): Promise<UserVerificationSession> {
    const session = await this.sessionsRepository.findOne({ where: { id } });
    if (!session) {
      this.logger.error(`Verification Session with Id ${id} not found`);
      throw new NotFoundException(`Verification Session with Id ${id} not found`);
    }
    return session;
  }

  async update(id: string, updateData: UpdateSessionDto): Promise<UserVerificationSession> {
    try {
      await this.sessionsRepository.update(id, updateData);
      return this.findById(id);
    } catch (error) {
      //check for unique constraint violation in PostgreSQL
      const pgError = error as {
        code?: string;
        detail?: string;
      };
      if (pgError?.code === '23505') {
        let field = 'unknown';
        if (pgError.detail?.includes('sessionId')) {
          field = 'sessionId';
        }
        this.logger.error(`Unique constraint violated for field: ${field}`);
        throw new ConflictException(`Unique constraint violated for field: ${field}`);
      }
      this.logger.error('Failed to create verification session');
      throw new InternalServerErrorException('Failed to create verification session');
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.sessionsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Verification Session with id ${id} not found`);
    }
  }
}
