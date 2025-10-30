import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { useCollaborativeEditor } from "@/hooks/useCollaborativeEditor";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Users, AlertCircle, Loader2 } from "lucide-react";

interface UserCursor {
  userId: number;
  clientId: string;
  position: number;
  selection?: [number, number];
  color: string;
  name: string;
}

export default function Editor() {
  const { documentId } = useParams();
  const docId = parseInt(documentId || "0");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPositions, setCursorPositions] = useState<Map<string, UserCursor>>(new Map());
  const [remoteUsers, setRemoteUsers] = useState<Map<string, UserCursor>>(new Map());

  // Fetch document metadata
  const { data: doc, isLoading: docLoading } = trpc.documents.get.useQuery(
    { documentId: docId },
    { enabled: docId > 0 }
  );

  // Initialize collaborative editor
  const { content, isConnected, updateContent, updateCursor } = useCollaborativeEditor({
    documentId: docId,
    onContentChange: (newContent) => {
      if (editorRef.current) {
        editorRef.current.value = newContent;
      }
    },
    onCursorsChange: (cursors) => {
      setCursorPositions(cursors);
    },
    onUsersChange: (users) => {
      setRemoteUsers(users);
    },
  });

  // Handle local text changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateContent(e.target.value);
  };

  // Handle cursor movement
  const handleCursorMove = () => {
    if (editorRef.current) {
      const position = editorRef.current.selectionStart;
      const selectionStart = editorRef.current.selectionStart;
      const selectionEnd = editorRef.current.selectionEnd;

      updateCursor(
        position,
        selectionStart !== selectionEnd ? [selectionStart, selectionEnd] : undefined
      );
    }
  };

  // Sync editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.value !== content) {
      const cursorPos = editorRef.current.selectionStart;
      editorRef.current.value = content;
      // Restore cursor position
      editorRef.current.setSelectionRange(cursorPos, cursorPos);
    }
  }, [content]);

  if (docLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle />
            <span>Document not found</span>
          </div>
        </Card>
      </div>
    );
  }

  const statusColor = isConnected ? "bg-green-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{doc.name}</h1>
            <p className="text-sm text-muted-foreground">
              {doc.wordCount} words • {doc.characterCount} characters
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">{remoteUsers.size + 1} online</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 container mx-auto p-4 flex gap-4">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col gap-4">
          <Card className="flex-1 overflow-hidden">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleTextChange}
              onKeyUp={handleCursorMove}
              onClick={handleCursorMove}
              placeholder="Start typing to edit the document..."
              className="w-full h-full p-4 resize-none focus:outline-none font-mono text-sm bg-background text-foreground"
            />
          </Card>
        </div>

        {/* Sidebar - Active Users */}
        <div className="w-64 flex flex-col gap-4">
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Active Users</h2>
            <div className="space-y-2">
              {Array.from(remoteUsers.values()).map((user) => (
                <div key={user.clientId} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: user.color }}
                  />
                  <span className="text-sm">{user.name}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Cursor Positions */}
          {cursorPositions.size > 0 && (
            <Card className="p-4">
              <h2 className="font-semibold mb-4">Cursors</h2>
              <div className="space-y-2">
                {Array.from(cursorPositions.values()).map((cursor) => (
                  <div key={cursor.clientId} className="text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cursor.color }}
                      />
                      <span className="font-medium">{cursor.name}</span>
                    </div>
                    <p className="text-muted-foreground ml-4">
                      Position: {cursor.position}
                      {cursor.selection &&
                        ` (Selection: ${cursor.selection[1] - cursor.selection[0]} chars)`}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
