import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Edit,
  ArrowUpDown,
  Filter
} from "lucide-react";
import { format } from "date-fns";

interface UserStats {
  total: number;
  active: number;
  pending: number;
  inactive: number;
}

interface ApprovalsHistory {
  payments: any[];
  users: any[];
  edits: any[];
}

export default function UserManagement() {
  const { user } = useUser();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Filter states for each tab
  const [paymentFilter, setPaymentFilter] = useState<"all" | "pending" | "approved">("all");
  const [userFilter, setUserFilter] = useState<"all" | "pending" | "approved">("all");
  const [editFilter, setEditFilter] = useState<"all" | "pending" | "approved">("all");
  
  // Sort states for each tab
  const [paymentSort, setPaymentSort] = useState<"date" | "amount" | "customer">("date");
  const [userSort, setUserSort] = useState<"date" | "name" | "email">("date");
  const [editSort, setEditSort] = useState<"date" | "type" | "requestedBy">("date");

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
  const { data: userStats = { total: 0, active: 0, pending: 0, inactive: 0 } } = useQuery<UserStats>({
    queryKey: ["/api/users/statistics"],
    enabled: !!user && (user.role === "owner" || user.role === "admin"),
  });

  // Fetch all approvals history
  const { data: approvalsHistory = { payments: [], users: [], edits: [] } } = useQuery<ApprovalsHistory>({
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
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/statistics"] });
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

  // Filter and sort payments data
  const filteredAndSortedPayments = useMemo(() => {
    let filtered = approvalsHistory.payments || [];
    
    // Apply filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter((p: any) => 
        paymentFilter === "pending" ? p.status === "pending" : p.status === "approved"
      );
    }
    
    // Apply sort
    filtered = [...filtered].sort((a: any, b: any) => {
      switch (paymentSort) {
        case "amount":
          return b.amount - a.amount;
        case "customer":
          return (a.customerName || "").localeCompare(b.customerName || "");
        case "date":
        default:
          return new Date(b.createdAt || b.paymentDate).getTime() - new Date(a.createdAt || a.paymentDate).getTime();
      }
    });
    
    return filtered;
  }, [approvalsHistory.payments, paymentFilter, paymentSort]);

  // Filter and sort users data
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = approvalsHistory.users || [];
    
    // Apply filter
    if (userFilter !== "all") {
      filtered = filtered.filter((u: any) => 
        userFilter === "pending" ? u.status === "pending" : u.status === "active"
      );
    }
    
    // Apply sort
    filtered = [...filtered].sort((a: any, b: any) => {
      switch (userSort) {
        case "name":
          return (a.fullName || a.name || "").localeCompare(b.fullName || b.name || "");
        case "email":
          return (a.email || "").localeCompare(b.email || "");
        case "date":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    
    return filtered;
  }, [approvalsHistory.users, userFilter, userSort]);

  // Filter and sort edits data
  const filteredAndSortedEdits = useMemo(() => {
    let filtered = approvalsHistory.edits || [];
    
    // Apply filter
    if (editFilter !== "all") {
      filtered = filtered.filter((e: any) => 
        editFilter === "pending" ? e.status === "pending" : e.status === "approved"
      );
    }
    
    // Apply sort
    filtered = [...filtered].sort((a: any, b: any) => {
      switch (editSort) {
        case "type":
          return (a.entityType || "").localeCompare(b.entityType || "");
        case "requestedBy":
          return (a.requestedByName || "").localeCompare(b.requestedByName || "");
        case "date":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    
    return filtered;
  }, [approvalsHistory.edits, editFilter, editSort]);

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
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
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
            <div className="flex gap-2">
              <ToggleGroup type="single" value={paymentFilter} onValueChange={(value) => value && setPaymentFilter(value as any)}>
                <ToggleGroupItem value="all" size="sm">
                  <Filter className="h-3 w-3 mr-1" />
                  All
                </ToggleGroupItem>
                <ToggleGroupItem value="pending" size="sm">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </ToggleGroupItem>
                <ToggleGroupItem value="approved" size="sm">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approved
                </ToggleGroupItem>
              </ToggleGroup>
              <Select value={paymentSort} onValueChange={(value: any) => setPaymentSort(value)}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="amount">Sort by Amount</SelectItem>
                  <SelectItem value="customer">Sort by Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Recorded By</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedPayments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate" title={payment.customerName || 'N/A'}>
                            {payment.customerName || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[100px] truncate" title={payment.collectionInvoice || 'N/A'}>
                            {payment.collectionInvoice || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{payment.paymentMode}</TableCell>
                        <TableCell>
                          {payment.paymentDate ? format(new Date(payment.paymentDate), "dd MMM yyyy") : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[100px] truncate" title={payment.referenceNumber || 'N/A'}>
                            {payment.referenceNumber || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>{payment.recordedByName || 'Unknown'}</TableCell>
                        <TableCell className="text-center">
                          {payment.status === 'pending' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              Pending
                            </Badge>
                          )}
                          {payment.status === 'approved' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              Approved
                            </Badge>
                          )}
                          {payment.status === 'rejected' && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {payment.status === 'pending' && (
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                onClick={() => handleApprovePayment(payment.id)}
                                disabled={processingId === payment.id}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectPayment(payment.id)}
                                disabled={processingId === payment.id}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {payment.status !== 'pending' && (
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

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
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
            <div className="flex gap-2">
              <ToggleGroup type="single" value={userFilter} onValueChange={(value) => value && setUserFilter(value as any)}>
                <ToggleGroupItem value="all" size="sm">
                  <Filter className="h-3 w-3 mr-1" />
                  All
                </ToggleGroupItem>
                <ToggleGroupItem value="pending" size="sm">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </ToggleGroupItem>
                <ToggleGroupItem value="approved" size="sm">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Active
                </ToggleGroupItem>
              </ToggleGroup>
              <Select value={userSort} onValueChange={(value: any) => setUserSort(value)}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="email">Sort by Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Bio</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedUsers.map((pendingUser: any) => (
                      <TableRow key={pendingUser.id}>
                        <TableCell className="font-medium">
                          {pendingUser.fullName || pendingUser.name || "No Name"}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[180px] truncate" title={pendingUser.email}>
                            {pendingUser.email}
                          </div>
                        </TableCell>
                        <TableCell>{pendingUser.phoneNumber || 'N/A'}</TableCell>
                        <TableCell className="capitalize">{pendingUser.role || 'employee'}</TableCell>
                        <TableCell>
                          {new Date(pendingUser.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {pendingUser.bio ? (
                            <div className="max-w-[200px] truncate" title={pendingUser.bio}>
                              {pendingUser.bio}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {pendingUser.status === 'pending' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              Pending
                            </Badge>
                          )}
                          {pendingUser.status === 'active' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              Active
                            </Badge>
                          )}
                          {pendingUser.status === 'rejected' && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {pendingUser.status === 'pending' && (
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(pendingUser.id)}
                                disabled={processingId === pendingUser.id}
                                className="bg-green-600 hover:bg-green-700 text-white"
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
                          {pendingUser.status !== 'pending' && (
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

    <TabsContent value="edits" className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
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
        <div className="flex gap-2">
          <ToggleGroup type="single" value={editFilter} onValueChange={(value) => value && setEditFilter(value as any)}>
            <ToggleGroupItem value="all" size="sm">
              <Filter className="h-3 w-3 mr-1" />
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="pending" size="sm">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </ToggleGroupItem>
            <ToggleGroupItem value="approved" size="sm">
              <CheckCircle className="h-3 w-3 mr-1" />
              Approved
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={editSort} onValueChange={(value: any) => setEditSort(value)}>
            <SelectTrigger className="w-[140px]">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="type">Sort by Type</SelectItem>
              <SelectItem value="requestedBy">Sort by Requester</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                  <TableHead className="text-center min-w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedEdits.map((editRequest: any) => (
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
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={async () => {
                              setProcessingId(editRequest.id);
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
                                  queryClient.invalidateQueries({ queryKey: ["/api/approvals/history"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
                                } else {
                                  const error = await response.json();
                                  toast({
                                    title: "Error",
                                    description: error.error || "Failed to approve edit request",
                                    variant: "destructive",
                                  });
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to approve edit request",
                                  variant: "destructive",
                                });
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            disabled={processingId === editRequest.id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              setProcessingId(editRequest.id);
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
                                  queryClient.invalidateQueries({ queryKey: ["/api/approvals/history"] });
                                } else {
                                  const error = await response.json();
                                  toast({
                                    title: "Error",
                                    description: error.error || "Failed to reject edit request",
                                    variant: "destructive",
                                  });
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to reject edit request",
                                  variant: "destructive",
                                });
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            disabled={processingId === editRequest.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
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