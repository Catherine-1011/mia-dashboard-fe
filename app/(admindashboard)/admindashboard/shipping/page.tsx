"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Truck, DollarSign, Clock, Edit, Trash2, Loader2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://alpa-be.onrender.com";

const getAuthToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("alpa_token");
};

type ShippingMethod = {
  id: string;
  name: string;
  description: string;
  cost: string | number;
  estimatedDays: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const fetchShippingMethods = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  
  const response = await fetch(`${BASE_URL}/api/shipping/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  
  if (!response.ok) throw new Error("Failed to fetch shipping methods");
  return response.json();
};

const addShippingMethod = async (data: {
  name: string;
  description: string;
  cost: string;
  estimatedDays: string;
  isActive: boolean;
}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  
  const response = await fetch(`${BASE_URL}/api/shipping/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error("Failed to add shipping method");
  return response.json();
};

const deleteShippingMethod = async (id: string) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  
  const response = await fetch(`${BASE_URL}/api/shipping/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  
  if (!response.ok) throw new Error("Failed to delete shipping method");
  return response.json();
};

const updateShippingMethod = async (id: string, data: {
  name: string;
  description: string;
  cost: string;
  estimatedDays: string;
  isActive: boolean;
}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  
  const response = await fetch(`${BASE_URL}/api/shipping/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error("Failed to update shipping method");
  return response.json();
};

function ShippingPage() {
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [editShippingId, setEditShippingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cost: "",
    estimatedDays: "",
    isActive: true,
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    cost: "",
    estimatedDays: "",
    isActive: true,
  });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      toast.error("Please log in to view shipping methods");
      setLoading(false);
      return;
    }
    loadShippingMethods();
  }, []);

  const loadShippingMethods = async () => {
    try {
      setLoading(true);
      const data = await fetchShippingMethods();
      setShippingMethods(data.data || []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load shipping methods");
    } finally {
      setLoading(false);
    }
  };

  const handleAddShipping = async () => {
    if (!formData.name || !formData.cost || !formData.estimatedDays) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      await addShippingMethod({
        name: formData.name,
        description: formData.description,
        cost: formData.cost,
        estimatedDays: formData.estimatedDays,
        isActive: formData.isActive,
      });
      toast.success("Shipping method added successfully!");
      setShowAddModal(false);
      setFormData({
        name: "",
        description: "",
        cost: "",
        estimatedDays: "",
        isActive: true,
      });
      loadShippingMethods();
    } catch (error) {
      toast.error((error as Error).message || "Failed to add shipping method");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShipping = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shipping method?")) return;

    try {
      await deleteShippingMethod(id);
      toast.success("Shipping method deleted successfully!");
      loadShippingMethods();
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete shipping method");
    }
  };

  const openEditModal = (method: ShippingMethod) => {
    setEditShippingId(method.id);
    setEditFormData({
      name: method.name,
      description: method.description,
      cost: method.cost.toString(),
      estimatedDays: method.estimatedDays,
      isActive: method.isActive,
    });
    setShowEditModal(true);
  };

  const handleEditShipping = async () => {
    if (!editShippingId) return;
    if (!editFormData.name || !editFormData.cost || !editFormData.estimatedDays) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setEditSubmitting(true);
      await updateShippingMethod(editShippingId, {
        name: editFormData.name,
        description: editFormData.description,
        cost: editFormData.cost,
        estimatedDays: editFormData.estimatedDays,
        isActive: editFormData.isActive,
      });
      toast.success("Shipping method updated successfully!");
      setShowEditModal(false);
      setEditShippingId(null);
      loadShippingMethods();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update shipping method");
    } finally {
      setEditSubmitting(false);
    }
  };

  const filteredMethods = shippingMethods.filter((method) =>
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
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2 items-center">
            <Skeleton className="h-10 w-[250px] rounded-md" />
            <Skeleton className="h-10 w-44 rounded-md" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Method cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full ml-2" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-5 w-20" />
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
          <h1 className="text-3xl font-bold tracking-tight">Shipping Methods</h1>
          <p className="text-muted-foreground">Manage your shipping options and delivery costs.</p>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0 items-center">
          <input
            type="text"
            placeholder="Search shipping methods..."
            className="border rounded px-3 py-2 w-[250px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" /> Add Shipping Method
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Methods</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shippingMethods.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Methods</CardTitle>
            <Badge variant="default" className="w-fit">
              {shippingMethods.filter((m) => m.isActive).length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shippingMethods.filter((m) => m.isActive).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Shipping Methods List */}
      {filteredMethods.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">No shipping methods found. Create one to get started.</p>
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
                  <Badge variant={method.isActive ? "default" : "secondary"} className="ml-2">
                    {method.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 mt-auto">
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[12px] text-muted-foreground">Shipping Cost</p>
                      <p className="font-bold text-lg">${method.cost}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[12px] text-muted-foreground">Delivery</p>
                      <p className="font-bold text-sm">{method.estimatedDays}</p>
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
                    onClick={() => handleDeleteShipping(method.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Shipping Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardHeader className="border-b sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Add Shipping Method</CardTitle>
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
                  Shipping Method Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Standard Shipping, Express Delivery"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="focus:ring-primary h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe this shipping method..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="resize-none focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cost" className="text-sm font-semibold">
                    Shipping Cost ($) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cost"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="pl-9 focus:ring-primary h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedDays" className="text-sm font-semibold">
                    Estimated Delivery <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="estimatedDays"
                    placeholder="e.g., 5-6 business days"
                    value={formData.estimatedDays}
                    onChange={(e) => setFormData({ ...formData, estimatedDays: e.target.value })}
                    className="focus:ring-primary h-10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="text-sm font-semibold cursor-pointer">
                    Active Status
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Make this shipping method available</p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button
                  className="flex-1 h-11 text-base font-semibold shadow-lg shadow-primary/20"
                  onClick={handleAddShipping}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" /> Add Method</>}
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

      {/* Edit Shipping Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardHeader className="border-b sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Edit Shipping Method</CardTitle>
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
                  Shipping Method Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., Standard Shipping, Express Delivery"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="focus:ring-primary h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm font-semibold">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  placeholder="Describe this shipping method..."
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                  className="resize-none focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-cost" className="text-sm font-semibold">
                    Shipping Cost ($) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-cost"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={editFormData.cost}
                      onChange={(e) => setEditFormData({ ...editFormData, cost: e.target.value })}
                      className="pl-9 focus:ring-primary h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-estimatedDays" className="text-sm font-semibold">
                    Estimated Delivery <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-estimatedDays"
                    placeholder="e.g., 5-6 business days"
                    value={editFormData.estimatedDays}
                    onChange={(e) => setEditFormData({ ...editFormData, estimatedDays: e.target.value })}
                    className="focus:ring-primary h-10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-isActive" className="text-sm font-semibold cursor-pointer">
                    Active Status
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Make this shipping method available</p>
                </div>
                <Switch
                  id="edit-isActive"
                  checked={editFormData.isActive}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, isActive: checked })}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button
                  className="flex-1 h-11 text-base font-semibold shadow-lg shadow-primary/20"
                  onClick={handleEditShipping}
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

export default ShippingPage;
