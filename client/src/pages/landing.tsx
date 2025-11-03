import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
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
          onClick={() => window.location.href = getLoginUrl()}
          className="px-8"
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
