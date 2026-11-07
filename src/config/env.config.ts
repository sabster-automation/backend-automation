import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

const envName = process.env.ENV || 'local';
const envFile = envName === 'local' ? '.env' : `.env.${envName}`;

// Load dotenv with override: true so .env takes precedence over Vite's internal defaults
dotenv.config({ path: path.resolve(process.cwd(), envFile), override: true });

// Vitest defaults process.env.BASE_URL to '/' if not explicitly overridden by user
const resolvedBaseUrl =
  process.env.BASE_URL && process.env.BASE_URL !== '/'
    ? process.env.BASE_URL
    : 'http://127.0.0.1:3000';

const EnvSchema = z.object({
  ENV: z.enum(['local', 'development', 'staging', 'production']).default('local'),
  BASE_URL: z.string().url().default('http://127.0.0.1:3000'),
  WEB_BASE_URL: z.string().url().default('http://127.0.0.1:3000'),
  API_KEY: z.string().default('test-api-key-12345'),
  RABBITMQ_URL: z.string().default('amqp://guest:guest@localhost:5672'),
  TIMEOUT_MS: z.coerce.number().default(15000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
});

const parsed = EnvSchema.safeParse({
  ...process.env,
  BASE_URL: resolvedBaseUrl,
});

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const config = parsed.data;
export type Config = z.infer<typeof EnvSchema>;
