import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Collections from "./pages/Collections";
import Import from "./pages/Import";
import NotFound from "./pages/NotFound";
import UserManagement from "./pages/UserManagement";
import Users from "./pages/Users";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import { UserProvider } from "@/hooks/use-user";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <ThemeProvider defaultTheme="system" storageKey="collection-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/collections" element={
                <ProtectedRoute>
                  <MainLayout>
                    <Collections />
                  </MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/import" element={
                <ProtectedRoute>
                  <MainLayout>
                    <Import />
                  </MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/pending-approvals" element={
                <ProtectedRoute>
                  <MainLayout>
                    <UserManagement />
                  </MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute>
                  <MainLayout>
                    <Users />
                  </MainLayout>
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
