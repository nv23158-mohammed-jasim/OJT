import React, { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/layout";
import { AIAssistant } from "./components/ai-assistant";
import Login from "./pages/login";
import Landing from "./pages/landing";
import Dashboard from "./pages/dashboard";
import Courses from "./pages/courses";
import Settings from "./pages/settings";

const CourseDetail = lazy(() => import("./pages/course-detail"));
const Admin = lazy(() => import("./pages/admin"));
const Submissions = lazy(() => import("./pages/submissions"));
const TeacherPanel = lazy(() => import("./pages/teacher-panel"));
const Invite = lazy(() => import("./pages/invite"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function PublicHome() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  React.useEffect(() => {
    if (!isLoading && user) setLocation("/dashboard");
  }, [user, isLoading, setLocation]);
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (user) return null;
  return <Landing />;
}

function ProtectedRoute({ component: Component, roles, ...rest }: { component: React.ComponentType<any>; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (roles && !roles.includes(user.role)) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-xl font-semibold">Access Denied</p>
          <p className="mt-2">You do not have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <Component {...rest} />
      </Suspense>
      <AIAssistant />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={PublicHome} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/courses" component={() => <ProtectedRoute component={Courses} />} />
      <Route path="/submissions" component={() => <ProtectedRoute component={Submissions} />} />
      <Route path="/courses/:id" component={() => <ProtectedRoute component={CourseDetail} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={Admin} roles={["admin"]} />} />
      <Route path="/teacher" component={() => <ProtectedRoute component={TeacherPanel} roles={["teacher", "admin"]} />} />
      <Route path="/invite/:token" component={() => <Suspense fallback={null}><Invite /></Suspense>} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
