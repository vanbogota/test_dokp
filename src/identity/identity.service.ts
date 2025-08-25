import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { User, IdentityStatus } from '../entities/users/user.entity';
import {
  IdentitySessionResponse,
  IdentityStatusResponse,
  IdentityVerificationData,
  VerificationStatus,
} from '../common/interfaces/identity.interfaces';
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const stripeApiKey = this.configService.get<string>('STRIPE_API_KEY');
    if (!stripeApiKey) {
      throw new Error('STRIPE_API_KEY environment variable is not set');
    }
    this.stripe = new Stripe(stripeApiKey, {
      apiVersion: '2025-07-30.basil',
    });
  }

  async startIdentityVerification(userId: string): Promise<IdentitySessionResponse> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const session = await this.stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: {
          user_id: userId,
        },
        options: {
          document: {
            allowed_types: ['driving_license', 'passport', 'id_card'],
            require_id_number: true,
            require_matching_selfie: true,
          },
        },
        return_url: `${this.configService.get<string>('APP_URL')}/identity/complete`,
      });

      return {
        clientSecret: session.client_secret as string,
        url: session.url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to start identity verification: ${errorMessage}`);
      throw error;
    }
  }

  async getIdentityStatus(userId: string): Promise<IdentityStatusResponse> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      let verificationStatus: VerificationStatus;
      switch (user.identityStatus) {
        case IdentityStatus.PENDING:
          verificationStatus = VerificationStatus.REQUIRES_INPUT;
          break;
        case IdentityStatus.VERIFIED:
          verificationStatus = VerificationStatus.VERIFIED;
          break;
        case IdentityStatus.FAILED:
          verificationStatus = VerificationStatus.FAILED;
          break;
        default:
          verificationStatus = VerificationStatus.REQUIRES_INPUT;
      }

      const identityData: IdentityVerificationData = {
        firstName: user.firstName,
        lastName: user.lastName,
        country: user.country,
        birthYear: user.birthYear,
      };

      return {
        status: verificationStatus,
        identityData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get identity status: ${errorMessage}`);
      throw error;
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    try {
      if (payload.type !== 'identity.verification_session.updated') {
        this.logger.log(`Ignoring webhook of type: ${payload.type}`);
        return;
      }

      const session = payload.data.object;
      const userId = session.metadata?.user_id;

      if (!userId) {
        this.logger.error('User ID not found in metadata');
        return;
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        this.logger.error(`User with ID ${userId} not found`);
        return;
      }

      switch (session.status) {
        case VerificationStatus.VERIFIED:
          user.identityStatus = IdentityStatus.VERIFIED;
          break;
        case VerificationStatus.FAILED:
          user.identityStatus = IdentityStatus.FAILED;
          break;
        default:
          user.identityStatus = IdentityStatus.PENDING;
      }

      if (session.status === VerificationStatus.VERIFIED && session.last_verification_report) {
        try {
          // Получаем отчет о верификации, содержащий личные данные
          const report = await this.stripe.identity.verificationReports.retrieve(session.last_verification_report);

          // Извлекаем и сохраняем данные из отчета
          if (report.document?.dob?.day && report.document?.dob?.month && report.document?.dob?.year) {
            user.birthYear = report.document.dob.year;
          }

          if (report.document?.first_name) {
            user.firstName = report.document.first_name;
          }

          if (report.document?.last_name) {
            user.lastName = report.document.last_name;
          }

          if (report.document?.address?.country) {
            user.country = report.document.address.country;
          }
        } catch (reportError) {
          const errorMessage = reportError instanceof Error ? reportError.message : 'Unknown error';
          this.logger.error(`Failed to retrieve verification report: ${errorMessage}`);
        }
      }

      await this.userRepository.save(user);
      this.logger.log(`Updated identity status for user ${userId} to ${user.identityStatus}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process identity webhook: ${errorMessage}`);
      throw error;
    }
  }
}
