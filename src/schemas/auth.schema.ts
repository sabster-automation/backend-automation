import { z } from 'zod';

export const LoginRequestSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string().min(10),
  refreshToken: z.string().min(10),
  expiresIn: z.number().positive(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    role: z.enum(['admin', 'user', 'editor']),
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string().min(10),
  expiresIn: z.number().positive(),
});
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
