import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  IndianRupee,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  DollarSign,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

const paymentSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  paymentMode: z.enum(["cash", "cheque", "upi", "bank_transfer", "other"]),
  referenceNumber: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});

const communicationSchema = z.object({
  type: z.enum(["call", "sms", "email", "whatsapp", "visit", "letter"]),
  direction: z.enum(["inbound", "outbound"]),
  subject: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  outcome: z.string().optional(),
  promisedAmount: z.string().optional(),
  promisedDate: z.string().optional(),
  nextActionRequired: z.string().optional(),
  nextActionDate: z.string().optional(),
});

export default function Collections() {
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);

  const { data: collections, isLoading } = useQuery({
    queryKey: ["/api/collections", statusFilter, searchTerm],
    enabled: !!user,
  });

  const paymentForm = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      paymentMode: "cash" as const,
      referenceNumber: "",
      bankName: "",
      notes: "",
    },
  });

  const communicationForm = useForm({
    resolver: zodResolver(communicationSchema),
    defaultValues: {
      type: "call" as const,
      direction: "outbound" as const,
      subject: "",
      content: "",
      outcome: "",
      promisedAmount: "",
      promisedDate: "",
      nextActionRequired: "",
      nextActionDate: "",
    },
  });

  const recordPayment = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/collections/${selectedCollection.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount) * 100, // Convert to paise
          collectionId: selectedCollection.id,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment Recorded",
        description: "Payment has been recorded and sent for approval",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setShowPaymentDialog(false);
      paymentForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const addCommunication = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/collections/${selectedCollection.id}/communications`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          promisedAmount: data.promisedAmount ? parseFloat(data.promisedAmount) * 100 : undefined,
          collectionId: selectedCollection.id,
          customerId: selectedCollection.customerId,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Communication Added",
        description: "Communication log has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setShowCommunicationDialog(false);
      communicationForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add communication",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      pending: { color: "bg-yellow-500", icon: Clock, label: "Pending" },
      partial: { color: "bg-blue-500", icon: DollarSign, label: "Partial" },
      paid: { color: "bg-green-500", icon: CheckCircle, label: "Paid" },
      overdue: { color: "bg-red-500", icon: AlertCircle, label: "Overdue" },
      disputed: { color: "bg-orange-500", icon: AlertCircle, label: "Disputed" },
      written_off: { color: "bg-gray-500", icon: FileText, label: "Written Off" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const filteredCollections = collections?.filter((collection: any) => {
    const matchesSearch = 
      collection.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || collection.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Collections Management</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage outstanding collections and track payments
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by customer or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Collections Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aging</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading collections...
                </TableCell>
              </TableRow>
            ) : filteredCollections?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No collections found
                </TableCell>
              </TableRow>
            ) : (
              filteredCollections?.map((collection: any) => (
                <TableRow key={collection.id}>
                  <TableCell className="font-medium">
                    {collection.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{collection.customerName}</p>
                      <p className="text-sm text-gray-500">{collection.customerPhone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(collection.dueDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatCurrency(collection.outstandingAmount)}</p>
                      {collection.paidAmount > 0 && (
                        <p className="text-sm text-green-600">
                          Paid: {formatCurrency(collection.paidAmount)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(collection.status)}
                  </TableCell>
                  <TableCell>
                    {collection.agingDays > 0 ? (
                      <span className={`text-sm ${collection.agingDays > 60 ? 'text-red-600' : collection.agingDays > 30 ? 'text-orange-600' : 'text-yellow-600'}`}>
                        {collection.agingDays} days
                      </span>
                    ) : (
                      <span className="text-sm text-green-600">Current</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {(user?.role === 'staff' || user?.role === 'admin' || user?.role === 'owner') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCollection(collection);
                              setShowPaymentDialog(true);
                            }}
                          >
                            <IndianRupee className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCollection(collection);
                              setShowCommunicationDialog(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `tel:${collection.customerPhone}`}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {selectedCollection?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit((data) => recordPayment.mutate(data))} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter amount" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Transaction ID / Cheque Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Record Payment
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPaymentDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Communication Dialog */}
      <Dialog open={showCommunicationDialog} onOpenChange={setShowCommunicationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Communication</DialogTitle>
            <DialogDescription>
              Record communication with customer for invoice {selectedCollection?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <Form {...communicationForm}>
            <form onSubmit={communicationForm.handleSubmit((data) => addCommunication.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={communicationForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="visit">Visit</SelectItem>
                          <SelectItem value="letter">Letter</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={communicationForm.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direction</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="outbound">Outbound</SelectItem>
                          <SelectItem value="inbound">Inbound</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={communicationForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <textarea 
                        className="w-full min-h-[100px] p-2 border rounded" 
                        placeholder="Describe the communication..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={communicationForm.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Promised payment, Will call back, Disputed amount" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={communicationForm.control}
                  name="promisedAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promised Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Amount promised" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={communicationForm.control}
                  name="promisedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promised Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Save Communication
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCommunicationDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}