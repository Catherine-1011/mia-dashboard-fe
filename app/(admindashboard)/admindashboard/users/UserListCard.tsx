// "use client";
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Avatar } from "@/components/ui/avatar";
// import { useEffect, useState } from "react";
// import { api } from "@/lib/api";
// import { toast } from "sonner";

// export default function UserListCard() {
//   const [users, setUsers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const fetchUsers = async () => {
//       setLoading(true);
//       try {
//         const token = typeof window !== "undefined" ? (localStorage.getItem("alpa_token") || localStorage.getItem("auth_token")) : null;
//         const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || "https://alpa-be.onrender.com"}/api/users/all`;
        
//         console.log("📍 UserListCard fetching from:", apiUrl);
//         console.log("🔍 Token exists:", !!token);
        
//         const res = await fetch(apiUrl, {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//             ...(token && { Authorization: `Bearer ${token}` }),
//           },
//           credentials: "include",
//         });
        
//         console.log("📊 UserListCard Response Status:", res.status);
        
//         if (!res.ok) {
//           const errorText = await res.text();
//           console.error("❌ UserListCard API Error:", errorText);
//           throw new Error(`Failed to fetch users: ${res.status}`);
//         }
        
//         const data = await res.json();
//         console.log("✅ UserListCard Data:", data);
        
//         setUsers(Array.isArray(data) ? data : data.users || []);
//       } catch (e: any) {
//         console.error("❌ UserListCard Error:", e.message);
//         toast.error("Failed to load users");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUsers();
//   }, []);

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="text-xl font-semibold">Recent Users</CardTitle>
//         <p className="text-muted-foreground">Latest 7 users in the system</p>
//       </CardHeader>
//       <CardContent>
//         {loading ? (
//           <div className="flex items-center justify-center p-8">
//             <span className="text-muted-foreground">Loading users...</span>
//           </div>
//         ) : users.length === 0 ? (
//           <div className="flex items-center justify-center p-8">
//             <span className="text-muted-foreground">No users found</span>
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-border">
//               <thead>
//                 <tr className="bg-muted">
//                   <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Avatar</th>
//                   <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
//                   <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Email</th>
//                   <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Role</th>
//                   <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
//                 </tr>
//               </thead>
//               <tbody className="bg-card divide-y divide-border">
//                 {users.slice(-7).reverse().map((user) => (
//                   <tr key={user.id} className="hover:bg-muted/50 transition-colors">
//                     <td className="px-4 py-2">
//                       <Avatar className="h-10 w-10 border">
//                         {user.profileImage ? (
//                           <img
//                             src={user.profileImage}
//                             alt={user.name || user.email}
//                             className="h-10 w-10 rounded-full object-cover"
//                           />
//                         ) : (
//                           <span className="font-bold text-lg">
//                             {user.name ? user.name[0] : user.email[0]}
//                           </span>
//                         )}
//                       </Avatar>
//                     </td>
//                     <td className="px-4 py-2 font-medium text-foreground truncate max-w-[160px]">{user.name || <span className="italic text-muted-foreground">No Name</span>}</td>
//                     <td className="px-4 py-2 text-muted-foreground truncate max-w-[200px]">{user.email}</td>
//                     <td className="px-4 py-2">
//                       <Badge variant={user.role === "ADMIN" ? "destructive" : user.role === "SELLER" ? "secondary" : "outline"}>
//                         {user.role}
//                       </Badge>
//                     </td>
//                     <td className="px-4 py-2">
//                       {user.isVerified ? (
//                         <Badge variant="default">Verified</Badge>
//                       ) : (
//                         <Badge variant="outline">Unverified</Badge>
//                       )}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Bell, Package, ShoppingCart, UserCheck,
  AlertCircle, CheckCircle2, Clock, DollarSign,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

type NotificationsResponse = {
  unread: number;
  data: Notification[];
  success: boolean;
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "NEW_ORDER":
      return <ShoppingCart className="h-5 w-5 text-blue-600" />;
    case "ORDER_UPDATE":
      return <Package className="h-5 w-5 text-orange-600" />;
    case "PAYMENT":
      return <DollarSign className="h-5 w-5 text-green-600" />;
    case "USER_ACTION":
      return <UserCheck className="h-5 w-5 text-purple-600" />;
    case "ALERT":
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case "SELLER_APPROVED":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "CULTURAL_APPROVAL":
      return <UserCheck className="h-5 w-5 text-yellow-600" />;
    case "PRODUCT_RECOMMENDATION":
      return <Package className="h-5 w-5 text-indigo-600" />;
    default:
      return <Bell className="h-5 w-5 text-gray-600" />;
  }
};

