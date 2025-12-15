# Code Style & Conventions

## General Principles (Based on Architecture Decisions)

### Language
- **TypeScript** throughout (frontend + backend + shared packages)
- **Strict mode enabled** - end-to-end type safety required
- **No `any` types** unless absolutely necessary with justification

### Code Organization

#### Monorepo Structure
```
cdm-17-gemini/
├── apps/
│   ├── web/              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/      # Next.js 13+ app directory
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── styles/
│   │   └── package.json
│   └── api/              # NestJS backend
│       ├── src/
│       │   ├── modules/  # Feature modules
│       │   ├── common/   # Shared utilities
│       │   └── main.ts
│       └── package.json
├── packages/
│   ├── types/            # Shared TypeScript interfaces/DTOs
│   │   ├── graph/
│   │   ├── auth/
│   │   ├── notification/
│   │   └── index.ts
│   └── config/           # Shared ESLint/TSConfig
└── turbo.json
```

### Naming Conventions

#### Files & Directories
- **Components**: PascalCase - `GraphCanvas.tsx`, `NodeEditor.tsx`
- **Utilities/Hooks**: camelCase - `useGraphState.ts`, `formatDate.ts`
- **Constants**: UPPER_SNAKE_CASE - `MAX_NODES.ts`, `API_ENDPOINTS.ts`
- **Types/Interfaces**: PascalCase - `NodeDTO.ts`, `GraphSyncEvent.ts`
- **Test files**: `*.spec.ts` or `*.test.ts`

#### Code Elements
- **Interfaces**: PascalCase, prefix with `I` optional - `NodeDTO` or `INodeDTO`
- **Types**: PascalCase - `GraphLayout`, `NodeType`
- **Enums**: PascalCase with UPPER_SNAKE_CASE values
  ```typescript
  enum NodeType {
    REQUIREMENT = 'REQUIREMENT',
    TASK = 'TASK',
    KNOWLEDGE = 'KNOWLEDGE'
  }
  ```
- **Functions/Methods**: camelCase - `createNode()`, `updateGraphLayout()`
- **Variables**: camelCase - `nodeCount`, `isLoading`
- **Constants**: UPPER_SNAKE_CASE - `MAX_NODES`, `DEFAULT_TIMEOUT`
- **React Components**: PascalCase - `GraphCanvas`, `NodeEditor`

### Frontend Conventions (Next.js + React)

#### Component Structure
```typescript
// Prefer functional components with TypeScript
interface GraphCanvasProps {
  nodes: NodeDTO[];
  onNodeClick: (nodeId: string) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, onNodeClick }) => {
  // Hooks first
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  // Event handlers
  const handleClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    onNodeClick(nodeId);
  };
  
  // Render
  return (
    <div className="graph-canvas">
      {/* JSX */}
    </div>
  );
};
```

#### Styling
- **TailwindCSS** for utility-first styling
- **Shadcn UI** components as base layer
- **Magic UI** for enhanced visual effects
- **Component-scoped** CSS modules if needed (avoid global styles)

#### State Management
- **Local state**: `useState` for component-level
- **Complex state**: Recoil or Zustand (TBD in detailed design)
- **Server state**: React Query or SWR for API data

### Backend Conventions (NestJS)

#### Module Structure
```typescript
// Feature-based modules
src/
├── graph/
│   ├── graph.module.ts
│   ├── graph.service.ts
│   ├── graph.controller.ts
│   ├── dto/
│   │   ├── create-node.dto.ts
│   │   └── update-node.dto.ts
│   └── entities/
│       └── node.entity.ts
```

#### Service Layer
- **Dependency Injection** throughout
- **Single Responsibility** - one service per domain concern
- **DTOs** for all API inputs/outputs (shared from `packages/types`)

#### API Design
- **RESTful** endpoints for CRUD operations
- **WebSocket** (Socket.io) for real-time sync
- **Consistent naming**: 
  - GET `/api/graphs/:id/nodes` - list nodes
  - POST `/api/graphs/:id/nodes` - create node
  - PATCH `/api/graphs/:id/nodes/:nodeId` - update node
  - DELETE `/api/graphs/:id/nodes/:nodeId` - delete node

