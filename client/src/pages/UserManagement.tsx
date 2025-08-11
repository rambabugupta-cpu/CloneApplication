import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  UserX,
  IndianRupee,
  CreditCard,
  Edit
} from "lucide-react";
import { format } from "date-fns";

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

  const { data: pendingUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users/pending"],
    enabled: !!user && (user.role === "owner" || user.role === "admin"),
  });

  const { data: pendingPayments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/payments/pending"],
    enabled: !!user && (user.role === "owner" || user.role === "admin"),
  });

  const { data: pendingEditRequests = [], isLoading: isLoadingEditRequests } = useQuery({
    queryKey: ["/api/edits/pending"],
    enabled: !!user && (user.role === "owner" || user.role === "admin"),
  });

  // Fetch user statistics
  const { data: userStats = { total: 0, active: 0, pending: 0, inactive: 0 } } = useQuery({
    queryKey: ["/api/users/statistics"],
    enabled: !!user && (user.role === "owner" || user.role === "admin"),
  });

  // Fetch all approvals history
  const { data: approvalsHistory = { payments: [], users: [], edits: [] } } = useQuery({
    queryKey: ["/api/approvals/history"],
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

  const paymentMutation = useMutation({
    mutationFn: async ({ paymentId, status }: { paymentId: string; status: "approved" | "rejected" }) => {
      const response = await fetch(`/api/payments/${paymentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update payment status");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.status === "approved" ? "Payment Approved" : "Payment Rejected",
        description: `Payment has been ${variables.status} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setProcessingId(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update payment status",
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

  const handleApprovePayment = (paymentId: string) => {
    setProcessingId(paymentId);
    paymentMutation.mutate({ paymentId, status: "approved" });
  };

  const handleRejectPayment = (paymentId: string) => {
    setProcessingId(paymentId);
    paymentMutation.mutate({ paymentId, status: "rejected" });
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  if (isLoadingUsers || isLoadingPayments) {
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
        <h1 className="text-3xl font-bold">Approvals Management</h1>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Users className="h-5 w-5 mr-2" />
            {pendingUsers.length} Users
          </Badge>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <CreditCard className="h-5 w-5 mr-2" />
            {pendingPayments.length} Payments
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments">Pending Payments ({pendingPayments.length})</TabsTrigger>
          <TabsTrigger value="users">Pending Users ({pendingUsers.length})</TabsTrigger>
          <TabsTrigger value="edits">Edit Requests ({pendingEditRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <div className="mb-4 flex gap-2">
            <Badge variant="secondary">Total: {approvalsHistory.payments?.length || 0}</Badge>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              Pending: {approvalsHistory.payments?.filter((p: any) => p.status === 'pending').length || 0}
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              Approved: {approvalsHistory.payments?.filter((p: any) => p.status === 'approved').length || 0}
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
              Rejected: {approvalsHistory.payments?.filter((p: any) => p.status === 'rejected').length || 0}
            </Badge>
          </div>
          {approvalsHistory.payments?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Payment Records</h3>
                <p className="text-muted-foreground">
                  No payment approvals to display.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {approvalsHistory.payments?.map((payment: any) => (
                <Card key={payment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">
                          {formatCurrency(payment.amount)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Customer: {payment.customerName || 'N/A'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Invoice: {payment.collectionInvoice || 'N/A'}
                        </p>
                      </div>
                      {payment.status === 'pending' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Approval
                        </Badge>
                      )}
                      {payment.status === 'approved' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                      {payment.status === 'rejected' && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejected
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Payment Mode</p>
                        <p className="font-medium capitalize">{payment.paymentMode}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payment Date</p>
                        <p className="font-medium">
                          {payment.paymentDate ? format(new Date(payment.paymentDate), "dd MMM yyyy") : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reference</p>
                        <p className="font-medium">{payment.referenceNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Recorded By</p>
                        <p className="font-medium">{payment.recordedByName || 'Unknown'}</p>
                      </div>
                    </div>
                    {payment.status === 'pending' && (
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectPayment(payment.id)}
                          disabled={processingId === payment.id}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprovePayment(payment.id)}
                          disabled={processingId === payment.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Payment
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="mb-4 flex gap-2">
            <Badge variant="secondary">Total: {approvalsHistory.users?.length || 0}</Badge>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              Pending: {approvalsHistory.users?.filter((u: any) => u.status === 'pending').length || 0}
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              Active: {approvalsHistory.users?.filter((u: any) => u.status === 'active').length || 0}
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
              Rejected: {approvalsHistory.users?.filter((u: any) => u.status === 'rejected').length || 0}
            </Badge>
          </div>
          {approvalsHistory.users?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No User Records</h3>
                <p className="text-muted-foreground">
                  No user approvals to display.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {approvalsHistory.users?.map((pendingUser: any) => (
                <Card key={pendingUser.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{pendingUser.fullName || pendingUser.name || "No Name"}</CardTitle>
                    {pendingUser.status === 'pending' && (
                      <Badge variant="outline" className="mt-2 bg-yellow-50 text-yellow-700 border-yellow-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Approval
                      </Badge>
                    )}
                    {pendingUser.status === 'active' && (
                      <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    {pendingUser.status === 'rejected' && (
                      <Badge variant="outline" className="mt-2 bg-red-50 text-red-700 border-red-300">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    )}
                  </div>
                  {pendingUser.status === 'pending' && (
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
                  )}
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
    </TabsContent>

    <TabsContent value="edits" className="space-y-4">
      <div className="mb-4 flex gap-2">
        <Badge variant="secondary">Total: {approvalsHistory.edits?.length || 0}</Badge>
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          Pending: {approvalsHistory.edits?.filter((e: any) => e.status === 'pending').length || 0}
        </Badge>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          Approved: {approvalsHistory.edits?.filter((e: any) => e.status === 'approved').length || 0}
        </Badge>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          Rejected: {approvalsHistory.edits?.filter((e: any) => e.status === 'rejected').length || 0}
        </Badge>
      </div>
      {approvalsHistory.edits?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Edit className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Edit Requests</h3>
            <p className="text-muted-foreground">
              No edit requests to display.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvalsHistory.edits?.map((editRequest: any) => (
                  <TableRow key={editRequest.id}>
                    <TableCell>
                      <Badge variant={editRequest.entityType === 'payment' ? 'default' : 'secondary'}>
                        {editRequest.entityType === 'payment' ? 'Payment' : 'Comm'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editRequest.entityType === 'payment' && editRequest.newData ? (
                        <div className="text-sm space-y-0.5">
                          {editRequest.newData.amount && (
                            <div>Amount: ₹{(editRequest.newData.amount / 100).toLocaleString('en-IN')}</div>
                          )}
                          {editRequest.newData.paymentMode && (
                            <div>Mode: {editRequest.newData.paymentMode}</div>
                          )}
                          {editRequest.newData.referenceNumber && (
                            <div>Ref: {editRequest.newData.referenceNumber}</div>
                          )}
                        </div>
                      ) : editRequest.entityType === 'communication' && editRequest.newData ? (
                        <div className="text-sm space-y-0.5">
                          {editRequest.newData.outcome && (
                            <div>Outcome: {editRequest.newData.outcome}</div>
                          )}
                          {editRequest.newData.content && (
                            <div className="truncate max-w-[200px]" title={editRequest.newData.content}>
                              {editRequest.newData.content}
                            </div>
                          )}
                        </div>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>{editRequest.requestedByName || 'N/A'}</TableCell>
                    <TableCell>
                      {editRequest.createdAt ? format(new Date(editRequest.createdAt), "dd MMM yyyy") : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={editRequest.editReason}>
                        {editRequest.editReason || 'No reason provided'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {editRequest.status === 'pending' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          Pending
                        </Badge>
                      )}
                      {editRequest.status === 'approved' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          Approved
                        </Badge>
                      )}
                      {editRequest.status === 'rejected' && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                          Rejected
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {editRequest.status === 'pending' && (
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/edits/${editRequest.id}/approve`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                });
                                if (response.ok) {
                                  toast({
                                    title: "Edit Approved",
                                    description: "The edit request has been approved successfully.",
                                  });
                                  queryClient.invalidateQueries({ queryKey: ["/api/edits/pending"] });
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to approve edit request",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={processingId === editRequest.id}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/edits/${editRequest.id}/reject`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                });
                                if (response.ok) {
                                  toast({
                                    title: "Edit Rejected",
                                    description: "The edit request has been rejected.",
                                  });
                                  queryClient.invalidateQueries({ queryKey: ["/api/edits/pending"] });
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to reject edit request",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={processingId === editRequest.id}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {editRequest.status !== 'pending' && (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  </Tabs>

      {/* User Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>User Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{userStats.total}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Users</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{userStats.active}</div>
              <div className="text-sm text-muted-foreground mt-1">Active Users</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{userStats.pending}</div>
              <div className="text-sm text-muted-foreground mt-1">Pending Approval</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{userStats.inactive}</div>
              <div className="text-sm text-muted-foreground mt-1">Inactive Users</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}