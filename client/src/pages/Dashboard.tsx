import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Users, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';

interface DashboardStats {
  totalOutstanding: number;
  totalCollected: number;
  overdueCount: number;
  totalCount: number;
  monthlyTrend: { month: string; collected: number; outstanding: number }[];
}

interface Collection {
  id: number;
  customerName: string;
  invoiceNumber: string;
  outstandingAmount: number;
  dueDate: string;
  status: string;
  priority: string;
}

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: collections, isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ['/api/collections'],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'outstanding': return 'bg-yellow-500';
      case 'overdue': return 'bg-red-500';
      case 'partial': return 'bg-blue-500';
      default: return 'bg-gray-500';
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

  // Pie chart data for status distribution
  const statusData = collections ? [
    { name: 'Outstanding', value: collections.filter(c => c.status === 'outstanding').length, color: '#EAB308' },
    { name: 'Overdue', value: collections.filter(c => c.status === 'overdue').length, color: '#EF4444' },
    { name: 'Paid', value: collections.filter(c => c.status === 'paid').length, color: '#22C55E' },
    { name: 'Partial', value: collections.filter(c => c.status === 'partial').length, color: '#3B82F6' },
  ] : [];

  if (statsLoading || collectionsLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <div className="grid gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const recentCollections = collections?.slice(0, 5) || [];
  const overdueCollections = collections?.filter(c => c.status === 'overdue') || [];
  const collectionRate = stats ? (stats.totalCollected / (stats.totalCollected + stats.totalOutstanding)) * 100 : 0;

  return (
    <Layout>
      <div className="p-6 transition-colors duration-300">
        <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Collection Dashboard</h1>
            <p className="text-muted-foreground">Overview of payment collections and outstanding amounts</p>
          </div>
          <Link to="/collections">
            <Button>View All Collections</Button>
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats?.totalOutstanding || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {stats?.totalCount || 0} invoices
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.totalCollected || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {collectionRate.toFixed(1)}% collection rate
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.overdueCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {collectionRate.toFixed(1)}%
              </div>
              <Progress value={collectionRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Collection Trend</CardTitle>
              <CardDescription>Collection vs Outstanding over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                  <Line type="monotone" dataKey="collected" stroke="#22C55E" strokeWidth={2} name="Collected" />
                  <Line type="monotone" dataKey="outstanding" stroke="#EF4444" strokeWidth={2} name="Outstanding" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Distribution</CardTitle>
              <CardDescription>Breakdown of invoice statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Tabs defaultValue="recent" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recent">Recent Collections</TabsTrigger>
            <TabsTrigger value="overdue">Overdue Invoices</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle>Recent Collections</CardTitle>
                <CardDescription>Latest collection records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentCollections.map((collection) => (
                    <div key={collection.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{collection.customerName}</span>
                          <Badge variant={getPriorityColor(collection.priority)}>{collection.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Invoice: {collection.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">Due: {new Date(collection.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(collection.outstandingAmount)}</div>
                        <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${getStatusColor(collection.status)} text-white`}>
                          {collection.status}
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentCollections.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No collections found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="overdue">
            <Card>
              <CardHeader>
                <CardTitle>Overdue Invoices</CardTitle>
                <CardDescription>Invoices that require immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {overdueCollections.map((collection) => (
                    <div key={collection.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{collection.customerName}</span>
                          <Badge variant="destructive">Overdue</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Invoice: {collection.invoiceNumber}</p>
                        <p className="text-sm text-red-600">Overdue since: {new Date(collection.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600">{formatCurrency(collection.outstandingAmount)}</div>
                        <Link to={`/collections/${collection.id}`}>
                          <Button size="sm" variant="outline" className="mt-2">
                            Take Action
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                  {overdueCollections.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-green-600 mb-2">✓</div>
                      <p className="text-muted-foreground">No overdue invoices!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;