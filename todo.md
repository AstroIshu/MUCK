# Real-Time CRDT Collaborative Editor - TODO

## Phase 1: Architecture & Setup

- [x] Initialize web development project with full-stack architecture
- [x] Design system architecture and database schema
- [x] Set up database schema with Drizzle ORM

## Phase 2: Backend WebSocket Server

- [x] Implement WebSocket hub for room/document management
- [x] Create database tables for documents, operations, sessions
- [x] Implement CRDT engine (Yjs) for conflict resolution
- [x] Add operation broadcasting and persistence
- [x] Implement offline/reconnect queue and vector clock tracking
- [x] Add operation deduplication and idempotent handling

## Phase 3: Frontend CRDT Editor

- [x] Set up React component for text editor
- [x] Integrate Yjs CRDT library for local editing
- [x] Implement WebSocket client for real-time sync
- [x] Add optimistic UI with local echo
- [x] Implement server ACK reconciliation

## Phase 4: Shared Cursors & Presence

- [x] Implement per-user cursor tracking
- [x] Add stable color assignment for users
- [x] Implement throttled cursor updates
- [x] Add presence awareness (online/offline users)
- [x] Display shared selections/highlights

## Phase 5: Persistence & Versioning

- [x] Implement document snapshots in database
- [x] Create operation log storage and retrieval
- [ ] Add snapshot compaction/GC for old operations
- [ ] Implement time-travel/version history
- [ ] Add snapshot integrity validation

## Phase 6: Authentication & Access Control

- [x] Implement JWT-protected WebSocket endpoints
- [x] Add role-based permissions (owner/editor/viewer)
- [x] Implement per-document ACL checks
- [ ] Add document sharing and permission management
- [ ] Implement session validation and token refresh

## Phase 7: Observability & Error Handling

- [ ] Add structured logging with correlation IDs
- [ ] Implement metrics collection (ops/sec, latency, presence)
- [ ] Add health check endpoints
- [ ] Implement error recovery and fallback mechanisms
- [ ] Add duplicate operation guards and schema validation

## Phase 8: Testing & Validation

- [ ] Write CRDT convergence unit tests
- [ ] Implement multi-client simulation tests
- [ ] Add latency/fault injection tests
- [ ] Validate snapshot integrity
- [ ] Test offline/reconnect scenarios

## Phase 9: Frontend UI & UX

- [ ] Design and implement editor layout
- [ ] Add document list/browser interface
- [ ] Implement user presence indicators
- [ ] Add document sharing UI
- [ ] Implement settings and user profile

## Phase 10: Documentation & Delivery

- [ ] Create API documentation
- [ ] Write user guide and deployment instructions
- [ ] Create system architecture documentation
- [ ] Prepare demo and test scenarios
- [ ] Final testing and bug fixes

## Bugs & Fixes

- [x] Fix FORBIDDEN error when accessing own document - owner not in permissions table
