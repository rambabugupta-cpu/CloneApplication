import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import UserApprovalPanel from "@/components/UserApprovalPanel";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { BarChart3, Upload, Users, Settings, FileText, DollarSign } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const { role, isAdmin, isEmployee } = useUserRole();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign out failed',
        description: error.message
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold transition-colors duration-300">Collection Management System</h1>
            <p className="text-muted-foreground transition-colors duration-300">Welcome back, {user?.email}</p>
            {role && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm bg-primary text-primary-foreground px-2 py-1 rounded transition-all duration-300">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Button variant="outline" onClick={handleSignOut} className="transition-all duration-300 hover:scale-105">
              Sign Out
            </Button>
          </div>
        </div>
        
        {isAdmin && (
          <div className="mb-8">
            <UserApprovalPanel />
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 hover:border-primary/50" onClick={() => window.location.href = '/dashboard'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary transition-colors duration-300" />
                Dashboard
              </CardTitle>
              <CardDescription>View collections overview and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track outstanding payments, follow-ups, and real-time analytics.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-muted-foreground">Available now</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 hover:border-primary/50" onClick={() => toast({
            title: "Import Data",
            description: "Data import feature coming soon! Upload Excel files from Tally to import payment data."
          })}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary transition-colors duration-300" />
                Import Data
              </CardTitle>
              <CardDescription>Upload Excel files from Tally</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Import outstanding payment data directly from Excel.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-muted-foreground">In development</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 hover:border-primary/50" onClick={() => window.location.href = '/collections'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary transition-colors duration-300" />
                Collections Management
              </CardTitle>
              <CardDescription>Manage customer collections and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and manage outstanding payments, invoices, and customer communications.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-muted-foreground">Available now</span>
              </div>
            </CardContent>
          </Card>

          {(isAdmin || isEmployee) && (
            <>
              <Card className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 hover:border-primary/50" onClick={() => toast({
                title: "Reports",
                description: "Reports feature coming soon! Generate detailed collection reports and analytics."
              })}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary transition-colors duration-300" />
                    Reports
                  </CardTitle>
                  <CardDescription>Generate collection reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create detailed reports on collections and payment trends.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-muted-foreground">Planned</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 hover:border-primary/50" onClick={() => toast({
                title: "Payment Tracking",
                description: "Payment tracking feature coming soon! Monitor payment status and send reminders."
              })}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary transition-colors duration-300" />
                    Payment Tracking
                  </CardTitle>
                  <CardDescription>Monitor payment status</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track payment status and send automated reminders.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-muted-foreground">Planned</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {isAdmin && (
            <Card className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 hover:border-primary/50" onClick={() => toast({
              title: "System Settings",
              description: "Settings feature coming soon! Configure system preferences and user permissions."
            })}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary transition-colors duration-300" />
                  System Settings
                </CardTitle>
                <CardDescription>Configure system preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage system settings, user roles, and permissions.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-muted-foreground">Planned</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {!isAdmin && !isEmployee && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  🔐 Your account is pending admin approval. You'll receive an email notification 
                  once your account has been reviewed. All data is secured with Row Level Security policies.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
