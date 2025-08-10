import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Plus, Filter, MoreHorizontal, Calendar, IndianRupee, Phone, Mail, Upload } from "lucide-react";
import { Link } from 'react-router-dom';
import { format } from "date-fns";
import Layout from '@/components/Layout';

interface Collection {
  id: number;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  originalAmount: number;
  outstandingAmount: number;
  paidAmount: number;
  currency: string;
  status: string;
  priority: string;
  description?: string;
  assignedTo?: string;
  lastContactDate?: string;
  nextFollowupDate?: string;
  createdAt: string;
  updatedAt: string;
}

const Collections = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: collections = [], isLoading } = useQuery<Collection[]>({
    queryKey: ['/api/collections'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/collections', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          invoiceDate: new Date(data.invoiceDate),
          dueDate: new Date(data.dueDate),
          originalAmount: Math.round(parseFloat(data.originalAmount) * 100),
          outstandingAmount: Math.round(parseFloat(data.outstandingAmount) * 100),
          paidAmount: Math.round((parseFloat(data.originalAmount) - parseFloat(data.outstandingAmount)) * 100),
          nextFollowupDate: data.nextFollowupDate ? new Date(data.nextFollowupDate) : null,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Collection record created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create collection record",
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    createMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'outstanding': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'partial': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const filteredCollections = collections.filter(collection => {
    const matchesSearch = collection.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         collection.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         collection.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || collection.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || collection.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusCounts = {
    all: collections.length,
    outstanding: collections.filter(c => c.status === 'outstanding').length,
    overdue: collections.filter(c => c.status === 'overdue').length,
    paid: collections.filter(c => c.status === 'paid').length,
    partial: collections.filter(c => c.status === 'partial').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 transition-colors duration-300">
        <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Collections Management</h1>
            <p className="text-muted-foreground">Manage outstanding payments and customer collections</p>
          </div>
          <div className="flex gap-2">
            <Link to="/import">
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import Excel
              </Button>
            </Link>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Collection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Collection Record</DialogTitle>
                <DialogDescription>
                  Add a new invoice or collection record to track outstanding payments
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input id="customerName" name="customerName" required />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Customer Email *</Label>
                    <Input id="customerEmail" name="customerEmail" type="email" required />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <Input id="customerPhone" name="customerPhone" />
                  </div>
                  <div>
                    <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                    <Input id="invoiceNumber" name="invoiceNumber" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoiceDate">Invoice Date *</Label>
                    <Input id="invoiceDate" name="invoiceDate" type="date" required />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <Input id="dueDate" name="dueDate" type="date" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="originalAmount">Original Amount (₹) *</Label>
                    <Input 
                      id="originalAmount" 
                      name="originalAmount" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="outstandingAmount">Outstanding Amount (₹) *</Label>
                    <Input 
                      id="outstandingAmount" 
                      name="outstandingAmount" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select name="priority" defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nextFollowupDate">Next Follow-up Date</Label>
                    <Input id="nextFollowupDate" name="nextFollowupDate" type="date" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="Invoice details or notes..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Collection"}
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers or invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                  <SelectItem value="outstanding">Outstanding ({statusCounts.outstanding})</SelectItem>
                  <SelectItem value="overdue">Overdue ({statusCounts.overdue})</SelectItem>
                  <SelectItem value="partial">Partial ({statusCounts.partial})</SelectItem>
                  <SelectItem value="paid">Paid ({statusCounts.paid})</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Collections Table */}
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollections.map((collection) => (
                  <TableRow key={collection.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{collection.customerName}</div>
                        <div className="text-sm text-muted-foreground">{collection.customerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-mono text-sm">{collection.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(collection.invoiceDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-bold">{formatCurrency(collection.outstandingAmount)}</div>
                        <div className="text-xs text-muted-foreground">
                          of {formatCurrency(collection.originalAmount)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(collection.status)}>
                        {collection.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(collection.priority)}>
                        {collection.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`text-sm ${new Date(collection.dueDate) < new Date() && collection.status !== 'paid' ? 'text-red-600 font-medium' : ''}`}>
                        {format(new Date(collection.dueDate), 'MMM dd, yyyy')}
                        {new Date(collection.dueDate) < new Date() && collection.status !== 'paid' && (
                          <div className="text-xs text-red-500">Overdue</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={`/collections/${collection.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                        <Button size="sm" variant="outline">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCollections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                        ? "No collections match your filters" 
                        : "No collection records found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Collections;