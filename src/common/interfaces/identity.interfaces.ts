export interface IdentitySessionResponse {
  clientSecret: string;
  url?: string | null;
}

export interface IdentityVerificationData {
  firstName?: string;
  lastName?: string;
  country?: string;
  birthYear?: number;
}

export enum VerificationStatus {
  CANCELED = 'canceled',
  PROCESSING = 'processing',
  REQUIRES_INPUT = 'requires_input',
  VERIFIED = 'verified',
}

export interface StripeIdentityWebhookPayload {
  id: string;
  object: 'event';
  api_version: string;
  created: number;
  data: {
    object: {
      id: string;
      object: 'identity.verification_session';
      client_secret?: string;
      created: number;
      last_error?: {
        code: string;
        reason: string;
      };
      last_verification_report?: string;
      livemode: boolean;
      metadata: {
        user_id?: string;
        [key: string]: string | undefined;
      };
      options?: {
        document?: {
          allowed_types?: string[];
          require_id_number?: boolean;
          require_matching_selfie?: boolean;
        };
      };
      redaction?: string | null;
      status: VerificationStatus;
      type: string;
      url?: string;
      verification_reports?: string[];
    };
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
  type: string;
}

export interface IdentityStatusResponse {
  status: VerificationStatus;
  identityData?: IdentityVerificationData;
}
