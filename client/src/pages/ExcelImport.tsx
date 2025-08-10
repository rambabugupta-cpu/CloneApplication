import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Download,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

export default function ExcelImport() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);

  const importExcel = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/import/excel", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.successRecords} records`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import Excel file",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setImporting(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast({
          title: "Invalid File",
          description: "Please select an Excel file (.xlsx or .xls)",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.xlsx') && !droppedFile.name.endsWith('.xls')) {
        toast({
          title: "Invalid File",
          description: "Please select an Excel file (.xlsx or .xls)",
          variant: "destructive",
        });
        return;
      }
      setFile(droppedFile);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (!file) return;
    setImporting(true);
    importExcel.mutate(file);
  };

  const downloadTemplate = () => {
    // Create a sample template
    const template = `Customer Name,Customer Code,Phone Number,Outstanding Amount,Invoice Number,Invoice Date,Due Date,Company Name,GST Number
Rajesh Kumar,CUST001,9876543210,150000,INV-2024-001,01/01/2024,31/01/2024,Kumar Enterprises,29ABCDE1234F1Z5
Priya Sharma,CUST002,9876543211,250000,INV-2024-002,05/01/2024,04/02/2024,Sharma Industries,27ABCDE5678G2H6`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'collection_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Import from Tally</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Import sundry debtors list from Tally Excel export
        </p>
      </div>

      <div className="grid gap-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
            <CardDescription>
              Select or drag and drop your Tally Excel export file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-300 dark:border-gray-700'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              
              {file ? (
                <div className="space-y-2">
                  <p className="text-lg font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    Size: {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button
                      onClick={handleImport}
                      disabled={importing}
                    >
                      {importing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Start Import
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setImportResult(null);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Drop your Excel file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Supports .xlsx and .xls files exported from Tally
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Select File
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <Button
                variant="link"
                onClick={downloadTemplate}
                className="text-sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Sample Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import Progress */}
        {importing && (
          <Card>
            <CardHeader>
              <CardTitle>Import Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={66} className="mb-2" />
              <p className="text-sm text-gray-500">Processing Excel file...</p>
            </CardContent>
          </Card>
        )}

        {/* Import Result */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle>Import Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{importResult.successRecords}</p>
                    <p className="text-sm text-gray-500">Successful</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{importResult.failedRecords}</p>
                    <p className="text-sm text-gray-500">Failed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{importResult.totalRecords}</p>
                    <p className="text-sm text-gray-500">Total Records</p>
                  </div>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Import Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {importResult.errors.slice(0, 5).map((error: string, index: number) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                    {importResult.errors.length > 5 && (
                      <p className="text-sm mt-2">
                        And {importResult.errors.length - 5} more errors...
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Column Mapping Info */}
        <Card>
          <CardHeader>
            <CardTitle>Supported Column Names</CardTitle>
            <CardDescription>
              The system automatically recognizes these column names from your Excel file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Recognized Column Names</TableHead>
                  <TableHead>Required</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Customer Name</TableCell>
                  <TableCell className="text-sm">
                    Customer Name, Name, Debtor Name, Party Name, Account Name
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-red-500 text-white">Required</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Customer Code</TableCell>
                  <TableCell className="text-sm">
                    Customer Code, Code, Account Code, Party Code, Customer ID
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-yellow-500 text-white">Recommended</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Phone Number</TableCell>
                  <TableCell className="text-sm">
                    Phone, Phone Number, Mobile, Contact Number
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-yellow-500 text-white">Recommended</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Outstanding Amount</TableCell>
                  <TableCell className="text-sm">
                    Amount, Outstanding Amount, Balance, Due Amount, Pending Amount
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-red-500 text-white">Required</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Invoice Number</TableCell>
                  <TableCell className="text-sm">
                    Invoice Number, Invoice, Bill Number, Bill No, Reference
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-gray-500 text-white">Optional</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">GST Number</TableCell>
                  <TableCell className="text-sm">
                    GST Number, GST, GSTIN
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-gray-500 text-white">Optional</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}