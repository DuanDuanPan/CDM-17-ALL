# Task Completion Checklist

## When a Development Task is Completed

### 1. Code Quality Checks

#### Linting
```bash
# Run linter
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Ensure no linting errors remain
```

#### Type Checking
```bash
# Run TypeScript compiler
pnpm type-check

# Ensure no type errors
```

#### Formatting
```bash
# Format code with Prettier (if configured)
pnpm format

# Or use auto-format in IDE (VSCode: Shift+Alt+F)
```

### 2. Testing Requirements

#### Unit Tests
- [ ] Write/update unit tests for new/modified code
- [ ] Achieve >80% coverage for critical paths
- [ ] All tests pass: `pnpm test`

#### Integration Tests
- [ ] Write integration tests for API endpoints
- [ ] Test database migrations (if applicable)
- [ ] Verify WebSocket event handling

#### E2E Tests (Playwright)
- [ ] Create E2E tests for new user flows
- [ ] Run E2E suite: `pnpm test:e2e`
- [ ] Verify in headless and headed modes

### 3. Documentation Updates

#### Code Documentation
- [ ] Add JSDoc comments for public APIs
- [ ] Update inline comments for complex logic
- [ ] Document breaking changes

#### README Updates
- [ ] Update package README if API changed
- [ ] Add usage examples for new features
- [ ] Update installation/setup instructions

#### Architecture Decisions
- [ ] Create ADR if architectural choice was made
- [ ] Update `docs/architecture.md` if needed
- [ ] Document trade-offs and alternatives considered

### 4. Security & Compliance

#### Classification Checks
- [ ] Verify user classification level checks
- [ ] Ensure sensitive data not logged
- [ ] Validate field/attachment-level permissions

#### Audit Trail
- [ ] Emit audit events for all mutations
- [ ] Include required fields: userId, action, resourceId, timestamp
- [ ] Test audit log writing

#### Watermarking (if applicable)
- [ ] Apply dynamic watermarks for online previews
- [ ] Test watermark visibility and content
- [ ] Verify watermark removal protection

### 5. Performance Validation

#### Frontend Performance
- [ ] P95 interaction latency <100ms (1k nodes)
- [ ] No memory leaks during extended usage
- [ ] Smooth 60fps rendering during pan/zoom
- [ ] Lazy loading works for large graphs

#### Backend Performance
- [ ] API response time P95 <200ms
- [ ] Database queries optimized with indexes
- [ ] Pagination implemented for list endpoints
- [ ] WebSocket sync latency <200ms (50 concurrent users)

#### Load Testing (for critical features)
- [ ] Run k6 performance scripts
- [ ] Verify no degradation under load
- [ ] Check resource usage (CPU/memory)

### 6. Real-time Sync Validation (if applicable)

#### Collaboration Features
- [ ] Multi-cursor display works correctly
- [ ] Conflict detection and resolution tested
- [ ] Lock/unlock mechanisms function properly
- [ ] Version history updates correctly

#### Notification System
- [ ] 5-minute deduplication works
- [ ] Aggregation logic correct
- [ ] Priority events bypass throttling
- [ ] Unread counts update accurately

### 7. Database Changes

#### Migrations (Prisma)
```bash
# Generate migration
pnpm --filter api prisma migrate dev --name migration_name

# Verify migration
pnpm --filter api prisma migrate status

# Test rollback if needed
pnpm --filter api prisma migrate reset
```

#### Schema Validation
- [ ] No breaking changes to existing tables
- [ ] Indexes added for frequently queried fields
- [ ] Foreign keys and constraints properly defined
- [ ] Seed data updated if needed

### 8. Git Workflow

#### Branch & Commits
- [ ] Commit messages follow convention: `type(scope): subject`
- [ ] Atomic commits (one logical change per commit)
- [ ] No sensitive data in commit history
- [ ] Branch name descriptive: `feature/`, `fix/`, `chore/`

#### Pull Request (when implemented)
- [ ] Create PR with clear description
- [ ] Link to related story/epic
- [ ] Request review from team members
- [ ] Resolve all review comments

### 9. BMAD Workflow Integration

#### Story Updates
- [ ] Mark story tasks as completed in story file
- [ ] Update acceptance criteria status
- [ ] Add implementation notes if needed
- [ ] Link commits/PRs to story

#### Sprint Tracking
```bash
# Update sprint status (when in implementation phase)
# Manually update docs/sprint-artifacts/sprint-status.yaml
# Or use: /bmad:bmm:workflows:sprint-status
```

#### Code Review
```bash
# Run adversarial code review workflow
/bmad:bmm:workflows:code-review

# Address all findings
# Re-run if significant changes made
```

### 10. Deployment Readiness (when applicable)

#### Build Verification
```bash
# Build all packages
pnpm build

# Verify no build errors
# Check bundle sizes (frontend)
```

#### Environment Variables
- [ ] All required env vars documented
- [ ] `.env.example` updated
- [ ] No secrets in version control

#### Configuration
- [ ] Database connection strings configured
- [ ] API endpoints/URLs correct
- [ ] Feature flags set appropriately

### 11. Final Checks Before Marking Complete

- [ ] **Code Quality**: All linting, formatting, type checks pass
- [ ] **Tests**: Unit, integration, E2E tests pass (>80% coverage)
- [ ] **Documentation**: Code, README, ADRs updated
- [ ] **Security**: Classification, audit, watermarking validated
- [ ] **Performance**: Meets P95 latency targets
- [ ] **Database**: Migrations tested, schema validated
- [ ] **Git**: Clean commits, PR created (if applicable)
- [ ] **BMAD**: Story updated, code review passed
- [ ] **Build**: No build errors, deployable state

## Post-Completion Actions

### Immediate Next Steps
1. Mark story/task as "Done" in tracking system
2. Update sprint progress in `sprint-status.yaml`
3. Notify team in standup or async channel
4. Move to next task in sprint backlog

### Epic Completion
```bash
# Run retrospective after epic completion
/bmad:bmm:workflows:retrospective

# Extract lessons learned
# Update project context if needed
```

### Sprint Completion
- [ ] Run final code review for all changes
- [ ] Ensure all stories meet acceptance criteria
- [ ] Demo completed features
- [ ] Plan next sprint

## Notes
- **Not all items apply to every task** - use judgment
- **Planning phase tasks** (current state) have different completion criteria
- **Adjust checklist** as project evolves and processes are established
- **Automate where possible** with pre-commit hooks and CI/CD
