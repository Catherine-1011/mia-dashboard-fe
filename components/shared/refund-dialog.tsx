"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Package, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Image from "next/image";

type OrderItem = {
  product?: { id?: string; title?: string; images?: string[]; price?: number };
  title?: string;
  quantity: number;
  productId?: string;
};

type Order = {
  id: string;
  displayId?: string;
  items?: OrderItem[];
};

type RefundDialogProps = {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ticketId: string) => void;
};

export function RefundDialog({ order, isOpen, onClose, onSuccess }: RefundDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [requestType, setRequestType] = useState<"REFUND" | "PARTIAL_REFUND">("PARTIAL_REFUND");
  const [reason, setReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ id: string; title: string; maxQty: number; qty: number }[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Filter items that actually have a productId we can reference
  const refundItems = (order.items || []).filter((item) => item.product?.id || item.productId);

  const toggleItem = (item: OrderItem, checked: boolean) => {
    const id = item.product?.id || item.productId;
    const title = item.product?.title || item.title || "Unknown Product";
    if (!id) return;

    if (checked) {
      setSelectedItems([...selectedItems, { id, title, maxQty: item.quantity, qty: item.quantity }]);
    } else {
      setSelectedItems(selectedItems.filter((si) => si.id !== id));
    }
  };

  const updateItemQty = (id: string, qty: number) => {
    setSelectedItems(
      selectedItems.map((si) => {
        if (si.id === id) {
          const newQty = Math.max(1, Math.min(si.maxQty, qty));
          return { ...si, qty: newQty };
        }
        return si;
      })
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const remainingSlots = 5 - images.length;
      if (filesArray.length > remainingSlots) {
        toast.error(`You can only upload up to 5 images. Please select fewer images.`);
        return;
      }
      setImages([...images, ...filesArray.slice(0, remainingSlots)]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    
    // In a real implementation this would upload to Cloudinary directly:
    // We mock Cloudinary upload or call a backend endpoint for image upload if configured
    setUploading(true);
    const urls: string[] = [];
    
    try {
      for (const file of images) {
        const formData = new FormData();
        formData.append("file", file);
        // Replace with your actual unsigned cloudinary preset
        formData.append("upload_preset", "your_unsigned_preset"); 
        
        // Mocking Cloudinary URL since we don't have the real cloud name and preset
        // const res = await fetch(`https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload`, {
        //   method: "POST",
        //   body: formData,
        // });
        // const data = await res.json();
        // urls.push(data.secure_url);
        
        // Fake URL for now
        urls.push(URL.createObjectURL(file));
      }
      return urls;
    } catch (err) {
      toast.error("Failed to upload images");
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the refund.");
      return;
    }
    if (requestType === "PARTIAL_REFUND" && selectedItems.length === 0) {
      toast.error("Please select at least one item for a partial refund.");
      return;
    }

    setSubmitting(true);
    try {
      const imageUrls: string[] = [];
      if (images.length > 0) {
        // Uncomment when cloudinary is set up
        // const uploadedUrls = await uploadImages();
        // imageUrls.push(...uploadedUrls);
      }

      const payload = {
        requestType,
        reason,
        items: requestType === "PARTIAL_REFUND" 
          ? selectedItems.map(si => ({
              productId: si.id,
              title: si.title,
              quantity: si.qty
            }))
          : [],
        images: imageUrls,
      };

      const res = await api.post(`/api/orders/refund-request/${order.displayId || order.id}`, payload);
      
      toast.success("Refund request submitted successfully");
      onSuccess(res?.request?.id || "ticket-id");
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        toast.error((err as Error & { response?: { data?: { message?: string } } }).response?.data?.message || err.message || "Failed to submit request");
      } else {
        toast.error("Failed to submit request");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Submit a request to refund items from your order and our team will review it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">Request Type</label>
            <Select value={requestType} onValueChange={(val: "REFUND" | "PARTIAL_REFUND") => setRequestType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARTIAL_REFUND">Partial Refund (Specific Items)</SelectItem>
                <SelectItem value="REFUND">Full Refund (Entire Order)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestType === "PARTIAL_REFUND" && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Items</label>
              <div className="border rounded-md divide-y overflow-hidden max-h-60 overflow-y-auto">
                {refundItems.length > 0 ? (
                  refundItems.map((item, idx) => {
                    const id = item.product?.id || item.productId;
                    if (!id) return null;
                    const isSelected = selectedItems.some(si => si.id === id);
                    const selectedItem = selectedItems.find(si => si.id === id);

                    return (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-card hover:bg-muted/50 transition-colors">
                        <input
                          type="checkbox"
                          id={`item-${id}`}
                          checked={isSelected}
                          onChange={(e) => toggleItem(item, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          {item.product?.images?.[0] ? (
                            <Image src={item.product.images[0]} alt="product" width={40} height={40} className="rounded object-cover" unoptimized />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="grid">
                            <label htmlFor={`item-${id}`} className="text-sm font-medium leading-none cursor-pointer truncate">
                              {item.product?.title || item.title}
                            </label>
                            <span className="text-xs text-muted-foreground mt-1">Ordered: {item.quantity}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-24 shrink-0">
                            <Input
                              type="number"
                              min="1"
                              max={item.quantity}
                              value={selectedItem?.qty || 1}
                              onChange={(e) => updateItemQty(id, parseInt(e.target.value) || 1)}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No eligible items found in order.</div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium">Reason for Refund <span className="text-destructive">*</span></label>
            <Textarea
              placeholder="Please explain why you want a refund..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none h-24"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium flex justify-between items-end">
              <span>Evidence Images (Optional)</span>
              <span className="text-xs text-muted-foreground font-normal">{images.length}/5 uploaded</span>
            </label>
            
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {images.map((file, i) => (
                <div key={i} className="relative aspect-square rounded-md border bg-muted group overflow-hidden">
                  <Image src={URL.createObjectURL(file)} alt="Evidence" fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {images.length < 5 && (
                <label className="aspect-square rounded-md border border-dashed flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
                  <span className="text-2xl font-light leading-none">+</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Attach images of items if they arrived damaged or incorrect.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting || uploading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || uploading}>
            {submitting || uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}