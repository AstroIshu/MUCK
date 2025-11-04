import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, FileText, Clock, Trash2, ArrowRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Documents() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [newDocName, setNewDocName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [docToDelete, setDocToDelete] = useState<number | null>(null);

  // Fetch user's documents
  const {
    data: documents,
    isLoading,
    refetch,
  } = trpc.documents.list.useQuery();

  // Delete document
  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: error => {
      console.error("Failed to delete document:", error);
    },
  });

  const handleDeleteDocument = () => {
    if (docToDelete) {
      deleteMutation.mutate({ documentId: docToDelete });
    }
  };

  // Create new document
  const createMutation = trpc.documents.create.useMutation({
    onSuccess: result => {
      setNewDocName("");
      setIsCreating(false);
      refetch();
      // Navigate to the new document
      setLocation(`/editor/${result.documentId}`);
    },
    onError: error => {
      console.error("Failed to create document:", error);
      setIsCreating(false);
    },
  });

  const handleCreateDocument = async () => {
    if (!newDocName.trim()) return;

    setIsCreating(true);
    createMutation.mutate({ name: newDocName });
  };

  const handleOpenDocument = (docId: number) => {
    setLocation(`/editor/${docId}`);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-2">Documents</h1>
          <p className="text-muted-foreground">
            Create and manage your collaborative documents
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        {/* Create New Document */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Create New Document</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Document name..."
              value={newDocName}
              onChange={e => setNewDocName(e.target.value)}
              onKeyPress={e => {
                if (e.key === "Enter") {
                  handleCreateDocument();
                }
              }}
              disabled={isCreating}
              className="flex-1"
            />
            <Button
              onClick={handleCreateDocument}
              disabled={isCreating || !newDocName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Documents List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => (
              <Card
                key={doc.id}
                className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleOpenDocument(doc.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                    {doc.ownerId === user?.id ? "Owner" : "Shared"}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                  {doc.name}
                </h3>
                <div className="space-y-1 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <span>{doc.wordCount} words</span>
                    <span>•</span>
                    <span>{doc.characterCount} chars</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(doc.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      handleOpenDocument(doc.id);
                    }}
                  >
                    Open
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  {doc.ownerId === user?.id && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={e => {
                                  e.stopPropagation();
                                  setDocToDelete(doc.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={e => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently
                                  delete your document.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteDocument}>
                                  Continue
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete document</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
)}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first collaborative document to get started
            </p>
            <Button onClick={() => document.querySelector("input")?.focus()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Document
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
