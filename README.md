# Nexora

A multi-tenant workspace for small businesses to manage a business profile, product/service catalogues, website appearance, subscriptions and enquiries.

Owner: Wisdom Umanor / WizzyFrosh. Documentation baseline: 15 October 2026.
This is an early release. A successful build is not evidence that billing, public websites or production configuration are safe to launch.

## Start here

1. Read [the current implementation audit](docs/CURRENT_STATE.md).
2. Read [the PRD](docs/PRD.md), then [the build sequence](docs/IMPLEMENTATION_PLAN.md).
3. Coding assistants must follow [AGENTS.md](AGENTS.md).
4. Use [the setup guide](docs/SETUP.md) to run the repository.

## Workspace

| Path                  | Responsibility                                           |
| --------------------- | -------------------------------------------------------- |
| apps/web              | Next.js 16.2.7 / React 19.2.4 application                |
| apps/api              | NestJS 11 API and Prisma schema                          |
| packages/shared-types | Shared TypeScript contracts                              |
| docs                  | Product, design, architecture and operating requirements |

## Documentation

| File                                                     | Purpose                                              |
| -------------------------------------------------------- | ---------------------------------------------------- |
| [PRD](docs/PRD.md)                                       | Scope, user stories, acceptance criteria, pricing    |
| [Technical requirements](docs/TECHNICAL_REQUIREMENTS.md) | Actual stack, boundaries and conventions             |
| [Architecture](docs/ARCHITECTURE.md)                     | Components, flows, failure behaviour                 |
| [Database](docs/DATABASE_DESIGN.md)                      | Existing models, invariants and migration strategy   |
| [API contracts](docs/API_CONTRACTS.md)                   | Existing routes and required validation              |
| [App flow](docs/APP_FLOW.md)                             | Owner and customer journeys                          |
| [Design brief](docs/DESIGN_BRIEF.md)                     | Reference synthesis, content and interaction rules   |
| [Security](docs/SECURITY.md)                             | Threats, concrete gaps and release gates             |
| [Scalability](docs/SCALABILITY.md)                       | Performance targets, queues, pools and cost controls |
| [Billing](docs/BILLING.md)                               | Payment lifecycle and reconciliation rules           |
| [Testing](docs/TESTING.md)                               | Unit, integration, browser and adversarial scenarios |
| [Deployment](docs/DEPLOYMENT.md)                         | Environments, release and rollback                   |
| [Operations](docs/OPERATIONS.md)                         | Monitoring, incidents and recovery                   |
| [Privacy](docs/PRIVACY_AND_DATA.md)                      | Data categories and proposed retention               |
| [Implementation plan](docs/IMPLEMENTATION_PLAN.md)       | Ordered tasks with exit criteria                     |
| [Decisions](docs/DECISIONS.md)                           | Accepted direction and open decisions                |
| [Master prompt](docs/MASTER_PROMPT.md)                   | Coding-assistant handoff                             |
| [Verification](docs/VERIFICATION.md)                     | Checks actually run and remaining limitations        |

## Build order

Run from the repository root:

```sh
npm ci
npm run build --workspace @nexora/shared-types
npm exec --workspace api -- prisma generate --schema prisma/schema.prisma
npm run build
npm run test --workspace api -- --runInBand
```

Database migrations are a separate, deliberate operation. Do not run a reset against a deployed database.
The web application can be built without production credentials. API runtime needs a configured PostgreSQL database.
