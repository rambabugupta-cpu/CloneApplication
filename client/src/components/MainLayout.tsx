import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  FileText, 
  Upload,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  IndianRupee,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user } = useUser();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    fetch("/api/auth/signout", { 
      method: "POST",
      credentials: "include"
    }).then(() => {
      window.location.href = "/auth";
    });
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["owner", "admin", "staff", "customer"] },
    { name: "Collections", href: "/collections", icon: IndianRupee, roles: ["owner", "admin", "staff", "customer"] },
    { name: "Import Excel", href: "/import", icon: Upload, roles: ["owner", "admin"] },
    { name: "Users", href: "/pending-approvals", icon: Users, roles: ["owner", "admin"] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || "")
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Tally Collections</h2>
            <p className="text-sm text-muted-foreground mt-1">Management System</p>
          </div>

          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                      {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t">
            <div className="mb-3">
              <p className="text-sm font-medium">{user?.fullName || user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}