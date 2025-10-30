# Real-Time CRDT Collaborative Editor - User Guide

**Website Purpose:** A real-time collaborative text editor where multiple users can edit the same document simultaneously with automatic conflict resolution and shared cursors.

**Access:** Login required (Manus OAuth)

---

## Powered by Manus

This application is built with cutting-edge technologies:

**Frontend:** React 19 + TypeScript + Tailwind CSS 4 with shadcn/ui components for a modern, responsive interface

**Backend:** Node.js + Express + tRPC for type-safe real-time communication

**Real-Time Sync:** Yjs CRDT (Conflict-free Replicated Data Type) for automatic conflict resolution and intention preservation across concurrent edits

**Database:** MySQL/TiDB with Drizzle ORM for persistent storage of documents, operations, and user sessions

**Transport:** Socket.io WebSocket for low-latency real-time collaboration with automatic reconnection and offline support

**Deployment:** Auto-scaling infrastructure with global CDN for seamless performance

---

## Using Your Website

### Creating Documents

Click **"Create Document"** on the Documents page, enter a name, and press Enter or click the Create button. Your new document opens immediately in the editor.

### Editing in Real-Time

Type directly into the editor textarea. Your changes sync instantly to all connected collaborators. You'll see:

- **Live cursor positions** of other users displayed in the sidebar with their assigned colors
- **Selection ranges** shown when collaborators highlight text
- **Active users list** showing everyone currently editing the document
- **Connection status** indicator (green = connected, red = disconnected)

### Viewing Collaborators

The right sidebar displays:

- **Active Users:** Shows all users currently editing with their assigned color
- **Cursors:** Real-time cursor positions and text selections from other users

### Word and Character Count

The document header shows real-time statistics: word count and character count update as you type.

---

## Managing Your Website

### Documents Page

Access the Documents page from the home screen to:

- **Create new documents** using the input field at the top
- **View all your documents** as cards showing name, word count, character count, and last edited time
- **Open any document** by clicking the card or the "Open" button

### Editor Page

The editor provides:

- **Document header** with name and statistics
- **Textarea editor** for writing content with monospace font
- **User presence sidebar** showing active collaborators and their cursors
- **Connection status** indicator in the top-right corner

### Settings (via Management UI)

Access Settings → Secrets to manage authentication tokens if needed for API integrations.

---

## Next Steps

Talk to Manus AI anytime to request changes or add features. You can ask for:

- Document sharing and permission management (owner/editor/viewer roles)
- Version history and time-travel to previous document states
- Export documents as PDF or Markdown
- Rich text formatting (bold, italic, lists, etc.)
- Comments and annotations
- Search across documents
- Document templates

Start collaborating now by creating your first document and inviting teammates to edit together!
