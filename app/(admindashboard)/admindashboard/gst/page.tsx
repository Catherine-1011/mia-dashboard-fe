"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Percent, Trash2, Loader2, X, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const getAuthToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("alpa_token");
};

type GSTMethod = {
  id: string;
  name: string;
  percentage: string | number;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

const fetchGSTMethods = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  
  const response = await fetch(`${BASE_URL}/api/gst/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  
  if (!response.ok) throw new Error("Failed to fetch GST methods");
  return response.json();
};

const addGSTMethod = async (data: {
  name: string;
  percentage: number;
  description: string;
  isDefault: boolean;
}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  
  const response = await fetch(`${BASE_URL}/api/gst/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error("Failed to add GST method");
  return response.json();
};

const deleteGSTMethod = async (id: string) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  
  console.log('Attempting to delete GST method:', { id, token: !!token });
  
  try {
    const response = await fetch(`${BASE_URL}/api/gst/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    console.log('Delete response:', { status: response.status, statusText: response.statusText });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('Delete failed with error data:', errorData);
      } catch {
        const errorText = await response.text();
        console.error('Delete failed with error text:', errorText);
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.message || errorData.error || `Failed to delete GST method (${response.status})`);
    }
    
    if (response.status === 204) {
      console.log('GST method deletion successful (No Content)');
      return null;
    }
    
    console.log('GST method deletion successful');
    return response.json();
  } catch (error) {
    console.error('Network error during deletion:', error);
    throw error;
  }
};

const updateGSTMethod = async (id: string, data: {
  name: string;
  percentage: number;
  description: string;
  isDefault: boolean;
}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  
  console.log('Attempting to update GST method:', { id, token: !!token });
  
  try {
    const response = await fetch(`${BASE_URL}/api/gst/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    console.log('Update response:', { status: response.status, statusText: response.statusText });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('Update failed with error data:', errorData);
      } catch {
        const errorText = await response.text();
        console.error('Update failed with error text:', errorText);
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.message || errorData.error || `Failed to update GST method (${response.status})`);
    }
    
    console.log('GST method update successful');
    return response.json();
  } catch (error) {
    console.error('Network error during update:', error);
    throw error;
  }
};

