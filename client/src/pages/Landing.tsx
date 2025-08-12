import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
            RBG Infra Developers LLP
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
            Comprehensive Collection Management System
          </p>
          <p className="text-lg text-slate-500 dark:text-slate-400 mb-12">
            Streamline your sundry debtors collection process with full transparency, 
            automated workflows, and real-time monitoring for enhanced efficiency.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Excel Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Direct import from accounting software with automated customer matching
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Real-time Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track staff activities and collection progress with live updates
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approval Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Secure approval system for all payment recordings and modifications
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Button 
              size="lg" 
              className="text-lg px-8 py-3"
              onClick={() => window.location.href = '/api/login'}
            >
              Sign In to Continue
            </Button>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Access your collection management dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}