### Shared Types (packages/types)

#### DTO Conventions
```typescript
// Shared DTOs between frontend and backend
export interface NodeDTO {
  id: string;
  type: NodeType;
  title: string;
  content?: string;
  classification: ClassificationLevel;
  createdAt: Date;
  updatedAt: Date;
}

// Use Zod or class-validator for runtime validation
export const nodeSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(NodeType),
  title: z.string().min(1).max(200),
  // ...
});
```

### Documentation Standards

#### Code Comments
- **JSDoc** for public APIs and exported functions
  ```typescript
  /**
   * Creates a new node in the graph
   * @param graphId - The ID of the target graph
   * @param nodeData - Node creation payload
   * @returns Created node with generated ID
   * @throws {UnauthorizedException} If user lacks permission
   */
  async createNode(graphId: string, nodeData: CreateNodeDTO): Promise<NodeDTO>
  ```

- **Inline comments** for complex logic only (prefer self-documenting code)
- **Chinese comments allowed** for domain-specific context (given project language)

#### Documentation Files
- **README.md** in each package/app
- **Architecture Decision Records** (ADRs) in `docs/architecture/`
- **API documentation** via Swagger/OpenAPI (NestJS)

### Testing Conventions

#### Test Structure
```typescript
describe('GraphService', () => {
  describe('createNode', () => {
    it('should create node with valid data', async () => {
      // Arrange
      const graphId = 'test-graph-id';
      const nodeData = { title: 'Test Node', type: NodeType.TASK };
      
      // Act
      const result = await service.createNode(graphId, nodeData);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Node');
    });
    
    it('should throw when user lacks permission', async () => {
      // ...
    });
  });
});
```

#### Testing Principles
- **AAA Pattern**: Arrange, Act, Assert
- **Test file location**: Co-located with source (`.spec.ts` next to `.ts`)
- **Coverage target**: >80% for critical paths
- **E2E tests**: Playwright in `apps/web/e2e/`

### Security & Compliance

#### Classification Handling
```typescript
// Always check user classification level
const canAccess = user.classificationLevel >= resource.classificationLevel;

// Never log sensitive data
logger.info(`Node accessed`, { nodeId, userId }); // OK
logger.info(`Node content: ${node.content}`);     // NEVER
```

#### Audit Trail
- **Every mutation** must emit audit event
- **Format**: `{ userId, action, resourceType, resourceId, timestamp, result }`
- **Retention**: Minimum 1 year (hot: 90 days, cold: 12 months)

### Performance Guidelines

#### Frontend
- **Lazy load** components outside viewport
- **Virtualize** large lists (1k+ nodes)
- **Debounce** search/filter inputs
- **Memoize** expensive computations (`useMemo`, `React.memo`)

#### Backend
- **Pagination** for all list endpoints (default: 50, max: 500)
- **Database indexing** for frequent queries
- **Caching** for read-heavy operations
- **Async processing** for long-running tasks (approval workflows)

### Version Control

#### Commit Messages
```
type(scope): subject

body (optional)

footer (optional)
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:
- `feat(graph): add multi-node selection`
- `fix(auth): resolve JWT expiration race condition`
- `docs(api): update Swagger annotations for node endpoints`

#### Branch Naming
- `feature/node-drill-down`
- `fix/ws-reconnection-loop`
- `chore/upgrade-prisma`

### Tools & Linters

#### ESLint
- Airbnb or Standard config as base
- TypeScript-specific rules
- Import order enforcement
- No unused variables/imports

#### Prettier
- Single quotes for strings (unless JSON)
- 2-space indentation
- Trailing commas (ES5)
- Line width: 100 characters

#### Pre-commit Hooks
- Lint staged files
- Run type checking
- Format with Prettier
- (Planned via Husky + lint-staged)

## Notes
- These conventions will be finalized when the monorepo is initialized
- Adjust based on team preferences during sprint 0
- Document any deviations in ADRs
