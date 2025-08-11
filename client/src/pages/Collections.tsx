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
import { Label } from "@/components/ui/label";
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
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  DollarSign,
  FileText,
  ClipboardList,
  MessageCircle,
  Send
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

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

  const raiseDispute = useMutation({
    mutationFn: async (data: { collectionId: string; reason: string }) => {
      return apiRequest(`/api/collections/${data.collectionId}/dispute`, {
        method: "POST",
        body: JSON.stringify({ reason: data.reason }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Dispute Raised",
        description: "The dispute has been raised successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setShowDisputeDialog(false);
      setDisputeReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to raise dispute",
        variant: "destructive",
      });
    },
  });

  const handleRaiseDispute = (collection: any) => {
    setSelectedCollection(collection);
    setShowDisputeDialog(true);
  };

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

  const filteredCollections = (collections as any[])?.filter((collection: any) => {
    const matchesSearch = 
      collection.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.customerPhone?.includes(searchTerm) ||
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
            placeholder="Search by Customer or Mobile No."
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
              <TableHead>Import Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aging</TableHead>
              <TableHead>Next Followup</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading collections...
                </TableCell>
              </TableRow>
            ) : filteredCollections?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No collections found
                </TableCell>
              </TableRow>
            ) : (
              filteredCollections?.map((collection: any) => (
                <TableRow key={collection.id}>
                  <TableCell className="font-medium">
                    <div className="text-sm">
                      <p>{format(new Date(collection.createdAt || collection.importedAt || Date.now()), "dd MMM yyyy")}</p>
                      <p className="text-gray-500">{format(new Date(collection.createdAt || collection.importedAt || Date.now()), "HH:mm:ss")}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{collection.customerName || 'N/A'}</p>
                      {collection.customerCompany && (
                        <p className="text-sm text-gray-500">{collection.customerCompany}</p>
                      )}
                      <p className="text-sm text-gray-500">{collection.customerPhone || 'No phone'}</p>
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
                    {collection.latestCommunication ? (
                      <div className="text-sm space-y-1">
                        {collection.latestCommunication.nextActionDate ? (
                          <p className="font-medium">
                            {format(new Date(collection.latestCommunication.nextActionDate), "dd MMM yyyy")}
                          </p>
                        ) : collection.latestCommunication.promisedDate ? (
                          <p className="font-medium">
                            Promise: {format(new Date(collection.latestCommunication.promisedDate), "dd MMM")}
                          </p>
                        ) : (
                          <p className="text-gray-500">-</p>
                        )}
                        
                        {collection.latestCommunication.type && (
                          <p className="text-gray-600 dark:text-gray-400 capitalize">
                            Last: {collection.latestCommunication.type}
                          </p>
                        )}
                        
                        {collection.latestCommunication.promisedAmount && (
                          <p className="text-green-600 dark:text-green-400">
                            ₹{(collection.latestCommunication.promisedAmount / 100).toLocaleString('en-IN')}
                          </p>
                        )}
                        
                        {collection.latestCommunication.nextActionRequired && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" 
                             title={collection.latestCommunication.nextActionRequired}>
                            {collection.latestCommunication.nextActionRequired}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">-</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {(user?.role === 'staff' || user?.role === 'admin' || user?.role === 'owner') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Record Payment"
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
                            title="Log Communication"
                            onClick={() => {
                              setSelectedCollection(collection);
                              setShowCommunicationDialog(true);
                            }}
                          >
                            <ClipboardList className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Call Customer"
                            onClick={() => window.location.href = `tel:${collection.customerPhone}`}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Send WhatsApp"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => {
                              const phone = collection.customerPhone?.replace(/[^0-9]/g, '');
                              const message = encodeURIComponent(`Hello ${collection.customerName}, this is regarding your outstanding amount of ${formatCurrency(collection.outstandingAmount)}.`);
                              window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                            }}
                          >
                            <SiWhatsapp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Send SMS"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => {
                              const message = encodeURIComponent(`Reminder: Outstanding amount ${formatCurrency(collection.outstandingAmount)} is due.`);
                              window.location.href = `sms:${collection.customerPhone}?body=${message}`;
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          {!collection.disputeRaisedAt && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 hover:text-orange-700"
                              title="Raise Dispute"
                              onClick={() => handleRaiseDispute(collection)}
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {collection.disputeRaisedAt && (
                        <Badge className="bg-orange-500 text-white">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Disputed
                        </Badge>
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
              <div className="space-y-1 mt-2">
                <p className="font-semibold text-base">{selectedCollection?.customerName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCollection?.customerAddress || 'Address not available'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Mobile: </span>
                  {selectedCollection?.customerPhone || 'Not available'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Amount: </span>
                  {formatCurrency(selectedCollection?.outstandingAmount || 0)}
                </p>
              </div>
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
              <div className="space-y-1 mt-2">
                <p className="font-semibold text-base">{selectedCollection?.customerName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCollection?.customerAddress || 'Address not available'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Amount: </span>
                  {formatCurrency(selectedCollection?.outstandingAmount || 0)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Mobile: </span>
                  {selectedCollection?.customerPhone || 'Not available'}
                </p>
              </div>
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
                        className="w-full min-h-[100px] p-2 border rounded text-black dark:text-white bg-white dark:bg-gray-800" 
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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

      {/* Dispute Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Dispute</DialogTitle>
            <DialogDescription>
              Raise a dispute for invoice {selectedCollection?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dispute-reason">Reason for Dispute</Label>
              <textarea
                id="dispute-reason"
                className="w-full min-h-[120px] p-2 border rounded mt-2 text-black dark:text-white bg-white dark:bg-gray-800"
                placeholder="Please provide detailed reason for the dispute..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (disputeReason.trim()) {
                    raiseDispute.mutate({
                      collectionId: selectedCollection.id,
                      reason: disputeReason
                    });
                  } else {
                    toast({
                      title: "Error",
                      description: "Please provide a reason for the dispute",
                      variant: "destructive",
                    });
                  }
                }}
                className="flex-1"
                disabled={!disputeReason.trim()}
              >
                Raise Dispute
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisputeDialog(false);
                  setDisputeReason("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}