function GSTPage() {
  const [gstMethods, setGSTMethods] = useState<GSTMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [editGSTId, setEditGSTId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    percentage: "",
    description: "",
    isDefault: false,
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    percentage: "",
    description: "",
    isDefault: false,
  });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      toast.error("Please log in to view GST methods");
      setLoading(false);
      return;
    }
    loadGSTMethods();
  }, []);

  const loadGSTMethods = async () => {
    try {
      setLoading(true);
      const data = await fetchGSTMethods();
      setGSTMethods(data.data || []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load GST methods");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGST = async () => {
    if (!formData.name || !formData.percentage || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      await addGSTMethod({
        name: formData.name,
        percentage: parseFloat(formData.percentage),
        description: formData.description,
        isDefault: formData.isDefault,
      });
      toast.success("GST method added successfully!");
      setShowAddModal(false);
      setFormData({
        name: "",
        percentage: "",
        description: "",
        isDefault: false,
      });
      loadGSTMethods();
    } catch (error) {
      toast.error((error as Error).message || "Failed to add GST method");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGST = async (id: string) => {
    if (!confirm("Are you sure you want to delete this GST method?")) return;

    try {
      await deleteGSTMethod(id);
      toast.success("GST method deleted successfully!");
      loadGSTMethods();
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete GST method");
    }
  };

  const openEditModal = (method: GSTMethod) => {
    setEditGSTId(method.id);
    setEditFormData({
      name: method.name,
      percentage: method.percentage.toString(),
      description: method.description,
      isDefault: method.isDefault,
    });
    setShowEditModal(true);
  };

  const handleEditGST = async () => {
    if (!editGSTId) return;
    if (!editFormData.name || !editFormData.percentage || !editFormData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setEditSubmitting(true);
      await updateGSTMethod(editGSTId, {
        name: editFormData.name,
        percentage: parseFloat(editFormData.percentage),
        description: editFormData.description,
        isDefault: editFormData.isDefault,
      });
      toast.success("GST method updated successfully!");
      setShowEditModal(false);
      setEditGSTId(null);
      loadGSTMethods();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update GST method");
    } finally {
      setEditSubmitting(false);
    }
  };

  const filteredMethods = gstMethods.filter((method) =>
    method.name.toLowerCase().includes(search.toLowerCase()) ||
    method.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2 items-center">
            <Skeleton className="h-10 w-[250px] rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* GST method cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-5 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GST Management</h1>
          <p className="text-muted-foreground">Manage your Goods and Services Tax rates.</p>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0 items-center">
          <input
            type="text"
            placeholder="Search GST methods..."
            className="border rounded px-3 py-2 w-[250px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" /> Add GST Rate
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total GST Rates</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gstMethods.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Rates</CardTitle>
            <Badge variant="default" className="w-fit">
              {gstMethods.filter((m) => m.isActive).length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gstMethods.filter((m) => m.isActive).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* GST Methods List */}
      {filteredMethods.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No GST methods found. Create one to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {filteredMethods.map((method) => (
            <Card key={method.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{method.name}</CardTitle>
                    <CardDescription className="text-sm">{method.description}</CardDescription>
                  </div>
                  <div className="flex gap-2 ml-2">
                    {method.isDefault && (
                      <Badge variant="default" className="whitespace-nowrap">
                        Default
                      </Badge>
                    )}
                    <Badge variant={method.isActive ? "default" : "secondary"} className="whitespace-nowrap">
                      {method.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 mt-auto">
                <div className="border-t pt-4">
                  <div className="flex items-center gap-3">
                    <Percent className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-[12px] text-muted-foreground">GST Rate</p>
                      <p className="font-bold text-2xl text-primary">{method.percentage}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => openEditModal(method)}
                  >
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDeleteGST(method.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add GST Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardHeader className="border-b sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Add GST Rate</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  GST Rate Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Standard GST, Premium GST"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="focus:ring-primary h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe this GST rate..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="resize-none focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="percentage" className="text-sm font-semibold">
                  GST Percentage (%) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="percentage"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                    className="pl-9 focus:ring-primary h-10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label htmlFor="isDefault" className="text-sm font-semibold cursor-pointer">
                    Set as Default
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Use this GST rate by default for new products</p>
                </div>
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button
                  className="flex-1 h-11 text-base font-semibold shadow-lg shadow-primary/20"
                  onClick={handleAddGST}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" /> Add GST Rate</>}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 px-8"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit GST Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardHeader className="border-b sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Edit GST Rate</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                  className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-semibold">
                  GST Rate Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., Standard GST, Premium GST"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="focus:ring-primary h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm font-semibold">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="edit-description"
                  placeholder="Describe this GST rate..."
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                  className="resize-none focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-percentage" className="text-sm font-semibold">
                  GST Percentage (%) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-percentage"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={editFormData.percentage}
                    onChange={(e) => setEditFormData({ ...editFormData, percentage: e.target.value })}
                    className="pl-9 focus:ring-primary h-10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-isDefault" className="text-sm font-semibold cursor-pointer">
                    Set as Default
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Use this GST rate by default for new products</p>
                </div>
                <Switch
                  id="edit-isDefault"
                  checked={editFormData.isDefault}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, isDefault: checked })}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button
                  className="flex-1 h-11 text-base font-semibold shadow-lg shadow-primary/20"
                  onClick={handleEditGST}
                  disabled={editSubmitting}
                >
                  {editSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <>Save Changes</>}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 px-8"
                  onClick={() => setShowEditModal(false)}
                  disabled={editSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default GSTPage;

