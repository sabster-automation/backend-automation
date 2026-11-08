# Production Backend & Automation Test Framework

A production-grade backend, API, message queue, and browser automation test framework built with **TypeScript**, **Vitest**, **Playwright**, **RabbitMQ (amqplib)**, **Axios**, **Zod**, and **Playwright PDF Reporting**.

---

## 🏗 Architecture Overview

```


backend-automation/
├── .agents/skills/playwright-cli/ # Antigravity agent browser automation skill
├── .claude/skills/playwright-cli/ # Claude Code agent browser automation skill
├── src/
│   ├── config/
│   │   └── env.config.ts          # Zod-validated environment config (.env)
│   ├── core/
│   │   ├── http/
│   │   │   ├── ApiClient.ts       # Axios wrapper with retries, interceptors & typed responses
│   │   │   └── AuthManager.ts     # Session & token lifecycle management
│   │   ├── mq/
│   │   │   └── RabbitMQClient.ts  # AMQP client with exchanges, queues & hermetic mock fallback
│   │   └── utils/
│   │       ├── dataGenerator.ts    # Realistic domain test data generation with Faker
│   │       ├── logger.ts           # Winston structured logger
│   │       └── schemaValidator.ts  # Zod contract validation & runtime assertions
│   ├── pages/                     # Playwright Page Object Models
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   └── DashboardPage.ts
│   ├── schemas/                   # Strongly-typed Zod schemas & TypeScript types
│   │   ├── auth.schema.ts
│   │   ├── user.schema.ts
│   │   ├── order.schema.ts
│   │   └── event.schema.ts
│   ├── services/                  # API service abstraction layer
│   │   ├── AuthService.ts
│   │   ├── UserService.ts
│   │   └── OrderService.ts
│   └── index.ts                   # Unified public export entrypoint
├── tests/
│   ├── api/                       # Vitest API test suites
│   │   ├── auth.test.ts           # Authentication & token refresh tests
│   │   ├── users.test.ts          # User CRUD & pagination tests
│   │   ├── orders.test.ts         # Order lifecycle & calculation tests
│   │   └── resilience.test.ts     # Retry & transient failure recovery tests
│   ├── rabbitmq/                  # Vitest event-driven messaging tests
│   │   └── orderEvents.test.ts    # Exchange publication & queue consumption assertions
│   ├── e2e/                       # Playwright browser end-to-end test suites
│   │   ├── auth.spec.ts           # Login UI, validation & authentication redirects
│   │   └── dashboard.spec.ts      # Dashboard metrics, tables & logout flow
│   ├── mock-server/
│   │   └── server.ts              # High-performance mock API and web server
│   ├── globalSetup.ts             # Vitest global server lifecycle setup
│   └── setup.ts                   # Per-run test harness & auth cleanup
├── scripts/
│   ├── k6/
│   │   └── load-test.js           # k6 load testing scenario (VUs, stages, thresholds)
│   ├── run-k6.ts                  # Dual-mode performance runner (k6 CLI + fallback engine)
│   └── generate-pdf-report.ts     # JUnit XML parser to HTML & Headless Chromium PDF report
├── reports/                       # Generated test execution artifacts
│   ├── backend-test-report.html   # Interactive test dashboard
│   ├── backend-test-report.pdf    # Executive PDF summary report
│   ├── junit-report.xml           # Vitest JUnit XML output
│   └── playwright-junit.xml       # Playwright JUnit XML output
├── playwright.config.ts           # Playwright test runner configuration
├── vitest.config.ts               # Vitest test runner configuration
├── .gitattributes                 # GitHub Linguist language overrides
└── tsconfig.json                  # TypeScript project configuration
```



---

## ⚡ Quick Start

Follow these steps to set up and run the framework on a freshly cloned machine:

### 1. Prerequisites
- **Node.js**: `v18+` (or `v20+` recommended)
- **npm**: `v9+`

