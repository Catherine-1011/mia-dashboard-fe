"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Banknote,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BankChangeStatus = "PENDING" | "APPROVED" | "REJECTED";

interface BankDetailsShape {
  bankName: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
}

interface BankChangeRequest {
  id: string;
  sellerId: string;
  newBankDetails: BankDetailsShape;
  reason: string;
  status: BankChangeStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  seller: {
    userId: string;
    storeName: string;
    businessName: string;
    bankDetails: BankDetailsShape | null;
    user: {
      email: string;
      name: string;
    };
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: BankChangeStatus) {
  switch (status) {
    case "PENDING":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
          Pending
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700">
          Approved
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700">
          Rejected
        </Badge>
      );
  }
}

function BankDetailsGrid({
  details,
  label,
}: {
  details: BankDetailsShape | null;
  label: string;
}) {
  if (!details) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          {label}
        </p>
        <p className="text-sm text-muted-foreground italic">No details on file</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </p>
      <dl className="space-y-0.5 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted-foreground w-28 shrink-0">Bank</dt>
          <dd className="font-medium">{details.bankName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground w-28 shrink-0">Account name</dt>
          <dd className="font-medium">{details.accountName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground w-28 shrink-0">BSB</dt>
          <dd className="font-medium font-mono">{details.bsb}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground w-28 shrink-0">Account no.</dt>
          <dd className="font-medium font-mono">{details.accountNumber}</dd>
        </div>
      </dl>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BankChangeRequestsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const highlightRef = useRef<HTMLDivElement | null>(null);

  const [requests, setRequests] = useState<BankChangeRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [statusFilter, setStatusFilter] = useState<BankChangeStatus | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedRequest, setHighlightedRequest] = useState<BankChangeRequest | null>(null);

  // Approve state
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchRequests = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const statusParam =
          statusFilter !== "ALL" ? `&status=${statusFilter}` : "";
        const data = await api.get(
          `/api/admin/bank-change-requests?page=${page}&limit=20${statusParam}`
        );
        setRequests(data.requests ?? []);
        setPagination(
          data.pagination ?? { total: 0, page: 1, limit: 20, pages: 1 }
        );
      } catch (err: any) {
        toast.error("Failed to load bank change requests", {
          description: err.message || "Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter]
  );

  // ── Fetch single highlighted request from notification deep-link ───────────

  useEffect(() => {
    if (!highlightId) return;
    api.get(`/api/admin/bank-change-requests/${highlightId}`)
      .then((data) => {
        const req: BankChangeRequest = data.request ?? data;
        setHighlightedRequest(req);
      })
      .catch(() => {
        // Non-critical — falls back to normal list
      });
  }, [highlightId]);

  // ── Scroll to highlighted card once it renders ─────────────────────────────

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedRequest]);

  useEffect(() => {
    fetchRequests(1);
  }, [fetchRequests]);

  // ── Approve ───────────────────────────────────────────────────────────────

  async function handleApprove(requestId: string) {
    setApprovingId(requestId);
    try {
      await api.post(`/api/admin/bank-change-requests/${requestId}/approve`);
      toast.success("Request approved", {
        description: "The seller's bank details have been updated.",
      });
      await fetchRequests(pagination.page);
      // Refresh the highlighted card too if it was the actioned request
      if (highlightId === requestId) {
        api.get(`/api/admin/bank-change-requests/${requestId}`)
          .then((d) => setHighlightedRequest(d.request ?? d))
          .catch(() => {});
      }
    } catch (err: any) {
      toast.error("Approval failed", {
        description: err.message || "Please try again.",
      });
    } finally {
      setApprovingId(null);
    }
  }

  // ── Reject dialog ─────────────────────────────────────────────────────────

  function openRejectDialog(requestId: string) {
    setRejectingId(requestId);
    setReviewNote("");
    setRejectDialogOpen(true);
  }

  async function handleReject() {
    if (!rejectingId) return;
    setIsRejecting(true);
    try {
      await api.post(`/api/admin/bank-change-requests/${rejectingId}/reject`, {
        reviewNote: reviewNote.trim() || undefined,
      });
      toast.success("Request rejected", {
        description: "The seller's bank details remain unchanged.",
      });
      setRejectDialogOpen(false);
      setRejectingId(null);
      setReviewNote("");
      await fetchRequests(pagination.page);
      // Refresh the highlighted card too if it was the actioned request
      if (highlightId === rejectingId) {
        api.get(`/api/admin/bank-change-requests/${rejectingId}`)
          .then((d) => setHighlightedRequest(d.request ?? d))
          .catch(() => {});
      }
    } catch (err: any) {
      toast.error("Rejection failed", {
        description: err.message || "Please try again.",
      });
    } finally {
      setIsRejecting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Banknote className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Bank Change Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review and action seller requests to update their bank details.
          </p>
        </div>
      </div>

      <Separator />

      {/* Highlighted request from notification deep-link */}
      {highlightedRequest && (
        <div ref={highlightRef}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Opened from notification
          </p>
          <Card className="border-2 border-orange-400 dark:border-orange-600 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{highlightedRequest.seller.user.name}</CardTitle>
                  <CardDescription>{highlightedRequest.seller.user.email}</CardDescription>
                  <CardDescription>{highlightedRequest.seller.storeName}</CardDescription>
                </div>
                {statusBadge(highlightedRequest.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <BankDetailsGrid label="Current" details={highlightedRequest.seller.bankDetails} />
                <BankDetailsGrid label="Requested" details={highlightedRequest.newBankDetails} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Reason</p>
                <p className="text-sm">{highlightedRequest.reason}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Submitted{" "}
                {new Date(highlightedRequest.createdAt).toLocaleDateString("en-AU", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
              {highlightedRequest.status === "PENDING" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(highlightedRequest.id)}
                    disabled={approvingId === highlightedRequest.id}
                  >
                    {approvingId === highlightedRequest.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Check className="h-3.5 w-3.5 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => openRejectDialog(highlightedRequest.id)}
                    disabled={approvingId === highlightedRequest.id}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          <Separator className="mt-6" />
        </div>
      )}

      {/* Status filter tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as BankChangeStatus | "ALL")}
      >
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No bank change requests found
            {statusFilter !== "ALL" ? ` with status "${statusFilter.toLowerCase()}"` : ""}.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Current Details</TableHead>
                  <TableHead>Requested Changes</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <p className="font-medium">{req.seller.user.name}</p>
                      <p className="text-xs text-muted-foreground">{req.seller.user.email}</p>
                      <p className="text-xs text-muted-foreground">{req.seller.storeName}</p>
                    </TableCell>
                    <TableCell>
                      {req.seller.bankDetails ? (
                        <div className="text-xs space-y-0.5">
                          <p>{req.seller.bankDetails.bankName}</p>
                          <p className="text-muted-foreground">{req.seller.bankDetails.accountName}</p>
                          <p className="font-mono">{req.seller.bankDetails.bsb}</p>
                          <p className="font-mono">{req.seller.bankDetails.accountNumber}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None on file</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <p>{req.newBankDetails.bankName}</p>
                        <p className="text-muted-foreground">{req.newBankDetails.accountName}</p>
                        <p className="font-mono">{req.newBankDetails.bsb}</p>
                        <p className="font-mono">{req.newBankDetails.accountNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <p className="text-xs text-muted-foreground line-clamp-3">{req.reason}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>{statusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      {req.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950/30"
                            onClick={() => handleApprove(req.id)}
                            disabled={approvingId === req.id}
                          >
                            {approvingId === req.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            <span className="ml-1">Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950/30"
                            onClick={() => openRejectDialog(req.id)}
                            disabled={approvingId === req.id}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span className="ml-1">Reject</span>
                          </Button>
                        </div>
                      )}
                      {req.status === "REJECTED" && req.reviewNote && (
                        <p className="text-xs text-muted-foreground text-right break-words mt-1">
                          Note: {req.reviewNote}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{req.seller.user.name}</CardTitle>
                      <CardDescription>{req.seller.user.email}</CardDescription>
                      <CardDescription>{req.seller.storeName}</CardDescription>
                    </div>
                    {statusBadge(req.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <BankDetailsGrid
                      label="Current"
                      details={req.seller.bankDetails}
                    />
                    <BankDetailsGrid
                      label="Requested"
                      details={req.newBankDetails}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Reason
                    </p>
                    <p className="text-sm">{req.reason}</p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Submitted{" "}
                    {new Date(req.createdAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>

                  {req.status === "PENDING" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(req.id)}
                        disabled={approvingId === req.id}
                      >
                        {approvingId === req.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => openRejectDialog(req.id)}
                        disabled={approvingId === req.id}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {req.status === "REJECTED" && req.reviewNote && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      <span className="font-medium">Rejection note:</span> {req.reviewNote}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing{" "}
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={() => fetchRequests(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.pages || isLoading}
                  onClick={() => fetchRequests(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Bank Change Request</DialogTitle>
            <DialogDescription>
              The seller's current bank details will remain unchanged. Optionally
              provide a reason that will be visible to the seller.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-sm font-medium mb-1.5 block">
              Rejection note{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="e.g. The provided BSB does not appear to be valid. Please resubmit with a correct BSB."
              className="resize-none"
              rows={4}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Rejecting…
                </>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
