import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Edit,
  FileText,
  ClipboardList,
  MessageCircle,
  Send,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Eye
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const paymentSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  paymentMode: z.enum(["cash", "cheque", "upi", "bank_transfer", "other"]),
  paymentDate: z.string().optional(),
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
  const [sortBy, setSortBy] = useState<'customer' | 'outstanding' | 'followup' | 'lastpayment'>('customer');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showNextFollowupPopup, setShowNextFollowupPopup] = useState(false);
  const [showLastPaymentPopup, setShowLastPaymentPopup] = useState(false);
  const [showPaymentHistoryDialog, setShowPaymentHistoryDialog] = useState(false);
  const [popupData, setPopupData] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [showEditPaymentDialog, setShowEditPaymentDialog] = useState(false);
  const [showEditCommunicationDialog, setShowEditCommunicationDialog] = useState(false);
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<any>(null);
  const [selectedCommunicationForEdit, setSelectedCommunicationForEdit] = useState<any>(null);

  const { data: collections, isLoading } = useQuery({
    queryKey: ["/api/collections", statusFilter, searchTerm],
    enabled: !!user,
  });

  // Fetch payment history for a collection
  const fetchPaymentHistory = async (collectionId: string) => {
    try {
      const response = await apiRequest(`/api/collections/${collectionId}/payments`, {
        method: 'GET',
      });
      setPaymentHistory(response);
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      setPaymentHistory([]);
    }
  };

  const paymentForm = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      paymentMode: "cash" as const,
      paymentDate: "",
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

  // Edit Payment Mutation
  const editPayment = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/payments/${data.paymentId}/edit`, {
        method: "POST",
        body: JSON.stringify(data.editData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Edit Request Submitted",
        description: "Your edit request has been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setShowEditPaymentDialog(false);
      setSelectedPaymentForEdit(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit edit request",
        variant: "destructive",
      });
    },
  });

  // Edit Communication Mutation
  const editCommunication = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/communications/${data.communicationId}/edit`, {
        method: "POST",
        body: JSON.stringify(data.editData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Edit Request Submitted",
        description: "Your edit request has been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setShowEditCommunicationDialog(false);
      setSelectedCommunicationForEdit(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit edit request",
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
      <Badge className={`${config.color} text-white text-xs py-0 px-1`}>
        <Icon className="w-2.5 h-2.5 mr-0.5" />
        <span className="text-[10px]">{config.label}</span>
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
  })?.sort((a: any, b: any) => {
    // Sort by customer name (A-Z or Z-A)
    if (sortBy === 'customer') {
      const nameA = (a.customerName || '').toLowerCase();
      const nameB = (b.customerName || '').toLowerCase();
      return sortOrder === 'asc' 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    }
    
    // Sort by outstanding amount (highest to lowest)
    if (sortBy === 'outstanding') {
      return sortOrder === 'desc' 
        ? b.outstandingAmount - a.outstandingAmount 
        : a.outstandingAmount - b.outstandingAmount;
    }
    
    // Sort by last payment amount
    if (sortBy === 'lastpayment') {
      const amountA = a.lastPaymentAmount || 0;
      const amountB = b.lastPaymentAmount || 0;
      
      // If both have no payments, maintain order
      if (amountA === 0 && amountB === 0) return 0;
      
      // Put zero payments at the end
      if (amountA === 0) return 1;
      if (amountB === 0) return -1;
      
      // Sort by amount
      return sortOrder === 'desc'
        ? amountB - amountA
        : amountA - amountB;
    }
    
    // Sort by next followup date (nearest to today first, past dates on top)
    if (sortBy === 'followup') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const getFollowupDate = (collection: any) => {
        if (collection.latestCommunication?.nextActionDate) {
          return new Date(collection.latestCommunication.nextActionDate);
        }
        if (collection.latestCommunication?.promisedDate) {
          return new Date(collection.latestCommunication.promisedDate);
        }
        return null;
      };
      
      const dateA = getFollowupDate(a);
      const dateB = getFollowupDate(b);
      
      // Handle null dates (put at the end)
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      // Check if dates are past
      const isPastA = dateA < today;
      const isPastB = dateB < today;
      
      // Past dates come first
      if (isPastA && !isPastB) return -1;
      if (!isPastA && isPastB) return 1;
      
      // Both past or both future: sort by date
      if (sortOrder === 'asc') {
        return dateA.getTime() - dateB.getTime();
      } else {
        return dateB.getTime() - dateA.getTime();
      }
    }
    
    return 0;
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
        {/* Import Date Header */}
        {filteredCollections && filteredCollections.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Last Import: {format(new Date(filteredCollections[0]?.createdAt || Date.now()), "dd MMM yyyy, HH:mm")}
            </p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Customers: {filteredCollections.length}
            </p>
          </div>
        )}
        
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-900">
              <TableHead className="font-semibold text-center w-auto whitespace-nowrap px-2">S.No</TableHead>
              <TableHead 
                className="font-semibold text-center min-w-[200px] px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  if (sortBy === 'customer') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('customer');
                    setSortOrder('asc');
                  }
                }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Customer</span>
                  {sortBy === 'customer' ? (
                    sortOrder === 'asc' ? 
                      <ChevronUp className="h-3 w-3 text-blue-600" /> : 
                      <ChevronDown className="h-3 w-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-center w-auto whitespace-nowrap px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  if (sortBy === 'outstanding') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('outstanding');
                    setSortOrder('desc');
                  }
                }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Outstanding</span>
                  {sortBy === 'outstanding' ? (
                    sortOrder === 'desc' ? 
                      <ChevronDown className="h-3 w-3 text-blue-600" /> : 
                      <ChevronUp className="h-3 w-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-center w-auto whitespace-nowrap px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  if (sortBy === 'lastpayment') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('lastpayment');
                    setSortOrder('desc');
                  }
                }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Last Payment</span>
                  {sortBy === 'lastpayment' ? (
                    sortOrder === 'desc' ? 
                      <ChevronDown className="h-3 w-3 text-blue-600" /> : 
                      <ChevronUp className="h-3 w-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-center w-auto whitespace-nowrap px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  if (sortBy === 'followup') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('followup');
                    setSortOrder('asc');
                  }
                }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Next Followup</span>
                  {sortBy === 'followup' ? (
                    sortOrder === 'asc' ? 
                      <ChevronUp className="h-3 w-3 text-blue-600" /> : 
                      <ChevronDown className="h-3 w-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead className="font-semibold text-center w-auto whitespace-nowrap px-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading collections...
                </TableCell>
              </TableRow>
            ) : filteredCollections?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No collections found
                </TableCell>
              </TableRow>
            ) : (
              filteredCollections?.map((collection: any, index: number) => (
                <TableRow key={collection.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b-2 border-gray-100 dark:border-gray-700">
                  <TableCell className="py-2 text-center px-2 text-sm font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <span className="font-semibold truncate" title={collection.customerName || 'N/A'}>
                        {collection.customerName || 'N/A'}
                      </span>
                      {collection.customerCompany && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400 truncate" title={collection.customerCompany}>
                            {collection.customerCompany}
                          </span>
                        </>
                      )}
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-0.5 text-xs text-gray-500">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span>{collection.customerPhone || 'No phone'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-center px-2 whitespace-nowrap">
                    <span className="font-bold text-sm">{formatCurrency(collection.outstandingAmount)}</span>
                  </TableCell>
                  <TableCell className="py-2 text-center px-2 whitespace-nowrap">
                    {collection.lastPaymentAmount && collection.lastPaymentAmount > 0 ? (
                      <div className="text-sm flex items-center justify-center gap-1">
                        <div>
                          <span className="font-medium text-green-600">{formatCurrency(collection.lastPaymentAmount)}</span>
                          {collection.lastPaymentDate && (
                            <p className="text-gray-500 text-xs">
                              {format(new Date(collection.lastPaymentDate), "dd/MM/yyyy")}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0"
                          title="View Details"
                          onClick={() => {
                            setPopupData(collection);
                            setShowLastPaymentPopup(true);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-2 whitespace-nowrap text-center">
                    {collection.latestCommunication ? (
                      <div className="text-sm">
                        {collection.latestCommunication.nextActionDate || collection.latestCommunication.promisedDate ? (
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div className="font-medium">
                                {collection.latestCommunication.nextActionDate 
                                  ? format(new Date(collection.latestCommunication.nextActionDate), "dd/MM/yyyy")
                                  : format(new Date(collection.latestCommunication.promisedDate), "dd/MM/yyyy")}
                              </div>
                              {collection.latestCommunication.promisedAmount && (
                                <div className="text-green-600 dark:text-green-400 text-xs">
                                  ₹{(collection.latestCommunication.promisedAmount / 100).toLocaleString('en-IN')}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0"
                              title="View Details"
                              onClick={() => {
                                setPopupData(collection);
                                setShowNextFollowupPopup(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-1 px-1">
                    <div className="flex gap-0 flex-wrap justify-center">
                      {(user?.role === 'staff' || user?.role === 'admin' || user?.role === 'owner') && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Log Communication"
                            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => {
                              setSelectedCollection(collection);
                              setShowCommunicationDialog(true);
                            }}
                          >
                            <ClipboardList className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Call Customer"
                            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => window.location.href = `tel:${collection.customerPhone}`}
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Send SMS"
                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => {
                              const message = encodeURIComponent(`Reminder: Outstanding amount ${formatCurrency(collection.outstandingAmount)} is due.`);
                              window.location.href = `sms:${collection.customerPhone}?body=${message}`;
                            }}
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Send WhatsApp"
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => {
                              const phone = collection.customerPhone?.replace(/[^0-9]/g, '');
                              const message = encodeURIComponent(`Hello ${collection.customerName}, this is regarding your outstanding amount of ${formatCurrency(collection.outstandingAmount)}.`);
                              window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                            }}
                          >
                            <SiWhatsapp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Record Payment"
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => {
                              setSelectedCollection(collection);
                              setShowPaymentDialog(true);
                            }}
                          >
                            <IndianRupee className="h-3 w-3" />
                          </Button>
                          {!collection.disputeRaisedAt && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                              title="Raise Dispute"
                              onClick={() => handleRaiseDispute(collection)}
                            >
                              <AlertCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </>
                      )}
                      {collection.disputeRaisedAt && (
                        <Badge className="bg-orange-500 text-white text-xs py-0 px-1">
                          <AlertCircle className="w-3 h-3 mr-0.5" />
                          <span className="text-xs">Disputed</span>
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

      {/* Next Followup Popup */}
      <Dialog open={showNextFollowupPopup} onOpenChange={setShowNextFollowupPopup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Next Followup Details</DialogTitle>
            <DialogDescription>
              {popupData?.customerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {popupData?.latestCommunication ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Type:</span>
                    <span className="capitalize">{popupData.latestCommunication.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Direction:</span>
                    <span className="capitalize">{popupData.latestCommunication.direction}</span>
                  </div>
                  {popupData.latestCommunication.subject && (
                    <div>
                      <span className="font-medium">Subject:</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {popupData.latestCommunication.subject}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Content:</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {popupData.latestCommunication.content}
                    </p>
                  </div>
                  {popupData.latestCommunication.outcome && (
                    <div>
                      <span className="font-medium">Outcome:</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {popupData.latestCommunication.outcome}
                      </p>
                    </div>
                  )}
                  {popupData.latestCommunication.promisedDate && (
                    <div className="flex justify-between">
                      <span className="font-medium">Promised Date:</span>
                      <span>{format(new Date(popupData.latestCommunication.promisedDate), "dd MMM yyyy")}</span>
                    </div>
                  )}
                  {popupData.latestCommunication.promisedAmount && (
                    <div className="flex justify-between">
                      <span className="font-medium">Promised Amount:</span>
                      <span className="text-green-600">
                        ₹{(popupData.latestCommunication.promisedAmount / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {popupData.latestCommunication.nextActionRequired && (
                    <div>
                      <span className="font-medium">Next Action Required:</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {popupData.latestCommunication.nextActionRequired}
                      </p>
                    </div>
                  )}
                  {popupData.latestCommunication.nextActionDate && (
                    <div className="flex justify-between">
                      <span className="font-medium">Next Action Date:</span>
                      <span>{format(new Date(popupData.latestCommunication.nextActionDate), "dd MMM yyyy")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium">Communication Date:</span>
                    <span>{format(new Date(popupData.latestCommunication.createdAt), "dd MMM yyyy, hh:mm a")}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No communication details available</p>
            )}
            <div className="flex gap-2">
              {popupData?.latestCommunication && user?.role !== 'customer' && (
                <Button 
                  onClick={() => {
                    setSelectedCommunicationForEdit(popupData.latestCommunication);
                    setShowEditCommunicationDialog(true);
                  }}
                  variant="outline"
                  className="flex-1 flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Followup
                </Button>
              )}
              <Button 
                onClick={() => setShowNextFollowupPopup(false)}
                className={popupData?.latestCommunication && user?.role !== 'customer' ? "flex-1" : "w-full"}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Last Payment Popup */}
      <Dialog open={showLastPaymentPopup} onOpenChange={setShowLastPaymentPopup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Last Payment Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              {/* Customer Name */}
              <div className="pb-2 border-b">
                <span className="text-sm text-gray-600">Customer Name</span>
                <p className="font-semibold text-lg">{popupData?.customerName || 'N/A'}</p>
              </div>

              {/* Outstanding Amount at Excel Upload Time */}
              <div>
                <span className="text-sm text-gray-600">Outstanding Amount at the time of uploading excel</span>
                <p className="font-bold text-lg text-red-600">
                  ₹{popupData?.originalAmount ? (popupData.originalAmount / 100).toLocaleString('en-IN') : 
                    popupData?.outstandingAmount ? ((popupData.outstandingAmount + (popupData.paidAmount || 0)) / 100).toLocaleString('en-IN') : '0'}
                </p>
              </div>

              {/* Excel Upload Date and Time */}
              <div>
                <span className="text-sm text-gray-600">Excel uploaded Date and time</span>
                <p className="font-medium">
                  {popupData?.importDate ? 
                    format(new Date(popupData.importDate), "dd MMM yyyy, hh:mm a") : 
                    'N/A'}
                </p>
                {popupData?.importFileName && (
                  <p className="text-xs text-gray-500 mt-1">File: {popupData.importFileName}</p>
                )}
              </div>

              {/* Total Last Payment Amount with Preview Button */}
              <div>
                <span className="text-sm text-gray-600">Total Last Payment Amount</span>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-lg text-green-600">
                    ₹{popupData?.paidAmount ? (popupData.paidAmount / 100).toLocaleString('en-IN') : '0'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (popupData?.id) {
                        fetchPaymentHistory(popupData.id);
                        setShowPaymentHistoryDialog(true);
                      }
                    }}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Preview
                  </Button>
                </div>
                {popupData?.lastPaymentDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last payment on {format(new Date(popupData.lastPaymentDate), "dd MMM yyyy")}
                  </p>
                )}
              </div>

              {/* Balance Amount */}
              <div className="pt-2 border-t">
                <span className="text-sm text-gray-600">Balance Amount</span>
                <p className="font-bold text-lg text-orange-600">
                  ₹{popupData?.outstandingAmount ? (popupData.outstandingAmount / 100).toLocaleString('en-IN') : '0'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {popupData?.lastPaymentId && (
                <Button 
                  onClick={async () => {
                    try {
                      // Fetch the latest payment details
                      if (popupData?.id) {
                        const payments = await apiRequest(`/api/collections/${popupData.id}/payments`, {
                          method: 'GET',
                        });
                        const latestPayment = payments
                          .filter((p: any) => p.status === 'approved')
                          .sort((a: any, b: any) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime())[0];
                        
                        if (latestPayment) {
                          setSelectedPaymentForEdit(latestPayment);
                          setShowEditPaymentDialog(true);
                        }
                      }
                    } catch (error) {
                      console.error('Failed to fetch payment for editing:', error);
                    }
                  }}
                  variant="outline"
                  className="flex-1 flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Payment
                </Button>
              )}
              <Button 
                onClick={() => setShowLastPaymentPopup(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={showEditPaymentDialog} onOpenChange={setShowEditPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment Details</DialogTitle>
            <DialogDescription>
              Submit an edit request for this payment.
            </DialogDescription>
          </DialogHeader>
          {selectedPaymentForEdit && (
            <Form {...paymentForm}>
              <form onSubmit={paymentForm.handleSubmit((data) => {
                editPayment.mutate({
                  paymentId: selectedPaymentForEdit.id,
                  editData: {
                    amount: parseFloat(data.amount) * 100,
                    paymentMode: data.paymentMode,
                    paymentDate: data.paymentDate || selectedPaymentForEdit.paymentDate || new Date().toISOString().split('T')[0],
                    referenceNumber: data.referenceNumber,
                    bankName: data.bankName,
                    notes: data.notes,
                  },
                });
              })} className="space-y-4">
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
                          defaultValue={(selectedPaymentForEdit.amount / 100).toString()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          defaultValue={selectedPaymentForEdit.paymentDate || new Date().toISOString().split('T')[0]}
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={selectedPaymentForEdit.paymentMode || field.value}
                      >
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
                      <FormLabel>Reference Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Transaction/Cheque number"
                          {...field}
                          defaultValue={selectedPaymentForEdit.referenceNumber || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Submit Edit Request
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditPaymentDialog(false);
                      setSelectedPaymentForEdit(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Communication Dialog */}
      <Dialog open={showEditCommunicationDialog} onOpenChange={setShowEditCommunicationDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Communication Details</DialogTitle>
            <DialogDescription>
              Submit an edit request for this communication.
            </DialogDescription>
          </DialogHeader>
          {selectedCommunicationForEdit && (
            <Form {...communicationForm}>
              <form onSubmit={communicationForm.handleSubmit((data) => {
                editCommunication.mutate({
                  communicationId: selectedCommunicationForEdit.id,
                  editData: {
                    type: data.type,
                    direction: data.direction,
                    subject: data.subject,
                    content: data.content,
                    outcome: data.outcome,
                    promisedAmount: data.promisedAmount ? parseFloat(data.promisedAmount) * 100 : null,
                    promisedDate: data.promisedDate,
                  },
                });
              })} className="space-y-4">
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
                          defaultValue={selectedCommunicationForEdit.content || ''}
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
                        <Input 
                          placeholder="e.g., Promised payment, Will call back" 
                          {...field}
                          defaultValue={selectedCommunicationForEdit.outcome || ''}
                        />
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
                          <Input 
                            type="number" 
                            placeholder="Amount promised" 
                            {...field}
                            defaultValue={selectedCommunicationForEdit.promisedAmount ? (selectedCommunicationForEdit.promisedAmount / 100).toString() : ''}
                          />
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
                          <Input 
                            type="date" 
                            {...field}
                            defaultValue={selectedCommunicationForEdit.promisedDate || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Submit Edit Request
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditCommunicationDialog(false);
                      setSelectedCommunicationForEdit(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={showPaymentHistoryDialog} onOpenChange={setShowPaymentHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              {popupData?.customerName} - All payments for Invoice #{popupData?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-sm font-medium">Date</th>
                      <th className="text-right p-2 text-sm font-medium">Amount</th>
                      <th className="text-left p-2 text-sm font-medium">Mode</th>
                      <th className="text-left p-2 text-sm font-medium">Reference</th>
                      <th className="text-left p-2 text-sm font-medium">Status</th>
                      {user?.role !== 'customer' && (
                        <th className="text-center p-2 text-sm font-medium">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment: any, index: number) => (
                      <tr key={payment.id || index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-2 text-sm">
                          {format(new Date(payment.paymentDate || payment.createdAt), "dd MMM yyyy")}
                        </td>
                        <td className="p-2 text-sm text-right font-medium text-green-600">
                          ₹{(payment.amount / 100).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-sm capitalize">{payment.paymentMode || 'N/A'}</td>
                        <td className="p-2 text-sm">{payment.referenceNumber || '-'}</td>
                        <td className="p-2">
                          <Badge
                            variant={
                              payment.status === 'approved' ? 'default' :
                              payment.status === 'pending_approval' ? 'secondary' :
                              'destructive'
                            }
                            className="text-xs"
                          >
                            {payment.status === 'pending_approval' ? 'Pending' : payment.status}
                          </Badge>
                        </td>
                        {user?.role !== 'customer' && (
                          <td className="p-2 text-center">
                            <Button
                              onClick={() => {
                                setSelectedPaymentForEdit(payment);
                                setShowEditPaymentDialog(true);
                                setShowPaymentHistoryDialog(false);
                              }}
                              variant="ghost"
                              size="sm"
                              title="Edit this payment"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="p-2 text-sm">Total</td>
                      <td className="p-2 text-sm text-right text-green-600">
                        ₹{(paymentHistory
                          .filter((p: any) => p.status === 'approved')
                          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) / 100)
                          .toLocaleString('en-IN')}
                      </td>
                      <td colSpan={user?.role !== 'customer' ? 4 : 3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No payment history available</p>
            )}
            <Button 
              onClick={() => setShowPaymentHistoryDialog(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}