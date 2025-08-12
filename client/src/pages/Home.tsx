import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BarChart3, Users, FileText, TrendingUp } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Welcome back, {(user as any)?.firstName || (user as any)?.fullName || 'User'}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              RBG Infra Developers LLP - Collection Management System
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/api/logout'}
          >
            Sign Out
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Dashboard
              </CardTitle>
              <CardDescription>
                View analytics and collection metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard">
                <Button className="w-full">Open Dashboard</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Collections
              </CardTitle>
              <CardDescription>
                Manage outstanding collection records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/collections">
                <Button className="w-full">View Collections</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customers
              </CardTitle>
              <CardDescription>
                View and manage customer information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/customers">
                <Button className="w-full">Manage Customers</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Reports
              </CardTitle>
              <CardDescription>
                Generate collection and performance reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/reports">
                <Button className="w-full">View Reports</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {(user as any)?.role === 'admin' || (user as any)?.role === 'owner' ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Admin Features</CardTitle>
              <CardDescription>
                Additional tools and features for administrators
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Link to="/pending-approvals">
                <Button variant="outline">Pending Approvals</Button>
              </Link>
              <Link to="/users">
                <Button variant="outline">User Management</Button>
              </Link>
              <Link to="/import">
                <Button variant="outline">Excel Import</Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Link to="/collections/new">
              <Button>Add New Collection</Button>
            </Link>
            <Link to="/payments/record">
              <Button variant="outline">Record Payment</Button>
            </Link>
            <Link to="/communications">
              <Button variant="outline">Customer Communications</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}