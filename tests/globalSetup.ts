import { startMockServer, stopMockServer } from './mock-server/server';
import { config } from '../src/config/env.config';

export async function setup() {
  if (config.BASE_URL.includes('localhost') || config.BASE_URL.includes('127.0.0.1')) {
    const url = new URL(config.BASE_URL);
    const port = parseInt(url.port || '3000', 10);
    await startMockServer(port);
  }
}

export async function teardown() {
  await stopMockServer();
}
