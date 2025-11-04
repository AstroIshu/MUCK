import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tighter mb-4">
          Welcome to Muck
        </h1>
        <p className="text-muted-foreground mb-8">
          Collaborate on documents in real-time
        </p>
        <Button
          size="lg"
          onClick={() => (window.location.href = getLoginUrl())}
          className="px-8"
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
