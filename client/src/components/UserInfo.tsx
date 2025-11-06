import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function UserInfo() {
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium">Name</p>
          <p className="text-muted-foreground">{user?.name}</p>
        </div>
        <div>
          <p className="font-medium">Email</p>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>
        <div>
          <p className="font-medium">Role</p>
          <p className="text-muted-foreground">{user?.role}</p>
        </div>
      </CardContent>
    </Card>
  );
}
