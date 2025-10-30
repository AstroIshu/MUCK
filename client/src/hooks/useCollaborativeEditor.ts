import { useEffect, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

interface UserCursor {
  userId: number;
  clientId: string;
  position: number;
  selection?: [number, number];
  color: string;
  name: string;
}

interface UseCollaborativeEditorProps {
  documentId: number;
  onContentChange?: (content: string) => void;
  onCursorsChange?: (cursors: Map<string, UserCursor>) => void;
  onUsersChange?: (users: Map<string, UserCursor>) => void;
}

export function useCollaborativeEditor({
  documentId,
  onContentChange,
  onCursorsChange,
  onUsersChange,
}: UseCollaborativeEditorProps) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const clientIdRef = useRef<string>("");
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [content, setContent] = useState("");
  const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map());
  const [remoteUsers, setRemoteUsers] = useState<Map<string, UserCursor>>(new Map());

  // Initialize CRDT document
  useEffect(() => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("shared-text");

    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    // Listen to local changes
    const updateHandler = () => {
      const newContent = ytext.toString();
      setContent(newContent);
      onContentChange?.(newContent);
    };

    ytext.observe(updateHandler);

    return () => {
      ytext.unobserve(updateHandler);
      ydoc.destroy();
    };
  }, [onContentChange]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user || !documentId) return;

    // Generate unique client ID
    const clientId = `${user.id}-${Date.now()}-${Math.random()}`;
    clientIdRef.current = clientId;

    const socket = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WebSocket] Connected");
      setIsConnected(true);

      // Get JWT token from localStorage or cookie
      const token = localStorage.getItem("auth_token") || "";

      // Join room
      socket.emit("join_room", {
        documentId,
        clientId,
        token,
      });
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Disconnected");
      setIsConnected(false);
    });

    socket.on("room_joined", (data) => {
      console.log("[WebSocket] Joined room", data);

      if (ydocRef.current && data.docState) {
        const state = new Uint8Array(data.docState);
        Y.applyUpdate(ydocRef.current, state);
      }

      // Update remote users
      const users = new Map<string, UserCursor>();
      data.users?.forEach((u: any) => {
        users.set(u.clientId, {
          userId: u.userId,
          clientId: u.clientId,
          position: 0,
          color: u.color,
          name: `User ${u.userId}`,
        });
      });
      setRemoteUsers(users);
      onUsersChange?.(users);
    });

    socket.on("update", (data) => {
      if (ydocRef.current && data.update) {
        const update = new Uint8Array(data.update);
        Y.applyUpdate(ydocRef.current, update);
      }
    });

    socket.on("cursor_update", (data) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(data.clientId, {
          userId: data.userId,
          clientId: data.clientId,
          position: data.position,
          selection: data.selection,
          color: data.color,
          name: data.name,
        });
        onCursorsChange?.(next);
        return next;
      });
    });

    socket.on("user_joined", (data) => {
      console.log("[WebSocket] User joined:", data);
      setRemoteUsers((prev) => {
        const next = new Map(prev);
        next.set(data.clientId, {
          userId: data.userId,
          clientId: data.clientId,
          position: 0,
          color: data.color,
          name: data.name,
        });
        onUsersChange?.(next);
        return next;
      });
    });

    socket.on("user_left", (data) => {
      console.log("[WebSocket] User left:", data);
      setRemoteUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.clientId);
        onUsersChange?.(next);
        return next;
      });

      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(data.clientId);
        onCursorsChange?.(next);
        return next;
      });
    });

    socket.on("error", (error) => {
      console.error("[WebSocket] Error:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, documentId, onCursorsChange, onUsersChange]);

  // Apply local changes to CRDT
  const updateContent = useCallback((newContent: string) => {
    if (!ytextRef.current) return;

    const ytext = ytextRef.current;
    const currentContent = ytext.toString();

    if (currentContent === newContent) return;

    // Simple diff-based update (for production, use a proper diff algorithm)
    if (newContent.length > currentContent.length) {
      const diff = newContent.slice(currentContent.length);
      ytext.insert(currentContent.length, diff);
    } else if (newContent.length < currentContent.length) {
      ytext.delete(newContent.length, currentContent.length - newContent.length);
    }

    // Send update to server
    if (socketRef.current && ydocRef.current) {
      const update = Y.encodeStateAsUpdate(ydocRef.current);
      socketRef.current.emit("update", {
        update: Array.from(update),
        clientId: clientIdRef.current,
      });
    }
  }, []);

  // Send cursor update
  const updateCursor = useCallback((position: number, selection?: [number, number]) => {
    if (!socketRef.current) return;

    // Clear previous timeout
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
    }

    // Throttle cursor updates
    cursorTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("cursor_update", {
        position,
        selection,
        clientId: clientIdRef.current,
      });
    }, 100);
  }, []);

  // Send heartbeat
  useEffect(() => {
    if (!socketRef.current || !isConnected) return;

    const heartbeatInterval = setInterval(() => {
      socketRef.current?.emit("ping");
    }, 30000);

    return () => clearInterval(heartbeatInterval);
  }, [isConnected]);

  return {
    content,
    isConnected,
    cursors,
    remoteUsers,
    updateContent,
    updateCursor,
    ydoc: ydocRef.current,
    ytext: ytextRef.current,
  };
}
