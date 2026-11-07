import { beforeAll, afterAll, beforeEach } from 'vitest';
import { defaultRabbitMQClient } from '../src/core/mq/RabbitMQClient';
import { authManager } from '../src/core/http/AuthManager';

beforeAll(async () => {
  // Connect RabbitMQ client (graceful fallback if broker not active)
  await defaultRabbitMQClient.connect();
});

beforeEach(() => {
  authManager.clearTokens();
});

afterAll(async () => {
  await defaultRabbitMQClient.disconnect();
});
