export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in: number;
}

export interface Auth0UserProfile {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  birthdate?: string;
  address?: {
    country: string;
  };
}
