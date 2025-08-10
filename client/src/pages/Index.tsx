import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import UserApprovalPanel from "@/components/UserApprovalPanel";

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
            <h1 className="text-3xl font-bold">Collection Management System</h1>
            <p className="text-muted-foreground">Welcome back, {user?.email}</p>
            {role && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm bg-primary text-primary-foreground px-2 py-1 rounded">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
        
        {isAdmin && (
          <div className="mb-8">
            <UserApprovalPanel />
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>View collections overview</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track outstanding payments, follow-ups, and more.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Import Data</CardTitle>
              <CardDescription>Upload Excel files from Tally</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Import outstanding payment data directly from Excel.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Customer Management</CardTitle>
              <CardDescription>Manage customer records</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and update customer information and payment history.
              </p>
            </CardContent>
          </Card>
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
