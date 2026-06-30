import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import AdminDashboard from "./pages/admin/AdminDashboard";
import "./form-backdrop.css";

const queryClient = new QueryClient();

function GymAccessShell({ children }: { children: any }) {
  return (
    <>
      <div className="form-brand-backdrop" aria-hidden="true" />
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
            {/* Hidden admin surface — not linked from anywhere public. */}
            <Route path="/x7-control/login" element={<AdminLogin />} />
            <Route path="/x7-control/2fa-setup" element={<Admin2FASetup />} />
            <Route path="/x7-control/2fa" element={<Admin2FAVerify />} />
            <Route path="/x7-control/dashboard" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
