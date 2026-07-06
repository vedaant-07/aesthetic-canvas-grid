import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import GymManagement from "./pages/GymManagement";
import GymRequestAccess from "./pages/GymRequestAccess";
import GymCode from "./pages/GymCode";
import GymLogin from "./pages/GymLogin";
import Support from "./pages/Support";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import Admin2FASetup from "./pages/admin/Admin2FASetup";
import Admin2FAVerify from "./pages/admin/Admin2FAVerify";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminGyms from "./pages/admin/AdminGyms";
import AdminGymOwners from "./pages/admin/AdminGymOwners";
import AdminUsersRoles from "./pages/admin/AdminUsersRoles";
import AdminAccessCodes from "./pages/admin/AdminAccessCodes";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminSettings from "./pages/admin/AdminSettings";
import "./form-backdrop.css";

const queryClient = new QueryClient();

function GymAccessShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="form-brand-backdrop" aria-hidden="true">
        <div className="form-brand-backdrop__inner">
          <div className="form-brand-backdrop__row">SE7EN.FIT   SE7EN.FIT   SE7EN.FIT   SE7EN.FIT</div>
          <div className="form-brand-backdrop__row form-brand-backdrop__row--reverse">SE7EN.FIT   SE7EN.FIT   SE7EN.FIT   SE7EN.FIT</div>
        </div>
      </div>
      {children}
    </>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/gym-management" element={<GymManagement />} />
            <Route path="/gym-management/request-access" element={<GymAccessShell><GymRequestAccess /></GymAccessShell>} />
            <Route path="/gym-management/code" element={<GymAccessShell><GymCode /></GymAccessShell>} />
            <Route path="/gym-management/login" element={<GymAccessShell><GymLogin /></GymAccessShell>} />
            <Route path="/support" element={<Support />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/x7-control" element={<Navigate to="/x7-control/dashboard" replace />} />
            <Route path="/x7-control/login" element={<AdminLogin />} />
            <Route path="/x7-control/2fa-setup" element={<GymAccessShell><Admin2FASetup /></GymAccessShell>} />
            <Route path="/x7-control/2fa" element={<GymAccessShell><Admin2FAVerify /></GymAccessShell>} />
            <Route path="/x7-control/dashboard" element={<AdminOverview />} />
            <Route path="/x7-control/requests" element={<AdminRequests />} />
            <Route path="/x7-control/gyms" element={<AdminGyms />} />
            <Route path="/x7-control/gym-owners" element={<AdminGymOwners />} />
            <Route path="/x7-control/users" element={<AdminUsersRoles />} />
            <Route path="/x7-control/access-codes" element={<AdminAccessCodes />} />
            <Route path="/x7-control/payments" element={<AdminPayments />} />
            <Route path="/x7-control/audit-logs" element={<AdminAuditLogs />} />
            <Route path="/x7-control/settings" element={<AdminSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
