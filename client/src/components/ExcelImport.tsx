import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ExcelImportProps {
  onImportComplete?: (count: number) => void;
}

interface PreviewData {
  [key: string]: any;
}

export function ExcelImport({ onImportComplete }: ExcelImportProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileId, setFileId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const formatCurrency = (value: any): string => {
    if (!value && value !== 0) return "₹0.00";
    const numValue = typeof value === 'string' ? 
      parseFloat(value.replace(/[₹,\s]/g, '')) : 
      parseFloat(value);
    if (isNaN(numValue)) return "₹0.00";
    return `₹${numValue.toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('excel', file);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const response = await apiRequest('/api/excel/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        setFileId(result.fileId);
        setPreviewData(result.preview || []);
        setRowCount(result.rowCount);
        setSuccess(`File uploaded successfully! Found ${result.rowCount} rows of data.`);
        
        toast({
          title: "Upload Successful",
          description: `Excel file processed with ${result.rowCount} rows`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      toast({
        title: "Upload Failed",
        description: err.message || 'Failed to upload file',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImportData = async () => {
    if (!fileId) return;

    setIsImporting(true);
    setError(null);

    try {
      const response = await apiRequest(`/api/excel/${fileId}/import`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Successfully imported ${result.collections.length} collection records!`);
        
        toast({
          title: "Import Successful",
          description: `Created ${result.collections.length} collection records`,
        });

        onImportComplete?.(result.collections.length);
        
        // Reset state
        setFileId(null);
        setPreviewData([]);
        setRowCount(0);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import data');
      toast({
        title: "Import Failed",
        description: err.message || 'Failed to import data',
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getColumnHeaders = () => {
    if (previewData.length === 0) return [];
    return Object.keys(previewData[0] || {});
  };

  const resetImport = () => {
    setFileId(null);
    setPreviewData([]);
    setRowCount(0);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);
  };

  return (
    <Card className="w-full shadow-lg border-0 bg-card/50 backdrop-blur">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          Excel Import
        </CardTitle>
        <CardDescription className="text-base mt-2">
          Import customer data from Excel files. Your file should contain customer names and amounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        {!fileId && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="excel-file" className="text-lg font-medium cursor-pointer">
                Click to upload Excel file
              </Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Supported formats: .xlsx, .xls (Max size: 5MB)
              </p>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading and processing...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </div>
        )}

        {/* Preview Section */}
        {fileId && previewData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Data Preview</h3>
                <p className="text-sm text-muted-foreground">
                  Showing first 5 rows of {rowCount} total rows
                </p>
              </div>
              <Badge variant="secondary">
                {rowCount} rows found
              </Badge>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {getColumnHeaders().map((header, index) => (
                      <TableHead key={index} className="font-medium">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      {getColumnHeaders().map((header, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {header.toLowerCase().includes('amount') ? 
                            formatCurrency(row[header]) : 
                            String(row[header] || '-')
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleImportData}
                disabled={isImporting}
                className="flex items-center gap-2"
              >
                {isImporting ? (
                  <AlertCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isImporting ? 'Importing...' : 'Import Data'}
              </Button>
              <Button variant="outline" onClick={resetImport}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Alert Messages */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm">Accepted Column Names</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground mb-1">Customer Name</p>
              <ul className="space-y-0.5 text-xs">
                <li>• Customer Name</li>
                <li>• Customer</li>
                <li>• Name</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-muted-foreground mb-1">Amount (₹)</p>
              <ul className="space-y-0.5 text-xs">
                <li>• Amount</li>
                <li>• Outstanding Amount</li>
                <li>• Outstanding</li>
                <li>• Total</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-muted-foreground mb-1">Phone (Optional)</p>
              <ul className="space-y-0.5 text-xs">
                <li>• Phone</li>
                <li>• Phone Number</li>
                <li>• Mobile</li>
                <li>• Contact</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-muted-foreground mb-1">Email (Optional)</p>
              <ul className="space-y-0.5 text-xs">
                <li>• Email</li>
                <li>• Email Address</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>Note:</strong> Records will be created with 30-day due dates. Column names are case-insensitive.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}