export interface JwkKey {
  kid: string;
  x5c: string[];
  [key: string]: unknown;
}

export interface JwksResponse {
  keys: JwkKey[];
}

export interface DecodedToken {
  header: {
    kid?: string;
    [key: string]: unknown;
  };
  payload: {
    sub?: string;
    [key: string]: unknown;
  };
}
