import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Documents from "./pages/Documents";
import Editor from "./pages/Editor";
import LandingPage from "./pages/landing";
import Profile from "./pages/Profile";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import { ComponentType } from "react";

// Protected route wrapper
function ProtectedRoute({
  component: Component,
}: {
  component: ComponentType;
}) {
  const { isAuthenticated } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/",
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect authenticated users away from landing to home
  if (isAuthenticated && window.location.pathname === "/") {
    setLocation("/home");
    return null;
  }

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route
        path="/home"
        component={() => <ProtectedRoute component={Home} />}
      />
      <Route
        path="/documents"
        component={() => <ProtectedRoute component={Documents} />}
      />
      <Route path="/editor/:documentId">
        {params => (
          <ProtectedRoute
            component={() => <Editor documentId={params.documentId} />}
          />
        )}
      </Route>
      <Route
        path="/profile"
        component={() => <ProtectedRoute component={Profile} />}
      />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
