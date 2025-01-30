# TestSenseAI Dashboard BFF API

Below is a possible technical specification for a TestSenseAI Dashboard BFF API project built with Nitric and TypeScript. It outlines directory organization, dependency usage, architectural decisions, and implementation details, aligning with multi-tenant requirements, real-time updates, and AI-oriented endpoints.

## Project Structure

```typescript
testsenseai-bff/
├─ .env
├─ package.json
├─ tsconfig.json
├─ nodemon.json
├─ src/
│  ├─ api/
│  │  ├─ index.ts            // Main entry for Nitric API definitions
│  │  ├─ auth/
│  │  │  ├─ auth.controller.ts
│  │  │  ├─ auth.middleware.ts
│  │  ├─ projects/
│  │  │  ├─ projects.controller.ts
│  │  ├─ analysis/
│  │  │  ├─ analysis.controller.ts
│  │  │  ├─ analysis.types.ts
│  │  ├─ metrics/
│  │  │  ├─ metrics.controller.ts
│  │  ├─ activities/
│  │  │  ├─ activities.controller.ts
│  │  ├─ insights/
│  │  │  ├─ insights.controller.ts
│  │  ├─ websockets/
│  │  │  ├─ realtime.controller.ts
│  │  ├─ common/
│  │  │  ├─ error-handler.ts
│  │  │  ├─ rate-limiter.ts
│  │  │  ├─ request-validation.ts
│  │  │  ├─ response-builder.ts
│  ├─ services/
│  │  ├─ auth.service.ts      // JWT, Cognito/Hanko integration
│  │  ├─ projects.service.ts
│  │  ├─ analysis.service.ts
│  │  ├─ metrics.service.ts
│  │  ├─ activities.service.ts
│  │  ├─ insights.service.ts
│  ├─ workers/
│  │  ├─ analysis.worker.ts   // Listens to topics for async AI processing
│  │  ├─ test-execution.worker.ts
│  ├─ common/
│  │  ├─ constants.ts
│  │  ├─ logger.ts
│  │  ├─ cache.ts
│  │  ├─ rate-limit-config.ts
│  │  ├─ zod-schemas.ts
│  ├─ config/
│  │  ├─ index.ts             // Loads environment-based config
│  ├─ main.ts                 // Nitric bootstrap
└─ ...
```

## Highlights

1. **api/ directory**

Contains BFF endpoints grouped by domain: auth, projects, analysis, metrics, activities, and insights.

• Each subdirectory includes its own controller file to handle HTTP routes and business logic orchestration.

• common/ stores middleware and reusable request/response utilities (validation, error handling, etc.).

2 **services/ directory**

Houses reusable logic (e.g., database queries, external API calls, or AI requests). Each file relates to a domain or feature area.

3 **workers/ directory**

Manages background tasks (topic subscribers, job queues, or AI analysis routines). For example, analysis.worker.ts consumes messages from an aiAnalysis topic to perform asynchronous tasks.

4 **common/ directory**

Shared utilities (logging, caching, typed constants, Zod schemas) that can be used across all modules.

5 **config/ directory**

Central place for environment-aware settings, such as DB connection strings, AWS/Hanko credentials, or feature flags.

6 **Top-level files**

• main.ts initializes the Nitric application and wires up the routes, topics, or schedules.

• package.json and tsconfig.json define dependencies, scripts, and TypeScript config.

• .env or environment-based config for secrets (not checked into version control).

## Dependencies

• **TypeScript** for static typing.

• **Nitric** (@nitric/sdk) for API routes, topics, and security policies.

• **Zod** for runtime schema validation.

• **Redis** or a similar cache service (optional) to store ephemeral data or results.

• **JWT library** (if not using a built-in feature from Cognito/Hanko) for token validation and claims extraction.

• Additional libraries listed in the provided metadata (axios, mime-types, node-gyp, uuid) included as needed.

## Implementation Details

1. **API Definition**

In api/index.ts, a createApi('dashboard') is defined with routes mapped to controllers:

```typescript
import { createApi } from '@nitric/sdk/api';
import { handleLogin } from './auth/auth.controller';
import { handleListProjects } from './projects/projects.controller';

// etc.

export const dashboardApi = createApi(‘dashboard’)

.get(’/api/projects’, handleListProjects)

.post(’/api/auth/login’, handleLogin);

// Additional endpoints…
```

