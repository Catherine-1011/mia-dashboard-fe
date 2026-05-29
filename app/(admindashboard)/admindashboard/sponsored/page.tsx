"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Upload, 
  X, 
  ChevronUp, 
  ChevronDown,
  Image as LucideImage,
  ExternalLink,
  Loader2,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import Image from "next/image";

// ─── Types ──────────────────────────────────────────────────────────────────
type MediaType = "IMAGE" | "VIDEO" | "GIF";

type SponsoredSection = {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: MediaType;
  ctaText: string;
  ctaUrl: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type SponsoredSectionForm = {
  title: string;
  description: string;
  media: File | null;
  mediaType: MediaType;
  ctaText: string;
  ctaUrl: string;
  isActive: boolean;
  order: number;
};

const initialFormState: SponsoredSectionForm = {
  title: "",
  description: "",
  media: null,
  mediaType: "IMAGE",
  ctaText: "",
  ctaUrl: "",
  isActive: true,
  order: 1,
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge 
      variant={isActive ? "default" : "secondary"}
      className={cn(
        "text-xs font-medium",
        isActive 
          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400" 
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

// ─── Media Type Badge ───────────────────────────────────────────────────────
function MediaTypeBadge({ type }: { type: MediaType }) {
  const config = {
    IMAGE: { label: "Image", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" },
    VIDEO: { label: "Video", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400" },
    GIF: { label: "GIF", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400" },
  };

  return (
    <Badge variant="outline" className={config[type].className}>
      {config[type].label}
    </Badge>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SponsoredSectionsPage() {
  const [sections, setSections] = useState<SponsoredSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SponsoredSectionForm>(initialFormState);
  const [formLoading, setFormLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSection, setPreviewSection] = useState<SponsoredSection | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Data ───────────────────────────────────────────────────────────
  const fetchSections = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/sponsored-sections");
      if (response?.success && response?.data) {
        setSections(response.data);
      }
    } catch (error) {
      console.error("Error fetching sponsored sections:", error);
      toast.error("Failed to load sponsored sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  // ─── Form Handlers ───────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setEditingId(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openAddForm = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      order: sections.length + 1
    }));
    setIsFormOpen(true);
  };

  const openEditForm = (section: SponsoredSection) => {
    setFormData({
      title: section.title,
      description: section.description,
      media: null,
      mediaType: section.mediaType,
      ctaText: section.ctaText,
      ctaUrl: section.ctaUrl,
      isActive: section.isActive,
      order: section.order,
    });
    setIsEditing(true);
    setEditingId(section.id);
    setPreviewUrl(section.mediaUrl);
    setIsFormOpen(true);
  };

  const handlePreview = (section: SponsoredSection) => {
    setPreviewSection(section);
    setIsPreviewOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, media: file }));
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) return "Title is required";
    if (!formData.description.trim()) return "Description is required";
    if (!formData.ctaText.trim()) return "CTA text is required";
    if (!formData.ctaUrl.trim()) return "CTA URL is required";
    if (!isEditing && !formData.media) return "Media file is required";
    
    // URL validation
    try {
      new URL(formData.ctaUrl);
    } catch {
      return "Please enter a valid URL";
    }
    
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setFormLoading(true);
      
      const submitData = new FormData();
      submitData.append("title", formData.title);
      submitData.append("description", formData.description);
      submitData.append("mediaType", formData.mediaType);
      submitData.append("ctaText", formData.ctaText);
      submitData.append("ctaUrl", formData.ctaUrl);
      submitData.append("isActive", formData.isActive.toString());
      submitData.append("order", formData.order.toString());
      
      if (formData.media) {
        submitData.append("media", formData.media);
      }

      let response;
      if (isEditing && editingId) {
        response = await api.put(`/api/admin/sponsored-sections/${editingId}`, submitData);
      } else {
        response = await api.post("/api/admin/sponsored-sections", submitData);
      }

      if (response?.success) {
        toast.success(isEditing ? "Section updated successfully" : "Section created successfully");
        setIsFormOpen(false);
        resetForm();
        fetchSections();
      } else {
        throw new Error(response?.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error saving section:", error);
      toast.error(`Failed to ${isEditing ? "update" : "create"} section`);
    } finally {
      setFormLoading(false);
    }
  };

  // ─── CRUD Operations ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sponsored section?")) {
      return;
    }

    try {
      const response = await api.delete(`/api/admin/sponsored-sections/${id}`);
      if (response?.success) {
        toast.success("Section deleted successfully");
        fetchSections();
      } else {
        throw new Error(response?.message || "Delete failed");
      }
    } catch (error) {
      console.error("Error deleting section:", error);
      toast.error("Failed to delete section");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await api.put(`/api/admin/sponsored-sections/${id}/toggle-status`, {
        isActive: !currentStatus
      });
      
      if (response?.success) {
        toast.success(`Section ${!currentStatus ? "activated" : "deactivated"}`);
        fetchSections();
      } else {
        throw new Error(response?.message || "Status update failed");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const section = sections.find(s => s.id === id);
    if (!section) return;

    const newOrder = direction === "up" ? section.order - 1 : section.order + 1;
    if (newOrder < 1 || newOrder > sections.length) return;

    try {
      const response = await api.put(`/api/admin/sponsored-sections/${id}/reorder`, {
        newOrder
      });
      
      if (response?.success) {
        toast.success("Order updated successfully");
        fetchSections();
      } else {
        throw new Error(response?.message || "Reorder failed");
      }
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("Failed to update order");
    }
  };

  // ─── Filter Data ────────────────────────────────────────────────────────
  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.ctaText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSections = filteredSections.filter(s => s.isActive);
  const inactiveSections = filteredSections.filter(s => !s.isActive);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sponsored Sections</h1>
          <p className="text-muted-foreground mt-2">
            Manage promotional banners and sponsored content
          </p>
        </div>
        
        <Button onClick={openAddForm} className="self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <LucideImage className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Sections</p>
                <p className="text-2xl font-bold">{sections.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeSections.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{inactiveSections.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">
                  {sections.length > 0 ? 
                    new Date(Math.max(...sections.map(s => new Date(s.updatedAt).getTime()))).toLocaleDateString('en-GB')
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sections List */}
      <Card>
        <CardHeader>
          <CardTitle>Sponsored Sections</CardTitle>
          <CardDescription>
            Manage and organize your promotional content
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-16 w-16 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="text-center py-12">
              <LucideImage className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No sponsored sections found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by creating your first sponsored section
              </p>
              <Button onClick={openAddForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSections
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                <div
                  key={section.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Media Preview */}
                  <div className="relative h-12 w-12 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {section.mediaUrl ? (
                      section.mediaType === "VIDEO" ? (
                        <video
                          src={section.mediaUrl}
                          className="object-cover w-full h-full"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <Image
                          src={section.mediaUrl}
                          alt={section.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      )
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <LucideImage className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-base font-semibold truncate">{section.title}</h3>
                          <StatusBadge isActive={section.isActive} />
                          <MediaTypeBadge type={section.mediaType} />
                          <Badge variant="outline" className="text-xs">
                            Order {section.order}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                          {section.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {section.ctaText}
                          </span>
                          <span>Updated {new Date(section.updatedAt).toLocaleDateString('en-GB')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(section)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditForm(section)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(section.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Sponsored Section" : "Add Sponsored Section"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter section title"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter section description"
                rows={3}
              />
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <Label htmlFor="media">Media {!isEditing && "*"}</Label>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="media"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                  {formData.media && (
                    <span className="text-sm text-muted-foreground">
                      {formData.media.name}
                    </span>
                  )}
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div className="relative h-32 w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {formData.mediaType === "VIDEO" || previewUrl.includes('.mp4') || previewUrl.includes('video') ? (
                      <video
                        src={previewUrl}
                        className="object-cover w-full h-full"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white/90"
                      onClick={() => {
                        setPreviewUrl(null);
                        setFormData(prev => ({ ...prev, media: null }));
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Media Type */}
            <div className="space-y-2">
              <Label htmlFor="mediaType">Media Type</Label>
              <Select
                value={formData.mediaType}
                onValueChange={(value: MediaType) => 
                  setFormData(prev => ({ ...prev, mediaType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="GIF">GIF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CTA Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ctaText">CTA Text *</Label>
                <Input
                  id="ctaText"
                  value={formData.ctaText}
                  onChange={(e) => setFormData(prev => ({ ...prev, ctaText: e.target.value }))}
                  placeholder="Shop Now, Learn More, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctaUrl">CTA URL *</Label>
                <Input
                  id="ctaUrl"
                  type="url"
                  value={formData.ctaUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, ctaUrl: e.target.value }))}
                  placeholder="https://yoursite.com/page"
                />
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  min="1"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    order: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, isActive: checked }))
                    }
                  />
                  <Label htmlFor="isActive">
                    {formData.isActive ? "Active" : "Inactive"}
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={formLoading}
            >
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  {isEditing ? "Update Section" : "Create Section"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>Preview: {previewSection?.title}</span>
              <StatusBadge isActive={previewSection?.isActive || false} />
              <MediaTypeBadge type={previewSection?.mediaType || "IMAGE"} />
            </DialogTitle>
          </DialogHeader>

          {previewSection && (
            <div className="space-y-6">
              {/* Media Display */}
              <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                {previewSection.mediaType === "VIDEO" ? (
                  <video
                    src={previewSection.mediaUrl}
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                  />
                ) : (
                  <Image
                    src={previewSection.mediaUrl}
                    alt={previewSection.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                )}
              </div>

              {/* Content Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                    <p className="text-lg font-semibold">{previewSection.title}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-sm leading-relaxed">{previewSection.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Call to Action</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{previewSection.ctaText}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(previewSection.ctaUrl, "_blank")}
                        className="text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Visit
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Details</Label>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Order:</span> {previewSection.order}</p>
                      <p><span className="font-medium">Status:</span> {previewSection.isActive ? "Active" : "Inactive"}</p>
                      <p><span className="font-medium">Created:</span> {new Date(previewSection.createdAt).toLocaleDateString('en-GB')}</p>
                      <p><span className="font-medium">Updated:</span> {new Date(previewSection.updatedAt).toLocaleDateString('en-GB')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            {previewSection && (
              <Button onClick={() => {
                setIsPreviewOpen(false);
                openEditForm(previewSection);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Section
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

