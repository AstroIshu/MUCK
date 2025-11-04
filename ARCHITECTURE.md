# Real-Time CRDT Collaborative Editor - System Architecture

## 1. Overview

The system implements a real-time collaborative text editor using CRDT (Conflict-free Replicated Data Type) for seamless conflict resolution across concurrent edits. The architecture consists of:

- **Frontend:** React + TypeScript with Yjs CRDT library
- **Backend:** Node.js + Express with WebSocket (Socket.io) for real-time transport
- **Database:** MongoDB for document persistence and operation logs
- **Auth:** JWT-based access control with role-based permissions

## 2. Core Components

### 2.1 CRDT Engine (Yjs)

**Why Yjs?** Yjs is a high-performance, battle-tested CRDT library that:

- Provides automatic conflict resolution without manual merging
- Supports rich data types (text, arrays, maps)
- Enables efficient binary encoding for network transfer
- Handles offline edits seamlessly
- Includes awareness protocol for shared cursors/presence

**Architecture:**

- Client maintains local Y.Doc with Y.Text for document content
- Server maintains authoritative Y.Doc for persistence
- Operations encoded as Uint8Array for efficient transport
- Vector clocks track causality for offline scenarios

### 2.2 WebSocket Protocol

**Message Types:**

```
Client → Server:
  - join_room: { documentId, userId, clientId }
  - sync_step1: { stateVector } (Yjs sync protocol)
  - sync_step2: { update } (Yjs sync protocol)
  - update: { update, clientId } (incremental updates)
  - cursor_update: { position, selection, userId }
  - ping: {} (keep-alive)

Server → Client:
  - room_joined: { documentId, users, clientId, doc_state }
  - sync_step1: { stateVector }
  - sync_step2: { update }
  - update: { update, clientId, lamportTime }
  - cursor_update: { userId, position, selection, color }
  - user_joined: { userId, name, color }
  - user_left: { userId }
  - pong: {}
  - error: { message, code }
```

### 2.3 Database Schema

**Collections:**

```
documents:
  _id: ObjectId
  name: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
  snapshot: {
    yState: Binary (Uint8Array)
    version: number
    timestamp: Date
  }
  permissions: [
    { userId: string, role: 'owner' | 'editor' | 'viewer' }
  ]
  metadata: {
    wordCount: number
    characterCount: number
    lastEditedBy: string
  }

operations:
  _id: ObjectId
  documentId: ObjectId
  clientId: string
  userId: string
  update: Binary (Uint8Array)
  lamportTime: number
  vectorClock: { clientId: number }
  timestamp: Date
  version: number

sessions:
  _id: ObjectId
  documentId: ObjectId
  userId: string
  clientId: string
  joinedAt: Date
  lastHeartbeat: Date
  cursor: { position: number, selection: [number, number] }
  color: string

users:
  _id: ObjectId
  openId: string (from OAuth)
  name: string
  email: string
  role: 'user' | 'admin'
  createdAt: Date
  updatedAt: Date
```

### 2.4 Offline & Sync Flow

**Offline Scenario:**

1. Client queues operations locally in IndexedDB
2. Maintains local Y.Doc state
3. On reconnect, sends queued operations with vector clock
4. Server validates and applies operations
5. Server sends back authoritative state if conflicts detected

**Sync Protocol (Yjs):**

1. Client sends state vector (what it has)
2. Server responds with missing updates
3. Client applies updates and sends its updates
4. Server applies and broadcasts to other clients

### 2.5 Access Control

**Permission Model:**

- **Owner:** Full control, can delete, share, modify permissions
- **Editor:** Can read and edit content, cannot modify permissions
- **Viewer:** Read-only access

**Enforcement:**

- JWT token includes userId and documentId
- Server validates permissions on every WebSocket message
- Operations from unauthorized users are rejected
- Cursor updates only visible to users with read access

### 2.6 Persistence & Snapshots

**Snapshot Strategy:**

- Create snapshot every 100 operations or 5 minutes
- Store compressed Yjs binary state in MongoDB
- Maintain operation log for incremental recovery
- Compact old operations when snapshot created

**Recovery:**

- On document load: fetch latest snapshot
- Apply operations after snapshot version
- If operations missing, request from server
- Validate snapshot integrity with checksum

### 2.7 Presence & Cursors

**Cursor Tracking:**

- Throttle cursor updates to 100ms
- Send position and selection range
- Assign stable color per user per document
- Display as overlay in editor

**Awareness Protocol:**

- Track online/offline status
- Broadcast user join/leave events
- Include user metadata (name, color, avatar)
- Clean up stale sessions after 30s inactivity

### 2.8 Error Handling & Recovery

**Duplicate Detection:**

- Track operation IDs (clientId + sequence)
- Idempotent operation application
- Reject duplicate operations

**Conflict Resolution:**

- CRDT handles all conflicts automatically
- No manual merge needed
- Intention preservation guaranteed by Yjs

**Network Failures:**

- Exponential backoff for reconnection
- Queue operations during disconnection
- Validate state on reconnect
- Fallback to snapshot if sync fails

## 3. Scalability Considerations

### 3.1 Room Sharding

- Each document is a separate room
- Rooms isolated on server
- No cross-room communication needed

### 3.2 Operation Batching

- Batch updates before broadcast (10ms window)
- Reduces message count by ~90%
- Maintains low latency

### 3.3 Memory Management

- Snapshot documents periodically
- Archive old operations after 30 days
- Limit concurrent rooms per instance

## 4. Observability

**Metrics:**

- Operations per second per document
- Sync latency (p50, p95, p99)
- Presence updates per second
- Active sessions per document
- Snapshot size and compression ratio

**Logging:**

- Correlation IDs for request tracing
- Operation timestamps for debugging
- Error logs with context
- Audit log for permission changes

## 5. Testing Strategy

**Unit Tests:**

- CRDT convergence with concurrent edits
- Operation deduplication
- Permission checks
- Snapshot integrity

**Integration Tests:**

- Multi-client sync scenarios
- Offline/reconnect flows
- Cursor update propagation
- Permission enforcement

**Simulation Tests:**

- Latency injection (50ms, 500ms)
- Packet loss (5%, 20%)
- Out-of-order delivery
- Concurrent edits from 10+ clients

## 6. Security

**Transport:**

- WSS (WebSocket Secure) for production
- JWT validation on every message
- Rate limiting per user/document

**Data:**

- Encrypt sensitive fields in MongoDB
- Audit log for all modifications
- Access control enforced server-side

**Operations:**

- Validate operation format
- Check user permissions
- Sanitize user input
- Prevent injection attacks
