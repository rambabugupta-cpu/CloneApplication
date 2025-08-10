import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Mail, Clock } from "lucide-react";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

const UserApprovalPanel = () => {
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingUsers = [], isLoading: loading } = useQuery<PendingUser[]>({
    queryKey: ['/api/users/pending'],
    staleTime: 1000 * 60, // 1 minute
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'approved' | 'rejected' }) => {
      return apiRequest(`/api/users/${userId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: `User ${variables.status}`,
        description: data.message,
        variant: variables.status === 'approved' ? 'default' : 'destructive'
      });
      // Refresh the pending users list
      queryClient.invalidateQueries({ queryKey: ['/api/users/pending'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error processing user',
        description: error.message
      });
    },
    onSettled: () => {
      setProcessingUser(null);
    }
  });

  const handleApproval = async (userId: string, status: 'approved' | 'rejected') => {
    setProcessingUser(userId);
    approvalMutation.mutate({ userId, status });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            User Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading pending users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          User Approvals
        </CardTitle>
        <CardDescription>
          Approve or reject pending user registrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No pending user approvals
          </p>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-medium">{user.name}</h4>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Registered: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {user.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleApproval(user.id, 'approved')}
                    disabled={processingUser === user.id}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleApproval(user.id, 'rejected')}
                    disabled={processingUser === user.id}
                    className="flex items-center gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserApprovalPanel;