"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://backend.madeinarnhemland.com.au";

type Stage = "exchanging" | "success";

// Helper – same pattern as login page
function setCookie(name: string, value: string, days = 7) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

// Decode JWT payload without verification (client-side only, for role routing)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Inner component that reads search params (must be inside Suspense)
function LoginCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stage, setStage] = useState<Stage>("exchanging");

  useEffect(() => {
    const token = searchParams.get("token");
    const type = searchParams.get("type");
    const ticket = searchParams.get("ticket");
    const redirectTo = searchParams.get("redirectTo");

    // Only allow internal paths — block open redirects
    const safePath = redirectTo && redirectTo.startsWith("/") ? redirectTo : null;

    // ── SAML SSO flow: backend sends token + type=saml directly ─────────────
    if (type === "saml" && token) {
      try {
        const payload = decodeJwtPayload(token);
        const role = (payload?.role as string) ?? "";

        // Persist session — short-lived token (15 min), keep cookie duration matching
        localStorage.setItem("alpa_token", token);
        setCookie("token", token, 1); // 1 day max; backend expiry governs actual session

        if (role) {
          setCookie("userRole", role, 1);
        }

        setStage("success");

        toast.success("Signed in successfully!", {
          description: "Redirecting you to your destination…",
        });

        const roleDest =
          role === "ADMIN" || role === "admin" ? "/admindashboard" :
          role === "SELLER" || role === "seller" ? "/sellerdashboard" :
          "/customerdashboard";
        const dest = safePath ?? roleDest;

        setTimeout(() => {
          router.replace(dest);
          router.refresh();
        }, 800);
      } catch (err) {
        console.error("[SAML] Token processing error:", err);
        router.replace("/login?error=invalid_callback");
      }
      return;
    }

    // ── WatchGuard ticket-exchange flow ──────────────────────────────────────
    if (!ticket) {
      router.replace("/login");
      return;
    }

    const exchangeTicket = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/exchange-ticket`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ticketId: ticket }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.token) {
          throw new Error(
            data.message || "Ticket exchange failed. Please log in again."
          );
        }

        // ── Persist session (mirror login page behaviour) ──────────────────
        localStorage.setItem("alpa_token", data.token);
        setCookie("token", data.token, 7);

        if (data.role) {
          setCookie("userRole", data.role, 7);
        }

        // Cache user data if the backend returns it
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        setStage("success");

        toast.success("Signed in successfully!", {
          description: "Redirecting you to your destination…",
        });

        // Determine destination: use explicit redirectTo, or derive from role
        const roleDest =
          data.role === "ADMIN"  || data.role === "admin"   ? "/admindashboard" :
          data.role === "SELLER" || data.role === "seller"  ? "/sellerdashboard" :
          "/customerdashboard";
        const dest = safePath ?? roleDest;

        // Small delay so the success state is visible, then navigate
        setTimeout(() => {
          router.replace(dest);
          router.refresh();
        }, 800);
      } catch (err) {
        const error = err as Error;
        console.error("[SSO] Ticket exchange error:", error);
        // Fallback — send to normal login
        router.replace("/login");
      }
    };

    exchangeTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ── UI ───────────────────────────────────────────────────────────────────────
  return (

    <div className="flex flex-col items-center justify-center gap-4 text-center">
      {stage === "exchanging" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Signing you in…</h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we securely complete your sign-in.
          </p>
        </>
      )}

      {stage === "success" && (
        <>
          <CheckCircle className="h-12 w-12 text-green-500" />
          <h2 className="text-xl font-semibold">Signed in!</h2>
          <p className="text-sm text-muted-foreground">
            Redirecting you now…
          </p>
        </>
      )}
    </div>
  );
}

// Suspense wrapper required because useSearchParams() causes
// a CSR bailout during static generation without it.
export default function LoginCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Signing you in…</h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we securely complete your sign-in.
          </p>
        </div>
      }
    >
      <LoginCallbackContent />
    </Suspense>
  );
}
