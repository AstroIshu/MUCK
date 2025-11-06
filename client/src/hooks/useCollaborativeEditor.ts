// import { useEffect, useRef, useState, useCallback } from "react";
// import * as Y from "yjs";
// import { io, Socket } from "socket.io-client";
// import { useAuth } from "@/_core/hooks/useAuth";

// interface UserCursor {
//   userId: number;
//   clientId: string;
//   position: number;
//   selection?: [number, number];
//   color: string;
//   name: string;
// }

// interface UseCollaborativeEditorProps {
//   documentId: number;
//   onContentChange?: (content: string) => void;
//   onCursorsChange?: (cursors: Map<string, UserCursor>) => void;
//   onUsersChange?: (users: Map<string, UserCursor>) => void;
// }

// export function useCollaborativeEditor({
//   documentId,
//   onContentChange,
//   onCursorsChange,
//   onUsersChange,
// }: UseCollaborativeEditorProps) {
//   const { user } = useAuth();
//   const socketRef = useRef<Socket | null>(null);
//   const ydocRef = useRef<Y.Doc | null>(null);
//   const ytextRef = useRef<Y.Text | null>(null);
//   const clientIdRef = useRef<string>("");
//   const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   const [isConnected, setIsConnected] = useState(false);
//   const [content, setContent] = useState("");
//   const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map());
//   const [remoteUsers, setRemoteUsers] = useState<Map<string, UserCursor>>(new Map());

//   // Initialize CRDT document
//   useEffect(() => {
//     const ydoc = new Y.Doc();
//     const ytext = ydoc.getText("shared-text");

//     ydocRef.current = ydoc;
//     ytextRef.current = ytext;

//     // Listen to local changes
//     const updateHandler = () => {
//       const newContent = ytext.toString();
//       setContent(newContent);
//       onContentChange?.(newContent);
//     };

//     ytext.observe(updateHandler);

//     return () => {
//       ytext.unobserve(updateHandler);
//       ydoc.destroy();
//     };
//   }, [onContentChange]);

//   // Initialize WebSocket connection
//   useEffect(() => {
//     if (!user || !documentId) return;

//     // Generate unique client ID
//     const clientId = `${user.id}-${Date.now()}-${Math.random()}`;
//     clientIdRef.current = clientId;

//     const socket = io(window.location.origin, {
//       reconnection: true,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       reconnectionAttempts: 5,
//     });

//     socketRef.current = socket;

//     socket.on("connect", () => {
//       console.log("[WebSocket] Connected");
//       setIsConnected(true);

//       // Get JWT token from localStorage or cookie
//       const token = localStorage.getItem("auth_token") || "";

//       // Join room
//       socket.emit("join_room", {
//         documentId,
//         clientId,
//         token,
//       });
//     });

//     socket.on("disconnect", () => {
//       console.log("[WebSocket] Disconnected");
//       setIsConnected(false);
//     });

//     socket.on("room_joined", (data) => {
//       console.log("[WebSocket] Joined room", data);

//       if (ydocRef.current && data.docState) {
//         const state = new Uint8Array(data.docState);
//         Y.applyUpdate(ydocRef.current, state);
//       }

//       // Update remote users
//       const users = new Map<string, UserCursor>();
//       data.users?.forEach((u: any) => {
//         users.set(u.clientId, {
//           userId: u.userId,
//           clientId: u.clientId,
//           position: 0,
//           color: u.color,
//           name: `User ${u.userId}`,
//         });
//       });
//       setRemoteUsers(users);
//       onUsersChange?.(users);
//     });

//     socket.on("update", (data) => {
//       if (ydocRef.current && data.update) {
//         const update = new Uint8Array(data.update);
//         Y.applyUpdate(ydocRef.current, update);
//       }
//     });

//     socket.on("cursor_update", (data) => {
//       setCursors((prev) => {
//         const next = new Map(prev);
//         next.set(data.clientId, {
//           userId: data.userId,
//           clientId: data.clientId,
//           position: data.position,
//           selection: data.selection,
//           color: data.color,
//           name: data.name,
//         });
//         onCursorsChange?.(next);
//         return next;
//       });
//     });

//     socket.on("user_joined", (data) => {
//       console.log("[WebSocket] User joined:", data);
//       setRemoteUsers((prev) => {
//         const next = new Map(prev);
//         next.set(data.clientId, {
//           userId: data.userId,
//           clientId: data.clientId,
//           position: 0,
//           color: data.color,
//           name: data.name,
//         });
//         onUsersChange?.(next);
//         return next;
//       });
//     });

//     socket.on("user_left", (data) => {
//       console.log("[WebSocket] User left:", data);
//       setRemoteUsers((prev) => {
//         const next = new Map(prev);
//         next.delete(data.clientId);
//         onUsersChange?.(next);
//         return next;
//       });

