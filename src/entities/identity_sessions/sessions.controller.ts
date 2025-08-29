import { SessionsService } from './sessions.service';
import { Controller, Delete, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { UserVerificationSession } from './session.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoles } from '../users/user.entity';

@ApiTags('verification-sessions')
@ApiBearerAuth()
@Controller('verification-sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Get()
  @Roles(UserRoles.ADMIN)
  @ApiOperation({ summary: 'Get all sessions' })
  @ApiOkResponse({
    description: 'List of sessions',
    type: [UserVerificationSession],
  })
  async getAllSessions(): Promise<UserVerificationSession[]> {
    return await this.sessionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a session by ID' })
  @ApiOkResponse({ type: UserVerificationSession })
  @ApiNotFoundResponse({ description: 'Session not found' })
  async getSessionById(@Param('id') id: string): Promise<UserVerificationSession | null> {
    return await this.sessionsService.findByUserId(id);
  }

  @Delete(':id')
  @Roles(UserRoles.ADMIN)
  @ApiOperation({ summary: 'Delete a session by ID' })
  @ApiOkResponse({ description: 'Session deleted' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  async deleteSession(@Param('id') id: string): Promise<void> {
    return await this.sessionsService.remove(id);
  }
}