const getNotificationTypeColor = (type: string) => {
  switch (type) {
    case "NEW_ORDER":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "ORDER_UPDATE":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "PAYMENT":
      return "bg-green-100 text-green-800 border-green-200";
    case "USER_ACTION":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "ALERT":
      return "bg-red-100 text-red-800 border-red-200";
    case "SELLER_APPROVED":
      return "bg-green-100 text-green-800 border-green-200";
    case "CULTURAL_APPROVAL":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "PRODUCT_RECOMMENDATION":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getDeepLink = (n: Notification): string | null => {
  const id = n.relatedId;
  switch (n.type) {
    case "NEW_PRODUCT_SUBMITTED":
    case "PRODUCT_LOW_STOCK_DEACTIVATED":
      return id ? `/admindashboard/products/${id}` : "/admindashboard/products";
    case "NEW_ORDER":
    case "ORDER_STATUS_CHANGED":
    case "ORDER_UPDATE":
    case "ORDER_CANCELLED":
      return id ? `/admindashboard/orders?highlight=${id}&tab=all` : "/admindashboard/orders";
    case "SELLER_APPROVED":
    case "SELLER_REJECTED":
      return "/admindashboard/sellers";
    case "BANK_CHANGE_REQUESTED":
      return `/admindashboard/sellers/bank-change-requests${id ? `?highlight=${id}` : ""}`;
    default:
      return null;
  }
};

export default function UserListCard() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response: NotificationsResponse = await api.get("/api/notifications");
      console.log('[UserListCard] Notifications response:', response);
      setNotifications(response?.notifications || response?.data || []);
      setUnreadCount(response?.unreadCount ?? response?.unread ?? 0);
      setPagination(response?.pagination || { page: 1, limit: 20, total: 0 });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    setMarkingAsRead(notificationId);
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success("Notification marked as read");
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      toast.error("Failed to mark as read");
    } finally {
      setMarkingAsRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-semibold">Notifications</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Your recent notifications</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all as read ({unreadCount})
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Bell className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No notifications</h3>
            <p className="text-muted-foreground text-sm">You&apos;re all caught up! No new notifications.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {notifications.map((notification) => {
              const link = getDeepLink(notification);
              return (
              <div
                key={notification.id}
                className={`rounded-lg border p-4 transition-all ${
                  !notification.isRead
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-background"
                }${link ? " cursor-pointer hover:opacity-80" : ""}`}
                onClick={() => {
                  if (!link) return;
                  if (!notification.isRead) markAsRead(notification.id);
                  router.push(link);
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {notification.message}
                        </p>

                        {notification.type === "PRODUCT_RECOMMENDATION" && notification.metadata && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="secondary" className="text-xs">
                              Recommended: {notification.metadata.recommendedCount} products
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Min SKU: {notification.metadata.minimumSKU}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Suggested SKU: {notification.metadata.suggestedSKU}
                            </Badge>
                          </div>
                        )}

                        {notification.metadata && notification.type !== "PRODUCT_RECOMMENDATION" && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {notification.metadata.totalAmount && (
                              <Badge variant="secondary" className="text-xs">
                                ${notification.metadata.totalAmount}
                              </Badge>
                            )}
                            {notification.metadata.itemCount && (
                              <Badge variant="secondary" className="text-xs">
                                {notification.metadata.itemCount} items
                              </Badge>
                            )}
                            {notification.metadata.customerName && (
                              <Badge variant="secondary" className="text-xs">
                                {notification.metadata.customerName}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Badge
                            variant="outline"
                            className={`${getNotificationTypeColor(notification.type)} text-xs`}
                          >
                            {notification.type.replace(/_/g, " ")}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {notification.isRead ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={markingAsRead === notification.id}
                            onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                            className="text-xs"
                          >
                            {markingAsRead === notification.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Mark as read"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}

            {pagination.total > pagination.limit && (
              <div className="text-center text-sm text-muted-foreground pt-2">
                Showing {notifications.length} of {pagination.total} notifications
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}