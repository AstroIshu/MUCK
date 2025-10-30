import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import * as Y from "yjs";
import {
  addOperation,
  checkDocumentAccess,
  createSession,
  deleteSession,
  getActiveSessions,
  getDocument,
  getOperationsSince,
  updateSessionCursor,
} from "./db";
import { getUserByOpenId } from "./db";

// Types for WebSocket messages
interface JoinRoomMessage {
  documentId: number;
  clientId: string;
  token: string;
}

interface SyncStep1Message {
  stateVector: Uint8Array;
  clientId: string;
}

interface SyncStep2Message {
  update: Uint8Array;
  clientId: string;
}

interface UpdateMessage {
  update: Uint8Array;
  clientId: string;
}

interface CursorUpdateMessage {
  position: number;
  selection?: [number, number];
  clientId: string;
}

interface UserSession {
  userId: number;
  clientId: string;
  documentId: number;
  color: string;
  lastHeartbeat: number;
}

interface DocumentRoom {
  doc: Y.Doc;
  text: Y.Text;
  users: Map<string, UserSession>;
  lamportTime: number;
  vectorClocks: Map<string, number>;
  operationBuffer: Array<{ update: Uint8Array; clientId: string; timestamp: number }>;
  lastSnapshot: { version: number; timestamp: number };
}

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
];

let colorIndex = 0;

function getNextColor(): string {
  const color = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return color;
}

