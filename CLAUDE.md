# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CDM-17-cc** is a mind map-driven collaborative development platform built as a B2B SaaS application. The system uses mind maps as the single source of truth for requirements management, task execution, workflow orchestration, and real-time team collaboration.

**Current Phase**: Pre-implementation (Solutioning complete)
**Architecture**: Turborepo monorepo with Next.js frontend and NestJS backend
**Package Manager**: pnpm (via Volta)
**Runtime**: Node.js v24.12.0 (via Volta)

## Essential Commands

### Development Workflow
```bash
# Install dependencies
pnpm install

# Run all apps in development mode
pnpm dev

# Run only frontend (Next.js on port 3000)
pnpm --filter web dev

# Run only backend (NestJS on port 4000)
pnpm --filter api dev

# Build all packages
pnpm build

# Run linting
pnpm lint

# Run tests
pnpm test
```

### Testing
```bash
# Frontend tests (Vitest)
pnpm --filter web test
pnpm --filter web test:watch

# Backend tests (Jest)
pnpm --filter api test
pnpm --filter api test:watch
```

### Database Operations (Prisma)
```bash
# Generate Prisma client
pnpm --filter @cdm/database db:generate

# Run migrations
pnpm --filter @cdm/database db:migrate

# Push schema to DB (development)
pnpm --filter @cdm/database db:push

# Open Prisma Studio
pnpm --filter @cdm/database db:studio
```

## Architecture Overview

### Monorepo Structure
```
cdm-17-cc/
├── apps/
│   ├── web/           # Next.js frontend (React, AntV X6, TailwindCSS)
│   └── api/           # NestJS backend (REST + WebSocket)
├── packages/
│   ├── database/      # Prisma schema and database layer
│   ├── plugins/       # Plugin system (microkernel architecture)
│   ├── types/         # Shared TypeScript types/DTOs
│   ├── ui/            # Shared UI components (Shadcn + Magic UI)
│   └── config/        # Shared ESLint/TSConfig
└── docs/              # Project documentation
```

### Key Architectural Patterns

**1. Microkernel Plugin Architecture**
- All business features implemented as plugins in `packages/plugins/`
- Core apps (`web`, `api`) provide only infrastructure
- Plugins follow lifecycle: `beforeLoad` → `load` → `install` → `afterEnable`

**2. Three-Layer Data Abstraction (NocoBase-inspired)**
```
Collection Layer   → Business model definitions (fields, relations, validation)
Repository Layer   → Data access (CRUD, query building, relations)
Database Layer     → Prisma client wrapper (connections, transactions)
```

**3. Real-time Collaboration (Yjs + Hocuspocus)**
- CRDT-based conflict-free synchronization
- WebSocket transport for graph updates
- Binary state stored in PostgreSQL bytea column

**4. Isomorphic Type Safety**
- **CRITICAL RULE**: All DTOs must be defined in `packages/types/`
- Frontend and backend import from `@cdm/types` - never define types locally
- Changes to backend schemas trigger frontend build errors immediately

**5. Unidirectional State Flow ("Yjs-First")**
- UI components NEVER modify local state directly
- Flow: User Action → Yjs update → Hocuspocus sync → Backend hooks → All clients update → React re-render
- **Anti-pattern**: `setState()` followed by `api.save()` causes split-brain in collaborative editing

### RESTful API Design

**Route Format**: `/api/<resource>:<action>?<params>`

Examples:
```bash
# CRUD operations
GET    /api/mindmaps                         # list
POST   /api/mindmaps                         # create
GET    /api/mindmaps:get?filterByTk=1        # get single
PUT    /api/mindmaps:update?filterByTk=1     # update
DELETE /api/mindmaps:destroy?filterByTk=1    # delete

# Custom actions
POST   /api/mindmaps:duplicate?filterByTk=1
POST   /api/mindmaps:export?filterByTk=1

# Nested resources
GET    /api/mindmaps/1/nodes
POST   /api/mindmaps/1/nodes
DELETE /api/mindmaps/1/nodes/n1
```

**Query Parameters**:
- `filter`: Query conditions with operators ($eq, $ne, $gt, $gte, $lt, $lte, $in, $notIn, $like, $and, $or)
- `fields`: Select specific fields to return
- `appends`: Include related data
- `sort`: Order results (prefix with `-` for descending)
- `page`, `pageSize`: Pagination (default: 50, max: 500)

## Code Organization Rules

### Plugin Structure (All features must follow this)
```
packages/plugins/plugin-name/
├── client/              # Next.js components
│   ├── MyNode.tsx      # Node view component
│   └── MyForm.tsx      # Property form
├── server/              # NestJS modules
│   ├── my.service.ts
│   ├── my.controller.ts
│   └── dto/
└── manifest.json        # Plugin metadata
```

### Import Rules
- Use workspace aliases: `@cdm/types`, `@cdm/ui`, `@cdm/database`
- **NEVER** use relative paths across packages (e.g., `../../packages/ui`)
- **NEVER** duplicate type definitions between frontend/backend

### File Naming
- Components: `PascalCase.tsx` (e.g., `GraphCanvas.tsx`)
- Utilities/Hooks: `camelCase.ts` (e.g., `useGraphState.ts`)
- Constants: `UPPER_SNAKE_CASE.ts` (e.g., `MAX_NODES.ts`)
- Types: `PascalCase.ts` (e.g., `NodeDTO.ts`)
- Tests: Co-located with source (`.spec.ts` or `.test.ts`)

