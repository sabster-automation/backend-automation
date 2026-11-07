import { spawn } from 'child_process';
import axios from 'axios';
import path from 'path';
import { startMockServer, stopMockServer } from '../tests/mock-server/server';
import { config } from '../src/config/env.config';

interface BenchmarkMetric {
  endpoint: string;
  durations: number[];
  errors: number;
}

function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runNativeBenchmark(baseUrl: string) {
  console.log(`\n⚡ Running Built-in Concurrent Load Generator against ${baseUrl}...`);
  console.log('   Simulation: 10 Virtual Users, 5 Seconds duration');

  const client = axios.create({ baseURL: baseUrl, timeout: 5000 });
  const metrics: Record<string, BenchmarkMetric> = {
    '/api/v1/health': { endpoint: '/api/v1/health', durations: [], errors: 0 },
    '/api/v1/users': { endpoint: '/api/v1/users', durations: [], errors: 0 },
    '/api/v1/auth/login': { endpoint: '/api/v1/auth/login', durations: [], errors: 0 },
  };

  const startTime = Date.now();
  const testDurationMs = 5000;
  let totalRequests = 0;

  async function worker() {
    while (Date.now() - startTime < testDurationMs) {
      // 1. Health
      try {
        const t0 = Date.now();
        await client.get('/api/v1/health');
        metrics['/api/v1/health'].durations.push(Date.now() - t0);
      } catch {
        metrics['/api/v1/health'].errors++;
      }
      totalRequests++;

      // 2. Users
      try {
        const t0 = Date.now();
        await client.get('/api/v1/users?page=1&limit=5');
        metrics['/api/v1/users'].durations.push(Date.now() - t0);
      } catch {
        metrics['/api/v1/users'].errors++;
      }
      totalRequests++;

      // 3. Login
      try {
        const t0 = Date.now();
        await client.post('/api/v1/auth/login', { username: 'admin', password: 'password123' });
        metrics['/api/v1/auth/login'].durations.push(Date.now() - t0);
      } catch {
        metrics['/api/v1/auth/login'].errors++;
      }
      totalRequests++;

      await new Promise((r) => setTimeout(r, 50));
    }
  }

  // Run 10 parallel VU workers
  const workers = Array.from({ length: 10 }, () => worker());
  await Promise.all(workers);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const overallRps = (totalRequests / totalTimeSec).toFixed(1);

  console.log('\n================ Performance Benchmark Results ================');
  console.log(`Total Requests: ${totalRequests} | Total Duration: ${totalTimeSec.toFixed(2)}s | Throughput: ${overallRps} req/s\n`);

  const summary = Object.values(metrics).map((m) => {
    const sorted = [...m.durations].sort((a, b) => a - b);
    const count = sorted.length;
    const avg = count ? (sorted.reduce((a, b) => a + b, 0) / count).toFixed(1) : '0';
    return {
      Endpoint: m.endpoint,
      Requests: count + m.errors,
      Success: count,
      Errors: m.errors,
      'Avg (ms)': avg,
      'P50 (ms)': calculatePercentile(sorted, 50),
      'P95 (ms)': calculatePercentile(sorted, 95),
      'P99 (ms)': calculatePercentile(sorted, 99),
    };
  });

  console.table(summary);
  console.log('================================================================\n');
}

async function main() {
  const isLocal = config.BASE_URL.includes('localhost') || config.BASE_URL.includes('127.0.0.1');
  let startedMock = false;

  if (isLocal) {
    try {
      await axios.get(`${config.BASE_URL}/api/v1/health`, { timeout: 1000 });
    } catch {
      console.log('Mock server not detected. Starting local mock server...');
      await startMockServer(3000);
      startedMock = true;
    }
  }

  const scriptPath = path.resolve(__dirname, 'k6/load-test.js');

  // Check if k6 CLI is available
  const k6Process = spawn('k6', ['run', scriptPath, '-e', `BASE_URL=${config.BASE_URL}`], {
    stdio: 'inherit',
    shell: true,
  });

  k6Process.on('error', async () => {
    console.log('k6 binary not found in PATH. Falling back to built-in concurrent load tester...');
    await runNativeBenchmark(config.BASE_URL);
    if (startedMock) await stopMockServer();
  });

  k6Process.on('exit', async (code) => {
    if (code !== 0 && code !== null) {
      console.log('k6 execution exited. Running built-in concurrent load tester...');
      await runNativeBenchmark(config.BASE_URL);
    }
    if (startedMock) await stopMockServer();
  });
}

main().catch((err) => {
  console.error('Fatal error running performance test:', err);
  process.exit(1);
});
