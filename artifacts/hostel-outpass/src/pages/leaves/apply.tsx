import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateLeave, getListLeavesQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Home, Stethoscope, BookOpen, Briefcase, Users, Heart, Scissors, ShoppingBag, Banknote, Building2, ClipboardList, AlertCircle, CheckCircle2, FileText, MapPin } from "lucide-react";

type PassType = "leave" | "outing";

const LEAVE_CATEGORIES = [
  { value: "semester_holiday", label: "Semester Holiday", icon: Home, color: "bg-blue-100 text-blue-800 border-blue-200", desc: "End of semester vacation" },
  { value: "study_holiday", label: "Study Holiday", icon: BookOpen, color: "bg-purple-100 text-purple-800 border-purple-200", desc: "Pre-exam study break" },
  { value: "diwali_holiday", label: "Diwali Holiday", icon: "🪔", color: "bg-orange-100 text-orange-800 border-orange-200", desc: "Diwali festival holiday" },
  { value: "pongal_holiday", label: "Pongal Holiday", icon: "🌾", color: "bg-yellow-100 text-yellow-800 border-yellow-200", desc: "Pongal festival holiday" },
  { value: "christmas_holiday", label: "Christmas Holiday", icon: "🎄", color: "bg-green-100 text-green-800 border-green-200", desc: "Christmas vacation" },
  { value: "ramzan_holiday", label: "Ramzan Holiday", icon: "🌙", color: "bg-indigo-100 text-indigo-800 border-indigo-200", desc: "Eid / Ramzan holiday" },
  { value: "family_function", label: "Family Function", icon: Users, color: "bg-pink-100 text-pink-800 border-pink-200", desc: "Family ceremony/event" },
  { value: "marriage_function", label: "Marriage Function", icon: Heart, color: "bg-rose-100 text-rose-800 border-rose-200", desc: "Wedding in family" },
  { value: "family_emergency", label: "Family Emergency", icon: AlertCircle, color: "bg-red-100 text-red-800 border-red-200", desc: "Urgent family matter" },
  { value: "medical_leave", label: "Medical Leave", icon: Stethoscope, color: "bg-cyan-100 text-cyan-800 border-cyan-200", desc: "Illness or medical treatment" },
  { value: "hospital_visit", label: "Hospital Visit", icon: Stethoscope, color: "bg-teal-100 text-teal-800 border-teal-200", desc: "Doctor appointment / checkup" },
  { value: "internship", label: "Internship / Training", icon: Briefcase, color: "bg-slate-100 text-slate-800 border-slate-200", desc: "Industry internship" },
  { value: "project_work", label: "Project Work", icon: ClipboardList, color: "bg-violet-100 text-violet-800 border-violet-200", desc: "Academic project outside" },
  { value: "other", label: "Other Reason", icon: FileText, color: "bg-gray-100 text-gray-800 border-gray-200", desc: "Type your own reason" },
];

const OUTING_CATEGORIES = [
  { value: "hair_cut", label: "Hair Cut", icon: Scissors, color: "bg-blue-100 text-blue-800 border-blue-200", desc: "Barber / salon visit" },
  { value: "shopping", label: "Shopping", icon: ShoppingBag, color: "bg-purple-100 text-purple-800 border-purple-200", desc: "Stationary, clothes, etc." },
  { value: "atm_withdrawal", label: "ATM Withdrawal", icon: Banknote, color: "bg-green-100 text-green-800 border-green-200", desc: "Bank / ATM visit" },
  { value: "bank_visit", label: "Bank Visit", icon: Building2, color: "bg-yellow-100 text-yellow-800 border-yellow-200", desc: "Bank branch visit" },
  { value: "hospital_visit", label: "Hospital Visit", icon: Stethoscope, color: "bg-rose-100 text-rose-800 border-rose-200", desc: "Hospital appointment" },
  { value: "medical_checkup", label: "Medical Checkup", icon: Stethoscope, color: "bg-red-100 text-red-800 border-red-200", desc: "Doctor visit / pharmacy" },
  { value: "personal_work", label: "Personal Work", icon: ClipboardList, color: "bg-orange-100 text-orange-800 border-orange-200", desc: "Personal errand" },
  { value: "other", label: "Other Reason", icon: FileText, color: "bg-gray-100 text-gray-800 border-gray-200", desc: "Type your own reason" },
];

