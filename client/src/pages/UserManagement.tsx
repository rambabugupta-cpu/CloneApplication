import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { queryClient } from "@/lib/queryClient";
import { 
  Users, 
  CheckCircle, 
  XCircle,
  Clock,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  UserX
} from "lucide-react";

export default function UserManagement() {
  const { user } = useUser();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const { data: pendingUsers = [], isLoading } = useQuery({
    queryKey: ["/api/users/pending"],
    enabled: !!user && (user.role === "owner" || user.role === "admin"),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: "approved" | "rejected" }) => {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user status");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.status === "approved" ? "User Approved" : "User Rejected",
        description: `User has been ${variables.status} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      setProcessingId(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user status",
      });
      setProcessingId(null);
    },
  });

  const handleApprove = (userId: string) => {
    setProcessingId(userId);
    approveMutation.mutate({ userId, status: "approved" });
  };

  const handleReject = (userId: string) => {
    setProcessingId(userId);
    approveMutation.mutate({ userId, status: "rejected" });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Users className="h-5 w-5 mr-2" />
          {pendingUsers.length} Pending
        </Badge>
      </div>

      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <UserCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Pending Users</h3>
            <p className="text-muted-foreground">
              All user registrations have been processed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.map((pendingUser: any) => (
            <Card key={pendingUser.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{pendingUser.name || "No Name"}</CardTitle>
                    <Badge variant="outline" className="mt-2">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending Approval
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(pendingUser.id)}
                      disabled={processingId === pendingUser.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(pendingUser.id)}
                      disabled={processingId === pendingUser.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{pendingUser.email}</span>
                  </div>
                  {pendingUser.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{pendingUser.phoneNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Registered:</span>
                    <span className="font-medium">
                      {new Date(pendingUser.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {pendingUser.bio && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{pendingUser.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* User Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>User Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-muted-foreground mt-1">Total Users</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-muted-foreground mt-1">Active Users</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</div>
              <div className="text-sm text-muted-foreground mt-1">Pending Approval</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600">0</div>
              <div className="text-sm text-muted-foreground mt-1">Inactive Users</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}