# Technology Stack

## Architecture Type
**Monorepo Full-Stack Application** (Frontend + Backend + Shared Types)

## Monorepo Setup
- **Tool**: Turborepo
- **Package Manager**: pnpm (via Volta)
- **Runtime**: Node.js v24.12.0 (via Volta)

## Planned Structure
```
cdm-17-gemini/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── types/        # Shared TypeScript DTOs/interfaces
│   └── config/       # Shared ESLint/TSConfig
└── turbo.json
```

## Frontend Stack
- **Framework**: Next.js (React-based)
- **Graph Engine**: AntV X6 (mind map rendering)
- **Styling**: TailwindCSS + Shadcn UI + Magic UI
- **State Management**: Recoil or Zustand (TBD)
- **Language**: TypeScript

## Backend Stack
- **Framework**: NestJS (modular Node.js)
- **Real-time Sync**: Socket.io (WebSocket gateway)
- **Database**: PostgreSQL
- **ORM**: Prisma (type-safe)
- **Collaboration Engine**: Yjs + Hocuspocus (CRDT-based sync)
- **Language**: TypeScript

## Key Architectural Decisions

### Real-time Synchronization
- **Engine**: Yjs (CRDT library) + Hocuspocus (NestJS integration)
- **Transport**: WebSocket via Socket.io
- **Strategy**: Conflict-free replicated data types for concurrent editing

### Storage Layers
- **Graph Data**: Document-oriented DB with graph indexing (PostgreSQL + extensions)
- **Version Snapshots**: Incremental + critical operation snapshots
- **Audit Logs**: Append-only storage with hot (90 days) and cold (12 months) tiers
- **Large Attachments**: Object storage (S3-compatible)

### Services Architecture
- **Graph Service**: Node/version/cross-graph references/tags/search/drill-down
- **Execution Service**: Task mapping, dependencies (FS/SS/FF/SF), approval-driven orchestration
- **Permission/Security Service**: Classification-based ACL, watermarking, audit logging
- **Notification Service**: Deduplication/aggregation engine with priority channels
- **Template/AI Service**: Template library, subtree reuse, AI skeleton generation
- **Export Service**: Multi-format export pipeline with watermark/masking

### Performance Optimizations
- Lazy loading with viewport-based rendering
- Incremental graph updates
- Relation line view culling
- Read-write separation
- P95/P99 monitoring (queue latency, conflict rates)

## Development Tools
- **Version Control**: Git
- **MCP Servers**: 
  - chrome-devtools (browser automation)
  - playwright (E2E testing)
  - serena (semantic code navigation)

## Testing Strategy (Planned)
- **Framework**: Playwright
- **Approaches**: ATDD, Component TDD, Fixture architecture
- **CI/CD**: Burn-in loops, artifact collection

## Security & Compliance
- Classification-based access control (≥ resource classification required)
- Field/attachment-level permissions
- Dynamic watermarking for online previews
- Audit trail retention: ≥1 year
- Temp privilege elevation with approval workflow
