import { db } from "../db";
import { 
  importBatches,
  customers,
  collections,
  type ImportBatch,
  type InsertImportBatch
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import xlsx from "xlsx";
import { CustomerService } from "./customerService";
import { CollectionService } from "./collectionService";
import { AuditService } from "./auditService";

interface ExcelRow {
  [key: string]: any;
}

interface ImportResult {
  success: boolean;
  customerId?: string;
  collectionId?: string;
  error?: string;
}

export class ExcelImportService {
  private customerService = new CustomerService();
  private collectionService = new CollectionService();
  private auditService = new AuditService();

  // Column name mappings for flexibility
  private columnMappings = {
    customerName: [
      'Customer Name', 'customer_name', 'Customer', 'Name', 
      'Debtor Name', 'Party Name', 'Account Name'
    ],
    customerCode: [
      'Customer Code', 'customer_code', 'Code', 'Account Code',
      'Party Code', 'Debtor Code', 'Customer ID'
    ],
    phone: [
      'Phone', 'Phone Number', 'phone_number', 'Mobile', 
      'Contact', 'Contact Number', 'Mobile Number'
    ],
    amount: [
      'Amount', 'Outstanding Amount', 'outstanding_amount', 
      'Outstanding', 'Balance', 'Due Amount', 'Pending Amount'
    ],
    invoiceNumber: [
      'Invoice Number', 'invoice_number', 'Invoice', 'Bill Number',
      'Bill No', 'Invoice No', 'Reference'
    ],
    invoiceDate: [
      'Invoice Date', 'invoice_date', 'Bill Date', 'Date'
    ],
    dueDate: [
      'Due Date', 'due_date', 'Payment Date'
    ],
    email: [
      'Email', 'Email Address', 'email_address', 'E-mail'
    ],
    companyName: [
      'Company Name', 'company_name', 'Company', 'Business Name'
    ],
    gstNumber: [
      'GST Number', 'gst_number', 'GST', 'GSTIN'
    ],
  };

  async processExcelFile(
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number,
    userId: string
  ): Promise<ImportBatch> {
    // Create import batch record
    const [batch] = await db.insert(importBatches).values({
      fileName,
      fileSize,
      status: "processing",
      importedBy: userId,
      totalRecords: 0,
      successRecords: 0,
      failedRecords: 0,
    }).returning();

    try {
      // Parse Excel file
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet) as ExcelRow[];

      // Process each row
      const results = await this.processRows(jsonData, batch.id, userId);

      // Update batch with results
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      const errors = results.filter(r => !r.success).map(r => r.error);

      const [updatedBatch] = await db.update(importBatches)
        .set({
          status: "completed",
          totalRecords: jsonData.length,
          successRecords: successCount,
          failedRecords: failedCount,
          errors: errors.length > 0 ? errors : undefined,
          completedAt: new Date(),
        })
        .where(eq(importBatches.id, batch.id))
        .returning();

      // Log the import
      await this.auditService.logAction({
        userId,
        action: "excel_import",
        entityType: "import_batch",
        entityId: batch.id,
        newValue: {
          fileName,
          totalRecords: jsonData.length,
          successRecords: successCount,
          failedRecords: failedCount,
        },
      });

      return updatedBatch;
    } catch (error) {
      // Update batch status to failed
      const [failedBatch] = await db.update(importBatches)
        .set({
          status: "failed",
          errors: [error instanceof Error ? error.message : "Unknown error"],
          completedAt: new Date(),
        })
        .where(eq(importBatches.id, batch.id))
        .returning();

      throw error;
    }
  }

  private async processRows(
    rows: ExcelRow[],
    batchId: string,
    userId: string
  ): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    for (const row of rows) {
      try {
        const result = await this.processRow(row, batchId, userId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  private async processRow(
    row: ExcelRow,
    batchId: string,
    userId: string
  ): Promise<ImportResult> {
    // Extract data from row using flexible column mappings
    const customerName = this.extractValue(row, this.columnMappings.customerName);
    const customerCode = this.extractValue(row, this.columnMappings.customerCode);
    const phone = this.extractValue(row, this.columnMappings.phone);
    const email = this.extractValue(row, this.columnMappings.email);
    const companyName = this.extractValue(row, this.columnMappings.companyName);
    const gstNumber = this.extractValue(row, this.columnMappings.gstNumber);
    const amountStr = this.extractValue(row, this.columnMappings.amount);
    const invoiceNumber = this.extractValue(row, this.columnMappings.invoiceNumber);
    const invoiceDateStr = this.extractValue(row, this.columnMappings.invoiceDate);
    const dueDateStr = this.extractValue(row, this.columnMappings.dueDate);

    // Validate required fields
    if (!customerName && !customerCode) {
      return {
        success: false,
        error: "Customer name or code is required",
      };
    }

    if (!amountStr || parseFloat(amountStr) <= 0) {
      return {
        success: false,
        error: "Valid amount is required",
      };
    }

    // Parse amount (convert to paise)
    const amount = Math.round(parseFloat(String(amountStr).replace(/[₹,\s]/g, '')) * 100);

    // Generate customer code if not provided
    const finalCustomerCode = customerCode || 
      `CUST-${customerName!.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Create or update customer
    const customer = await this.customerService.createOrUpdateFromImport({
      customerCode: finalCustomerCode,
      primaryContactName: customerName!,
      primaryPhone: phone,
      companyName: companyName,
    });

    // Parse dates
    const today = new Date();
    const invoiceDate = invoiceDateStr ? this.parseDate(invoiceDateStr) : today;
    const dueDate = dueDateStr ? this.parseDate(dueDateStr) : this.addDays(today, 30);

    // Generate invoice number if not provided
    const finalInvoiceNumber = invoiceNumber || 
      `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create collection record
    const collection = await this.collectionService.createCollection({
      customerId: customer.id,
      invoiceNumber: finalInvoiceNumber,
      invoiceDate: invoiceDate.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      originalAmount: amount,
      outstandingAmount: amount,
      paidAmount: 0,
      importBatchId: batchId,
      notes: `Imported from Excel: ${new Date().toLocaleDateString()}`,
    });

    return {
      success: true,
      customerId: customer.id,
      collectionId: collection.id,
    };
  }

  private extractValue(row: ExcelRow, possibleKeys: string[]): string | undefined {
    for (const key of possibleKeys) {
      // Check exact match
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]).trim();
      }
      
      // Check case-insensitive match
      const lowerKey = key.toLowerCase();
      for (const rowKey in row) {
        if (rowKey.toLowerCase() === lowerKey && row[rowKey] !== undefined && row[rowKey] !== null && row[rowKey] !== '') {
          return String(row[rowKey]).trim();
        }
      }
    }
    return undefined;
  }

  private parseDate(dateStr: string): Date {
    // Handle Excel date serial numbers
    if (!isNaN(Number(dateStr))) {
      const excelDate = Number(dateStr);
      // Excel dates start from 1900-01-01
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date;
    }

    // Try to parse string date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try common date formats
    const formats = [
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (match[0].includes('-') && match[1].length === 4) {
          // YYYY-MM-DD format
          return new Date(`${match[1]}-${match[2]}-${match[3]}`);
        } else {
          // DD/MM/YYYY or DD-MM-YYYY format
          return new Date(`${match[3]}-${match[2]}-${match[1]}`);
        }
      }
    }

    // Default to today if parsing fails
    return new Date();
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  async getImportHistory(userId: string, isAdmin: boolean): Promise<ImportBatch[]> {
    if (isAdmin) {
      // Admins can see all imports
      return await db.select()
        .from(importBatches)
        .orderBy(importBatches.createdAt)
        .limit(100);
    } else {
      // Users can only see their own imports
      return await db.select()
        .from(importBatches)
        .where(eq(importBatches.importedBy, userId))
        .orderBy(importBatches.createdAt)
        .limit(50);
    }
  }

  async getImportBatchById(id: string): Promise<ImportBatch | undefined> {
    const [batch] = await db.select()
      .from(importBatches)
      .where(eq(importBatches.id, id))
      .limit(1);
    
    return batch;
  }

  async validateExcelFile(fileBuffer: Buffer): Promise<{ 
    isValid: boolean; 
    errors: string[];
    preview?: ExcelRow[];
  }> {
    const errors: string[] = [];

    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      
      if (workbook.SheetNames.length === 0) {
        errors.push("Excel file contains no sheets");
        return { isValid: false, errors };
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet) as ExcelRow[];

      if (jsonData.length === 0) {
        errors.push("Excel file contains no data");
        return { isValid: false, errors };
      }

      // Check for required columns
      const firstRow = jsonData[0];
      const hasCustomerInfo = this.hasAnyColumn(firstRow, [
        ...this.columnMappings.customerName,
        ...this.columnMappings.customerCode,
      ]);

      const hasAmount = this.hasAnyColumn(firstRow, this.columnMappings.amount);

      if (!hasCustomerInfo) {
        errors.push("Excel file must contain customer name or code column");
      }

      if (!hasAmount) {
        errors.push("Excel file must contain amount column");
      }

      if (errors.length > 0) {
        return { isValid: false, errors };
      }

      return {
        isValid: true,
        errors: [],
        preview: jsonData.slice(0, 5), // Return first 5 rows as preview
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Failed to parse Excel file");
      return { isValid: false, errors };
    }
  }

  /**
   * Get column value using different possible column names
   */
  private getColumnValue(row: ExcelRow, possibleNames: string[]): any {
    for (const name of possibleNames) {
      if (row.hasOwnProperty(name)) {
        return row[name];
      }
      
      // Check case-insensitive
      const lowerName = name.toLowerCase();
      for (const rowKey in row) {
        if (rowKey.toLowerCase() === lowerName) {
          return row[rowKey];
        }
      }
    }
    return null;
  }

  /**
   * Map raw Excel row to standardized format
   */
  private mapRowData(row: ExcelRow): any {
    return {
      customerName: this.getColumnValue(row, this.columnMappings.customerName),
      amount: this.getColumnValue(row, this.columnMappings.amount),
      invoiceNumber: this.getColumnValue(row, this.columnMappings.invoiceNumber),
      dueDate: this.getColumnValue(row, this.columnMappings.dueDate),
      phone: this.getColumnValue(row, this.columnMappings.phone),
      email: this.getColumnValue(row, this.columnMappings.email),
      companyName: this.getColumnValue(row, this.columnMappings.companyName),
      gstNumber: this.getColumnValue(row, this.columnMappings.gstNumber)
    };
  }

  /**
   * Validate mapped row data
   */
  private validateRowData(mappedRow: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!mappedRow.customerName || String(mappedRow.customerName).trim() === '') {
      errors.push('Customer name is required');
    }
    
    const amount = parseFloat(String(mappedRow.amount || '').replace(/[₹,\s]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      errors.push('Valid amount is required');
    }
    
    if (!mappedRow.invoiceNumber || String(mappedRow.invoiceNumber).trim() === '') {
      errors.push('Invoice number is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private hasAnyColumn(row: ExcelRow, possibleKeys: string[]): boolean {
    for (const key of possibleKeys) {
      if (row.hasOwnProperty(key)) {
        return true;
      }
      
      // Check case-insensitive
      const lowerKey = key.toLowerCase();
      for (const rowKey in row) {
        if (rowKey.toLowerCase() === lowerKey) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Enterprise-grade batch processing for 1000+ users
   * Processes a stored import batch with progress tracking and error handling
   */
  async processBatch(batchId: string, userId: string): Promise<{
    collections: any[];
    totalRecords: number;
    successRecords: number;
    failedRecords: number;
    duplicateRecords: number;
    errors: any[];
  }> {
    try {
      // Get the import batch
      const batch = await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
      
      if (batch.length === 0) {
        throw new Error("Import batch not found");
      }

      const batchData = batch[0];
      if (!batchData.rawData) {
        throw new Error("No data found in import batch");
      }

      // Parse the stored Excel data
      const jsonData = JSON.parse(batchData.rawData as string);
      
      let successRecords = 0;
      let failedRecords = 0;
      let duplicateRecords = 0;
      const errors: any[] = [];
      const collections: any[] = [];

      // Process in chunks for better performance with large datasets
      const CHUNK_SIZE = 100; // Process 100 records at a time
      
      for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
        const chunk = jsonData.slice(i, i + CHUNK_SIZE);
        
        for (let j = 0; j < chunk.length; j++) {
          const rowIndex = i + j;
          try {
            const result = await this.processRow(chunk[j], batchId, userId);
            
            if (result.success) {
              collections.push(result.collectionId);
              successRecords++;
            } else if (result.error?.includes('duplicate')) {
              duplicateRecords++;
            } else {
              failedRecords++;
              errors.push({
                row: rowIndex + 1,
                error: result.error,
                data: chunk[j]
              });
            }
          } catch (error) {
            failedRecords++;
            errors.push({
              row: rowIndex + 1,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: chunk[j]
            });
          }
        }

        // Update batch progress
        const progress = Math.round(((i + chunk.length) / jsonData.length) * 100);
        await db.update(importBatches)
          .set({ 
            status: 'processing',
            processedAt: new Date(),
            summary: JSON.stringify({
              totalRecords: jsonData.length,
              processed: i + chunk.length,
              progress: progress
            })
          })
          .where(eq(importBatches.id, batchId));
      }

      // Update final batch status
      await db.update(importBatches)
        .set({ 
          status: failedRecords > successRecords ? 'failed' : 'completed',
          processedAt: new Date(),
          summary: JSON.stringify({
            totalRecords: jsonData.length,
            successRecords,
            failedRecords,
            duplicateRecords,
            errors: errors.slice(0, 100) // Store first 100 errors
          })
        })
        .where(eq(importBatches.id, batchId));

      return {
        collections,
        totalRecords: jsonData.length,
        successRecords,
        failedRecords,
        duplicateRecords,
        errors
      };

    } catch (error) {
      // Update batch with error status
      await db.update(importBatches)
        .set({ 
          status: 'failed',
          processedAt: new Date(),
          summary: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        })
        .where(eq(importBatches.id, batchId));

      throw error;
    }
  }

  /**
   * Preview batch data for 1000+ user environments
   * Returns structured preview with column mapping and validation
   */
  async previewBatch(batchId: string): Promise<{
    data: any[];
    count: number;
    columnMapping: any;
    summary: any;
  }> {
    try {
      // Get the import batch
      const batch = await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
      
      if (batch.length === 0) {
        throw new Error("Import batch not found");
      }

      const batchData = batch[0];
      if (!batchData.rawData) {
        throw new Error("No data found in import batch");
      }

      // Parse the stored Excel data
      const jsonData = JSON.parse(batchData.rawData as string);
      
      // Get column mapping
      const columnMapping = this.detectColumnMapping(jsonData[0] || {});
      
      // Validate and enrich preview data
      const previewData = jsonData.slice(0, 20).map((row: any, index: number) => {
        const mappedRow = this.mapRowData(row);
        return {
          rowNumber: index + 1,
          original: row,
          mapped: mappedRow,
          validation: this.validateRowData(mappedRow)
        };
      });

      // Generate summary statistics
      const summary = {
        totalRows: jsonData.length,
        previewRows: previewData.length,
        columnCount: Object.keys(jsonData[0] || {}).length,
        detectedColumns: columnMapping,
        estimatedProcessingTime: this.estimateProcessingTime(jsonData.length),
        warnings: this.analyzeDataQuality(jsonData.slice(0, 100)) // Analyze first 100 rows
      };

      return {
        data: previewData,
        count: jsonData.length,
        columnMapping,
        summary
      };

    } catch (error) {
      throw new Error(`Failed to preview batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect column mapping from Excel headers
   */
  private detectColumnMapping(firstRow: any): any {
    const mapping: any = {};
    
    for (const column in firstRow) {
      // Check each column mapping
      for (const [fieldName, possibleNames] of Object.entries(this.columnMappings)) {
        if (possibleNames.some(name => 
          column.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(column.toLowerCase())
        )) {
          mapping[fieldName] = column;
          break;
        }
      }
    }
    
    return mapping;
  }

  /**
   * Estimate processing time for large datasets
   */
  private estimateProcessingTime(rowCount: number): string {
    const recordsPerSecond = 50; // Conservative estimate for database operations
    const totalSeconds = Math.ceil(rowCount / recordsPerSecond);
    
    if (totalSeconds < 60) {
      return `${totalSeconds} seconds`;
    } else if (totalSeconds < 3600) {
      return `${Math.ceil(totalSeconds / 60)} minutes`;
    } else {
      return `${Math.ceil(totalSeconds / 3600)} hours`;
    }
  }

  /**
   * Analyze data quality for enterprise reporting
   */
  private analyzeDataQuality(sampleData: any[]): string[] {
    const warnings: string[] = [];
    
    if (sampleData.length === 0) {
      warnings.push("No sample data available for analysis");
      return warnings;
    }

    // Check for empty rows
    const emptyRows = sampleData.filter(row => 
      Object.values(row).every(val => !val || String(val).trim() === '')
    ).length;
    
    if (emptyRows > 0) {
      warnings.push(`${emptyRows} empty rows detected in sample`);
    }

    // Check for missing customer names
    const missingCustomers = sampleData.filter(row => {
      const customerName = this.getColumnValue(row, this.columnMappings.customerName);
      return !customerName || String(customerName).trim() === '';
    }).length;
    
    if (missingCustomers > 0) {
      warnings.push(`${missingCustomers} rows missing customer information`);
    }

    // Check for invalid amounts
    const invalidAmounts = sampleData.filter(row => {
      const amount = this.getColumnValue(row, this.columnMappings.amount);
      const numAmount = parseFloat(String(amount).replace(/[₹,\s]/g, ''));
      return isNaN(numAmount) || numAmount <= 0;
    }).length;
    
    if (invalidAmounts > 0) {
      warnings.push(`${invalidAmounts} rows have invalid amount values`);
    }

    // Check for duplicate invoice numbers
    const invoiceNumbers = sampleData.map(row => 
      this.getColumnValue(row, this.columnMappings.invoiceNumber)
    ).filter(Boolean);
    
    const uniqueInvoices = new Set(invoiceNumbers);
    if (invoiceNumbers.length !== uniqueInvoices.size) {
      warnings.push("Duplicate invoice numbers detected");
    }

    return warnings;
  }
}