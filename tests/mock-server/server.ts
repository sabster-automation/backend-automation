import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'editor';
  department: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MockOrder {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; name?: string; quantity: number; unitPrice: number }>;
  currency: string;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  shippingAddress: string;
  createdAt: string;
  updatedAt?: string;
}

// In-Memory state
const users: MockUser[] = [
  {
    id: 'user-001',
    name: 'Admin User',
    email: 'admin@company.com',
    role: 'admin',
    department: 'Engineering',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-002',
    name: 'Sarah Connor',
    email: 'sarah.connor@company.com',
    role: 'editor',
    department: 'Operations',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const orders: MockOrder[] = [
  {
    orderId: 'ord-1001',
    userId: 'user-001',
    items: [{ productId: 'PROD-A', name: 'Premium Widget', quantity: 2, unitPrice: 49.99 }],
    currency: 'USD',
    totalAmount: 99.98,
    status: 'CONFIRMED',
    shippingAddress: '123 Market St, San Francisco, CA',
    createdAt: new Date().toISOString(),
  },
];

let flakyAttempts = 0;
let serverInstance: http.Server | null = null;

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function sendHtml(res: ServerResponse, status: number, html: string) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = parsedUrl.pathname;
    const method = (req.method || 'GET').toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      });
      return res.end();
    }

    // Health check
    if (path === '/api/v1/health') {
      return sendJson(res, 200, { status: 'healthy', timestamp: new Date().toISOString() });
    }

    // Flaky endpoint for testing retry resiliency
    if (path === '/api/v1/flaky') {
      flakyAttempts++;
      if (flakyAttempts % 3 !== 0) {
        return sendJson(res, 503, { error: 'Service Unavailable (simulated transient failure)' });
      }
      return sendJson(res, 200, { message: 'Success after retry recovery', attempts: flakyAttempts });
    }

    // AUTH: Login
    if (path === '/api/v1/auth/login' && method === 'POST') {
      const body = await parseJsonBody(req).catch(() => null);
      if (!body || !body.username || !body.password) {
        return sendJson(res, 400, { error: 'Username and password are required' });
      }
      if (body.password === 'wrongpassword') {
        return sendJson(res, 401, { error: 'Invalid credentials' });
      }
      return sendJson(res, 200, {
        accessToken: `jwt-access-token-${Date.now()}`,
        refreshToken: `jwt-refresh-token-${Date.now()}`,
        expiresIn: 3600,
        user: {
          id: 'user-001',
          username: body.username,
          email: `${body.username}@test.com`,
          role: 'admin',
        },
      });
    }

    // AUTH: Refresh
    if (path === '/api/v1/auth/refresh' && method === 'POST') {
      const body = await parseJsonBody(req).catch(() => null);
      if (!body || !body.refreshToken) {
        return sendJson(res, 400, { error: 'Refresh token is required' });
      }
      return sendJson(res, 200, {
        accessToken: `jwt-refreshed-token-${Date.now()}`,
        expiresIn: 3600,
      });
    }

    // USERS: List & Create
    if (path === '/api/v1/users') {
      if (method === 'GET') {
        const page = parseInt(parsedUrl.searchParams.get('page') || '1', 10);
        const limit = parseInt(parsedUrl.searchParams.get('limit') || '10', 10);
        const search = parsedUrl.searchParams.get('search')?.toLowerCase() || '';

        let filtered = users;
        if (search) {
          filtered = filtered.filter(
            (u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
          );
        }

        const start = (page - 1) * limit;
        const pagedData = filtered.slice(start, start + limit);

        return sendJson(res, 200, {
          total: filtered.length,
          page,
          limit,
          data: pagedData,
        });
      }

      if (method === 'POST') {
        const body = await parseJsonBody(req).catch(() => null);
        if (!body || !body.name || !body.email || !body.role) {
          return sendJson(res, 400, { error: 'Name, email, and role are required' });
        }
        if (!body.email.includes('@')) {
          return sendJson(res, 400, { error: 'Invalid email address format' });
        }
        const newUser: MockUser = {
          id: `user-${Date.now()}`,
          name: body.name,
          email: body.email,
          role: body.role,
          department: body.department || 'General',
          isActive: body.isActive ?? true,
          createdAt: new Date().toISOString(),
        };
        users.push(newUser);
        return sendJson(res, 201, newUser);
      }
    }

    // USERS: Individual user operations /api/v1/users/:id
    const userMatch = path.match(/^\/api\/v1\/users\/([^/]+)$/);
    if (userMatch) {
      const userId = userMatch[1];
      const index = users.findIndex((u) => u.id === userId);

      if (method === 'GET') {
        if (index === -1) return sendJson(res, 404, { error: 'User not found' });
        return sendJson(res, 200, users[index]);
      }

      if (method === 'PUT') {
        if (index === -1) return sendJson(res, 404, { error: 'User not found' });
        const body = await parseJsonBody(req).catch(() => null);
        users[index] = {
          ...users[index],
          ...body,
          updatedAt: new Date().toISOString(),
        };
        return sendJson(res, 200, users[index]);
      }

      if (method === 'DELETE') {
        if (index === -1) return sendJson(res, 404, { error: 'User not found' });
        users.splice(index, 1);
        res.writeHead(204);
        return res.end();
      }
    }

    // ORDERS: List & Create
    if (path === '/api/v1/orders') {
      if (method === 'GET') {
        return sendJson(res, 200, {
          total: orders.length,
          data: orders,
        });
      }

      if (method === 'POST') {
        const body = await parseJsonBody(req).catch(() => null);
        if (!body || !body.userId || !Array.isArray(body.items) || body.items.length === 0) {
          return sendJson(res, 400, { error: 'userId and non-empty items array are required' });
        }

        const totalAmount = body.items.reduce(
          (sum: number, it: any) => sum + (it.quantity || 1) * (it.unitPrice || 0),
          0
        );

        const newOrder: MockOrder = {
          orderId: `ord-${Date.now()}`,
          userId: body.userId,
          items: body.items,
          currency: body.currency || 'USD',
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          status: 'PENDING',
          shippingAddress: body.shippingAddress || 'Default Address',
          createdAt: new Date().toISOString(),
        };
        orders.push(newOrder);
        return sendJson(res, 201, newOrder);
      }
    }

    // ORDERS: Individual /api/v1/orders/:id
    const orderMatch = path.match(/^\/api\/v1\/orders\/([^/]+)$/);
    if (orderMatch) {
      const orderId = orderMatch[1];
      const index = orders.findIndex((o) => o.orderId === orderId);

      if (method === 'GET') {
        if (index === -1) return sendJson(res, 404, { error: 'Order not found' });
        return sendJson(res, 200, orders[index]);
      }

      if (method === 'PATCH') {
        if (index === -1) return sendJson(res, 404, { error: 'Order not found' });
        const body = await parseJsonBody(req).catch(() => null);
        orders[index] = {
          ...orders[index],
          ...body,
          updatedAt: new Date().toISOString(),
        };
        return sendJson(res, 200, orders[index]);
      }

      if (method === 'DELETE') {
        if (index === -1) return sendJson(res, 404, { error: 'Order not found' });
        orders.splice(index, 1);
        res.writeHead(204);
        return res.end();
      }
    }

    // WEB PAGES for Playwright E2E UI Tests
    if (path === '/' || path === '/login') {
      const loginHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Automation Portal - Sign In</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { background: white; padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 340px; }
          h2 { margin-top: 0; color: #1e293b; text-align: center; }
          .field { margin-bottom: 16px; }
          label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; }
          input { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; }
          button { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; }
          button:hover { background: #1d4ed8; }
          .error { color: #dc2626; font-size: 13px; margin-top: 10px; display: none; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Enterprise Portal</h2>
          <form id="login-form">
            <div class="field">
              <label for="username">Username</label>
              <input id="username" name="username" type="text" required placeholder="admin" />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>
            <button id="submit-btn" type="submit">Sign In</button>
            <div id="error-msg" class="error"></div>
          </form>
        </div>
        <script>
          document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            const err = document.getElementById('error-msg');
            err.style.display = 'none';

            if (p === 'wrongpassword') {
              err.textContent = 'Invalid credentials. Please try again.';
              err.style.display = 'block';
              return;
            }
            localStorage.setItem('auth_token', 'mock_e2e_token');
            localStorage.setItem('user_name', u);
            window.location.href = '/dashboard';
          });
        </script>
      </body>
      </html>
      `;
      return sendHtml(res, 200, loginHtml);
    }

    if (path === '/dashboard') {
      const dashboardHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Dashboard - Automation Platform</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 24px; }
          header { display: flex; justify-content: space-between; align-items: center; background: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
          .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .card h3 { margin: 0 0 8px 0; font-size: 14px; color: #64748b; }
          .card .value { font-size: 28px; font-weight: bold; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          th { background: #f1f5f9; font-weight: 600; color: #475569; }
          #logout-btn { background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        </style>
      </head>
      <body>
        <header>
          <h1 id="welcome-msg" style="font-size: 20px; margin: 0;">Welcome to Operations Dashboard</h1>
          <button id="logout-btn" onclick="localStorage.clear(); window.location.href='/login'">Logout</button>
        </header>
        <div class="metrics">
          <div class="card">
            <h3>TOTAL USERS</h3>
            <div id="metric-users" class="value">${users.length}</div>
          </div>
          <div class="card">
            <h3>ACTIVE ORDERS</h3>
            <div id="metric-orders" class="value">${orders.length}</div>
          </div>
          <div class="card">
            <h3>SYSTEM STATUS</h3>
            <div id="metric-status" class="value" style="color: #10b981;">Operational</div>
          </div>
        </div>
        <table id="users-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th></tr>
          </thead>
          <tbody>
            ${users.map((u) => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td>${u.department}</td></tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
      `;
      return sendHtml(res, 200, dashboardHtml);
    }

    sendJson(res, 404, { error: `Route not found: ${method} ${path}` });
  });
}

export function startMockServer(port = 3000): Promise<http.Server> {
  return new Promise((resolve) => {
    if (serverInstance) {
      return resolve(serverInstance);
    }
    const server = createServer();
    server.listen(port, '127.0.0.1', () => {
      serverInstance = server;
      console.log(`🚀 Mock API and Web Server running at http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

export function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(() => {
        serverInstance = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Standalone execution
if (require.main === module) {
  startMockServer(3000);
}