function generateLetter(passType: PassType, category: string, destination: string, fromDate: string, toDate: string, studentName = "Student", customReason = ""): string {
  const cat = passType === "leave" ? LEAVE_CATEGORIES.find(c => c.value === category) : OUTING_CATEGORIES.find(c => c.value === category);
  const catLabel = cat?.label || category;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  if (passType === "outing") {
    const outingReasonMap: Record<string, string> = {
      hair_cut: "I need to visit the barber/salon for a haircut, which cannot be done within the campus premises.",
      shopping: "I need to purchase stationery, personal items, and other academic essentials from the nearby market.",
      atm_withdrawal: "I need to visit the ATM/Bank to withdraw money for my academic and personal expenses.",
      bank_visit: "I have an urgent banking matter that needs to be resolved at the bank branch in person.",
      hospital_visit: "I have a scheduled appointment at the hospital and require permission to attend the same.",
      medical_checkup: "I need to visit the doctor/clinic for a medical checkup and to collect prescribed medicines.",
      personal_work: "I have an important personal errand that requires my presence outside the campus for a short duration.",
      other: customReason || "I have a personal matter that requires my brief presence outside the campus.",
    };
    const outingPurpose = outingReasonMap[category] || outingReasonMap.other;
    return `Date: ${dateStr}

To,
The Hostel Warden,
JKKM College of Technology,
Komarapalayam.

Respected Sir/Madam,

I, ${studentName}, a student of JKKM College of Technology residing in the college hostel, humbly request you to grant me an Outing Pass for ${catLabel.toLowerCase()} purposes.

${outingPurpose}

Purpose of Outing: ${catLabel}
Destination: ${destination}
Date: ${fromDate}${toDate && toDate !== fromDate ? ` to ${toDate}` : ""}
Expected Return Time: Same day before 6:00 PM

I assure you that I will return within the stipulated time and will not engage in any activity that brings disrepute to the institution.

Thanking you,

Yours obediently,
${studentName}
JKKM College of Technology`;
  }

  const daysText = fromDate && toDate ? `from ${fromDate} to ${toDate}` : "for the specified period";

  const reasonParagraphMap: Record<string, string> = {
    semester_holiday: `I wish to go to my hometown as the semester has ended and I would like to spend time with my family during this break.`,
    study_holiday: `As the examination period is approaching, I wish to go home to study in a comfortable environment and prepare well for my upcoming examinations.`,
    diwali_holiday: `I wish to celebrate the auspicious festival of Diwali with my family and I kindly request your permission to visit my home.`,
    pongal_holiday: `I wish to celebrate the harvest festival of Pongal with my family in our hometown.`,
    christmas_holiday: `I wish to celebrate Christmas with my family and seek your gracious permission to visit my home.`,
    ramzan_holiday: `I wish to observe the holy month of Ramzan and celebrate Eid with my family.`,
    family_function: `There is an important family function/ceremony at my home which requires my presence, and I kindly request your permission to attend the same.`,
    marriage_function: `There is a marriage ceremony in my family to which my presence is obligatory. I kindly request you to grant me leave to attend this auspicious occasion.`,
    family_emergency: `Due to an unforeseen family emergency, my immediate presence at home is required. I request you to kindly grant emergency leave.`,
    medical_leave: `I am currently unwell and require rest and proper medical treatment at home under the care of my family. My doctor has advised rest for the said period.`,
    hospital_visit: `I have a scheduled appointment / medical checkup at the hospital and require leave for the same.`,
    internship: `I have been selected for an internship/industrial training program and I am required to report to the organization during this period.`,
    project_work: `I have to carry out project-related work which requires me to visit external institutions and cannot be completed from within the campus.`,
    other: customReason ? `${customReason}` : `I have a personal reason for which I require leave during the specified period. I assure you that this is genuine and necessary.`,
  };

  const reasonParagraph = reasonParagraphMap[category] || reasonParagraphMap["other"];

  return `Date: ${dateStr}

To,
The Principal,
JKKM College of Technology,
Komarapalayam.

Through:
The Hostel Warden & Class Tutor

Respected Sir/Madam,

I, ${studentName}, a hostel student of JKKM College of Technology, most respectfully beg to state that I wish to avail leave ${daysText}.

${reasonParagraph}

Destination: ${destination}
Leave Period: ${fromDate} to ${toDate}
Category: ${catLabel}

I assure you that I will make up for any missed studies and will report back to the hostel within the sanctioned time without fail.

I, therefore, kindly request you to grant me leave for the above-mentioned period.

Thanking you,

Yours obediently,
${studentName}
JKKM College of Technology
Komarapalayam.`;
}

