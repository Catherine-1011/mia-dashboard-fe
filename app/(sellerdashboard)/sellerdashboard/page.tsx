
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CreditCard, DollarSign, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";

const LoadingDashboard = dynamic(() => import("@/components/shared/loading-dashboard").then(m => m.LoadingDashboard), { ssr: false });



export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [slaData, setSlaData] = useState<any>(null);
  const [loadingSla, setLoadingSla] = useState(false);
  // Track acknowledge loading and status for each notification
  const [ackState, setAckState] = useState<
    Record<string, { loading: boolean; acknowledged: boolean }>
  >({});

  // Fetch analytics data from API
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // Use the api client for consistency
      const data = await api.get("/api/seller/orders/analytics");
      setAnalytics(data.analytics || null);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper: persist acknowledged notifications in localStorage
  const ACK_KEY = "alpa_acknowledged_notifications";
  function getPersistedAcks() {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(ACK_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }
  function persistAck(id: string) {
    if (typeof window === "undefined") return;
    const prev = getPersistedAcks();
    prev[id] = true;
    localStorage.setItem(ACK_KEY, JSON.stringify(prev));
  }

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window === "undefined") {
        setChecking(false);
        return;
      }

      const token = localStorage.getItem("alpa_token");

      if (!token) {
        console.log("No token found, redirecting to login");
        toast.error("Please login to continue");
        setChecking(false);
        setTimeout(() => router.push("/login"), 300);
        return;
      }

      try {
        // Validate token format
        const parts = token.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid token format");
        }

        const payload = JSON.parse(atob(parts[1]));
        console.log("User payload:", payload);

        // Check if token is expired
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.warn("Token expired");
          localStorage.removeItem("alpa_token");
          toast.error("Session expired. Please login again.");
          setChecking(false);
          setTimeout(() => router.push("/login"), 300);
          return;
        }

        // Check user role - be flexible with case
        const userRole = payload.role?.toLowerCase()?.trim();
        console.log(`User role from token: "${userRole}"`);

        setUserRole(payload.role);

        // Allow seller and admin to view seller dashboard
        const isSeller = userRole?.includes("seller");
        const isAdmin = userRole?.includes("admin");

        if (isSeller || isAdmin) {
          console.log(
            `User is ${isAdmin ? "admin" : "seller"}, loading dashboard`,
          );
          // Fetch notifications data
          setLoadingSla(true);
          try {
            const response = await api.get("/api/seller/notifications");
            setSlaData(response);
            // Initialize ackState for notifications
            if (response.notifications) {
              const persisted = getPersistedAcks();
              const ackInit: Record<string, { loading: boolean; acknowledged: boolean }> = {};
              response.notifications.forEach((n: any) => {
                ackInit[n.id] = {
                  loading: false,
                  acknowledged: !!n.acknowledged || !!persisted[n.id],
                };
              });
              setAckState(ackInit);
            }
          } catch (error: any) {
            console.error("Error loading notifications:", error);
            setSlaData({
              success: false,
              notifications: [],
              summary: {
                total: 0,
                pending: 0,
                overdue: 0,
                critical: 0,
              },
            });
          } finally {
            setLoadingSla(false);
          }
          // Fetch analytics data after auth
          fetchAnalytics();
        } else {
          console.error(`Access denied: user role is "${userRole}"`);
          toast.error(
            `Unauthorized - Your role is: ${payload.role}. Seller or admin access required.`,
          );
          setChecking(false);
          setTimeout(() => router.push("/customerdashboard"), 300);
          return;
        }

        setChecking(false);
      } catch (e) {
        console.error("Token validation error:", e);
        localStorage.removeItem("alpa_token");
        toast.error("Invalid session. Please login again.");
        setChecking(false);
        setTimeout(() => router.push("/login"), 300);
      }
    };

    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center">
        <div className="w-full max-w-7xl"><LoadingDashboard /></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Welcome back! Here&apos;s an overview of your data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics ? `$${parseFloat(analytics.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-xs text-muted-foreground">-</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              +20.1% from last month
            </div>
          </CardContent>
        </Card>
        {/* Total Orders */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics ? Number(analytics.totalOrders).toLocaleString('en-US') : <span className="text-xs text-muted-foreground">-</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              +19% from last month
            </div>
          </CardContent>
        </Card>
        {/* Total Items Sold */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Total Items Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics ? Number(analytics.totalItemsSold).toLocaleString('en-US') : <span className="text-xs text-muted-foreground">-</span>}
            </div>
          </CardContent>
        </Card>
        {/* Avg. Order Value */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Avg. Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics ? `$${parseFloat(analytics.averageOrderValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-xs text-muted-foreground">-</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      {/* <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="group hover:shadow-lg transition-all duration-200"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div> */}

      {/* Additional Content Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* SLA Dashboard Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              SLA Dashboard
            </CardTitle>
            <p className="text-muted-foreground">
              Service Level Agreement monitoring
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSla ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Total Notifications
                    </p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      <Skeleton className="h-7 w-16" />
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/30 dark:border-green-900">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Pending
                    </p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      <Skeleton className="h-7 w-16" />
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/30 dark:border-red-900">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Overdue</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                      <Skeleton className="h-7 w-16" />
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      Critical
                    </p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      <Skeleton className="h-7 w-16" />
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Total Notifications
                    </p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {slaData?.summary?.total || 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/30 dark:border-green-900">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Pending
                    </p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {slaData?.summary?.pending || 0}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/30 dark:border-red-900">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Overdue</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {slaData?.summary?.overdue || 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      Critical
                    </p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {slaData?.summary?.critical || 0}
                    </p>
                  </div>
                </div>
                {/* Notifications List */}
                {/* <div className="space-y-2">
									<p className="font-medium text-gray-700">Notifications</p>
									<div className="max-h-64 overflow-y-auto space-y-2">
										{slaData?.notifications?.length > 0 ? (
											slaData.notifications.map((notification: any) => {
												const isHighPriority = notification.priority === "HIGH";
												const isOverdue = notification.isOverdue;
												const badgeColor = isOverdue ? "bg-red-500" : isHighPriority ? "bg-orange-500" : "bg-blue-500";
												const bgColor = isOverdue ? "border-red-200 bg-red-50" : isHighPriority ? "border-orange-200 bg-orange-50" : "border-blue-200 bg-blue-50";
												const ack = ackState[notification.id] || { loading: false, acknowledged: !!notification.acknowledged };
												return (
													<div key={notification.id} className={`flex items-start gap-4 p-3 rounded-lg border ${bgColor}`}>
														<div className={`w-2 h-2 rounded-full mt-2 ${badgeColor}`} />
														<div className="flex-1">
															<div className="flex items-start justify-between">
																<div className="flex-1">
																	<p className="font-medium text-gray-800 text-sm">
																		{notification.message}
																	</p>
																	<p className="text-xs text-gray-600 mt-1">
																		{notification.notes}
																	</p>
																	<div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
																		<span>Order: {notification.order?.customerName}</span>
																		<span className={`px-2 py-1 rounded-full text-xs font-medium ${
																			notification.slaIndicator === 'GREEN' ? 'bg-green-100 text-green-700' :
																			notification.slaIndicator === 'YELLOW' ? 'bg-yellow-100 text-yellow-700' :
																			'bg-red-100 text-red-700'
																		}`}>
																			{notification.slaIndicator}
																		</span>
																		<span>
																			{notification.timeRemaining ? `${notification.timeRemaining.toFixed(1)}h remaining` : 'Time elapsed'}
																		</span>
																	</div>
																</div>
																<div className="flex flex-col items-end ml-2 gap-2">
																	<span className="text-xs text-gray-500">{new Date(notification.createdAt).toLocaleDateString('en-GB')}</span>
																	<button
																		className={`px-3 py-1 rounded text-xs font-medium border ${ack.acknowledged ? 'bg-green-100 text-green-700 border-green-300 cursor-default' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} disabled:opacity-60`}
																		disabled={ack.loading || ack.acknowledged}
																		onClick={async () => {
																			setAckState((prev) => ({ ...prev, [notification.id]: { ...ack, loading: true } }));
																			try {
																				await api.patch(`/api/seller/notifications/${notification.id}/acknowledge`);
																				toast.success("Notification acknowledged");
																				setAckState((prev) => ({ ...prev, [notification.id]: { loading: false, acknowledged: true } }));
																			} catch {
																				toast.error("Failed to acknowledge notification");
																				setAckState((prev) => ({ ...prev, [notification.id]: { ...ack, loading: false } }));
																			}
																		}}
																	>
																		{ack.loading ? 'Acknowledging...' : ack.acknowledged ? 'Acknowledged' : 'Acknowledge'}
																	</button>
																</div>
															</div>
														</div>
													</div>
												);
											})
										) : (
											<div className="text-center py-8 text-gray-500">
												<p>No notifications found</p>
											</div>
										)}
									</div>
								</div> */}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-medium text-foreground">Notifications</p>
              <div
                className="max-h-64 overflow-y-auto space-y-2 pr-2 pb-1"
                style={{ scrollbarGutter: "stable" }}
              >
                {slaData?.notifications?.length > 0 ? (
                  slaData.notifications.map((notification: any) => {
                    const isHighPriority = notification.priority === "HIGH";
                    const isOverdue = notification.isOverdue;
                    const badgeColor = isOverdue
                      ? "bg-red-500"
                      : isHighPriority
                        ? "bg-orange-500"
                        : "bg-blue-500";
                    const bgColor = isOverdue
                      ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                      : isHighPriority
                        ? "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30"
                        : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30";
                    const ack = ackState[notification.id] || {
                      loading: false,
                      acknowledged: !!notification.acknowledged,
                    };
                    return (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-4 p-3 rounded-lg border ${bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
                        onClick={(e) => {
                          // Don't navigate when clicking the acknowledge button
                          if ((e.target as HTMLElement).closest("button")) return;
                          if (notification.order?.id) router.push(`/sellerdashboard/orders?highlight=${notification.order.id}`);
                        }}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${badgeColor}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-foreground text-sm">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.notes}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span>
                                  Order: {notification.order?.customerName}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    notification.slaIndicator === "GREEN"
                                      ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                                      : notification.slaIndicator === "YELLOW"
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                  }`}
                                >
                                  {notification.slaIndicator}
                                </span>
                                <span>
                                  {notification.timeRemaining
                                    ? `${notification.timeRemaining.toFixed(1)}h remaining`
                                    : "Time elapsed"}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end ml-2 gap-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(
                                  notification.createdAt,
                                ).toLocaleDateString('en-GB')}
                              </span>
                              <button
                                className={`px-3 py-1 rounded text-xs font-medium border ${ack.acknowledged ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800 cursor-default" : "bg-background text-foreground border-border hover:bg-muted"} disabled:opacity-60`}
                                disabled={ack.loading || ack.acknowledged}
                                onClick={async () => {
                                  setAckState((prev) => ({
                                    ...prev,
                                    [notification.id]: {
                                      ...ack,
                                      loading: true,
                                    },
                                  }));
                                  try {
                                    await api.patch(
                                      `/api/seller/notifications/${notification.id}/acknowledge`,
                                    );
                                    toast.success("Notification acknowledged");
                                    setAckState((prev) => ({
                                      ...prev,
                                      [notification.id]: {
                                        loading: false,
                                        acknowledged: true,
                                      },
                                    }));
                                    persistAck(notification.id);
                                  } catch {
                                    toast.error(
                                      "Failed to acknowledge notification",
                                    );
                                    setAckState((prev) => ({
                                      ...prev,
                                      [notification.id]: {
                                        ...ack,
                                        loading: false,
                                      },
                                    }));
                                  }
                                }}
                              >
                                {ack.loading
                                  ? "Acknowledging..."
                                  : ack.acknowledged
                                    ? "Acknowledged"
                                    : "Acknowledge"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No notifications found</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* <Card>
					<CardHeader>
						<CardTitle className="text-xl font-semibold">
							Quick Actions
						</CardTitle>
						<p className="text-muted-foreground">Commonly used features</p>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<button
								type="button"
								className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border hover:bg-muted transition-colors"
							>
								<Users className="h-6 w-6" />
								<span className="text-sm font-medium">Add User</span>
							</button>
							<button
								type="button"
								className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border hover:bg-muted transition-colors"
							>
								<CreditCard className="h-6 w-6" />
								<span className="text-sm font-medium">New Sale</span>
							</button>
							<button
								type="button"
								className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border hover:bg-muted transition-colors"
							>
								<Activity className="h-6 w-6" />
								<span className="text-sm font-medium">Reports</span>
							</button>
							<button
								type="button"
								className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border hover:bg-muted transition-colors"
							>
								<DollarSign className="h-6 w-6" />
								<span className="text-sm font-medium">Analytics</span>
							</button>
						</div>
					</CardContent>
				</Card> */}
      </div>
    </div>
  );
}
function getAuthHeaders(): HeadersInit | undefined {
  throw new Error("Function not implemented.");
}
