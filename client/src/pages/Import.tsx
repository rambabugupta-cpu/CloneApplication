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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/collections")}
            className="flex items-center gap-2 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Collections
          </Button>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Import Data
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              Bulk import customer and collection data from Excel files
            </p>
          </div>
          
          <ExcelImport onImportComplete={handleImportComplete} />
        </div>
      </div>
    </div>
  );
}