# Multi User Real Time Text Editor

A real-time collaborative text editor enabling multiple users to simultaneously edit documents with automatic conflict resolution and live cursor tracking.

## Features

- **Real-time Collaboration**
  - Concurrent editing with instant synchronization
  - Live cursor and selection tracking
  - Active users presence indicators
  - Automatic conflict resolution

- **Document Management**
  - Create and organize multiple documents
  - Document statistics (word count, character count)
  - Version history and change tracking
  - Persistent storage of content

- **User Experience**
  - Clean, modern interface
  - Responsive design
  - Offline support with auto-reconnection
  - Cross-platform compatibility

## Tech Stack

### Frontend
- React 19 with TypeScript
- Tailwind CSS 4
- shadcn/ui components
- Socket.io client

### Backend
- Node.js with Express
- tRPC for type-safe API
- Yjs CRDT for conflict resolution
- Socket.io for WebSocket communication

### Database
- MySQL/TiDB
- Drizzle ORM

## Getting Started

### Prerequisites
```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation
1. Clone the repository
```bash
git clone https://github.com/AstroIshu/MUCK.git
cd MUCK
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development server
```bash
npm run dev
```

## Usage

### Document Creation
1. Navigate to the Documents page
2. Click "New Document"
3. Enter document name
4. Start editing

### Collaboration
- Share document URL with collaborators
- View active users in right sidebar
- See real-time cursor positions
- Changes sync automatically

## Development

### Project Structure
```
MUCK/
├── src/
│   ├── client/     # Frontend React application
│   ├── server/     # Backend Node.js server
│   └── shared/     # Shared types and utilities
├── public/         # Static assets
└── tests/         # Test suites
```

### Scripts
- `npm run dev` - Start development environment
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Run linting

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request
