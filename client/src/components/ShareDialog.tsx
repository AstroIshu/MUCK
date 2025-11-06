import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface ShareDialogProps {
  documentId: number;
  children: React.ReactNode;
}

export function ShareDialog({ documentId, children }: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [isOpen, setIsOpen] = useState(false);

  const getUserByEmail = trpc.sharing.getUserByEmail.useQuery(
    { email },
    { enabled: false } // Only run when we manually refetch
  );

  const shareDocument = trpc.sharing.shareDocument.useMutation();

  const handleShare = async () => {
    const userResult = await getUserByEmail.refetch();
    if (userResult.data) {
      shareDocument.mutate(
        {
          documentId,
          userId: userResult.data.id,
          role,
        },
        {
          onSuccess: () => {
            // Handle success, e.g., show a toast
            console.log("Document shared successfully");
            setIsOpen(false);
          },
          onError: (error) => {
            // Handle error
            console.error("Failed to share document:", error);
          },
        }
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Enter user's email"            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select value={role} onValueChange={(value: "editor" | "viewer") => setRole(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleShare} disabled={shareDocument.isPending}>
            {shareDocument.isPending ? "Sharing..." : "Share"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
