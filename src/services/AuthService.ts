import { ApiClient, defaultApiClient } from '../core/http/ApiClient';
import { authManager } from '../core/http/AuthManager';
import { assertSchema } from '../core/utils/schemaValidator';
import {
  LoginRequest,
  LoginResponse,
  LoginResponseSchema,
  RefreshTokenResponse,
  RefreshTokenResponseSchema,
} from '../schemas/auth.schema';

export class AuthService {
  constructor(private client: ApiClient = defaultApiClient) {}

  /**
   * Authenticate with username and password, caching the received JWT tokens
   */
  public async login(credentials: LoginRequest, contextKey = 'default'): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/api/v1/auth/login', credentials, {
      skipAuth: true,
    });

    const validated = assertSchema(LoginResponseSchema, response.data, 'LoginResponse');

    authManager.setTokens(contextKey, {
      accessToken: validated.accessToken,
      refreshToken: validated.refreshToken,
      expiresAt: Date.now() + validated.expiresIn * 1000,
    });

    return validated;
  }

  /**
   * Refresh auth access token using refresh token
   */
  public async refreshToken(refreshToken: string, contextKey = 'default'): Promise<RefreshTokenResponse> {
    const response = await this.client.post<RefreshTokenResponse>(
      '/api/v1/auth/refresh',
      { refreshToken },
      { skipAuth: true }
    );

    const validated = assertSchema(RefreshTokenResponseSchema, response.data, 'RefreshTokenResponse');

    const current = authManager.getTokens(contextKey);
    authManager.setTokens(contextKey, {
      accessToken: validated.accessToken,
      refreshToken: current?.refreshToken || refreshToken,
      expiresAt: Date.now() + validated.expiresIn * 1000,
    });

    return validated;
  }

  /**
   * Logout and invalidate session
   */
  public logout(contextKey = 'default'): void {
    authManager.clearTokens(contextKey);
  }
}

export const authService = new AuthService();
