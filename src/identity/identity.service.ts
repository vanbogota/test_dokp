import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { IdentityStatus } from '../entities/users/user.entity';
import {
  IdentityStatusResponse,
  IdentityVerificationData,
  VerificationStatus,
} from '../common/interfaces/identity.interfaces';
import { UsersService } from '../entities/users/users.service';

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
  ) {
    const stripeApiKey = this.configService.get<string>('STRIPE_API_KEY');
    if (!stripeApiKey) {
      throw new Error('STRIPE_API_KEY environment variable is not set');
    }
    this.stripe = new Stripe(stripeApiKey, { apiVersion: '2025-07-30.basil' });
  }

  /**
   * Start the identity verification process for a user.
   * @param userId The ID of the user to verify.
   * @returns The client secret for the verification session.
   */
  async startIdentityVerification(userId: string): Promise<{ client_secret: string | null }> {
    this.logger.log(`Started Identity verification for user: ${userId}`);
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        this.logger.error(`User not found: ${userId}`);
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
            require_id_number: false,
            require_matching_selfie: false,
          },
        },
      });

      return { client_secret: session.client_secret };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to start identity verification: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get the identity verification status for a user.
   * @param userId The ID of the user to check.
   * @returns The identity verification status.
   */
  async getIdentityStatus(userId: string): Promise<IdentityStatusResponse> {
    try {
      const user = await this.userService.findById(userId);
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
          verificationStatus = VerificationStatus.PROCESSING;
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

  /**
   * Handle the webhook event from Stripe.
   * @param payload The webhook payload from Stripe.
   */
  async handleWebhook(payload: any): Promise<void> {
    this.logger.log(`Handling Stripe webhook: ${payload?.type}`);
    try {
      const session = payload.data.object;
      const userId = session.metadata?.user_id;

      if (!userId) {
        this.logger.error('User ID not found in metadata');
        return;
      }

      if (
        session.status !== VerificationStatus.VERIFIED &&
        session.status !== VerificationStatus.FAILED
      ) {
        this.logger.log(`Ignoring session with status: ${session.status}`);
        return;
      }

      const user = await this.userService.findById(userId);
      if (!user) {
        this.logger.error(`User with ID ${userId} not found`);
        return;
      }

      if (session.status === VerificationStatus.VERIFIED) {
        try {
          this.logger.log(
            `Handling verified status session: ${session.id} with report ID: ${session.last_verification_report}`,
          );
          const report = await this.stripe.identity.verificationReports.retrieve(
            session.last_verification_report,
          );

          user.identityStatus = IdentityStatus.VERIFIED;

          if (report.document?.dob?.year) {
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
          user.identityStatus = IdentityStatus.FAILED;
        }
      }
      if (session.status === VerificationStatus.FAILED) {
        user.identityStatus = IdentityStatus.FAILED;
      }

      await this.userService.update(userId, user);
      this.logger.log(`Updated identity status for user ${userId} to ${user.identityStatus}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process identity webhook: ${errorMessage}`);
      throw error;
    }
  }
}
