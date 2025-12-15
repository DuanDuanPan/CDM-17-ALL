# System-Level Test Design

**Date:** 2025-12-15
**Project:** CDM-17-cc
**Status:** Approved for Implementation

## Testability Assessment

*   **Controllability: PASS**
    *   **Architecture Support:** NestJS + Prisma architecture allows excellent database seeding and state control. Dependency Injection enables mocking of external services. "Microkernel" plugin architecture allows isolating feature testing.
    *   **Action Items:** Implement global data factories for User and Node creation to ensure deterministic test states.

*   **Observability: PASS**
    *   **Architecture Support:** Centralized logging configured. "Audit Log" requirement guarantees user action traceability.
    *   **Action Items:** Ensure frontend exposes key state (e.g., sync status, active node count) via `data-testid` attributes or window objects for test introspection.

*   **Reliability: PASS**
    *   **Architecture Support:** Dockerized infrastructure ensures environment consistency. Stateless backend services (except WebSocket gateway) support parallel testing.
    *   **Action Items:** Use "Network-First" safeguards in Playwright to handle WebSocket message latency deterministically.

## Architecturally Significant Requirements (ASRs)

| ID | Requirement | Category | Risk Score | Rationale for Testing Focus |
|----|-------------|----------|------------|-----------------------------|
| **ASR-1** | **Real-time Synchronization (Yjs + Hocuspocus)** | Reliability | **9 (Critical)** | Core "Source of Truth" mechanism. High risk of race conditions, "split-brain" states, and data loss during concurrent edits. **Must be tested with multi-client E2E scenarios.** |
| **ASR-2** | **Granular RBAC (Node/Field Level)** | Security | **6 (High)** | Complex permission logic (Inherited vs. Override). High risk of data leakage. **Requires matrix-based integration testing.** |
| **ASR-3** | **Canvas Performance (1k+ Nodes)** | Performance | **6 (High)** | Rendering logic is heavy. Risk of UI jank/lag. **Requires automated performance profiling metrics.** |
| **ASR-4** | **Plugin Protocol Integrity** | Maintainability| **4 (Medium)** | Plugins are separate packages. Risk of contract drift. **Requires strict shared-type integration tests.** |

## Test Levels Strategy

*   **Unit Testing (40%)**
    *   **Focus:** Pure business logic.
    *   **Scope:** Shared `packages/types`, `packages/utils`, React Custom Hooks (`useGraphData`), NestJS Service logic (with mocked repositories).
    *   **Rationale:** Fastest feedback loop for complex algorithmic logic (e.g., node layout calculations, permission checks).
    *   **Tools:** Vitest.

*   **Integration Testing (30%)**
    *   **Focus:** Module boundaries and Data Persistence.
    *   **Scope:** NestJS Modules (Controller -> Service -> DB), Plugin loading verification, API contract validation.
    *   **Rationale:** Critical to verify that the "Microkernel" correctly loads plugins and that Prisma handles DB constraints (e.g., uniqueness, foreign keys).
    *   **Tools:** Vitest + Testcontainers (PostgreSQL).

*   **End-to-End (E2E) Testing (30%)**
    *   **Focus:** Critical User Journeys & Collaborative Flows.
    *   **Scope:** Full Login -> Create Map -> Real-time Sync (Multi-user) -> Export.
    *   **Rationale:** The only way to verify WebSocket sync and complex Canvas interactions involving drag-and-drop.
    *   **Tools:** Playwright.

## NFR Testing Approach

*   **Security (SEC)**
    *   **Approach:** Automated E2E tests for Authentication and Authorization boundaries.
    *   **Tools:** Playwright (verify 401/403 responses, menu item visibility).
    *   **Key Scenarios:** Attempting to access "Secret" nodes with "Internal" user level.

*   **Performance (PERF)**
    *   **Approach:** Synthetic load testing on WebSocket gateway.
    *   **Tools:** k6 (WebSocket protocol).
    *   **Key Scenarios:** 50 concurrent users editing same graph; 1k nodes initial load time.

*   **Reliability (REL)**
    *   **Approach:** Resilience testing (Network disconnects).
    *   **Tools:** Playwright (forcing offline mode).
    *   **Key Scenarios:** User loses connection, edits offline, reconnects -> Verify merge.

*   **Maintainability (MAIN)**
    *   **Approach:** Strict type checking and linting.
    *   **Tools:** TypeScript (Strict Mode), ESLint, Prettier.
    *   **Key Scenarios:** CI fails on any type error or unused export.

## Test Environment Requirements

*   **Local/CI:**
    *   Docker Compose heavily relied upon.
    *   **Services:** Postgres 16 (DB), Redis (optional/future for Hocuspocus scaling).
    *   **Seed Data:** Scripts to generate "Gold Master" 1k-node graph for performance baselining.

## Testability Concerns

*   **Canvas Element Interactions:** Interacting with AntV X6 nodes via standard DOM selectors can be brittle. Test IDs need to be embedded deep within the SVG/Canvas structure.
    *   *Mitigation:* Create custom Playwright Locators specific for Graph Nodes.
*   **WebSocket Determinism:** Testing "real-time" sync is inherently asynchronous.
    *   *Mitigation:* Implement a `waitForSync()` harness that listens for specific WebSocket acknowledgment events before asserting.

## Recommendations for Sprint 0

1.  **Scaffold Test Architecture:** Initialize `tests/e2e` with Playwright and `tests/integration` with Vitest in the Monorepo.
2.  **Implement Auth Fixture:** Create a global Playwright fixture that handles Clerk authentication state (bypassing login UI for speed).
3.  **Define Factory Pattern:** Create type-safe factories (`UserFactory`, `NodeFactory`) in `packages/testing` for use across all test levels.
4.  **Prototype Perf Test:** Create a baseline k6 script for WebSocket connection limits.