## Development Guidelines

### Frontend (Next.js + React)
- Use functional components with TypeScript
- Hooks-first approach for state and logic
- TailwindCSS for styling (utility-first)
- Lazy load components outside viewport
- Virtualize large lists (1k+ nodes)
- Memoize expensive computations (`useMemo`, `React.memo`)

### Backend (NestJS)
- Feature-based module organization
- Dependency injection throughout
- DTOs for all API inputs/outputs (from `@cdm/types`)
- Repository pattern for data access (never call Prisma directly in services)
- Async processing for long-running tasks

### Data Access Pattern
```typescript
// ✅ CORRECT: Use Repository
const mindmapRepo = db.getRepository('mindmaps');
const mindmaps = await mindmapRepo.find({
  filter: { status: 'published', creatorId: { $eq: userId } },
  fields: ['id', 'title', 'updatedAt'],
  appends: ['creator', 'nodes'],
  sort: ['-updatedAt'],
  page: 1,
  pageSize: 20,
});

// ❌ WRONG: Direct Prisma calls in services
const mindmaps = await prisma.mindmap.findMany({ where: { ... } });
```

### Security & Compliance
- Check classification levels before data access
- **NEVER** log sensitive data (node content, user details)
- Every mutation must emit audit event
- Audit format: `{ userId, action, resourceType, resourceId, timestamp, result }`
- Retention: 1+ year (hot: 90 days, cold: 12 months)

### Performance
- **Frontend**: Lazy loading, virtualization, debouncing, memoization
- **Backend**: Pagination (all list endpoints), database indexing, caching, async processing
- **Database**: Avoid N+1 queries (use `include` or Fluent API)

## Testing Strategy

### Test Structure (AAA Pattern)
```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should do something when condition', async () => {
      // Arrange - setup test data
      const input = { ... };

      // Act - execute the code
      const result = await service.method(input);

      // Assert - verify results
      expect(result).toBeDefined();
    });
  });
});
```

### Coverage Targets
- Critical paths: >80% coverage
- Co-locate tests with source files
- Use Vitest for frontend, Jest for backend

## Technology Stack

### Core Dependencies
- **Frontend**: Next.js, React 19, AntV X6 (graph editor), TailwindCSS
- **Backend**: NestJS, Prisma (PostgreSQL), Socket.io
- **Collaboration**: Yjs, Hocuspocus
- **Auth**: Clerk (planned)
- **Testing**: Vitest (web), Jest (api), Playwright (E2E)

### Key Packages
- `@antv/x6`: Graph/mind map rendering engine
- `@antv/x6-react-shape`: React integration for X6
- `@prisma/client`: Type-safe database client
- `@nestjs/platform-express`: NestJS HTTP server
- `lucide-react`: Icon library

## Important Context

### NocoBase-Inspired Patterns
This project adopts patterns from NocoBase (open-source no-code platform):
1. Everything-is-a-plugin architecture
2. Collection/Repository/Database three-layer abstraction
3. Event-driven architecture for data mutations
4. RESTful resource:action API design
5. Schema-driven UI (planned for future)

### Event-Driven Hooks
```typescript
// Listen to data changes
db.on('mindmaps.beforeCreate', async (model, options) => {
  // Set defaults, validate
});

db.on('mindmaps.afterCreate', async (model, options) => {
  // Trigger notifications, audit logs
});
```

### Collaboration Flow
```typescript
// Client-side Yjs integration
const ydoc = new Y.Doc();
const provider = new HocuspocusProvider({
  url: `${WS_URL}/collab`,
  name: `mindmap:${mindmapId}`,
  document: ydoc,
  token: getAuthToken(),
});

// All graph updates go through Yjs shared types
const nodesMap = ydoc.getMap('nodes');
nodesMap.set(nodeId, nodeData); // Syncs to all clients
```

## Project Memories

The following Serena memories contain detailed information:
- `project-overview`: Project goals, MVP features, current status
- `tech-stack`: Complete technology decisions
- `code-style-conventions`: Detailed coding standards
- `suggested-commands`: Windows-specific command reference
- `bmad-workflow-guide`: BMAD methodology workflow

Read these memories when relevant to your current task.

## Windows-Specific Notes

This project is developed on Windows with Git Bash/PowerShell:
- Use `pnpm` instead of `npm`/`yarn`
- Volta manages Node.js versions automatically
- Git Bash preferred for Unix-like commands
- Use forward slashes in paths for cross-platform compatibility

## Common Pitfalls to Avoid

1. **Type Duplication**: Never define types locally - always use `@cdm/types`
2. **Direct State Mutation**: Never bypass Yjs in collaborative features
3. **Relative Imports**: Never use `../..` across packages - use workspace aliases
4. **Direct Prisma Calls**: Always go through Repository layer
5. **Missing Audit Trails**: Every mutation needs audit event emission
6. **Over-Engineering**: Keep solutions simple - only implement what's requested
7. **Security Leaks**: Never log sensitive data (content, classifications, tokens)

## When Making Changes

1. **Read First**: Always read existing code before modifying
2. **Follow Patterns**: Match existing architectural patterns
3. **Type Safety**: Ensure all changes maintain end-to-end type safety
4. **Plugin-First**: Business features belong in `packages/plugins/`, not core apps
5. **Test Coverage**: Add tests for new functionality
6. **Documentation**: Update relevant docs when changing architecture
