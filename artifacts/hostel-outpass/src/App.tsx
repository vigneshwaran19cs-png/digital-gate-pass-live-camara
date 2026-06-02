import { Switch, Route, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import LeavesPage from "@/pages/leaves";
import LeaveDetailPage from "@/pages/leaves/detail";
import ApplyLeavePage from "@/pages/leaves/apply";
import OutpassesPage from "@/pages/outpasses";
import OutpassDetailPage from "@/pages/outpasses/detail";
import SecurityPage from "@/pages/security";
import ReportsPage from "@/pages/reports";
import UsersPage from "@/pages/users";
import NotificationsPage from "@/pages/notifications";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, path }: { component: any, path: string }) {
  const { user } = useAuth();
  
  return (
    <Route path={path}>
      {user ? (
        <AppLayout>
          <Component />
        </AppLayout>
      ) : (
        <Redirect to="/" />
      )}
    </Route>
  );
}

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/leaves" component={LeavesPage} />
      <ProtectedRoute path="/apply" component={ApplyLeavePage} />
      <ProtectedRoute path="/leaves/:id" component={LeaveDetailPage} />
      <ProtectedRoute path="/outpasses" component={OutpassesPage} />
      <ProtectedRoute path="/outpasses/:id" component={OutpassDetailPage} />
      <ProtectedRoute path="/security" component={SecurityPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      
      <Route>
        {user ? (
          <AppLayout>
            <NotFound />
          </AppLayout>
        ) : (
          <NotFound />
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <div className="min-h-screen">
              <Router />
              <Toaster />
            </div>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;