2 **Authentication**  

- A dedicated `auth.middleware.ts` performs JWT or token-based checks.  
- `auth.service.ts` integrates with Cognito or Hanko for multi-tenant role-based access, seat-based billing logic, or any future passwordless approach.

3 **Multi-Tenancy**  

- All routes parse `organizationId` from JWT claims or from the request context.  
- Data isolation is enforced at the service/database layer based on that `organizationId`.  
- The `projects.service.ts`, `analysis.service.ts`, etc., filter records or data by `org_id`.

4 **Validation**  

- Zod schemas in `common/zod-schemas.ts` define request/response structures.  
- `request-validation.ts` includes a small middleware or helper to parse and validate request bodies.

5 **Caching & Rate Limiting**  

- A `cache.ts` module can implement Redis-based get/set operations.  
- A `rate-limit-config.ts` describes per-organization and per-project limits.  
- `rate-limiter.ts` is a middleware that references these settings to throttle requests.

6 **Real-time Updates**  

- `websockets/realtime.controller.ts` handles `api.ws` connections.  
- `workers/analysis.worker.ts` or `workers/test-execution.worker.ts` publishes progress updates to `topics.aiAnalysis` or `topics.testExecutions`, which then broadcast via websockets to each connection in that organization.

7 **Error Handling**  

- `error-handler.ts` is a middleware that catches thrown `ApiError` or general errors, then sends standardized JSON responses with an `APIError` interface.  
- The `logger.ts` captures stack traces or context for deeper analysis.

8 **AI Analysis Flow**  

- `analysis.controller.ts` has endpoints like `POST /api/analysis/requirements`.  
- This endpoint parses the request with Zod, generates an `analysisId`, and publishes a message to `topics.aiAnalysis`.  
- `analysis.worker.ts` listens to `aiAnalysis` messages, runs an AI task (via the `-core` repository or external service), and stores results in a data store or cache.  
- The worker can also push real-time events (e.g., `analysis.progress`) to the websocket.

## Environment & Configuration

- **Configuration**  
- `.env.development` and `.env.production` files store environment variables (database connection, secrets, region).  
- `config/index.ts` loads variables, applying typed defaults.

- **Secrets Handling**  
- For AWS Cognito or Hanko private keys, use secure secrets management (e.g., AWS Secrets Manager or environment variables).

## DevOps Considerations

1. **Local Development**  

- `npm run dev` or `yarn dev` triggers Nitric local stack plus watchers for TypeScript changes.  
- Integration with Docker Compose if needed for Redis or other ephemeral dependencies.

2 **Production Deployment**  

- Automated CI/CD pipeline.  
- Potentially deploy as a serverless function or container (AWS Fargate, Azure Container Apps, etc.).  
- Ensure the environment is configured with correct secrets and that caches/brokers are provisioned.

3 **Monitoring & Logging**  

- `logger.ts` for structured logs.  
- Additional instrumentation can be added for request timing and usage analytics.  
- Websocket connections monitored for concurrency or memory usage.

## Testing & Quality

- **Unit Tests**  
- Place in a `tests/` directory (or next to each file).  
- Validate controllers, services, and workers with mocking external dependencies.  
- Use coverage thresholds to maintain code quality.

- **Integration Tests**  
- Spin up a local Nitric stack in a test environment.  
- Run a battery of real requests against the endpoints.

- **AI-Specific Scenarios**  
- For AI-based flows, ensure confidence scores, recommendation logic, and edge cases are covered.

## Summary of Key Points

- Domain-based directory structure to keep controllers, services, and workers separate.  
- Zod for validation, robust multi-tenant checks, JWT claims for `organizationId`.  
- Real-time updates through Nitric websockets and background workers.  
- Rate-limiting, caching, and error handling as common cross-cutting concerns.  
- Minimal overhead to keep response times fast (under 200ms for synchronous endpoints).

This layout provides a foundation for the TestSenseAI Dashboard BFF API. Controllers manage incoming requests, services handle domain logic, workers process asynchronous tasks, and everything is organized under Nitric with security, multi-tenancy, and real-time features built in.
