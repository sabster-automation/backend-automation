import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 10 },   // Ramp-up to 10 VUs
    { duration: '10s', target: 20 },  // Steady load 20 VUs
    { duration: '5s', target: 0 },    // Ramp-down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests must finish within 500ms
    http_req_failed: ['rate<0.01'],                  // http errors should be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': 'test-api-key-12345',
  };

  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/api/v1/health`, { headers });
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  // 2. Fetch users
  const usersRes = http.get(`${BASE_URL}/api/v1/users?page=1&limit=5`, { headers });
  check(usersRes, {
    'users status is 200': (r) => r.status === 200,
    'users list has items': (r) => JSON.parse(r.body).data.length > 0,
  });

  // 3. User login
  const loginPayload = JSON.stringify({
    username: 'admin',
    password: 'password123',
  });
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, { headers });
  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login returns access token': (r) => JSON.parse(r.body).accessToken !== undefined,
  });

  sleep(0.5);
}
