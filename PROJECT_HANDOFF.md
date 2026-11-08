# Project Handoff Documentation: Backend & Automation Test Framework

> **Generated:** November 8, 2026  
> **Author & Maintainer:** Sebastian Cichon (<sebastian@crescendoengineering.com> / <scichon@tracker.co.za>)  
> **Repository:** [`https://github.com/sabster-automation/backend-automation.git`](https://github.com/sabster-automation/backend-automation.git)  
> **Environment:** Node.js v20+ / v24+ • TypeScript 5.7+ • Windows 11 / Cross-Platform  
> **Originating Conversations:**  
> - `Backend API Test Automation Framework` (`c1d3847a-b57c-4717-a386-a2960efea680`)  
> - `Backend Test Framework Development` (`d562d1a8-73c8-470b-b8b6-2cf9c4eddcb4`)

---

## 1. Project Goal & Genesis

The objective of this repository is to establish a **production-grade, multi-layer backend and end-to-end test automation framework** engineered from scratch in **TypeScript**.

The project originated from an architectural planning session (`/plan`) focused on backend API testing, and was progressively expanded through iterative user feedback to cover:
1. **REST / HTTP API Contract Testing:** Rigorous contract assertions via Zod schemas, automated authentication lifecycle handling (Bearer/API Keys), and an Axios HTTP client with exponential retry backoff and jitter.
2. **Event-Driven Message Queue Validation:** Asynchronous message queue verification for RabbitMQ (`amqplib`), featuring exchanges, routing keys, consumer promises (`waitForMessage`), and a zero-dependency **In-Memory AMQP Broker Simulator** for hermetic local and CI execution.
3. **Web Automation (E2E & CLI):** Native browser testing via `@playwright/test` using the Page Object Model (POM), plus interactive agent-driven browser automation powered by custom `playwright-cli` agent skills (`.agents/skills/playwright-cli/` and `.claude/skills/playwright-cli/`).
4. **Performance & Load Benchmarking:** Dual-mode performance testing using **k6** scenarios with virtual user (VU) ramping profiles and SLA thresholds (P95/P99 latency), seamlessly paired with a built-in concurrent Axios load generator fallback when the `k6` binary is absent.
5. **Executive Test Reporting:** Automated ingestion of JUnit XML test results to compile both an interactive HTML dashboard and an A4 executive PDF report rendered via Playwright's headless Chromium engine (`npm run report:pdf`).
6. **Self-Contained Mock Test Harness:** A zero-dependency native Node.js HTTP mock server (`tests/mock-server/server.ts`) delivering auth endpoints, users CRUD, orders management, transient 503 failure simulations, and HTML portal pages for end-to-end browser execution out of the box.

---

## 2. Architectural Decisions & Repository Layout

```
backend-automation/
├── .agents/skills/playwright-cli/ # Antigravity agent browser automation skill
│   ├── SKILL.md                   # Agent skill manifest & CLI instructions
│   └── references/                # Element attributes, mocking, sessions, tracing
├── .claude/skills/playwright-cli/ # Claude Code agent browser automation skill
├── src/
│   ├── config/
│   │   └── env.config.ts          # Zod-validated environment config (.env)
│   ├── core/
│   │   ├── http/
│   │   │   ├── ApiClient.ts       # Axios wrapper with exponential retry & durationMs
│   │   │   └── AuthManager.ts     # Singleton session & token lifecycle cache
│   │   ├── mq/
│   │   │   └── RabbitMQClient.ts  # AMQP client + In-Memory AMQP Broker Simulator
│   │   └── utils/
│   │       ├── dataGenerator.ts    # Faker-based realistic domain data fixtures
│   │       ├── logger.ts           # Winston structured logging utility
│   │       └── schemaValidator.ts  # Zod schema assertion & error diff formatting
│   ├── pages/                     # Playwright Page Object Models
│   │   ├── BasePage.ts            # Abstract base page with navigation helpers
│   │   ├── LoginPage.ts           # Portal authentication page object
│   │   └── DashboardPage.ts       # Portal operations dashboard page object
│   ├── schemas/                   # Zod contracts & TypeScript inferred types
│   │   ├── auth.schema.ts         # Login & token refresh contracts
│   │   ├── user.schema.ts         # User CRUD & pagination contracts
│   │   ├── order.schema.ts        # Order management contracts
│   │   └── event.schema.ts        # RabbitMQ domain event contracts
│   ├── services/                  # Service Object Model (SOM) abstractions
│   │   ├── AuthService.ts         # Auth API service wrapper
│   │   ├── UserService.ts         # User API service wrapper
│   │   └── OrderService.ts        # Order API service wrapper
│   └── index.ts                   # Centralized public export entrypoint
├── tests/
│   ├── api/                       # Vitest REST API test suites
│   │   ├── auth.test.ts           # Authentication & token refresh tests
│   │   ├── users.test.ts          # User CRUD & schema validation tests
│   │   ├── orders.test.ts         # Order creation & list tests
│   │   └── resilience.test.ts     # Retry backoff & transient recovery tests
│   ├── rabbitmq/                  # Vitest event messaging suites
│   │   └── orderEvents.test.ts    # Order event publishing & subscription tests
│   ├── e2e/                       # Playwright browser end-to-end suites
│   │   ├── auth.spec.ts           # Login form, errors & dashboard redirect
│   │   └── dashboard.spec.ts      # Table population, metrics & logout flow
│   ├── mock-server/
│   │   └── server.ts              # Zero-dependency Node HTTP mock server
│   ├── globalSetup.ts             # Vitest global server lifecycle setup
│   └── setup.ts                   # Per-worker test environment harness
├── scripts/
│   ├── k6/
│   │   └── load-test.js           # k6 scenario with ramping VUs & SLA thresholds
│   │                              # Thresholds: http_req_duration p(95)<200ms, p(99)<400ms, errors<1%
│   ├── run-k6.ts                  # Dual-mode performance benchmark runner (k6 / Axios fallback)
│   └── generate-pdf-report.ts     # JUnit XML to HTML & A4 PDF report compiler
├── reports/                       # Generated test execution artifacts & dashboards
│   ├── backend-test-report.html   # Standalone executive HTML report
│   ├── backend-test-report.pdf    # Executive A4 PDF report rendered via Chromium
│   ├── junit-report.xml           # Vitest API & MQ JUnit test results
│   ├── playwright-html/           # Playwright interactive HTML report
│   ├── playwright-junit.xml       # Playwright E2E JUnit test results
│   └── todomvc-added.png          # Agent playwright-cli verification snapshot
├── .env                           # Local environment configuration
├── .env.example                   # Baseline environment template
├── .gitattributes                 # GitHub Linguist overrides for generated reports
├── .gitignore                     # Git ignore rules for reports, logs & temp files
├── playwright.config.ts           # Playwright Test runner configuration
├── vitest.config.ts               # Vitest runner configuration
└── tsconfig.json                  # TypeScript compiler settings
```

### Key Architectural Decisions:
1. **Runtime Schema Validation via Zod (`src/schemas/`):**  
   Every inbound and outbound API payload is validated at runtime with Zod schemas (`assertSchema`, `validateSchema`). Schema definitions export static TypeScript types (`z.infer<typeof Schema>`) ensuring complete type safety from compile time through runtime execution.
2. **Resilient HTTP Engine (`ApiClient.ts`):**  
   Axios instance wrapped with request/response interceptors:
   - Injects credentials and Bearer tokens dynamically from `AuthManager`.
   - Records granular response latency (`durationMs`).
   - Implements automated retries for transient 5xx server errors, HTTP 429 rate limits, and network connection drops using exponential backoff with randomized jitter.
3. **Hermetic AMQP Broker Simulation (`RabbitMQClient.ts`):**  
   Connects to a real RabbitMQ broker via `amqplib`. If an external broker is not reachable, it automatically transitions to an internal **In-Memory AMQP Broker Simulator** that models exchanges (direct, topic, fanout), queue subscriptions, pattern matching, and promise-based message consumption (`waitForMessage`). This ensures CI pipelines run hermetically without requiring Docker.
4. **Zero-Dependency Mock Server (`tests/mock-server/server.ts`):**  
   Built using Node's standard `http` library. Provides `/api/v1/*` routes with JSON payloads, `/api/v1/flaky` for verifying retry mechanisms, and static HTML views (`/login`, `/dashboard`) for browser tests.
5. **Executive PDF Reporting Engine (`scripts/generate-pdf-report.ts`):**  
   Parses Vitest and Playwright JUnit XML reports, generates a styled executive KPI dashboard, and renders it to a print-ready A4 PDF report using Playwright's existing headless Chromium engine (`page.pdf()`), completely bypassing third-party binary dependencies.
6. **Interactive Browser Automation Skills (`playwright-cli`):**  
   Pre-configured agent skills in `.agents/skills/playwright-cli/` and `.claude/skills/playwright-cli/` allowing AI agents to interactively open browsers, capture accessible DOM snapshots, fill forms, trigger clicks, and record screenshots.

---

## 3. Completed Work & Verification Summary

| Component | Test Runner / Engine | Verification Results | Status |
|---|---|---|---|
| **TypeScript Compilation** | `tsc --noEmit` | Clean build, 0 compilation or type errors | ✅ Complete |
| **REST API Test Suite** | Vitest (`tests/api/`) | **15 passed** across `auth`, `users`, `orders`, and `resilience` | ✅ Complete |
| **RabbitMQ Messaging** | Vitest (`tests/rabbitmq/`) | **2 passed** verifying exchange publishing and consumer receipt | ✅ Complete |
| **Browser E2E Tests** | Playwright (`tests/e2e/`) | **6 passed** in headless Chromium testing login & dashboard | ✅ Complete |
| **Agent CLI Automation** | `playwright-cli` skill | Executed TodoMVC "add todo" flow, snapshot & screenshot generated | ✅ Complete |
| **Performance Benchmark** | `run-k6.ts` | **429.8 req/s throughput**, 2,166 requests executed with 0% error rate | ✅ Complete |
| **Executive PDF Reporting** | `generate-pdf-report.ts` | Generated `reports/backend-test-report.pdf` & HTML dashboard | ✅ Complete |
| **Linguist Classification** | `.gitattributes` | Tagged generated reports to ensure repo displays as **TypeScript** | ✅ Complete |

---

## 4. Relevant File Paths & Symbol Index

### Configuration & Environment
- [`src/config/env.config.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/config/env.config.ts) — Zod-validated environment parser (`config`, `Config`, `EnvSchema`).
- [`.env.example`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/.env.example) — Template with default local ports, API keys, and timeouts.
- [`playwright.config.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/playwright.config.ts) — Playwright test configuration, JUnit/HTML reporters, `webServer`, and `ignoreHTTPSErrors`.
- [`vitest.config.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/vitest.config.ts) — Vitest test runner configuration, path aliases, JUnit output, and `globalSetup`.
- [`tsconfig.json`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/tsconfig.json) — TypeScript compiler settings with path mapping aliases.
- [`.gitattributes`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/.gitattributes) — GitHub Linguist language overrides.

### Core Framework Modules
- [`src/core/http/ApiClient.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/core/http/ApiClient.ts) — Core HTTP client with retry interceptor (`ApiClient`, `ApiResponse`, `ApiError`).
- [`src/core/http/AuthManager.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/core/http/AuthManager.ts) — Central token cache and header provider (`AuthManager`, `authManager`).
- [`src/core/mq/RabbitMQClient.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/core/mq/RabbitMQClient.ts) — AMQP client and in-memory broker simulator (`RabbitMQClient`).
- [`src/core/utils/dataGenerator.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/core/utils/dataGenerator.ts) — Faker-based test data generator (`DataGenerator`).
- [`src/core/utils/logger.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/core/utils/logger.ts) — Winston structured logger instance (`logger`).
- [`src/core/utils/schemaValidator.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/core/utils/schemaValidator.ts) — Schema assertion utilities (`validateSchema`, `assertSchema`).
- [`src/index.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/index.ts) — Centralized framework barrel export.

### Services & Schemas
- [`src/services/AuthService.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/services/AuthService.ts) — Authentication API service abstraction.
- [`src/services/UserService.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/services/UserService.ts) — User CRUD API service abstraction.
- [`src/services/OrderService.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/services/OrderService.ts) — Order API service abstraction.
- [`src/schemas/auth.schema.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/schemas/auth.schema.ts) — Zod auth request/response contracts.
- [`src/schemas/user.schema.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/schemas/user.schema.ts) — Zod user CRUD contracts.
- [`src/schemas/order.schema.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/schemas/order.schema.ts) — Zod order contracts.
- [`src/schemas/event.schema.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/schemas/event.schema.ts) — Zod messaging event contracts.

### Page Object Models & E2E
- [`src/pages/BasePage.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/pages/BasePage.ts) — Base Playwright page object model.
- [`src/pages/LoginPage.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/pages/LoginPage.ts) — Login page object model.
- [`src/pages/DashboardPage.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/src/pages/DashboardPage.ts) — Dashboard page object model.
- [`tests/e2e/auth.spec.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/tests/e2e/auth.spec.ts) — E2E authentication specifications.
- [`tests/e2e/dashboard.spec.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/tests/e2e/dashboard.spec.ts) — E2E dashboard specifications.

### Test Suites & Test Harness
- [`tests/api/auth.test.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/tests/api/auth.test.ts) — Auth API test suite.
- [`tests/api/users.test.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/tests/api/users.test.ts) — User CRUD test suite.
- [`tests/api/orders.test.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/tests/api/orders.test.ts) — Orders API test suite.
- [`tests/api/resilience.test.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/tests/api/resilience.test.ts) — Retry and transient error recovery tests.
- [`tests/rabbitmq/orderEvents.test.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/tests/rabbitmq/orderEvents.test.ts) — RabbitMQ event messaging tests.
- [`tests/mock-server/server.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/tests/mock-server/server.ts) — Native Node.js mock API and web server.
- [`tests/globalSetup.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/tests/globalSetup.ts) — Global server setup/teardown for Vitest.
- [`tests/setup.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/tests/setup.ts) — Per-worker test initialization harness.

### Scripts & Performance
- [`scripts/run-k6.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/scripts/run-k6.ts) — Dual-mode load testing runner script.
- [`scripts/k6/load-test.js`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/scripts/k6/load-test.js) — k6 load testing scenario with SLA thresholds.
- [`scripts/generate-pdf-report.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/scripts/generate-pdf-report.ts) — Executive HTML/PDF report compiler.

---

## 5. Edge Cases & Challenges Solved

### 1. Antigravity Sandbox Workspace Permission Prompts
- **Issue:** In the initial session, the repository was not opened as the active workspace in Antigravity. As a result, Antigravity prompted for confirmation on every single file write operation (`AuthManager.ts`, `UserService.ts`, etc.).
- **Resolution:** Opened `C:\Users\USER-PC\OneDrive\Documents\Repositories\backend-automation` as the trusted active workspace and started a clean session, allowing all subsequent file and command operations to run autonomously.

### 2. Vitest Environment Variable Collision (`BASE_URL = '/'`)
- **Issue:** Vitest automatically defaults `process.env.BASE_URL = '/'`. Standard `dotenv.config()` calls did not overwrite this existing environment variable, causing Zod's `z.string().url()` validator to throw `Invalid url: '/'`.
- **Resolution:** Added `dotenv.config({ override: true })` and normalized `resolvedBaseUrl` in `src/config/env.config.ts` to default to `http://127.0.0.1:3000` whenever `BASE_URL` is `'/'` or unassigned.

### 3. Vitest Worker Port Conflict (`EADDRINUSE: 3000`)
- **Issue:** When running multiple Vitest test files simultaneously, Vitest executed `setupFiles` once per worker thread, causing multiple worker threads to attempt binding to port 3000 at the same time.
- **Resolution:** Moved mock server lifecycle management to `tests/globalSetup.ts` (which executes once in the master process before any workers are spawned) and set `fileParallelism: false` in `vitest.config.ts`.

### 4. Windows IPv6 Resolution Interception (`::1:3000 connect EACCES`)
- **Issue:** On Windows, `localhost` resolves to IPv6 `::1` before `127.0.0.1`. Binding the server without an explicit host string resulted in `connect EACCES ::1:3000` errors.
- **Resolution:** Explicitly configured all server bindings, Axios client base URLs, and Playwright configurations to IPv4 `127.0.0.1`.

### 5. Hermetic Testing Without RabbitMQ / Docker
- **Issue:** In standard local environments and CI agents where Docker or a live RabbitMQ broker is unavailable, AMQP connection attempts would fail and block the test run.
- **Resolution:** Engineered an **In-Memory AMQP Broker Simulator** inside `src/core/mq/RabbitMQClient.ts`. When `amqp.connect()` times out or fails, the client seamlessly switches to in-memory queues, exchanges, and topic routing, achieving 100% test pass rates without external dependencies.

### 6. Seamless Performance Benchmarking Without `k6` Binary
- **Issue:** The local environment did not have `k6` installed in the system PATH, causing `npm run test:perf` to fail with a missing binary error.
- **Resolution:** Implemented an automatic CLI detection check in `scripts/run-k6.ts`. If `k6` is absent, it executes a built-in concurrent Axios load generator measuring throughput and latency percentiles (P50, P95, P99).

### 7. Module Resolution Errors with `ts-node` (`ERR_MODULE_NOT_FOUND`)
- **Issue:** Running `ts-node scripts/run-k6.ts` produced `ERR_MODULE_NOT_FOUND` because Node treated the package as ESM while encountering TypeScript imports without explicit `.js` extensions.
- **Resolution:** Updated `package.json` scripts (`test:perf`, `report:pdf`, `mock:server`) to use `tsx`, which natively handles TypeScript and ESM resolution seamlessly.

### 8. `amqplib` TypeScript Type Definition Mismatch
- **Issue:** During TypeScript compilation (`tsc --noEmit`), `amqplib`'s return type for `amqp.connect()` caused type errors against `Connection` (`Type 'ChannelModel' is missing properties from type 'Connection'`).
- **Resolution:** Updated `RabbitMQClient.ts` to import and type `connection` as `ChannelModel | null`.

### 9. GitHub Linguist Repository Misclassification (Showing as 86.8% HTML)
- **Issue:** The generated Playwright HTML report (`reports/playwright-html/index.html`) is ~525 KB, while total TypeScript source code is ~80 KB. GitHub Linguist classified the repository as predominantly HTML rather than TypeScript.
- **Resolution:** Created [`.gitattributes`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/.gitattributes) marking `reports/**` as `linguist-generated` and `linguist-vendored`, and `*.html` as `linguist-detectable=false`, returning TypeScript to 100% of recognized code.

### 10. Windows CMD Trailing Space in Environment Variables
- **Issue:** Running `set VAR=val && cmd` in Windows CMD includes the whitespace preceding `&&` in the variable value (`"todo-app "`), causing named pipe daemon lookups in `playwright-cli` to fail.
- **Resolution:** Documented proper Windows PowerShell (`$env:PLAYWRIGHT_CLI_SESSION="todo-app"`) and CMD (`set VAR=val&& cmd`) syntaxes, and linked `agy.cmd` / `agy.ps1` global wrappers to the system PATH.

### 11. Corporate TLS Inspection & SSL Proxy Interception
- **Issue:** Corporate network proxies inspecting SSL traffic can fail browser automation tests with TLS validation errors.
- **Resolution:** Configured `ignoreHTTPSErrors: true` in [`playwright.config.ts`](file:///c:/Users/USER-PC/OneDrive/Documents/Repositories/backend-automation/playwright.config.ts) to permit execution behind corporate TLS inspection proxies.

---

## 6. Immediate Next Steps

1. **Reconcile Git Branch Divergence:**
   - The local `master` branch and `origin/master` have diverged with distinct commits.
   - Remote commits include corporate TLS configuration updates, multi-browser configurations (Firefox, WebKit), and Quick Start documentation.
   - **Action:** Execute `git pull --rebase origin master` and push the consolidated history.

2. **Deploy Azure DevOps CI/CD Pipeline (`azure-pipelines.yml`):**
   - Implement `azure-pipelines.yml` (as specified during the initial planning session in Conversation 1) containing:
     - Node.js 20.x tool installer.
     - npm dependency caching (`package-lock.json`).
     - Playwright browser caching and installation (`npx playwright install --with-deps chromium`).
     - Build verification (`npm run build`).
     - Vitest test execution with JUnit publishing (`PublishTestResults@2` targeting `reports/junit-report.xml`).
     - Playwright E2E test execution with JUnit publishing (`PublishTestResults@2` targeting `reports/playwright-junit.xml`).
     - PDF and HTML report artifact publishing (`PublishBuildArtifacts@1` targeting `reports/`).

3. **Purge Committed `node_modules` from Git History:**
   - In the initial commit (`efda368`), `node_modules/` was checked into Git (~150 MB).
   - **Action:** Run `git rm -r --cached node_modules`, update `.gitignore` with `/node_modules`, and commit to dramatically reduce repository clone time and size.

4. **Multi-Environment Profiles (`.env.staging`, `.env.production`):**
   - Provide concrete environment files for non-local environments.
   - Configure Azure DevOps pipeline variables / key vault secrets to map `API_KEY` and `RABBITMQ_URL` dynamically based on branch or stage.

5. **Expand Test Suites & Negative Scenarios:**
   - Add negative API tests for token expiration, malformed JSON bodies, payload size limits, and invalid HTTP verbs.
   - Add a test reset endpoint (`POST /api/v1/mock/reset`) to the mock server to clear modified in-memory records between test runs.

6. **Visual Regression Testing:**
   - Integrate Playwright visual snapshot assertions (`expect(page).toHaveScreenshot()`) for the dashboard and login pages across Chromium, Firefox, and WebKit.
