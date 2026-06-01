"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useForm } from "react-hook-form";
import { z } from "zod";


import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Banknote, CheckCircle2, Clock, Eye, EyeOff, History, XCircle } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BankDetails {
  bankName: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
}

interface PendingChangeRequest {
  id: string;
  newBankDetails: BankDetails;
  reason: string;
  status: "PENDING";
  createdAt: string;
}

type BankChangeStatus = "PENDING" | "APPROVED" | "REJECTED";

interface HistoryRequest {
  id: string;
  newBankDetails: BankDetails;
  reason: string;
  status: BankChangeStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Change-request form schema ──────────────────────────────────────────────

const changeRequestSchema = z.object({
  bankName: z.string().min(1, { message: "Bank name is required." }),
  accountName: z.string().min(1, { message: "Account name is required." }),
  bsb: z
    .string()
    .min(1, { message: "BSB is required." })
    .regex(/^\d{3}-?\d{3}$/, { message: "BSB must be in the format XXX-XXX." }),
  accountNumber: z.string().min(1, { message: "Account number is required." }),
  reason: z
    .string()
    .min(10, { message: "Please provide a more detailed reason (at least 10 characters)." }),
  currentPassword: z.string().min(1, { message: "Current password is required." }),
});

type ChangeRequestValues = z.infer<typeof changeRequestSchema>;

// ─── Status badge helper ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BankChangeStatus }) {
  switch (status) {
    case "PENDING":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BankDetailsSettingsPage() {
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingChangeRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [history, setHistory] = useState<HistoryRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const form = useForm<ChangeRequestValues>({
    resolver: zodResolver(changeRequestSchema),
    defaultValues: {
      bankName: "",
      accountName: "",
      bsb: "",
      accountNumber: "",
      reason: "",
      currentPassword: "",
    },
    mode: "onChange",
  });

  // ── Fetch bank details ────────────────────────────────────────────────────

  const fetchBankDetails = async () => {
    setIsLoading(true);
    try {
      const data = await api.get("/api/sellers/bank-details");
      setBankDetails(data.bankDetails ?? null);
      setPendingRequest(data.pendingChangeRequest ?? null);
    } catch (error: any) {
      toast.error("Failed to load bank details", {
        description: error.message || "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Fetch request history ─────────────────────────────────────────────────

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await api.get("/api/sellers/bank-change-requests");
      setHistory(data.requests ?? []);
    } catch {
      // History is supplementary — fail silently, don't interrupt the main view
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchBankDetails();
    fetchHistory();
  }, []);

  // ── Submit change request ─────────────────────────────────────────────────

  async function onSubmit(values: ChangeRequestValues) {
    setIsSubmitting(true);
    try {
      // Use raw fetch (not api.post) so a 401 wrong-password response
      // doesn't trigger the global logout interceptor in api.ts.
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "backend.madeinarnhemland.com.au";
      const res = await fetch(`${BASE_URL}/api/sellers/bank-details/change-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          bankName: values.bankName,
          accountName: values.accountName,
          bsb: values.bsb,
          accountNumber: values.accountNumber,
          reason: values.reason,
          currentPassword: values.currentPassword,
        }),
      });

      let body: any = {};
      try { body = await res.json(); } catch { /* non-JSON body */ }

      if (res.status === 401) {
        // Wrong password — show field error, do NOT log out
        form.setError("currentPassword", {
          type: "manual",
          message: body?.message?.toLowerCase().includes("password")
            ? body.message
            : "Incorrect password. Please try again.",
        });
        return;
      }

      if (res.status === 409 || body?.message?.toLowerCase().includes("pending")) {
        toast.error("Request already pending", {
          description: "You already have a pending bank details change request under review.",
        });
        setDialogOpen(false);
        form.reset();
        await Promise.all([fetchBankDetails(), fetchHistory()]);
        return;
      }

      if (!res.ok) {
        toast.error("Submission failed", {
          description: body?.message || `Unexpected error (${res.status}). Please try again.`,
        });
        return;
      }

      toast.success("Request submitted!", {
        description: "Your bank details change request has been submitted for review.",
      });
      setDialogOpen(false);
      form.reset();
      await Promise.all([fetchBankDetails(), fetchHistory()]);
    } catch (error: any) {
      toast.error("Submission failed", {
        description: error.message || "Please check your details and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-40 rounded bg-muted animate-pulse" />
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h3 className="text-lg font-medium">Bank Details</h3>
        <p className="text-sm text-muted-foreground">
          View your current bank account on file. Submit a change request if you need to update it.
        </p>
      </div>
      <Separator />

      {/* Pending request banner */}
      {pendingRequest && (
        <div className="flex gap-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-yellow-800 dark:text-yellow-300">
              A change request is currently under review
            </p>
            <p className="text-yellow-700 dark:text-yellow-400">
              Submitted on{" "}
              {new Date(pendingRequest.createdAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-yellow-800 dark:text-yellow-300">
              <span className="text-muted-foreground">Requested bank:</span>
              <span>{pendingRequest.newBankDetails.bankName}</span>
              <span className="text-muted-foreground">Account name:</span>
              <span>{pendingRequest.newBankDetails.accountName}</span>
              <span className="text-muted-foreground">BSB:</span>
              <span>{pendingRequest.newBankDetails.bsb}</span>
              <span className="text-muted-foreground">Account number:</span>
              <span>{pendingRequest.newBankDetails.accountNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* Current bank details card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <Banknote className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">Current Bank Account</CardTitle>
            <CardDescription>Details are partially masked for security.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {bankDetails ? (
            <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Bank Name</dt>
                <dd className="font-medium">{bankDetails.bankName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account Name</dt>
                <dd className="font-medium">{bankDetails.accountName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">BSB</dt>
                <dd className="font-medium font-mono">{bankDetails.bsb}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account Number</dt>
                <dd className="font-medium font-mono">{bankDetails.accountNumber}</dd>
              </div>
            </dl>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No bank details on file.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request change button */}
      <div>
        <Button
          onClick={() => {
            form.reset();
            setDialogOpen(true);
          }}
          disabled={!!pendingRequest}
        >
          Request to Change Bank Details
        </Button>
        {pendingRequest && (
          <p className="mt-2 text-xs text-muted-foreground">
            You cannot submit a new request while one is under review.
          </p>
        )}
      </div>

      {/* ── Request history ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Request History</h4>
        </div>

        {historyLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven't submitted any bank change requests yet.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((req) => (
              <div
                key={req.id}
                className="rounded-lg border p-4 text-sm space-y-2"
              >
                {/* Row 1: status + date */}
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={req.status} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(req.createdAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* Row 2: requested details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-medium">{req.newBankDetails.bankName}</span>
                  <span className="text-muted-foreground">Account name</span>
                  <span className="font-medium">{req.newBankDetails.accountName}</span>
                  <span className="text-muted-foreground">BSB</span>
                  <span className="font-mono">{req.newBankDetails.bsb}</span>
                  <span className="text-muted-foreground">Account no.</span>
                  <span className="font-mono">{req.newBankDetails.accountNumber}</span>
                </div>

                {/* Row 3: reason */}
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Reason: </span>
                  {req.reason}
                </p>

                {/* Row 4: review note (if rejected) */}
                {req.status === "REJECTED" && req.reviewNote && (
                  <div className="flex gap-1.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-800 dark:text-red-300">
                    <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium">Admin note: </span>
                      {req.reviewNote}
                    </span>
                  </div>
                )}

                {req.status === "APPROVED" && (
                  <div className="flex gap-1.5 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-xs text-green-800 dark:text-green-300">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>These details were approved and applied to your account.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change request dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Bank Details Change</DialogTitle>
            <DialogDescription>
              Enter your new bank details and verify your identity with your current password.
              An admin will review your request before applying any changes.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-2"
              id="bank-change-form"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Bank Name */}
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ANZ Bank" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Account Name */}
                <FormField
                  control={form.control}
                  name="accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Name on the account" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* BSB */}
                <FormField
                  control={form.control}
                  name="bsb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BSB</FormLabel>
                      <FormControl>
                        <Input placeholder="XXX-XXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Account Number */}
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 87654321" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Reason */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Change</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe why you need to change your bank details (min 10 characters)…"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Current Password */}
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Your account password"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword((v) => !v)}
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="bank-change-form" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
