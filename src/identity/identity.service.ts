import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { IdentityStatus } from '../entities/users/user.entity';
import { VerificationStatus } from '../common/interfaces/identity.interfaces';
import { UsersService } from '../entities/users/users.service';
import { SessionsService } from '../entities/identity_sessions/sessions.service';

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    private readonly sessionService: SessionsService,
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
  async startIdentityVerification(
    userId: string,
  ): Promise<{ session_status: string; client_secret: string | null }> {
    this.logger.log(`Started Identity verification for user: ${userId}`);
    try {
      const user = await this.userService.findById(userId);

      let session: Stripe.Identity.VerificationSession | null = null;

      const existingUserSession = await this.sessionService.findByUserId(user.id);
      if (existingUserSession) {
        session = await this.stripe.identity.verificationSessions.retrieve(
          existingUserSession.sessionId,
        );
      }

      if (session) {
        switch (session.status) {
          case 'requires_input':
            return { session_status: 'requires_input', client_secret: session.client_secret };
          case 'processing':
            return { session_status: 'processing', client_secret: null };
          case 'verified':
            return { session_status: 'verified', client_secret: null };
        }
      }

      session = await this.stripe.identity.verificationSessions.create({
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

      await this.sessionService.create({
        userId: user.id,
        sessionId: session.id,
      });

      return { session_status: 'new', client_secret: session.client_secret };
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
  async getIdentityStatus(userId: string): Promise<{ status: string; error: any }> {
    try {
      const user = await this.userService.findById(userId);

      const existingUserSession = await this.sessionService.findByUserId(user.id);

      if (!existingUserSession) {
        throw new NotFoundException('No identity verification session found for this user.');
      }

      const session = await this.stripe.identity.verificationSessions.retrieve(
        existingUserSession.sessionId,
      );

      return {
        status: session.status,
        error: session.last_error,
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

      if (session.status !== 'verified' && session.status !== 'requires_input') {
        this.logger.log(`Ignoring session with status: ${session.status}`);
        return;
      }

      const user = await this.userService.findById(userId);
      if (!user) {
        this.logger.error(`User with ID ${userId} not found`);
        return;
      }

      if (session.status === 'verified') {
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
      if (session.status === 'requires_input') {
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

  async getVerificationSession(sessionId: string): Promise<Stripe.Identity.VerificationSession> {
    try {
      const session = await this.stripe.identity.verificationSessions.retrieve(sessionId);
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve verification session: ${errorMessage}`);
      throw error;
    }
  }

  async getAllVerificationSessions(
    client_reference_id?: string,
    status?: VerificationStatus,
    limit?: number,
  ): Promise<Stripe.Identity.VerificationSession[]> {
    try {
      const sessions = await this.stripe.identity.verificationSessions.list({
        client_reference_id: client_reference_id,
        status: status,
        limit: limit,
      });

      return sessions.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve verification sessions: ${errorMessage}`);
      throw error;
    }
  }
}
