import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export function LogoutButton() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to landing page after logout
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Button variant="destructive" onClick={handleLogout} className="px-4">
      Sign Out
    </Button>
  );
}
