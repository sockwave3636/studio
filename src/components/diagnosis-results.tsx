import type { AnalyzeSymptomsOutput } from '@/ai/flows/analyze-symptoms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

interface DiagnosisResultsProps {
  results: AnalyzeSymptomsOutput;
}

const getConfidenceIcon = (confidence: string) => {
  switch (confidence.toLowerCase()) {
    case 'high':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'medium':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case 'low':
      return <HelpCircle className="h-5 w-5 text-orange-600" />;
    default:
      return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getConfidenceVariant = (confidence: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (confidence.toLowerCase()) {
        case 'high':
            return "default"; // Consider a green variant if theme supports
        case 'medium':
            return "secondary"; // Consider a yellow/orange variant
        case 'low':
            return "outline";
        default:
            return "outline";
    }
}

export function DiagnosisResults({ results }: DiagnosisResultsProps) {
  if (!results || !results.diagnoses || results.diagnoses.length === 0) {
    return (
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle>Analysis Complete</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No potential conditions identified based on the provided information. If symptoms persist or worsen, please consult a healthcare professional.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl shadow-lg rounded-lg overflow-hidden border border-border">
      <CardHeader className="bg-secondary">
        <CardTitle className="text-xl font-semibold text-secondary-foreground">Potential Conditions</CardTitle>
        <CardDescription className="text-secondary-foreground/80">
          Based on your symptoms and medical history. This is not a substitute for professional medical advice.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {results.diagnoses.map((diagnosis, index) => (
            <li key={index} className="p-4 md:p-6 flex items-start space-x-4 hover:bg-muted/50 transition-colors duration-150">
              <div className="mt-1 flex-shrink-0">
               {getConfidenceIcon(diagnosis.confidence)}
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-medium text-foreground">{diagnosis.condition}</h3>
                <p className="text-sm text-muted-foreground mt-1">Likelihood based on input:</p>
              </div>
              <Badge variant={getConfidenceVariant(diagnosis.confidence)} className="ml-auto mt-1 flex-shrink-0 capitalize">
                {diagnosis.confidence}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
      <div className="p-4 md:p-6 border-t border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
              <span className="font-semibold">Disclaimer:</span> HealthAI Assistant provides informational suggestions and does not constitute medical advice. Always consult with a qualified healthcare provider for any health concerns or before making any decisions related to your health or treatment.
          </p>
      </div>
    </Card>
  );
}
