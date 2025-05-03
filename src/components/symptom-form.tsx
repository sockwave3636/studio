'use client';

import type { Symptom, MedicalHistory, PatientProfile } from '@/services/medical-diagnosis';
import type { AnalyzeSymptomsInput, AnalyzeSymptomsOutput } from '@/ai/flows/analyze-symptoms';
import { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { analyzeSymptoms } from '@/ai/flows/analyze-symptoms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlusCircle, Trash2, Loader2, ImageUp, X } from 'lucide-react';
import { DiagnosisResults } from '@/components/diagnosis-results';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image'; // Import next/image

// Define Zod schema based on AnalyzeSymptomsInputSchema for client-side validation
const symptomSchema = z.object({
  name: z.string().min(1, 'Symptom name is required.'),
  severity: z.string().min(1, 'Severity is required.'),
});

const medicalHistorySchema = z.object({
  pastConditions: z.string().optional(), // Using string for textarea input, will split later
  currentMedications: z.string().optional(), // Using string for textarea input, will split later
});

// Define max file size (e.g., 10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Define accepted image types
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/dicom"]; // Added dicom based on context, browser support varies

const formSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  age: z.coerce.number().int().positive('Age must be a positive number.').min(1, 'Age is required.'),
  weight: z.coerce.number().positive('Weight must be positive').optional(),
  weightUnit: z.string().optional(),
  height: z.coerce.number().positive('Height must be positive').optional(),
  heightUnit: z.string().optional(),
  gender: z.string().min(1, 'Gender is required.'),
  symptoms: z.array(symptomSchema).min(1, 'Please add at least one symptom.'),
  medicalHistory: medicalHistorySchema,
  medicalImage: z
    .custom<FileList>()
    .refine(files => files === undefined || files === null || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max image size is 10MB.`)
    .refine(
      files => files === undefined || files === null || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, .png, .webp and .dicom formats are supported."
    )
    .optional(),
}).refine(data => (data.weight ? !!data.weightUnit : true), {
    message: "Weight unit is required if weight is provided.",
    path: ["weightUnit"],
}).refine(data => (data.height ? !!data.heightUnit : true), {
    message: "Height unit is required if height is provided.",
    path: ["heightUnit"],
});


type FormData = z.infer<typeof formSchema>;

const severityLevels = ["Mild", "Moderate", "Severe", "Very Severe"];
const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];
const weightUnits = ["kg", "lbs"];
const heightUnits = ["cm", "in", "ft"];

export function SymptomForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalyzeSymptomsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      age: undefined,
      weight: undefined,
      weightUnit: undefined,
      height: undefined,
      heightUnit: undefined,
      gender: '',
      symptoms: [{ name: '', severity: '' }],
      medicalHistory: {
        pastConditions: '',
        currentMedications: '',
      },
      medicalImage: undefined,
    },
     mode: "onChange", // Validate on change to show errors earlier
  });

   const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size client-side before setting preview
      if (file.size > MAX_FILE_SIZE) {
          form.setError("medicalImage", { type: "manual", message: `Max image size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` });
          setImagePreview(null);
          form.setValue("medicalImage", undefined, { shouldValidate: true }); // Clear invalid value
          event.target.value = ''; // Reset file input
          return;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          form.setError("medicalImage", { type: "manual", message: "Invalid file type. Please upload an image (JPEG, PNG, WEBP) or DICOM file." });
          setImagePreview(null);
          form.setValue("medicalImage", undefined, { shouldValidate: true }); // Clear invalid value
           event.target.value = ''; // Reset file input
          return;
      }

      // Clear previous errors if validation passes now
      form.clearErrors("medicalImage");

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        // RHF stores FileList, not the data URI directly
        form.setValue("medicalImage", event.target.files, { shouldValidate: true });
      };
      reader.onerror = () => {
        console.error("Error reading file");
         toast({
          variant: "destructive",
          title: "File Read Error",
          description: "Could not read the selected image file.",
        });
        setImagePreview(null);
        form.setValue("medicalImage", undefined, { shouldValidate: true });
         event.target.value = ''; // Reset file input
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
      form.setValue("medicalImage", undefined, { shouldValidate: true });
    }
  }, [form, toast]);

  const removeImage = useCallback(() => {
    setImagePreview(null);
    form.setValue("medicalImage", undefined, { shouldValidate: true, shouldDirty: true });
    // Reset the actual file input element
    const fileInput = document.getElementById('medicalImage-input') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
    form.clearErrors("medicalImage");
  }, [form]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'symptoms',
  });

  // Function to convert File to Data URI
  const fileToDataUri = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  };


  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    let imageDataUri: string | undefined = undefined;
    if (data.medicalImage && data.medicalImage.length > 0) {
        try {
            imageDataUri = await fileToDataUri(data.medicalImage[0]);
        } catch (err) {
            console.error("Error converting image to Data URI:", err);
            setError("Failed to process the uploaded image. Please try again.");
            setIsLoading(false);
            return;
        }
    }


    // Prepare data for the AI flow
    const formattedMedicalHistory: MedicalHistory = {
        pastConditions: data.medicalHistory.pastConditions?.split(',').map(s => s.trim()).filter(s => s) ?? [],
        currentMedications: data.medicalHistory.currentMedications?.split(',').map(s => s.trim()).filter(s => s) ?? [],
    };

    const input: AnalyzeSymptomsInput = {
      name: data.name,
      age: data.age,
      weight: data.weight,
      weightUnit: data.weightUnit,
      height: data.height,
      heightUnit: data.heightUnit,
      gender: data.gender,
      symptoms: data.symptoms,
      medicalHistory: formattedMedicalHistory,
      imageDataUri: imageDataUri, // Add the image data URI
    };

    try {
      const diagnosisResults = await analyzeSymptoms(input);
      setResults(diagnosisResults);
    } catch (err) {
      console.error('Error analyzing symptoms:', err);
      setError('An error occurred while analyzing symptoms. The AI model might have limitations with image analysis or the input provided. Please ensure the image is clear and relevant, or try removing it. If the problem persists, contact support.');
       toast({
          variant: "destructive",
          title: "Analysis Error",
          description: "Failed to get analysis from the AI. Check console for details.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <Card className="shadow-lg rounded-lg border border-border">
        <CardHeader className="bg-secondary">
          <CardTitle className="text-2xl font-semibold text-secondary-foreground">Symptom Checker</CardTitle>
          <CardDescription className="text-secondary-foreground/80">
            Enter your details, symptoms, medical history, and optionally upload a medical image (MRI, X-ray). Our AI will provide potential conditions based on your input.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 p-6">
              {/* Profile Section */}
              <div className="space-y-4">
                 <Label className="text-lg font-medium">Your Information</Label>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                 />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="Enter your age" {...field} onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {genderOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Weight (Optional)</FormLabel>
                            <FormControl>
                             <Input type="number" step="0.1" placeholder="Enter weight" {...field} onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="weightUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight Unit</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.watch('weight')}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {weightUnits.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {unit}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Height (Optional)</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.1" placeholder="Enter height" {...field} onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="heightUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height Unit</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.watch('height')}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {heightUnits.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {unit}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                </div>
              </div>


              {/* Symptoms Section */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-lg font-medium">Symptoms</Label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start space-x-3 p-4 border rounded-md bg-card">
                    <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`symptoms.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Symptom</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Headache, Fever" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`symptoms.${index}.severity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Severity</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select severity" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {severityLevels.map((level) => (
                                    <SelectItem key={level} value={level}>
                                      {level}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="mt-8 text-destructive hover:bg-destructive/10"
                        aria-label="Remove symptom"
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                  </div>
                ))}
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: '', severity: '' })}
                    className="mt-2"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Symptom
                </Button>
                 {form.formState.errors.symptoms && !form.formState.errors.symptoms.root?.message && (
                   <p className="text-sm font-medium text-destructive">
                     {form.formState.errors.symptoms.message || "Please add at least one symptom."}
                   </p>
                )}
                 {form.formState.errors.symptoms?.root && (
                   <p className="text-sm font-medium text-destructive">
                     {form.formState.errors.symptoms.root.message}
                   </p>
                 )}
              </div>

             {/* Medical Image Upload Section */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-lg font-medium">Medical Image (Optional)</Label>
                <FormDescription>Upload an MRI, X-ray, or other relevant medical image (max 10MB).</FormDescription>
                 <FormField
                    control={form.control}
                    name="medicalImage"
                    render={({ field: { onChange, value, ...rest } }) => ( // Destructure onChange and value manually
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Input
                              id="medicalImage-input" // Add an ID for easier reset
                              type="file"
                              accept={ACCEPTED_IMAGE_TYPES.join(',')}
                              onChange={handleImageChange} // Use the custom handler
                              className="hidden" // Hide default input
                              {...rest} // Pass rest of props like name, ref etc.
                            />
                            <Button type="button" variant="outline" onClick={() => document.getElementById('medicalImage-input')?.click()}>
                               <ImageUp className="mr-2 h-4 w-4" /> Upload Image
                            </Button>
                             {imagePreview && (
                                <div className="relative group">
                                    <Image
                                        src={imagePreview}
                                        alt="Medical image preview"
                                        width={80}
                                        height={80}
                                        className="rounded border object-cover aspect-square"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={removeImage}
                                        aria-label="Remove image"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                          </div>

                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

              </div>


              {/* Medical History Section */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-lg font-medium">Medical History (Optional)</Label>
                 <FormField
                    control={form.control}
                    name="medicalHistory.pastConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Past Conditions</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Asthma, Diabetes (comma-separated)" {...field} />
                        </FormControl>
                         <FormDescription>Enter any relevant past medical conditions, separated by commas.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 <FormField
                    control={form.control}
                    name="medicalHistory.currentMedications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Medications</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Ibuprofen, Metformin (comma-separated)" {...field} />
                        </FormControl>
                         <FormDescription>List any medications you are currently taking, separated by commas.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-center p-6 border-t">
               <Button type="submit" disabled={isLoading || !form.formState.isValid} className="w-full max-w-xs">
                 {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    'Analyze Symptoms'
                  )}
              </Button>
               {!form.formState.isValid && form.formState.isSubmitted && (
                <p className="mt-4 text-sm text-destructive">Please fix the errors in the form before submitting.</p>
              )}
              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* Results Section */}
      {results && <DiagnosisResults results={results} />}
    </div>
  );
}
