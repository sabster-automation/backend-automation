import { config } from '../../config/env.config';
import { logger } from '../utils/logger';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export class AuthManager {
  private static instance: AuthManager;
  private tokenCache: Map<string, AuthTokens> = new Map();

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Store authentication tokens for a specific user or context
   */
  public setTokens(contextKey: string, tokens: AuthTokens): void {
    this.tokenCache.set(contextKey, tokens);
    logger.debug(`Cached tokens for context: ${contextKey}`);
  }

  /**
   * Retrieve cached tokens
   */
  public getTokens(contextKey: string = 'default'): AuthTokens | undefined {
    return this.tokenCache.get(contextKey);
  }

  /**
   * Check if token is present and not expired
   */
  public hasValidToken(contextKey: string = 'default'): boolean {
    const tokens = this.getTokens(contextKey);
    if (!tokens || !tokens.accessToken) return false;
    if (tokens.expiresAt && Date.now() >= tokens.expiresAt) {
      logger.warn(`Token expired for context: ${contextKey}`);
      return false;
    }
    return true;
  }

  /**
   * Clear tokens
   */
  public clearTokens(contextKey?: string): void {
    if (contextKey) {
      this.tokenCache.delete(contextKey);
    } else {
      this.tokenCache.clear();
    }
  }

  /**
   * Generate default auth headers based on available config and session
   */
  public getHeaders(contextKey: string = 'default'): Record<string, string> {
    const headers: Record<string, string> = {
      'x-api-key': config.API_KEY,
    };

    const tokens = this.getTokens(contextKey);
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    return headers;
  }
}

export const authManager = AuthManager.getInstance();
