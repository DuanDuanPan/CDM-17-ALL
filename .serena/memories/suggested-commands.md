# Suggested Commands

## System Information
**Operating System**: Windows  
**Shell**: Git Bash (mingw64) or PowerShell  
**Node Version Manager**: Volta

## Common Windows Commands

### Directory Navigation & File Operations
```bash
# List directory contents
ls                    # Git Bash
dir                   # PowerShell/CMD

# Change directory
cd <path>

# Find files
find . -name "*.ts"   # Git Bash
Get-ChildItem -Recurse -Filter "*.ts"  # PowerShell

# Search in files
grep -r "pattern" .   # Git Bash
Select-String -Pattern "pattern" -Recurse  # PowerShell
```

### Version Control (Git)
```bash
# Check status
git status

# View changes
git diff

# View commit history
git log --oneline --graph --decorate

# Create branch
git checkout -b feature/branch-name

# Stage and commit
git add .
git commit -m "message"

# Push to remote
git push origin branch-name
```

## Project Setup Commands (When Implementation Begins)

### Initial Monorepo Setup (Not Yet Executed)
```bash
# Initialize Turborepo (planned)
npx create-turbo@latest cdm-17-gemini

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run development servers
pnpm dev
```

### Package Management (pnpm)
```bash
# Install all dependencies
pnpm install

# Add dependency to specific workspace
pnpm --filter web add <package>
pnpm --filter api add <package>

# Add dev dependency
pnpm --filter web add -D <package>

# Update dependencies
pnpm update

# Check outdated packages
pnpm outdated
```

### Testing Commands (Playwright - When Implemented)
```bash
# Run all tests
pnpm test

# Run tests in UI mode
pnpm test:ui

# Run specific test file
pnpm test path/to/test.spec.ts

# Run tests with debugging
pnpm test:debug

# Generate test report
pnpm test:report
```

### Linting & Formatting (When Configured)
```bash
# Run ESLint
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Format with Prettier (if configured)
pnpm format

# Type check
pnpm type-check
```

### Database Commands (Prisma - When Implemented)
```bash
# Generate Prisma client
pnpm --filter api prisma generate

# Run migrations
pnpm --filter api prisma migrate dev

# Reset database
pnpm --filter api prisma migrate reset

# Open Prisma Studio (DB GUI)
pnpm --filter api prisma studio

# Create migration
pnpm --filter api prisma migrate dev --name migration_name
```

### Development Servers (When Implemented)
```bash
# Start all apps in dev mode
pnpm dev

# Start only frontend
pnpm --filter web dev

# Start only backend
pnpm --filter api dev

# Build for production
pnpm build

# Start production build
pnpm start
```

## BMAD Workflow Commands

### Check Project Status
```bash
# Use BMAD workflow status checker
/bmad:bmm:workflows:workflow-status
```

### Next Step in Current Phase
```bash
# Create epics and stories (current next step)
/bmad:bmm:workflows:create-epics-stories

# After epics: check implementation readiness
/bmad:bmm:workflows:check-implementation-readiness

# Then: sprint planning
/bmad:bmm:workflows:sprint-planning
```

### Documentation Generation
```bash
# Generate project context for AI agents
/bmad:bmm:workflows:generate-project-context

# Create diagrams
/bmad:bmm:workflows:create-excalidraw-diagram
/bmad:bmm:workflows:create-excalidraw-wireframe
```

## MCP Tools Available

### Browser Automation (chrome-devtools)
```bash
# Available via MCP, no direct commands needed
# Use through Claude Code MCP integration
```

### E2E Testing (playwright)
```bash
# Available via MCP, no direct commands needed
# Use through Claude Code MCP integration
```

### Semantic Code Navigation (serena)
```bash
# Available via MCP, no direct commands needed
# Use through Claude Code MCP integration
```

## Environment Management (Volta)

### Node.js Version
```bash
# Check current Node version
node --version
# Current: v24.12.0

# Volta manages Node automatically per project
# No manual switching needed
```

### Package Manager
```bash
# Check pnpm version
pnpm --version

# Volta ensures correct version
# Defined in package.json volta field (when created)
```

## Utilities

### Port Checking (Windows)
```bash
# Check what's using a port
netstat -ano | findstr :3000

# Kill process by PID
taskkill /PID <process_id> /F
```

### Performance Monitoring
```bash
# Check system resources
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10  # PowerShell
```

## Notes
- Most npm/yarn commands should use `pnpm` instead
- Use Git Bash for Unix-like command experience on Windows
- Volta automatically manages Node.js and pnpm versions
- Project has not yet initialized the Turborepo structure - commands above are planned for when implementation begins
