import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../../src/services/AuthService';
import { authManager } from '../../src/core/http/AuthManager';
import { ApiError } from '../../src/core/http/ApiClient';

describe('Auth Service & Endpoints', () => {
  beforeEach(() => {
    authManager.clearTokens();
  });

  it('should authenticate user and store access token', async () => {
    const response = await authService.login({
      username: 'admin',
      password: 'password123',
    });

    expect(response.accessToken).toBeDefined();
    expect(response.refreshToken).toBeDefined();
    expect(response.user.username).toBe('admin');
    expect(response.user.role).toBe('admin');
    expect(authManager.hasValidToken()).toBe(true);
  });

  it('should reject invalid credentials with 401 Unauthorized', async () => {
    await expect(
      authService.login({
        username: 'admin',
        password: 'wrongpassword',
      })
    ).rejects.toThrowError(ApiError);

    try {
      await authService.login({
        username: 'admin',
        password: 'wrongpassword',
      });
    } catch (err: any) {
      expect(err.status).toBe(401);
      expect(err.data).toEqual({ error: 'Invalid credentials' });
    }
  });

  it('should reject login with empty or missing fields', async () => {
    try {
      await authService.login({
        username: '',
        password: '',
      });
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
    }
  });

  it('should refresh access token using valid refresh token', async () => {
    const loginRes = await authService.login({
      username: 'admin',
      password: 'password123',
    });

    const refreshRes = await authService.refreshToken(loginRes.refreshToken);
    expect(refreshRes.accessToken).toBeDefined();
    expect(refreshRes.accessToken).not.toBe(loginRes.accessToken);
    expect(refreshRes.expiresIn).toBe(3600);
  });

  it('should clear stored session on logout', async () => {
    await authService.login({
      username: 'admin',
      password: 'password123',
    });
    expect(authManager.hasValidToken()).toBe(true);

    authService.logout();
    expect(authManager.hasValidToken()).toBe(false);
  });
});