### 2. Clone & Install Dependencies
```

bash
git clone <repository-url>
cd backend-automation
npm install
```



### 3. Install Playwright Browsers (for E2E & PDF Reports)
```

bash
npx playwright install chromium
```



### 4. Configure Environment Variables
Copy `.env.example` to `.env` (the defaults work out of the box for hermetic local testing):
```

bash
# On Linux/macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```



> **Note on Hermetic Execution**: External dependencies like RabbitMQ or a remote backend are optional.
> - When running against `localhost` / `127.0.0.1`, Vitest automatically spins up the internal mock API/web server during `globalSetup`.
> - If an external RabbitMQ instance is not reachable, `RabbitMQClient` automatically falls back to an in-memory AMQP broker simulator.

### 5. Run the Tests
```

bash
# Run API integration test suite
npm run test:api

# Run RabbitMQ event messaging tests
npm run test:rabbitmq

# Run all Vitest suites
npm test

# Run Playwright E2E browser tests
npm run test:e2e

# Run performance / load tests
npm run test:perf
```



### 6. Generate Reports
```

bash
# Generate HTML and executive PDF report (from JUnit XML)
npm run report:pdf

# Generate and view Allure reports
npm run report:allure
```



---

## 🚀 Key Framework Capabilities

### 1. Robust HTTP Client (`ApiClient`)
- Automatic exponential backoff retries on HTTP 5xx, 429, and transient network errors.
- Centralized bearer token / API key injection managed by `AuthManager`.
- Request duration metrics tracking and custom `ApiError` exceptions with full request/response debugging metadata.

### 2. Event-Driven Messaging (`RabbitMQClient`)
- AMQP connection management with exchange assertions (direct, topic, fanout) and queue bindings.
- Promise-based `waitForMessage<T>()` utility to test async event receipt without busy polling.
- Built-in **In-Memory AMQP Broker Simulator** allowing tests to run 100% hermetically in CI or local environments without requiring an active external RabbitMQ broker.

### 3. Contract & Runtime Schema Validation
- Strongly typed schema assertions using **Zod** (`assertSchema`, `validateSchema`).
- Validates request payloads and response bodies with descriptive diff errors on mismatch.

### 4. Page Object Model (POM) E2E Testing
- UI abstractions via Playwright (`BasePage`, `LoginPage`, `DashboardPage`).
- Auto-starts the local mock server and executes parallel browser verification.

### 5. Interactive Browser Automation (`playwright-cli`)
- Integrated agent skill (`.agents/skills/playwright-cli`) enabling CLI-driven browser automation.
- Session isolation using `-s=<session>` (e.g. `playwright-cli -s=todo-app open <URL>`).
- Accessibility snapshot inspection (`playwright-cli snapshot`) and ref-based element interactions (`e1`, `e2`).

### 6. Dual-Mode Performance Benchmark (`run-k6.ts`)
- Automatically detects if `k6` is installed and executes the scenario in `scripts/k6/load-test.js`.
- Seamlessly falls back to an internal concurrent load simulator reporting P50, P95, P99 latency percentiles, error rates, and RPS throughput.

### 7. Executive PDF & HTML Reporting
- Ingests test outputs from `reports/junit-report.xml`.
- Renders an interactive executive HTML dashboard and compiles it into an A4 PDF report (`reports/backend-test-report.pdf`) using Playwright's headless browser.

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

---

## 🌐 Browser Automation CLI (`playwright-cli`)

For ad-hoc or agent-driven browser workflows:

```

bash
# Open an isolated session
playwright-cli -s=todo-app open https://demo.playwright.dev/todomvc

# Interact using snapshot refs
playwright-cli -s=todo-app fill e8 "Buy milk" --submit
playwright-cli -s=todo-app snapshot

# Capture a screenshot
playwright-cli -s=todo-app screenshot --filename=reports/todomvc-verified.png

# Close session
playwright-cli -s=todo-app close
```