const formSchema = z.object({
  passType: z.enum(["leave", "outing"]),
  leaveType: z.string().min(1, "Please select a category"),
  fromDate: z.string().min(1, "From Date is required"),
  toDate: z.string().min(1, "To Date is required"),
  destination: z.string().min(3, "Destination is required"),
  reason: z.string().min(5, "Please provide a reason"),
  aiGeneratedLetter: z.string().optional(),
});

export default function ApplyLeavePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createLeave = useCreateLeave();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPassType, setSelectedPassType] = useState<PassType>("leave");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [generatedLetter, setGeneratedLetter] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passType: "leave",
      leaveType: "",
      fromDate: "",
      toDate: "",
      destination: "",
      reason: "",
    },
  });

  const { watch, setValue } = form;
  const fromDate = watch("fromDate");
  const toDate = watch("toDate");
  const destination = watch("destination");

  useEffect(() => {
    if (selectedCategory && destination && fromDate) {
      const letter = generateLetter(selectedPassType, selectedCategory, destination, fromDate, toDate, "Student", customReason);
      setGeneratedLetter(letter);
      setValue("aiGeneratedLetter", letter);
      if (selectedCategory !== "other") {
        const cat = selectedPassType === "leave"
          ? LEAVE_CATEGORIES.find(c => c.value === selectedCategory)
          : OUTING_CATEGORIES.find(c => c.value === selectedCategory);
        setValue("reason", cat?.label || selectedCategory);
      } else {
        setValue("reason", customReason);
      }
    }
  }, [selectedCategory, destination, fromDate, toDate, selectedPassType, customReason]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    createLeave.mutate(
      { data: { ...values, reason: values.reason } as any },
      {
        onSuccess: () => {
          toast({ title: "✅ Application Submitted", description: "Your request has been forwarded to the Warden for approval." });
          queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey() });
          setLocation("/leaves");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.message || "Failed to submit application.", variant: "destructive" });
        }
      }
    );
  }

  const categories = selectedPassType === "leave" ? LEAVE_CATEGORIES : OUTING_CATEGORIES;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <Button variant="ghost" onClick={() => setLocation("/leaves")} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Leaves
      </Button>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{step > s ? <CheckCircle2 className="w-4 h-4" /> : s}</div>
            {s < 3 && <div className={`h-0.5 w-12 transition-colors ${step > s ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
        <div className="ml-2 text-sm text-muted-foreground">
          {step === 1 ? "Select Pass Type" : step === 2 ? "Choose Category & Dates" : "Review Letter & Submit"}
        </div>
      </div>

      {/* Step 1: Pass Type */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">What do you need?</CardTitle>
            <CardDescription>Select the type of pass you want to apply for.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => { setSelectedPassType("leave"); form.setValue("passType", "leave"); }}
              className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${selectedPassType === "leave" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="text-3xl mb-3">🏠</div>
              <div className="font-bold text-lg">Hostel Leave</div>
              <div className="text-sm text-muted-foreground mt-1">Go home for holidays, family events, or medical reasons. Requires full approval chain: Warden → Tutor → HOD → Principal.</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {["Semester Holiday", "Family Function", "Medical"].map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              </div>
            </button>
            <button
              onClick={() => { setSelectedPassType("outing"); form.setValue("passType", "outing"); }}
              className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${selectedPassType === "outing" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="text-3xl mb-3">🚶</div>
              <div className="font-bold text-lg">Outing Pass</div>
              <div className="text-sm text-muted-foreground mt-1">Quick outing within town for personal errands. Faster approval: Warden only. Return same day.</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {["Hair Cut", "Shopping", "ATM / Bank", "Medical"].map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              </div>
            </button>
          </CardContent>
          <div className="px-6 pb-6 flex justify-end">
            <Button onClick={() => setStep(2)}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Category + Dates */}
      {step === 2 && (
        <Form {...form}>
          <form className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{selectedPassType === "leave" ? "🏠 Hostel Leave" : "🚶 Outing Pass"} — Choose Category</CardTitle>
                <CardDescription>Select the reason that best matches your situation.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {categories.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => { setSelectedCategory(cat.value); form.setValue("leaveType", cat.value); }}
                      className={`p-3 rounded-lg border-2 text-left transition-all hover:shadow-sm ${selectedCategory === cat.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                    >
                      <div className="text-lg mb-1">
                        {typeof cat.icon === "string" ? cat.icon : <cat.icon className="w-5 h-5" />}
                      </div>
                      <div className="font-medium text-sm">{cat.label}</div>
                      <div className="text-xs text-muted-foreground">{cat.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="fromDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} min={new Date().toISOString().split("T")[0]} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="toDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} min={fromDate || new Date().toISOString().split("T")[0]} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Destination</FormLabel>
                      <FormControl>
                        <Input placeholder={selectedPassType === "outing" ? "e.g., Town Market, Komarapalayam" : "e.g., 123 Gandhi Street, Chennai - 600001"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCategory === "other" && (
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Other Reason <span className="text-xs text-muted-foreground">(Keep it short — e.g. Passport Verification)</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Passport Verification"
                            {...field}
                            value={customReason}
                            onChange={(e) => {
                              field.onChange(e);
                              setCustomReason(e.target.value);
                              form.setValue("reason", e.target.value);
                            }}
                          />
                        </FormControl>
                        {customReason.length >= 3 && (
                          <p className="text-xs text-emerald-600 mt-1">✅ A formal letter will be auto-generated for this reason</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
              <div className="px-6 pb-6 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                  type="button"
                  disabled={!selectedCategory || !fromDate || !toDate || !destination || (selectedCategory === "other" && customReason.length < 5)}
                  onClick={() => {
                    const letter = generateLetter(selectedPassType, selectedCategory, destination, fromDate, toDate, "Student", customReason);
                    setGeneratedLetter(letter);
                    setValue("aiGeneratedLetter", letter);
                    if (selectedCategory !== "other") {
                      const cat = selectedPassType === "leave"
                        ? LEAVE_CATEGORIES.find(c => c.value === selectedCategory)
                        : OUTING_CATEGORIES.find(c => c.value === selectedCategory);
                      setValue("reason", cat?.label || selectedCategory);
                    } else {
                      setValue("reason", customReason);
                    }
                    setStep(3);
                  }}
                >
                  Preview Application <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </form>
        </Form>
      )}

      {/* Step 3: Review Letter */}
      {step === 3 && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Review Your Application Letter
                </CardTitle>
                <CardDescription>
                  This letter has been auto-generated based on your inputs. You can edit it before submitting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white border border-gray-200 rounded-lg p-4 font-mono text-sm shadow-inner relative">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Application Letter Preview</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => {
                        const win = window.open("", "_blank");
                        if (!win) return;
                        win.document.write(`<html><head><title>Leave Letter</title><style>body{font-family:'Georgia',serif;max-width:600px;margin:40px auto;padding:20px;line-height:1.8;font-size:14px;white-space:pre-wrap;}</style></head><body>${generatedLetter.replace(/\n/g, '<br/>')}</body></html>`);
                        win.document.close();
                        win.print();
                      }}
                    >
                      <FileText className="w-3 h-3" /> Print Letter
                    </Button>
                  </div>
                  <Textarea
                    value={generatedLetter}
                    onChange={(e) => {
                      setGeneratedLetter(e.target.value);
                      setValue("aiGeneratedLetter", e.target.value);
                    }}
                    className="min-h-[380px] font-mono text-sm border-0 shadow-none focus-visible:ring-0 bg-transparent resize-none"
                  />
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <strong>📋 Approval Route:</strong>{" "}
                  {selectedPassType === "outing"
                    ? "Warden → Outpass Generated (Same Day)"
                    : "Warden → Tutor (Parent Call) → HOD → Principal → Warden Final → Outpass Generated"}
                </div>
              </CardContent>
              <div className="px-6 pb-6 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Edit Details
                </Button>
                <Button type="submit" disabled={createLeave.isPending} className="min-w-[160px]">
                  {createLeave.isPending ? "Submitting..." : "✅ Submit Application"}
                </Button>
              </div>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}