import { ExcelImport } from "@/components/ExcelImport";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Import() {
  const navigate = useNavigate();

  const handleImportComplete = (count: number) => {
    // Navigate to collections page after successful import
    setTimeout(() => {
      navigate("/collections");
    }, 2000);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/collections")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Collections
        </Button>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Import Data</h1>
          <p className="text-muted-foreground mt-2">
            Upload Excel files to bulk import customer and collection data
          </p>
        </div>
        
        <ExcelImport onImportComplete={handleImportComplete} />
      </div>
    </div>
  );
}