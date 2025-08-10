import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  IndianRupee, 
  Users, 
  FileText, 
  AlertCircle, 
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useUser } from "@/hooks/use-user";

export default function Dashboard() {
  const { user } = useUser();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Sample data for charts
  const monthlyData = [
    { month: 'Jan', collected: 2500000, outstanding: 4500000 },
    { month: 'Feb', collected: 3200000, outstanding: 4200000 },
    { month: 'Mar', collected: 2800000, outstanding: 4800000 },
    { month: 'Apr', collected: 3500000, outstanding: 3900000 },
    { month: 'May', collected: 4100000, outstanding: 3500000 },
    { month: 'Jun', collected: 3800000, outstanding: 3200000 },
  ];

  const statusData = [
    { name: 'Paid', value: stats?.paidCount || 0, color: '#10B981' },
    { name: 'Pending', value: stats?.pendingCount || 0, color: '#F59E0B' },
    { name: 'Overdue', value: stats?.overdueCount || 0, color: '#EF4444' },
    { name: 'Partial', value: stats?.partialCount || 0, color: '#3B82F6' },
  ];

  const agingData = [
    { range: '0-30 days', amount: stats?.aging030 || 0 },
    { range: '31-60 days', amount: stats?.aging3160 || 0 },
    { range: '61-90 days', amount: stats?.aging6190 || 0 },
    { range: '90+ days', amount: stats?.aging90plus || 0 },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Welcome, {user?.fullName || user?.email}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's an overview of your collection management system
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalOutstanding || 0)}</div>
            <p className="text-xs text-muted-foreground">
              From {stats?.totalCount || 0} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalCollected || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Collection rate: {formatPercentage(stats?.collectionRate || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.overdueCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Amount: {formatCurrency(stats?.overdueAmount || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total: {stats?.totalCustomers || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Collection Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="collected" stroke="#10B981" name="Collected" strokeWidth={2} />
                <Line type="monotone" dataKey="outstanding" stroke="#EF4444" name="Outstanding" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collection Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
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

      {/* Aging Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Aging Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Collection Progress for Staff */}
      {(user?.role === 'staff' || user?.role === 'admin' || user?.role === 'owner') && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Your Collection Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Monthly Target</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(stats?.monthlyTarget || 5000000)} / {formatCurrency(stats?.monthlyAchieved || 3500000)}
                  </span>
                </div>
                <Progress value={stats?.targetProgress || 70} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{stats?.todayCollections || 0}</p>
                  <p className="text-xs text-muted-foreground">Today's Collections</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.weeklyCollections || 0}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.monthlyCollections || 0}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}