// ─── Protected Resource Metadata (RFC 9470) ────────────────────────
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  bearer_methods_supported?: string[];
  scopes_supported?: string[];
}

// ─── Authorization Server Metadata (RFC 8414) ──────────────────────
export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  revocation_endpoint?: string;
}

// ─── PKCE ───────────────────────────────────────────────────────────
export interface PKCEPair {
  verifier: string;
  challenge: string;
  method: "S256";
}

// ─── Authorization URL Build Params ─────────────────────────────────
export interface AuthorizationParams {
  clientId: string;
  redirectUri: string;
  responseType: "code";
  codeChallenge: string;
  codeChallengeMethod: "S256";
  state: string;
  scope?: string;
}

// ─── Token Exchange ─────────────────────────────────────────────────
export interface TokenExchangeRequest {
  grantType: "authorization_code";
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
  clientSecret?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;  // Optional - Notion tokens don't expire
  token_type: string;
  scope?: string;
  workspace_id?: string;
  workspace_name?: string;
}

// ─── Callback Validation ────────────────────────────────────────────
export interface CallbackValidation {
  valid: boolean;
  verifier: string;
  userId: string;
}