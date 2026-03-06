# 📝 MUCK – Multi‑User Real‑Time Collaborative Text Editor

MUCK is a modern, real‑time collaborative text editor that allows multiple users to simultaneously edit documents with automatic conflict resolution, live cursor tracking, and presence awareness. Built with cutting‑edge web technologies, it leverages CRDT (Conflict‑free Replicated Data Type) via Yjs to ensure seamless synchronisation even under network interruptions.

> **Live Demo**: [coming soon]()  
> **GitHub Repository**: [https://github.com/AstroIshu/MUCK](https://github.com/AstroIshu/MUCK)

---

## ✨ Features

### Real‑Time Collaboration
- **Concurrent Editing** – Multiple users edit the same document simultaneously.
- **Live Cursor Tracking** – See other users’ cursors and text selections in real time.
- **Presence Indicators** – Active users list with stable colour assignments.
- **Automatic Conflict Resolution** – Yjs CRDT guarantees that all clients eventually converge without manual merging.

### Document Management
- **Create & Organise** – Create new documents, view all your documents in a list.
- **Document Statistics** – Live word count and character count.
- **Version History** (planned) – Time‑travel through previous document states.
- **Persistent Storage** – Document content and operation logs stored in MySQL.

### User Experience
- **Clean Modern Interface** – Built with shadcn/ui and Tailwind CSS 4.
- **Responsive Design** – Works on desktop, tablet, and mobile.
- **Offline Support** – Local edits are queued and re‑synced when connection is restored.
- **Google OAuth** – Secure authentication with your Google account.

### Developer Friendly
- **Type‑Safe APIs** – tRPC ensures end‑to‑end type safety between client and server.
- **Well‑Documented** – Comprehensive architecture and API documentation.
- **Extensible** – Modular codebase, easy to add new features.

---

## 🛠️ Tech Stack

### Frontend
- **React 19** – Latest React with modern hooks.
- **TypeScript** – Static typing for robustness.
- **Tailwind CSS 4** – Utility‑first styling with custom theming.
- **shadcn/ui** – Re‑usable component library built on Radix UI.
- **Socket.io‑client** – WebSocket communication for real‑time updates.
- **Yjs** – CRDT library for conflict‑free data synchronisation.
- **tRPC client** – Type‑safe RPC client for server communication.
- **React Hook Form** – Form handling (used in share dialog).
- **Sonner** – Toast notifications.

### Backend
- **Node.js** – JavaScript runtime.
- **Express** – Lightweight web framework.
- **Socket.io** – WebSocket server for real‑time messaging.
- **Yjs** – Server‑side CRDT document management.
- **tRPC server** – End‑to‑end typesafe API routes.
- **Drizzle ORM** – TypeScript ORM for MySQL.
- **MySQL** – Relational database for persistent storage.
- **Jose** – JWT creation and verification.
- **Zod** – Schema validation for API inputs.

### Infrastructure
- **Docker** – MySQL container for local development.
- **Vite** – Fast frontend build tool.
- **PM2** – Production process manager.
- **Nginx** – Reverse proxy and SSL termination.

---

## 🏗️ Architecture Overview

### 1. CRDT Engine (Yjs)

Yjs is a high‑performance CRDT library that guarantees eventual consistency without a central server. In MUCK, each document is represented as a `Y.Doc` containing a `Y.Text` type for the editor content.

- **Local Editing** – Changes are applied optimistically to the local `Y.Doc`.
- **Operation Encoding** – Edits are encoded as binary updates (`Uint8Array`) for efficient network transfer.
- **Conflict Resolution** – Yjs uses a Lamport clock and vector clocks to order operations and resolve conflicts automatically.
- **Awareness Protocol** – Yjs also provides a built‑in mechanism for sharing presence information (cursors, selections), which we use for live cursors.

### 2. WebSocket Communication (Socket.io)

Socket.io provides real‑time, bidirectional communication between clients and the server.

#### Client → Server Messages
| Event          | Payload                                           | Description                          |
|----------------|---------------------------------------------------|--------------------------------------|
| `join_room`    | `{ documentId, clientId, token }`                 | Join a document room                 |
| `sync_step1`   | `{ stateVector, clientId }`                       | Request missing updates              |
| `sync_step2`   | `{ update, clientId }`                             | Send a Yjs binary update             |
| `update`       | `{ update, clientId }`                             | Broadcast an edit                    |
| `cursor_update`| `{ position, selection, clientId }`                | Update cursor/selection              |
| `ping`         | (empty)                                           | Keep‑alive                           |

#### Server → Client Messages
| Event          | Payload                                           | Description                          |
|----------------|---------------------------------------------------|--------------------------------------|
| `room_joined`  | `{ documentId, clientId, users, docState, lamportTime }` | Confirmation of room join        |
| `sync_step2`   | `{ update, clientId }`                             | Respond to sync request              |
| `update`       | `{ update, clientId, lamportTime }`                | Broadcast an edit from another user  |
| `cursor_update`| `{ userId, clientId, position, selection, color, name }` | Broadcast cursor movement      |
| `user_joined`  | `{ userId, clientId, name, color }`                | Notify new user joined               |
| `user_left`    | `{ clientId, userId }`                             | Notify user left                     |
| `pong`         | (empty)                                           | Keep‑alive response                  |
| `error`        | `{ message, code }`                                | Error notification                    |

### 3. Database Schema (Drizzle ORM)

The database is MySQL, managed with Drizzle ORM. Key tables:

- **`users`** – Stores user information from Google OAuth.
- **`documents`** – Document metadata, latest snapshot, and statistics.
- **`documentPermissions`** – Access control (owner/editor/viewer).
- **`operations`** – Log of all CRDT operations (for recovery and versioning).
- **`sessions`** – Active editing sessions with cursor positions.
- **`offlineQueue`** – Queued operations for offline clients.

### 4. Offline & Sync Flow

When a client loses connection:

1. **Queue Operations** – Local edits are stored in IndexedDB (via Yjs persistence) and also sent to the server’s `offlineQueue` table.
2. **Reconnect** – Upon reconnection, the client sends its vector clock; the server responds with missing updates.
3. **Conflict Recovery** – Yjs automatically merges offline edits with the current server state.

### 5. Authentication

Authentication is handled via **Google OAuth 2.0**:

1. User clicks “Sign in with Google” on the landing page.
2. Backend exchanges the authorization code for an access token and retrieves user info.
3. A JWT session token is created and stored in an HTTP‑only cookie (`app_session_id`).
4. All subsequent tRPC and WebSocket requests validate this cookie.

### 6. API Layer (tRPC)

tRPC provides a type‑safe RPC layer. Routers:

- **`auth`** – `me`, `logout`
- **`documents`** – `create`, `get`, `list`, `getPermissions`, `getOperations`, `delete`
- **`sharing`** – `shareDocument`, `revokeAccess`, `getSharedDocuments`, `getUserByEmail`

All procedures are protected (except `auth.me` and `auth.logout`) and attach the authenticated user to the context.

### 7. Real‑Time Collaboration in Action

1. **User A** opens a document → WebSocket joins room `doc:123`.
2. Server loads the `Y.Doc` from the latest snapshot and sends it to User A.
3. **User B** joins the same room → receives the current document state and a list of active users.
4. When **User A** types, Yjs generates a binary update that is sent via `update` event.
5. Server applies the update to its master `Y.Doc`, broadcasts it to all other clients in the room, and persists the operation to the `operations` table.
6. **User B** receives the update, applies it locally, and the editor content updates.
7. Cursor movements are throttled and broadcast via `cursor_update`.

---

## 📁 Project Structure

```
MUCK/
├── client/                     # Frontend React application
│   ├── index.html
│   ├── src/
│   │   ├── _core/               # Core frontend modules
│   │   │   └── hooks/useAuth.ts
│   │   ├── components/          # UI components
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── AIChatBox.tsx    # Optional AI chat (for future)
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ShareDialog.tsx
│   │   │   └── ...
│   │   ├── contexts/            # React contexts (ThemeContext)
│   │   ├── hooks/               # Custom hooks
│   │   │   ├── useCollaborativeEditor.ts  # Core editor logic
│   │   │   ├── useComposition.ts          # IME composition handling
│   │   │   └── useMobile.tsx
│   │   ├── lib/                 # Utilities (trpc client, cn)
│   │   ├── pages/                # Page components
│   │   │   ├── Documents.tsx
│   │   │   ├── Editor.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── landing.tsx
│   │   │   └── NotFound.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── const.ts
│   └── public/                   # Static assets
├── server/                       # Backend Node.js application
│   ├── _core/                     # Core server modules
│   │   ├── context.ts             # tRPC context creator
│   │   ├── cookies.ts             # Cookie utilities
│   │   ├── env.ts                 # Environment validation
│   │   ├── index.ts               # Express server entry
│   │   ├── oauth.ts               # Google OAuth routes
│   │   ├── sdk.ts                 # Auth SDK (JWT)
│   │   ├── trpc.ts                # tRPC router setup
│   │   └── vite.ts                # Vite integration (dev)
│   ├── routers/                    # tRPC routers
│   │   ├── documents.ts
│   │   └── sharing.ts
│   ├── db.ts                        # Database queries (Drizzle)
│   ├── websocket.ts                 # Socket.io server
│   ├── offline.ts                   # Offline recovery manager
│   └── storage.ts                   # File storage helper (S3)
├── drizzle/                         # Drizzle ORM schema & migrations
│   ├── schema.ts
│   ├── relations.ts
│   └── migrations/
├── shared/                          # Code shared between client & server
│   ├── const.ts
│   └── types.ts
├── docker/                          # Docker configuration
│   └── mysql/init/
├── patches/                          # Patched dependencies
├── .env.example
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── README.md                         # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 9.0.0 (or npm/yarn)
- **MySQL** (or Docker for local container)
- **Google OAuth credentials** (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AstroIshu/MUCK.git
   cd MUCK
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration (see [Configuration](#configuration)).

4. **Start the database** (using Docker)
   ```bash
   docker-compose up -d
   ```
   Or set up MySQL manually and update `DATABASE_URL`.

5. **Run database migrations**
   ```bash
   pnpm run db:push
   ```

6. **Start the development server**
   ```bash
   pnpm run dev
   ```
   The app will be available at `http://localhost:3000`.

### Configuration

Create a `.env.local` file in the root directory. The following variables are required:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL connection string (e.g., `mysql://user:pass@localhost:3306/muck`) |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
| `JWT_SECRET` | Secret key for signing JWT tokens (at least 32 characters) |
| `COOKIE_SECRET` | Secret for cookie encryption |
| `APP_ID` | Application identifier (any string) |
| `OWNER_OPEN_ID` (optional) | OpenID of the admin user |
| `VITE_GOOGLE_CLIENT_ID` | Same as `GOOGLE_CLIENT_ID`, exposed to frontend |
| `VITE_APP_TITLE` (optional) | App title shown in browser |
| `VITE_APP_LOGO` (optional) | URL to app logo |

> ⚠️ **Never commit `.env.local` to version control.**

---

## 📖 Usage Guide

### 1. Sign In

- Visit the landing page and click **Sign in with Google**.
- Authorise the application (you may need to grant access to your email and profile).
- After successful authentication, you’ll be redirected to the documents dashboard.

### 2. Create a Document

- On the **Documents** page, enter a document name in the input field and click **Create**.
- The new document opens automatically in the editor.

### 3. Collaborate in Real Time

- Share the document URL with collaborators.
- Active users are shown in the right sidebar, each with a distinct colour.
- Cursors and selections of other users appear as coloured highlights in the editor.
- All changes are synchronised instantly.

### 4. View Statistics

- The document header displays live word count and character count.
- Connection status (green dot = connected, red = disconnected) is shown in the top right.

### 5. Share a Document

- Open a document and click the **Share** button.
- Enter the email address of the user you want to share with.
- Choose a role: **Editor** (can edit) or **Viewer** (read‑only).
- Click **Share**. The user will see the document in their list.

### 6. Manage Documents

- On the **Documents** page, you can:
  - Click on any document card to open it.
  - Delete your own documents (owner only) using the trash icon.
  - See who owns each document (Owner / Shared).

### 7. Logout

- Click on your avatar in the bottom‑left corner of the sidebar and select **Sign out**.

---

## 📡 API Reference

### tRPC Endpoints

All tRPC endpoints are mounted at `/api/trpc`.  
Use the tRPC client (auto‑generated types) to interact.

#### `auth.me`
- **Method**: `query`
- **Returns**: Current user object or `null` if not authenticated.

#### `auth.logout`
- **Method**: `mutation`
- **Returns**: `{ success: true }`

#### `documents.create`
- **Input**: `{ name: string }`
- **Returns**: `{ success: true, documentId: number }`

#### `documents.get`
- **Input**: `{ documentId: number }`
- **Returns**: Document metadata.

#### `documents.list`
- **Returns**: Array of documents accessible by the user.

#### `documents.delete`
- **Input**: `{ documentId: number }`
- **Returns**: `{ success: true }`

#### `sharing.shareDocument`
- **Input**: `{ documentId: number, userId: number, role: 'editor' | 'viewer' }`
- **Returns**: Success message.

### WebSocket Events

See the [Architecture Overview](#-architecture-overview) for a full list of events.

---

## 🗃️ Database Schema

Key tables (defined in `drizzle/schema.ts`):

- **users**
  - `id` (int, primary key)
  - `openId` (varchar, unique) – Google OAuth sub
  - `name` (text)
  - `email` (varchar)
  - `role` (enum 'user'|'admin')
  - `createdAt`, `updatedAt`, `lastSignedIn`

- **documents**
  - `id` (int, primary key)
  - `name` (varchar)
  - `ownerId` (int, foreign key to users)
  - `content` (longtext) – current plain text (fallback)
  - `snapshotState` (longtext) – Base64 encoded Yjs snapshot
  - `snapshotVersion` (int)
  - `wordCount`, `characterCount` (int)
  - `lastEditedBy` (int, foreign key to users)
  - `createdAt`, `updatedAt`

- **documentPermissions**
  - `id` (int, primary key)
  - `documentId` (int, foreign key)
  - `userId` (int, foreign key)
  - `role` (enum 'owner'|'editor'|'viewer')
  - `grantedAt`, `grantedBy`

- **operations**
  - `id` (int, primary key)
  - `documentId` (int)
  - `clientId` (varchar)
  - `userId` (int)
  - `updateData` (longtext) – Base64 Yjs update
  - `lamportTime` (int)
  - `vectorClock` (json)
  - `version` (int)
  - `createdAt`

- **sessions**
  - `id` (int, primary key)
  - `documentId` (int)
  - `userId` (int)
  - `clientId` (varchar, unique)
  - `cursorPosition` (int)
  - `selectionStart`, `selectionEnd` (int)
  - `userColor` (varchar)
  - `joinedAt`, `lastHeartbeat`

- **offlineQueue**
  - `id` (int, primary key)
  - `clientId` (varchar)
  - `documentId` (int)
  - `updateData` (longtext)
  - `sequenceNumber` (int)
  - `createdAt`

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please ensure your code follows the existing style (Prettier) and includes appropriate tests.

---

## 📄 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Yjs](https://yjs.dev) – CRDT framework
- [shadcn/ui](https://ui.shadcn.com) – Beautifully designed components
- [tRPC](https://trpc.io) – End‑to‑end typesafe APIs
- [Drizzle ORM](https://orm.drizzle.team) – TypeScript ORM
- [Socket.io](https://socket.io) – Real‑time engine
- All contributors and the open‑source community

---

**Built with ❤️ by [AstroIshu](https://github.com/AstroIshu)**
