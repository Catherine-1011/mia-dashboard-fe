"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MessageSquare, RefreshCw, Search, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ContactSubmission {
  id: string;
  issueType: string;
  fullName: string;
  phoneNumber?: string;
  email: string;
  message: string;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function SupportQueriesPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, limit: 20, total: 0, totalPages: 1
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>("ALL");
  
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchSubmissions = async (page = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });
      if (searchTerm) queryParams.append("search", searchTerm);
      if (statusFilter !== "ALL") queryParams.append("status", statusFilter);
      if (issueTypeFilter !== "ALL") queryParams.append("issueType", issueTypeFilter);

      const data = await apiClient(`/api/contact?${queryParams.toString()}`);

      if (data && data.success) {
        setSubmissions(data.data);
        if (data.pagination) setPagination(data.pagination);
      } else {
        toast.error(data.message || "Failed to fetch queries.");
      }
    } catch (error) {
      toast.error("Error fetching contact queries.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, issueTypeFilter]);

  const handleSearchData = () => {
    fetchSubmissions(1);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const data = await apiClient(`/api/contact/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (data && data.success) {
        toast.success("Status updated successfully.");
        // Update local state instead of full re-fetch
        setSubmissions((prev) => 
          prev.map((sub) => sub.id === id ? { ...sub, status: newStatus as any } : sub)
        );
        if (selectedSubmission?.id === id) {
          setSelectedSubmission({ ...selectedSubmission, status: newStatus as any });
        }
      } else {
        toast.error(data.message || "Failed to update status.");
      }
    } catch {
      toast.error("An error occurred while updating status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this query?")) return;
    
    try {
      const data = await apiClient(`/api/contact/${id}`, {
        method: "DELETE",
      });

      if (data && data.success) {
        toast.success("Query deleted successfully.");
        fetchSubmissions(pagination.page);
        if (selectedSubmission?.id === id) setDetailsOpen(false);
      } else {
        toast.error(data.message || "Failed to delete query.");
      }
    } catch {
      toast.error("An error occurred while deleting.");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "NEW": return "destructive";
      case "IN_PROGRESS": return "default";
      case "RESOLVED": return "secondary";
      default: return "outline";
    }
  };

  const issueTypes = [
    "Customer Order Support",
    "Seller Registration",
    "Becoming a Marketplace Partner",
    "Cultural or Community Enquiries",
    "Media / Press",
    "General Enquiry"
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Queries</h1>
          <p className="text-muted-foreground mt-1">
            Manage contact form submissions from users.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchSubmissions(pagination.page)}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchData()}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={issueTypeFilter} onValueChange={setIssueTypeFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Issue Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Issue Types</SelectItem>
                {issueTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleSearchData}>Search</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="rounded-md border m-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading queries...
                  </TableCell>
                </TableRow>
              ) : submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No contact submissions found.
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {format(new Date(sub.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{sub.fullName}</span>
                        <span className="text-xs text-muted-foreground">{sub.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{sub.issueType}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(sub.status) as any}>
                        {sub.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSubmission(sub);
                          setDetailsOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchSubmissions(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchSubmissions(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Query Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedSubmission && format(new Date(selectedSubmission.createdAt), "PPp")}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">From</h4>
                  <p className="font-semibold">{selectedSubmission.fullName}</p>
                  <p>{selectedSubmission.email}</p>
                  {selectedSubmission.phoneNumber && <p>{selectedSubmission.phoneNumber}</p>}
                </div>
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">Issue Category</h4>
                  <p className="font-semibold">{selectedSubmission.issueType}</p>
                  <div className="mt-2">
                    <Badge variant={getStatusBadgeVariant(selectedSubmission.status) as any}>
                      {selectedSubmission.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-muted-foreground mb-2">Message</h4>
                <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm border">
                  {selectedSubmission.message}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Update Status:</span>
                  <Select
                    value={selectedSubmission.status}
                    onValueChange={(val) => handleUpdateStatus(selectedSubmission.id, val)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selectedSubmission.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Query
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}