import { Switch, Route, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
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
import NotificationLogsPage from "@/pages/notifications/logs";
import AdminDepartmentsPage from "@/pages/admin/departments";
import AdminClassesPage from "@/pages/admin/classes";
import AdminHostelsPage from "@/pages/admin/hostels";
import LiveScannerPage from "@/pages/security/live-scanner";
import EnrollmentPage from "@/pages/enrollment";
import StudentProfilePage from "@/pages/students/profile";
import EmergencyLeavePage from "@/pages/leaves/emergency";
import BulkApprovePage from "@/pages/leaves/bulk-approve";
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
      <ProtectedRoute path="/enrollment" component={EnrollmentPage} />
      <ProtectedRoute path="/profile" component={StudentProfilePage} />
      <ProtectedRoute path="/leaves" component={LeavesPage} />
      <ProtectedRoute path="/leaves/emergency" component={EmergencyLeavePage} />
      <ProtectedRoute path="/leaves/bulk-approve" component={BulkApprovePage} />
      <ProtectedRoute path="/apply" component={ApplyLeavePage} />
      <ProtectedRoute path="/leaves/:id" component={LeaveDetailPage} />
      <ProtectedRoute path="/outpasses" component={OutpassesPage} />
      <ProtectedRoute path="/outpasses/:id" component={OutpassDetailPage} />
      <ProtectedRoute path="/security" component={SecurityPage} />
      <ProtectedRoute path="/security/scanner" component={LiveScannerPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/admin/notification-logs" component={NotificationLogsPage} />
      <ProtectedRoute path="/admin/departments" component={AdminDepartmentsPage} />
      <ProtectedRoute path="/admin/classes" component={AdminClassesPage} />
      <ProtectedRoute path="/admin/hostels" component={AdminHostelsPage} />
      
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
            <BrandingProvider>
              <div className="min-h-screen">
                <Router />
                <Toaster />
              </div>
            </BrandingProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;