export interface StoredConnection {
  id: string;
  user_id: string;
  encrypted_access_token: Buffer;
  access_token_iv: Buffer;
  encrypted_refresh_token: Buffer | null;
  refresh_token_iv: Buffer | null;
  expires_at: Date;
  scope: string | null;
  workspace_id: string | null;
  workspace_name: string | null;
  status: string;
  refresh_count: number;
  last_used_at: Date | null;
  refreshed_at: Date | null;
  disconnected_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ConnectionStatus {
  connected: boolean;
  workspace_name: string | null;
  workspace_id: string | null;
  connected_at: string | null;
  status: string;
}