//       setCursors((prev) => {
//         const next = new Map(prev);
//         next.delete(data.clientId);
//         onCursorsChange?.(next);
//         return next;
//       });
//     });

//     socket.on("error", (error) => {
//       console.error("[WebSocket] Error:", error);
//     });

//     return () => {
//       socket.disconnect();
//     };
//   }, [user, documentId, onCursorsChange, onUsersChange]);

//   // Apply local changes to CRDT
//   const updateContent = useCallback((newContent: string) => {
//     if (!ytextRef.current) return;

//     const ytext = ytextRef.current;
//     const currentContent = ytext.toString();

//     if (currentContent === newContent) return;

//     // Find the first difference between old and new content
//     let startIndex = 0;
//     while (startIndex < currentContent.length && startIndex < newContent.length &&
//            currentContent[startIndex] === newContent[startIndex]) {
//       startIndex++;
//     }

//     // Find the end of the difference
//     let endIndexOld = currentContent.length;
//     let endIndexNew = newContent.length;
//     while (endIndexOld > startIndex && endIndexNew > startIndex &&
//            currentContent[endIndexOld - 1] === newContent[endIndexNew - 1]) {
//       endIndexOld--;
//       endIndexNew--;
//     }

//     // Calculate the length of text to delete and insert
//     const deleteLength = endIndexOld - startIndex;
//     const insertText = newContent.slice(startIndex, endIndexNew);

//     // Apply the changes
//     if (deleteLength > 0) {
//       ytext.delete(startIndex, deleteLength);
//     }
//     if (insertText.length > 0) {
//       ytext.insert(startIndex, insertText);
//     }

//     // Send update to server
//     if (socketRef.current && ydocRef.current) {
//       const update = Y.encodeStateAsUpdate(ydocRef.current);
//       socketRef.current.emit("update", {
//         update: Array.from(update),
//         clientId: clientIdRef.current,
//       });
//     }
//   }, []);

//   // Send cursor update
//   const updateCursor = useCallback((position: number, selection?: [number, number]) => {
//     if (!socketRef.current) return;

//     // Clear previous timeout
//     if (cursorTimeoutRef.current) {
//       clearTimeout(cursorTimeoutRef.current);
//     }

//     // Throttle cursor updates
//     cursorTimeoutRef.current = setTimeout(() => {
//       socketRef.current?.emit("cursor_update", {
//         position,
//         selection,
//         clientId: clientIdRef.current,
//       });
//     }, 100);
//   }, []);

//   // Send heartbeat
//   useEffect(() => {
//     if (!socketRef.current || !isConnected) return;

//     const heartbeatInterval = setInterval(() => {
//       socketRef.current?.emit("ping");
//     }, 30000);

//     return () => clearInterval(heartbeatInterval);
//   }, [isConnected]);

//   return {
//     content,
//     isConnected,
//     cursors,
//     remoteUsers,
//     updateContent,
//     updateCursor,
//     ydoc: ydocRef.current,
//     ytext: ytextRef.current,
//     socket: socketRef.current,
//   };
// }

