"use client"
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Heart, ShoppingCart, List, LayoutGrid, Trash2, StickyNote, Loader2, ExternalLink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

// TypeScript interfaces matching your actual API response
interface VariantAttribute {
  attribute: string;
  value: string;
  hexColor: string | null;
}

interface WishlistVariant {
  id: string;
  price: string;
  stock: number;
  sku: string;
  images: string[];
  isActive: boolean;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: string | null;
  featuredImage: string; // This is a string URL, not an array
  stock: number | null;
  status: string;
  category: string;
  type: "SIMPLE" | "VARIABLE";
  seller: {
    id: string;
    name: string;
  };
  displayPrice: string;
  displayStock: number;
  displayImage: string;
}

interface WishlistItem {
  id: string;
  productId: string;
  variantId: string | null;
  product: Product;
  variant: WishlistVariant | null;
  variantAttributes: VariantAttribute[];
  needsVariantSelection: boolean;
  addedAt: string;
}

interface WishlistResponse {
  success: boolean;
  wishlist: WishlistItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Helper function to create URL-friendly slug from product title
function createProductSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
    .replace(/-+/g, '-');         // Replace multiple hyphens with single
}

// Variant Display Component - Updated for actual API structure
function VariantDisplay({ item, className }: {
  item: WishlistItem;
  className?: string;
}) {
  const { product } = item;
  
  // Show variant info for variable products
  if (product.type !== "VARIABLE" || !item.variant || !item.variantAttributes.length) {
    return (
      <div className={className}>
        <div className="text-sm text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            Simple Product
          </Badge>
        </div>
      </div>
    );
  }

  // Format variant attributes for display
  const formatVariantAttributes = (attributes: VariantAttribute[]) => {
    return attributes.map(attr => {
      const formattedName = attr.attribute.charAt(0).toUpperCase() + attr.attribute.slice(1);
      return `${formattedName}: ${attr.value}`;
    }).join(', ');
  };

  return (
    <div className={className}>
      <div className="p-3 bg-muted/30 rounded-md space-y-2">
        <div className="text-sm font-medium">
          {formatVariantAttributes(item.variantAttributes)}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">${item.variant.price} AUD</span>
          <span>Stock: {item.variant.stock}</span>
          <span>SKU: {item.variant.sku}</span>
        </div>
        {/* Color swatches */}
        {item.variantAttributes.some(attr => attr.hexColor) && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Color:</span>
            {item.variantAttributes
              .filter(attr => attr.hexColor)
              .map((attr, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                    style={{ backgroundColor: attr.hexColor || undefined }}
                    title={attr.value}
                  />
                  <span className="text-xs">{attr.value}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Card View Component
function WishlistCard({ item, onRemove, onAddToCart, onMoveToCart, onVariantChange, actionLoading }: { 
  item: WishlistItem; 
  onRemove: (itemId: string) => void;
  onAddToCart: (productId: string, variantId?: string) => void;
  onMoveToCart: (productId: string, itemId: string, variantId?: string) => void;
  onVariantChange: (itemId: string, variantId: string) => void;
  actionLoading: { [key: string]: boolean };
}) {
  const { product } = item;
  
  // Use featured image from API response (it's a string, not an array)
  const image = product.featuredImage || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80";
  
  // Use variant data if available, otherwise use display data
  const currentPrice = item.variant ? item.variant.price : product.displayPrice;
  const currentStock = item.variant ? item.variant.stock : product.displayStock;

  const isRemoving = actionLoading[`remove-${item.id}`];
  const isAddingToCart = actionLoading[`add-cart-${product.id}`];
  const isMovingToCart = actionLoading[`cart-${product.id}`];
  
  const productSlug = createProductSlug(product.title);
  const frontendUrl = `https://apla-fe.vercel.app/shop/${productSlug}`;
  
  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <a href={frontendUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={image}
            alt={product.title}
            className="w-full h-48 object-cover hover:scale-105 transition-transform cursor-pointer"
          />
        </a>
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 bg-background/90 hover:bg-muted"
          onClick={() => onRemove(item.id)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
          )}
        </Button>
      </div>
      <CardContent className="p-4">
        <a href={frontendUrl} target="_blank" rel="noopener noreferrer" className="block mb-2">
          <CardTitle className="text-sm line-clamp-2 hover:text-primary transition-colors cursor-pointer">
            {product.title}
            <ExternalLink className="h-3 w-3 inline ml-1 opacity-60" />
          </CardTitle>
        </a>
        <CardDescription className="text-xs mb-2">{product.seller.name}</CardDescription>
        <CardDescription className="text-xs mb-2 text-muted-foreground">{product.category}</CardDescription>
        {product.type === "VARIABLE" && (
          <Badge variant="secondary" className="text-xs mb-2">
            <Settings className="h-3 w-3 mr-1" />
            Variable Product
          </Badge>
        )}
        <div className="text-lg font-bold text-primary mb-2">${currentPrice} AUD</div>
        <div className="text-xs text-muted-foreground mb-4">Stock: {currentStock}</div>
        
        {/* Variant Details */}
        {(product.type === "VARIABLE" && item.variant && item.variantAttributes.length > 0) ? (
          <VariantDisplay 
            item={item}
            className="mb-4"
          />
        ) : product.type === "VARIABLE" ? (
          <div className="mb-4 p-2 bg-yellow-50 rounded-md">
            <div className="text-sm text-yellow-700">Variable product - No variant selected</div>
          </div>
        ) : null}
        
        {/* Action buttons */}
        <div className="space-y-2">
          <Button 
            className="w-full bg-primary hover:bg-primary/90" 
            size="sm"
            disabled={currentStock === 0 || isMovingToCart}
            onClick={() => onMoveToCart(product.id, item.id, item.variantId || undefined)}
          >
            {isMovingToCart ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {currentStock > 0 ? "Add to Cart" : "Sold Out"}
              </>
            )}
          </Button>
          <Button
            className="w-full border-destructive/20 text-destructive hover:bg-destructive/10"
            variant="outline"
            size="sm"
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Table View Component
function WishlistTable({ items, onRemove, onAddToCart, onMoveToCart, onVariantChange, actionLoading }: { 
  items: WishlistItem[];
  onRemove: (itemId: string) => void;
  onAddToCart: (productId: string, variantId?: string) => void;
  onMoveToCart: (productId: string, itemId: string, variantId?: string) => void;
  onVariantChange: (itemId: string, variantId: string) => void;
  actionLoading: { [key: string]: boolean };
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[400px]">Product</TableHead>
          <TableHead className="w-[120px]">Category</TableHead>
          <TableHead className="w-[130px]">Price</TableHead>
          <TableHead className="w-[90px]">Stock</TableHead>
          <TableHead className="w-[200px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const { product } = item;
          
          // Use featured image from API response - ensure it's properly formatted
          const image = product.featuredImage && product.featuredImage.trim() !== '' 
            ? product.featuredImage 
            : "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80";
          
          // Use variant data if available, otherwise use display data
          const currentPrice = item.variant ? item.variant.price : product.displayPrice;
          const currentStock = item.variant ? item.variant.stock : product.displayStock;
          
          const isRemoving = actionLoading[`remove-${item.id}`];
          const isAddingToCart = actionLoading[`add-cart-${product.id}`];
          const isMovingToCart = actionLoading[`cart-${product.id}`];
          
          const productSlug = createProductSlug(product.title);
          const frontendUrl = `https://apla-fe.vercel.app/shop/${productSlug}`;
          
          return (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex gap-3">
                  <a href={frontendUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={image}
                      alt={product.title}
                      className="w-20 h-20 object-cover rounded hover:scale-105 transition-transform cursor-pointer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80';
                      }}
                    />
                  </a>
                  <div className="flex flex-col gap-1">
                    <a href={frontendUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="font-medium line-clamp-2 hover:text-primary transition-colors cursor-pointer">
                        {product.title}
                        {product.type === "VARIABLE" && item.variant && item.variantAttributes.length > 0 && (
                          <span className="text-sm font-normal text-gray-600 ml-2">
                            ({item.variantAttributes.map((attr, idx) => (
                              <span key={idx}>
                                {attr.attribute}: {attr.value}
                                {idx < item.variantAttributes.length - 1 && ', '}
                              </span>
                            ))})
                          </span>
                        )}
                        <ExternalLink className="h-3 w-3 inline ml-1 opacity-60" />
                      </div>
                    </a>
                    <div className="text-sm text-muted-foreground">by {product.seller.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Item added {new Date(item.addedAt).toLocaleDateString('en-AU', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{product.category}</div>
              </TableCell>
              <TableCell>
                <div className="font-bold text-primary">${currentPrice} AUD</div>
                <div className="text-xs text-muted-foreground mt-1">FREE Delivery on orders over $50 AUD</div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{currentStock} available</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-2 min-w-[160px]">
                  {/* Move to Cart - Primary action */}
                  <Button 
                    size="sm" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-1 py-1 text-xs h-7"
                    disabled={currentStock === 0 || isMovingToCart}
                    onClick={() => onMoveToCart(product.id, item.id, item.variantId || undefined)}
                  >
                    {isMovingToCart ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-3 w-3 mr-1" />
                    )}
                    {isMovingToCart ? "Adding..." : currentStock > 0 ? "Add to Cart" : "Sold Out"}
                  </Button>
                  
                  {/* Remove action */}
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/30 px-1 py-1 text-xs h-7"
                    onClick={() => onRemove(item.id)}
                    disabled={isRemoving}
                  >
                    {isRemoving ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3 mr-1" />
                    )}
                    {isRemoving ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// Utility function to check wishlist status - can be used in other components
export const checkWishlistStatus = async (productId: string): Promise<boolean> => {
  try {
    const response = await api.get(`/api/wishlist/check/${productId}`);
    return response.inWishlist || false;
  } catch (err) {
    console.error('Error checking wishlist status:', err);
    return false;
  }
};

const WishlistLoadingSkeleton = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>

      {/* Table View Skeleton */}
      <Card className="border-0 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="w-[400px]">Product</TableHead>
              <TableHead className="w-[120px]">Category</TableHead>
              <TableHead className="w-[130px]">Price</TableHead>
              <TableHead className="w-[90px]">Stock</TableHead>
              <TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, idx) => (
              <TableRow key={idx} className="border-border/30">
                <TableCell>
                  <div className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded-lg" />
                    <div className="flex flex-col gap-2 flex-1">
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <Skeleton className="h-8 w-full rounded-md" />
                    <Skeleton className="h-8 w-full rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
    

// Utility function to add item to wishlist - can be used in other components
export const addToWishlist = async (productId: string): Promise<boolean> => {
  try {
    await api.post('/api/wishlist/add', { productId });
    return true;
  } catch (err) {
    console.error('Error adding to wishlist:', err);
    return false;
  }
};

// Main Wishlist Page Component
const Wishlist = () => {
  console.log("[WishlistPage] Component loaded");
  
  const [view, setView] = useState<'card' | 'table'>('table');
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [wishlistStatus, setWishlistStatus] = useState<{ [productId: string]: boolean }>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Check if product is in wishlist using the new API
  const checkProductInWishlist = async (productId: string): Promise<boolean> => {
    try {
      const response = await api.get(`/api/wishlist/check/${productId}`);
      return response.inWishlist || false;
    } catch (err) {
      console.error('Error checking wishlist status:', err);
      return false;
    }
  };

  // Update wishlist status for a specific product
  const updateWishlistStatus = (productId: string, inWishlist: boolean) => {
    setWishlistStatus(prev => ({
      ...prev,
      [productId]: inWishlist
    }));
  };

  // Handle variant selection change (placeholder for future functionality)
  const handleVariantChange = (itemId: string, variantId: string) => {
    console.log(`[DEBUG] Variant change requested for item ${itemId} to variant ${variantId}`);
    // For now, this is just a placeholder since variant switching would require
    // additional backend API to handle switching variants in wishlist
    toast.info("Variant switching coming soon!", {
      description: "This feature will be available in a future update.",
    });
  };

  // Fetch wishlist data when component mounts
  useEffect(() => {
    fetchWishlist();
  }, []);

  // API call function
  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[DEBUG] Fetching wishlist...');
      
      // Use the api client from lib/api.ts which handles authentication automatically
      const data: WishlistResponse = await api.get('/api/wishlist/');
      
      console.log('[DEBUG] API Response:', data);
      
      if (data.success && data.wishlist) {
        console.log('[DEBUG] Setting wishlist items:', data.wishlist);
        setWishlistItems(data.wishlist);
        setPagination(data.pagination);
        
        // Debug: Log the wishlist data structure
        console.log('[DEBUG] Wishlist data received:', data.wishlist);
        data.wishlist.forEach((item, index) => {
          console.log(`[DEBUG] Item ${index + 1}:`, {
            id: item.id,
            title: item.product.title,
            type: item.product.type,
            hasVariant: !!item.variant,
            variantId: item.variantId,
            variantObject: item.variant,
            variantAttributes: item.variantAttributes,
            featuredImage: item.product.featuredImage
          });
        });
        
        // Update wishlist status for all fetched items
        const statusUpdates: { [productId: string]: boolean } = {};
        data.wishlist.forEach(item => {
          statusUpdates[item.product.id] = true;
        });
        setWishlistStatus(prev => ({ ...prev, ...statusUpdates }));
      } else {
        console.error('[DEBUG] API response error:', data);
        setError('Failed to fetch wishlist - Invalid response structure');
      }
    } catch (err) {
      console.error('[DEBUG] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching wishlist');
      console.error('Error fetching wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  // Remove item from wishlist using productId instead of itemId
  const removeFromWishlist = async (itemId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [`remove-${itemId}`]: true }));
      
      // Find the product ID for this wishlist item
      const wishlistItem = wishlistItems.find(item => item.id === itemId);
      if (!wishlistItem) {
        throw new Error('Item not found in wishlist');
      }
      
      // Use the productId as per the API endpoint requirement: /api/wishlist/:productId
      await api.delete(`/api/wishlist/${wishlistItem.productId}`, {
        reason: ""
      });
      
      // Update wishlist status
      updateWishlistStatus(wishlistItem.productId, false);
      
      toast.success("Item removed from wishlist", {
        description: "The item has been successfully removed from your wishlist.",
      });
      // Refresh wishlist after removal
      fetchWishlist();
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove item from wishlist';
      setError(errorMessage);
      toast.error("Failed to remove item", {
        description: errorMessage,
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [`remove-${itemId}`]: false }));
    }
  };

  // Move to cart - using the new API endpoint with variant support
  const moveToCart = async (productId: string, itemId: string, variantId?: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [`cart-${productId}`]: true }));
      
      console.log('[DEBUG] Moving to cart:', { productId, itemId, variantId });
      
      // Find the wishlist item to get the correct variant information
      const wishlistItem = wishlistItems.find(item => item.id === itemId);
      console.log('[DEBUG] Found wishlist item:', wishlistItem);
      
      // Try dedicated move-to-cart endpoint first
      try {
        const moveData: any = { 
          itemId: itemId,
          quantity: 1 
        };
        
        console.log('[DEBUG] Trying dedicated move-to-cart endpoint with:', moveData);
        await api.post('/api/wishlist/move-to-cart', moveData);
        
        console.log('[DEBUG] Successfully used dedicated move-to-cart endpoint');
        
        // Update wishlist status (item removed from wishlist after moving to cart)
        updateWishlistStatus(productId, false);
        
        toast.success("Item moved to cart", {
          description: "The item has been successfully moved from wishlist to cart.",
        });
        // Refresh wishlist after moving to cart (item should be removed from wishlist)
        fetchWishlist();
        return;
        
      } catch (moveError) {
        console.log('[DEBUG] Dedicated move-to-cart failed, trying add+delete approach:', moveError);
        
        // Fallback to add-to-cart + delete approach
        const cartData: any = { productId, quantity: 1 };
        
        // Use variant info from the wishlist item itself
        if (wishlistItem?.variant?.id) {
          cartData.variantId = wishlistItem.variant.id;
          console.log('[DEBUG] Using variant ID from wishlist item:', wishlistItem.variant.id);
        } else if (variantId) {
          cartData.variantId = variantId;
          console.log('[DEBUG] Using passed variant ID:', variantId);
        }
        
        console.log('[DEBUG] Cart data being sent:', cartData);
        
        // Call the add-to-cart API endpoint
        await api.post('/api/cart/add', cartData);
        
        // Delete from wishlist using the correct itemId
        console.log('[DEBUG] Deleting wishlist item:', itemId);
        await api.delete(`/api/wishlist/item/${itemId}`, {
          reason: ""
        });
        
        // Update wishlist status (item removed from wishlist after moving to cart)
        updateWishlistStatus(productId, false);
        
        toast.success("Item moved to cart", {
          description: "The item has been successfully moved from wishlist to cart.",
        });
        // Refresh wishlist after moving to cart (item should be removed from wishlist)
        fetchWishlist();
      }
    } catch (err) {
      console.error('Error moving to cart:', err);
      
      // Enhanced error logging
      if (err && typeof err === 'object' && 'response' in err) {
        console.error('[DEBUG] API Error Response:', (err as any).response?.data);
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to move item to cart';
      setError(errorMessage);
      toast.error("Failed to move to cart", {
        description: errorMessage,
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [`cart-${productId}`]: false }));
    }
  };

  // Add to cart with variant support (keep original functionality for separate add to cart without removing from wishlist)
  const addToCart = async (productId: string, variantId?: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [`add-cart-${productId}`]: true }));
      
      // Prepare cart data with variant if applicable
      const cartData: any = { productId, quantity: 1 };
      if (variantId) {
        cartData.variantId = variantId;
      }
      
      await api.post('/api/cart/add', cartData);
      toast.success("Item added to cart", {
        description: "The item has been successfully added to your cart.",
      });
    } catch (err) {
      console.error('Error adding to cart:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to cart';
      setError(errorMessage);
      toast.error("Failed to add to cart", {
        description: errorMessage,
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [`add-cart-${productId}`]: false }));
    }
  };

  // Loading state
  if (loading) {
    return <WishlistLoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <h3 className="text-destructive font-semibold mb-2">Error loading wishlist</h3>
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchWishlist} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  // Main render
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
          <p className="text-muted-foreground">
            {pagination.total} {pagination.total === 1 ? 'item' : 'items'} in your wishlist
          </p>
        </div>
        {/* View Toggle Buttons */}
        <div className="flex gap-2">
          <Button
            variant={view === 'card' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setView('card')}
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setView('table')}
            aria-label="Table view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {wishlistItems.length === 0 ? (
        <Card className="p-12 text-center">
          <Heart className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Your wishlist is empty</h2>
          <p className="text-muted-foreground">Start adding items you love to your wishlist!</p>
        </Card>
      ) : (
        /* Wishlist Content */
        <>
          {view === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {wishlistItems.map((item) => (
                <WishlistCard 
                  key={item.id}
                  item={item}
                  onRemove={removeFromWishlist}
                  onAddToCart={addToCart}
                  onMoveToCart={moveToCart}
                  onVariantChange={handleVariantChange}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          ) : (
            <Card>
              <WishlistTable 
                items={wishlistItems} 
                onRemove={removeFromWishlist}
                onAddToCart={addToCart}
                onMoveToCart={moveToCart}
                onVariantChange={handleVariantChange}
                actionLoading={actionLoading}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
export default Wishlist;

