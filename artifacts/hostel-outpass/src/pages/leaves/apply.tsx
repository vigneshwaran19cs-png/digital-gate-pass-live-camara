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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const formSchema = z.object({
  leaveType: z.enum(["home", "medical", "emergency", "personal", "educational"]),
  fromDate: z.string().min(1, "From Date is required"),
  toDate: z.string().min(1, "To Date is required"),
  destination: z.string().min(3, "Destination is required"),
  reason: z.string().min(10, "Please provide a detailed reason"),
});

export default function ApplyLeavePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createLeave = useCreateLeave();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaveType: "home",
      fromDate: "",
      toDate: "",
      destination: "",
      reason: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createLeave.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Leave applied successfully", description: "Your request is pending warden approval." });
          queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey() });
          setLocation("/leaves");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to apply for leave.", variant: "destructive" });
        }
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/leaves")} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Leaves
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-heading">Apply for Leave</CardTitle>
          <CardDescription>Fill out the details below to request hostel leave. It will be routed for approvals.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="leaveType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="home">Home Visit</SelectItem>
                        <SelectItem value="medical">Medical</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="educational">Educational / Event</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
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
                      <FormLabel>To Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
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
                    <FormLabel>Destination / Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Where are you going?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Leave</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide detailed reason for your leave request..." 
                        className="resize-none min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t border-border mt-6">
                <Button type="button" variant="outline" onClick={() => setLocation("/leaves")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLeave.isPending}>
                  {createLeave.isPending ? "Submitting..." : "Submit Leave Request"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}