// Writing the new code because the previous one was causing looping issues
import { useEffect, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

// ... (your interfaces remain the same)
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

  // Add mount protection
  const isMountedRef = useRef(false);
  const initializationRef = useRef<Promise<void> | null>(null);
  const hasConnectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [content, setContent] = useState("");
  const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map());
  const [remoteUsers, setRemoteUsers] = useState<Map<string, UserCursor>>(
    new Map()
  );

  // Initialize CRDT document - ONLY ONCE with mount protection
  useEffect(() => {
    if (isMountedRef.current || ydocRef.current) return;

    isMountedRef.current = true;
    console.log("[WebSocket] Initializing CRDT document");

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("shared-text");

    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    const updateHandler = () => {
      const newContent = ytext.toString();
      setContent(newContent);
      onContentChange?.(newContent);
    };

    ytext.observe(updateHandler);

    const ydocUpdateHandler = (update: Uint8Array, origin: any) => {
      if (origin === 'local' && socketRef.current?.connected) {
        socketRef.current.emit("update", {
          update: Array.from(update),
          clientId: clientIdRef.current,
        });
      }
    };

    ydoc.on('update', ydocUpdateHandler);

    return () => {
      // Don't destroy during development Strict Mode remounts
      // Only destroy when truly unmounting
      if (isMountedRef.current) {
        ytext.unobserve(updateHandler);
        ydoc.off('update', ydocUpdateHandler);
        // We'll let the final cleanup handle destruction
      }
    };
  }, []);

  // Initialize WebSocket connection with robust mount protection
  useEffect(() => {
    // Early returns for invalid states
    if (!user || !documentId) return;
    if (socketRef.current?.connected) return;

    // Create initialization promise to prevent concurrent initializations
    if (!initializationRef.current) {
      initializationRef.current = (async () => {
        try {
          console.log("[WebSocket] Starting connection initialization...");

          // Generate unique client ID
          const clientId = `${user.id}-${Date.now()}-${Math.random()}`;
          clientIdRef.current = clientId;

          const socket = io(window.location.origin, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            withCredentials: true,
            transports: ["websocket", "polling"],
            autoConnect: true,
          });

          socketRef.current = socket;

          // Set up event listeners
          const handleConnect = () => {
            if (!isMountedRef.current) {
              socket.disconnect();
              return;
            }
            console.log("[WebSocket] Connected");
            setIsConnected(true);
            hasConnectedRef.current = true;

            socket.emit("join_room", {
              documentId,
              clientId,
              token: "",
            });
          };

          const handleDisconnect = (reason: string) => {
            if (!isMountedRef.current) return;
            console.log("[WebSocket] Disconnected, reason:", reason);
            setIsConnected(false);
          };

          const handleConnectError = (error: Error) => {
            console.error("[WebSocket] Connection error:", error);
          };

          socket.on("connect", handleConnect);
          socket.on("disconnect", handleDisconnect);
          socket.on("connect_error", handleConnectError);

          socket.on("room_joined", data => {
            if (!isMountedRef.current) return;
            console.log("[WebSocket] Joined room", data);

            if (ydocRef.current && data.docState) {
              const state = new Uint8Array(data.docState);
              Y.applyUpdate(ydocRef.current, state);
            }

            const users = new Map<string, UserCursor>();
            data.users?.forEach((u: any) => {
              users.set(u.clientId, {
                userId: u.userId,
                clientId: u.clientId,
                position: 0,
                color: u.color,
                name: u.name,
              });
            });
            setRemoteUsers(users);
            onUsersChange?.(users);
          });

          socket.on("update", data => {
            if (!isMountedRef.current) return;
            if (ydocRef.current && data.update) {
              const update = new Uint8Array(data.update);
              Y.applyUpdate(ydocRef.current, update);
            }
          });

          socket.on("cursor_update", data => {
            if (!isMountedRef.current) return;
            setCursors(prev => {
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

          socket.on("user_joined", data => {
            if (!isMountedRef.current) return;
            console.log("[WebSocket] User joined:", data);
            setRemoteUsers(prev => {
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

          socket.on("user_left", data => {
            if (!isMountedRef.current) return;
            console.log("[WebSocket] User left:", data);
            setRemoteUsers(prev => {
              const next = new Map(prev);
              next.delete(data.clientId);
              onUsersChange?.(next);
              return next;
            });

            setCursors(prev => {
              const next = new Map(prev);
              next.delete(data.clientId);
              onCursorsChange?.(next);
              return next;
            });
          });

          socket.on("error", error => {
            console.error("[WebSocket] Error:", error);
          });
        } catch (error) {
          console.error("[WebSocket] Initialization error:", error);
        }
      })();
    }

    // Cleanup function - only runs on true unmount
    return () => {
      // This cleanup should only run when the component is truly unmounting
      // Not during development Strict Mode remounts
    };
  }, [user, documentId, onCursorsChange, onUsersChange]);

  // Final cleanup - only when truly unmounting
  useEffect(() => {
    return () => {
      console.log("[WebSocket] Final cleanup - component unmounting");
      isMountedRef.current = false;

      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
        ytextRef.current = null;
      }

      initializationRef.current = null;
    };
  }, []);

  // ... (rest of your functions remain the same - updateContent, updateCursor, etc.)
  // Apply local changes to CRDT
  const updateContent = useCallback((newContent: string) => {
    if (!ytextRef.current || !ydocRef.current) return;

    const ytext = ytextRef.current;
    const currentContent = ytext.toString();

    if (currentContent !== newContent) {
        ydocRef.current.transact(() => {
            ytext.delete(0, ytext.length);
            ytext.insert(0, newContent);
        }, 'local');
    }
  }, []);

  // Send cursor update
  const updateCursor = useCallback(
    (position: number, selection?: [number, number]) => {
      if (!socketRef.current || !socketRef.current.connected) return;

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
    },
    []
  );

  // Send heartbeat - only when connected
  useEffect(() => {
    if (!socketRef.current || !isConnected) return;

    const heartbeatInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("ping");
      }
    }, 30000);

    return () => clearInterval(heartbeatInterval);
  }, [isConnected]);

  // Manual disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      hasConnectedRef.current = false;
      socketRef.current.disconnect();
    }
  }, []);

  return {
    content,
    isConnected,
    cursors,
    remoteUsers,
    updateContent,
    updateCursor,
    disconnect,
    ydoc: ydocRef.current,
    ytext: ytextRef.current,
    socket: socketRef.current,
  };
}
