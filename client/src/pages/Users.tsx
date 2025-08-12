import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { 
  Users as UsersIcon, 
  UserCheck,
  UserCog,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  Search,
  Shield,
  ShieldCheck,
  UserCircle,
  Building2
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  phoneNumber?: string;
  createdAt: string;
  lastLoginAt?: string;
  department?: string;
  employeeCode?: string;
}

export default function Users() {
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");

  // Check if user has permission
  if (user?.role !== "owner" && user?.role !== "admin") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all users
  const { data: allUsers = [], isLoading } = useQuery<UserData[]>({
    queryKey: ["/api/users"],
    enabled: !!user && (user.role === "owner" || user.role === "admin"),
  });

  // Filter users by role
  const adminUsers = allUsers.filter((u: UserData) => u.role === "admin" || u.role === "owner");
  const staffUsers = allUsers.filter((u: UserData) => u.role === "staff");
  const customerUsers = allUsers.filter((u: UserData) => u.role === "customer");

  // Filter by search term
  const filterUsers = (users: UserData[]) => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(u => 
      u.fullName?.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.phoneNumber?.toLowerCase().includes(term)
    );
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'owner':
        return <ShieldCheck className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'staff':
        return <UserCog className="h-4 w-4" />;
      case 'customer':
        return <UserCircle className="h-4 w-4" />;
      default:
        return <UsersIcon className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'owner':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'staff':
        return 'secondary';
      case 'customer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return '';
    }
  };

  const UserCard = ({ userData }: { userData: UserData }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              {getRoleIcon(userData.role)}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{userData.fullName || "No Name"}</h3>
              <Badge variant={getRoleBadgeColor(userData.role)} className="mt-1">
                {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
              </Badge>
            </div>
          </div>
          <Badge className={`${getStatusBadgeColor(userData.status)}`}>
            {userData.status}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">{userData.email}</span>
          </div>
          
          {userData.phoneNumber && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{userData.phoneNumber}</span>
            </div>
          )}
          
          {userData.employeeCode && (
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Employee Code:</span>
              <span className="font-medium">{userData.employeeCode}</span>
            </div>
          )}
          
          {userData.department && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Department:</span>
              <span className="font-medium">{userData.department}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Joined:</span>
            <span className="font-medium">
              {new Date(userData.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          {userData.lastLoginAt && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last Login:</span>
              <span className="font-medium">
                {new Date(userData.lastLoginAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allUsers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{adminUsers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Staff Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{staffUsers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{customerUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different user roles */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All Users ({allUsers.length})
          </TabsTrigger>
          <TabsTrigger value="admin">
            Admins ({adminUsers.length})
          </TabsTrigger>
          <TabsTrigger value="staff">
            Staff ({staffUsers.length})
          </TabsTrigger>
          <TabsTrigger value="customer">
            Customers ({customerUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterUsers(allUsers).map((userData) => (
              <UserCard key={userData.id} userData={userData} />
            ))}
          </div>
          {filterUsers(allUsers).length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <UsersIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Users Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "No users match your search criteria." : "No users available."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="admin" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterUsers(adminUsers).map((userData) => (
              <UserCard key={userData.id} userData={userData} />
            ))}
          </div>
          {filterUsers(adminUsers).length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Admin Users</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "No admin users match your search." : "No admin users registered."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterUsers(staffUsers).map((userData) => (
              <UserCard key={userData.id} userData={userData} />
            ))}
          </div>
          {filterUsers(staffUsers).length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <UserCog className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Staff Members</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "No staff members match your search." : "No staff members registered."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="customer" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterUsers(customerUsers).map((userData) => (
              <UserCard key={userData.id} userData={userData} />
            ))}
          </div>
          {filterUsers(customerUsers).length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <UserCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Customers</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "No customers match your search." : "No customers registered."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}