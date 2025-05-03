import { SymptomForm } from '@/components/symptom-form';
import { HeartPulse } from 'lucide-react'; // Using a relevant icon

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 md:p-12 lg:p-24 bg-background">
      <header className="mb-12 text-center">
        <div className="flex justify-center items-center gap-4 mb-4">
           <HeartPulse className="h-12 w-12 text-primary" />
           <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            HealthAI Assistant
           </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Get AI-powered insights into potential health conditions based on your symptoms.
        </p>
      </header>

      <SymptomForm />

      <footer className="mt-16 text-center text-sm text-muted-foreground">
         <p>&copy; {new Date().getFullYear()} HealthAI Assistant. All rights reserved.</p>
         <p className="mt-1">Disclaimer: This tool provides informational suggestions only and is not a substitute for professional medical advice.</p>
      </footer>
    </main>
  );
}