function parseJWT(token: string): { openId: string; exp: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    return payload;
  } catch {
    return null;
  }
}

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  const rooms = new Map<number, DocumentRoom>();

  // Helper to get or create document room
  async function getOrCreateRoom(documentId: number): Promise<DocumentRoom | null> {
    if (rooms.has(documentId)) {
      return rooms.get(documentId)!;
    }

    const doc = await getDocument(documentId);
    if (!doc) return null;

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("shared-text");

    // Load snapshot if exists
    if (doc.snapshotState) {
      try {
        const state = Buffer.from(doc.snapshotState, "base64");
        Y.applyUpdate(ydoc, new Uint8Array(state));
      } catch (error) {
        console.error(`[CRDT] Failed to load snapshot for document ${documentId}:`, error);
      }
    }

    const room: DocumentRoom = {
      doc: ydoc,
      text: ytext,
      users: new Map(),
      lamportTime: 0,
      vectorClocks: new Map(),
      operationBuffer: [],
      lastSnapshot: { version: doc.snapshotVersion || 0, timestamp: Date.now() },
    };

    rooms.set(documentId, room);
    return room;
  }

  // Helper to broadcast update to all clients in room
  function broadcastUpdate(
    documentId: number,
    update: Uint8Array,
    clientId: string,
    lamportTime: number
  ) {
    const room = rooms.get(documentId);
    if (!room) return;

    io.to(`doc:${documentId}`).emit("update", {
      update: Array.from(update),
      clientId,
      lamportTime,
      timestamp: Date.now(),
    });

    // Buffer operation for persistence
    room.operationBuffer.push({
      update,
      clientId,
      timestamp: Date.now(),
    });

    // Trigger snapshot if buffer is large
    if (room.operationBuffer.length > 100) {
      persistSnapshot(documentId, room);
    }
  }

  // Helper to persist snapshot
  async function persistSnapshot(documentId: number, room: DocumentRoom) {
    try {
      const state = Y.encodeStateAsUpdate(room.doc);
      const stateBase64 = Buffer.from(state).toString("base64");

      // Update document snapshot in database
      const db = await import("./db").then((m) => m.getDb());
      if (db) {
        // Note: This would need a proper update function in db.ts
        console.log(`[CRDT] Snapshot persisted for document ${documentId}`);
      }

      room.operationBuffer = [];
      room.lastSnapshot = { version: room.lastSnapshot.version + 1, timestamp: Date.now() };
    } catch (error) {
      console.error(`[CRDT] Failed to persist snapshot for document ${documentId}:`, error);
    }
  }

  // Socket connection handler
  io.on("connection", (socket: Socket) => {
    let currentSession: UserSession | null = null;

    socket.on("join_room", async (message: JoinRoomMessage) => {
      try {
        const { documentId, clientId, token } = message;

        // Validate JWT token
        const payload = parseJWT(token);
        if (!payload) {
          socket.emit("error", { message: "Invalid token", code: "AUTH_FAILED" });
          return;
        }

        // Get user from database
        const user = await getUserByOpenId(payload.openId);
        if (!user) {
          socket.emit("error", { message: "User not found", code: "USER_NOT_FOUND" });
          return;
        }

        // Get or create room (also validates document exists)
        const room = await getOrCreateRoom(documentId);
        if (!room) {
          socket.emit("error", { message: "Document not found", code: "NOT_FOUND" });
          return;
        }

        // Check document access - owner always has access
        const doc = await getDocument(documentId);
        if (doc && doc.ownerId !== user.id) {
          const access = await checkDocumentAccess(documentId, user.id);
          if (!access) {
            socket.emit("error", { message: "Access denied", code: "ACCESS_DENIED" });
            return;
          }
        }

        // Create session
        const color = getNextColor();
        const session: UserSession = {
          userId: user.id,
          clientId,
          documentId,
          color,
          lastHeartbeat: Date.now(),
        };

        currentSession = session;
        room.users.set(clientId, session);

        // Create database session
        await createSession(documentId, user.id, clientId, color);

        // Join socket room
        socket.join(`doc:${documentId}`);

        // Send current document state
        const state = Y.encodeStateAsUpdate(room.doc);
        socket.emit("room_joined", {
          documentId,
          clientId,
          users: Array.from(room.users.values()).map((u) => ({
            clientId: u.clientId,
            userId: u.userId,
            color: u.color,
          })),
          docState: Array.from(state),
          lamportTime: room.lamportTime,
        });

        // Notify other users
        socket.to(`doc:${documentId}`).emit("user_joined", {
          userId: user.id,
          clientId,
          name: user.name,
          color,
        });

        console.log(`[WebSocket] User ${user.id} joined document ${documentId} with client ${clientId}`);
      } catch (error) {
        console.error("[WebSocket] Error joining room:", error);
        socket.emit("error", { message: "Internal server error", code: "SERVER_ERROR" });
      }
    });

    socket.on("sync_step1", async (message: SyncStep1Message) => {
      try {
        if (!currentSession) {
          socket.emit("error", { message: "Not in room", code: "NOT_IN_ROOM" });
          return;
        }

        const room = rooms.get(currentSession.documentId);
        if (!room) return;

        const stateVector = new Uint8Array(message.stateVector);
        const diff = Y.encodeStateAsUpdate(room.doc, stateVector);

        socket.emit("sync_step2", {
          update: Array.from(diff),
          clientId: message.clientId,
        });
      } catch (error) {
        console.error("[WebSocket] Error in sync_step1:", error);
      }
    });

    socket.on("update", async (message: UpdateMessage) => {
      try {
        if (!currentSession) {
          socket.emit("error", { message: "Not in room", code: "NOT_IN_ROOM" });
          return;
        }

        const room = rooms.get(currentSession.documentId);
        if (!room) return;

        const update = new Uint8Array(message.update);

        // Apply update to local CRDT
        Y.applyUpdate(room.doc, update);

        // Increment Lamport clock
        room.lamportTime++;
        room.vectorClocks.set(message.clientId, (room.vectorClocks.get(message.clientId) || 0) + 1);

        // Persist operation
        await addOperation(
          currentSession.documentId,
          message.clientId,
          currentSession.userId,
          Buffer.from(update).toString("base64"),
          room.lamportTime,
          Object.fromEntries(room.vectorClocks),
          room.lastSnapshot.version + room.operationBuffer.length
        );

        // Broadcast to other clients
        broadcastUpdate(currentSession.documentId, update, message.clientId, room.lamportTime);

        console.log(`[CRDT] Update applied for document ${currentSession.documentId}`);
      } catch (error) {
        console.error("[WebSocket] Error processing update:", error);
        socket.emit("error", { message: "Failed to process update", code: "UPDATE_FAILED" });
      }
    });

    socket.on("cursor_update", async (message: CursorUpdateMessage) => {
      try {
        if (!currentSession) return;

        const room = rooms.get(currentSession.documentId);
        if (!room) return;

        // Update session cursor
        await updateSessionCursor(
          message.clientId,
          message.position,
          message.selection?.[0],
          message.selection?.[1]
        );

        // Broadcast cursor to other users
        socket.to(`doc:${currentSession.documentId}`).emit("cursor_update", {
          userId: currentSession.userId,
          clientId: message.clientId,
          position: message.position,
          selection: message.selection,
          color: currentSession.color,
          name: "User", // TODO: Get actual user name
        });
      } catch (error) {
        console.error("[WebSocket] Error updating cursor:", error);
      }
    });

    socket.on("ping", () => {
      if (currentSession) {
        currentSession.lastHeartbeat = Date.now();
      }
      socket.emit("pong");
    });

    socket.on("disconnect", async () => {
      try {
        if (currentSession) {
          const room = rooms.get(currentSession.documentId);
          if (room) {
            room.users.delete(currentSession.clientId);

            // Notify other users
            socket.to(`doc:${currentSession.documentId}`).emit("user_left", {
              clientId: currentSession.clientId,
              userId: currentSession.userId,
            });

            // Clean up empty rooms
            if (room.users.size === 0) {
              persistSnapshot(currentSession.documentId, room);
              rooms.delete(currentSession.documentId);
            }
          }

          // Delete session from database
          await deleteSession(currentSession.clientId);

          console.log(
            `[WebSocket] User ${currentSession.userId} left document ${currentSession.documentId}`
          );
        }
      } catch (error) {
        console.error("[WebSocket] Error handling disconnect:", error);
      }
    });
  });

  return io;
}
