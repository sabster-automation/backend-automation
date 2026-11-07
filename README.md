# Production Backend Test Automation Framework

A production-grade backend, API, and message queue test automation framework built with **TypeScript**, **Playwright**, **Vitest**, **RabbitMQ (amqplib)**, **Axios**, **Zod**, and **Playwright PDF Reporting**.

---

## 🏗 Architecture Overview

```
backend-automation/
├── src/
│   ├── config/
│   │   └── env.config.ts        # Zod-validated environment config (.env)
│   ├── core/
│   │   ├── http/
│   │   │   ├── ApiClient.ts     # Axios wrapper with retries, interceptors & typed responses
│   │   │   └── AuthManager.ts   # Session & token lifecycle management
│   │   ├── mq/
│   │   │   └── RabbitMQClient.ts# AMQP client with exchanges, queues & hermetic mock fallback
│   │   └── utils/
│   │       ├── dataGenerator.ts  # Realistic domain test data generation with Faker
│   │       ├── logger.ts         # Winston structured logger
│   │       └── schemaValidator.ts# Zod contract validation & runtime assertions
│   ├── pages/                   # Playwright Page Object Models
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   └── DashboardPage.ts
│   ├── schemas/                 # Strongly-typed Zod schemas & TypeScript types
│   │   ├── auth.schema.ts
│   │   ├── user.schema.ts
│   │   ├── order.schema.ts
│   │   └── event.schema.ts
│   ├── services/                # API service abstraction layer
│   │   ├── AuthService.ts
│   │   ├── UserService.ts
│   │   └── OrderService.ts
│   └── index.ts                 # Unified public export entrypoint
├── tests/
│   ├── api/                     # Vitest API test suites
│   │   ├── auth.test.ts         # Authentication & token refresh tests
│   │   ├── users.test.ts        # User CRUD & pagination tests
│   │   ├── orders.test.ts       # Order lifecycle & calculation tests
│   │   └── resilience.test.ts   # Retry & transient failure recovery tests
│   ├── rabbitmq/                # Vitest event-driven messaging tests
│   │   └── orderEvents.test.ts  # Exchange publication & queue consumption assertions
│   ├── e2e/                     # Playwright browser end-to-end test suites
│   │   ├── auth.spec.ts         # Login UI, validation & authentication redirects
│   │   └── dashboard.spec.ts    # Dashboard metrics, tables & logout flow
│   ├── mock-server/
│   │   └── server.ts            # High-performance mock API and web server
│   ├── globalSetup.ts           # Vitest global server lifecycle setup
│   └── setup.ts                 # Per-run test harness & auth cleanup
├── scripts/
│   ├── k6/
│   │   └── load-test.js         # k6 load testing scenario (VUs, stages, thresholds)
│   ├── run-k6.ts                # Dual-mode performance runner (k6 CLI + fallback engine)
│   └── generate-pdf-report.ts   # JUnit XML parser to HTML & Headless Chromium PDF report
├── playwright.config.ts         # Playwright test runner configuration
├── vitest.config.ts             # Vitest test runner configuration
└── tsconfig.json                # TypeScript project configuration
```

---

## 🚀 Key Features

1. **Robust HTTP Client (`ApiClient`)**:
   - Automated exponential backoff retry on HTTP 5xx, 429, and transient network errors.
   - Dynamic authorization header injection via `AuthManager`.
   - Request and response duration timing tracking.
   - Standardized `ApiResponse<T>` and custom `ApiError` with debug metadata.

2. **Event-Driven Messaging (`RabbitMQClient`)**:
   - Connection management, exchange assertions, queue bindings, and JSON message routing.
   - Async `waitForMessage<T>` helper to test event consumers without polling loops.
   - Built-in In-Memory AMQP Broker Simulator to run tests hermetically without requiring external Docker/RabbitMQ instances.

3. **Domain Contracts & Schema Validation**:
   - Runtime request and response verification with **Zod** (`assertSchema`, `validateSchema`).
   - Strong TypeScript inference for zero runtime type mismatches.

4. **Page Object Model (POM) E2E Testing**:
   - Clean UI abstraction using **Playwright** (`LoginPage`, `DashboardPage`).
   - Auto-starts the mock web server and runs parallel browser checks.

5. **Dual-Mode Performance Benchmark (`run-k6.ts`)**:
   - Automatically detects if `k6` is installed and runs the load test scenario.
   - Seamlessly falls back to an internal concurrent load simulator reporting P50, P95, P99 latency percentiles, error rates, and RPS throughput.

6. **Executive PDF & HTML Reporting**:
   - Parses JUnit XML test execution outputs.
   - Uses Playwright's headless browser to generate an A4 PDF executive test summary (`reports/backend-test-report.pdf`) and an interactive HTML report.

---

## 🛠 Available Scripts

| Command | Description |
|---|---|
| `npm run build` | Validates TypeScript compilation (`tsc --noEmit`) |
| `npm test` | Runs all API and RabbitMQ Vitest test suites |
| `npm run test:api` | Runs API test suites only |
| `npm run test:rabbitmq` | Runs RabbitMQ event-driven test suites only |
| `npm run test:e2e` | Runs Playwright browser end-to-end tests |
| `npm run test:perf` | Runs API performance benchmark & latency percentiles |
| `npm run report:pdf` | Generates HTML and executive PDF report (`reports/`) |
| `npm run mock:server` | Starts standalone mock API and web server |
