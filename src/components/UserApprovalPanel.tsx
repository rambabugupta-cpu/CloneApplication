import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Mail, Clock } from "lucide-react";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

const UserApprovalPanel = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading users',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId: string, status: 'approved' | 'rejected', userEmail: string, userName: string) => {
    setProcessingUser(userId);
    
    try {
      // Update user status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Assign employee role if approved
      if (status === 'approved') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'employee' });

        if (roleError) throw roleError;
      }

      // Send approval email
      const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
        body: {
          email: userEmail,
          name: userName,
          status
        }
      });

      if (emailError) {
        console.warn('Email sending failed:', emailError);
        toast({
          title: 'User updated but email failed',
          description: `User ${status} successfully but approval email could not be sent.`,
          variant: 'default'
        });
      } else {
        toast({
          title: `User ${status}`,
          description: `${userName} has been ${status} and notified via email.`,
          variant: status === 'approved' ? 'default' : 'destructive'
        });
      }

      // Refresh the list
      fetchPendingUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error processing user',
        description: error.message
      });
    } finally {
      setProcessingUser(null);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

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
                        Registered: {new Date(user.created_at).toLocaleDateString()}
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
                    onClick={() => handleApproval(user.id, 'approved', user.email, user.name)}
                    disabled={processingUser === user.id}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleApproval(user.id, 'rejected', user.email, user.name)}
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