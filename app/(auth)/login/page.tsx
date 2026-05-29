"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://alpa-be.onrender.com";

// Login API function
async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data: data,
  };
}

// Verify login OTP
async function verifyLoginOTP(email: string, otp: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-login-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, otp }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "OTP verification failed");
  }

  return data;
}

// Resend login OTP
async function resendLoginOTP(email: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/resend-login-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to resend OTP");
  }

  return data;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <LogIn className="mx-auto h-12 w-12 text-gray-400" />
            <CardTitle className="mt-4 text-2xl">Loading...</CardTitle>
            <CardDescription>
              Please wait while we load the login form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </CardContent>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOTP] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isOTPLoading, setIsOTPLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get redirect parameter for post-login navigation
  const redirectTo = searchParams.get("redirectTo");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Helper function to set cookies
  function setCookie(name: string, value: string, days: number = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  }

  // Helper function to handle successful login
  function handleSuccessfulLogin(token: string, role?: string) {
    // Store in localStorage
    localStorage.setItem("alpa_token", token);

    // Set cookies that middleware can read
    setCookie("token", token, 7);
    if (role) {
      setCookie("userRole", role, 7);
    }

    localStorage.removeItem("user_data");

    toast.success("Login successful!", {
      description: "Welcome back! You have been logged in successfully.",
    });

    setTimeout(() => {
      // Use redirectTo parameter if provided, otherwise use role-based routing
      if (redirectTo && redirectTo.startsWith("/")) {
        router.push(redirectTo);
      } else if (
        role === "ADMIN" ||
        role === "admin" ||
        role === "SUPER_ADMIN"
      ) {
        router.push("/admindashboard");
      } else if (role === "SELLER" || role === "seller") {
        router.push("/sellerdashboard");
      } else {
        router.push("/customerdashboard");
      }
      // Force a hard refresh to ensure middleware picks up the cookies
      router.refresh();
    }, 1000);
  }

  // Handles login form submit
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      console.log("🔐 Attempting login for:", values.email);

      const response = await loginUser(values.email, values.password);

      console.log("📥 Login Response:", response);

      // Check if login failed
      if (!response.ok) {
        throw new Error(response.data.message || "Invalid email or password");
      }

      // Case 1: Direct login (device verified, within 7 days)
      if (
        response.data.success &&
        response.data.token &&
        !response.data.requiresVerification
      ) {
        console.log("✅ Direct login - device verified");
        handleSuccessfulLogin(response.data.token, response.data.role);
        return;
      }

      // Case 2: Verification required (first time or after 7 days)
      if (response.data.success && response.data.requiresVerification) {
        console.log("📧 Verification required - OTP sent");
        setLoginEmail(values.email);
        setLoginPassword(values.password);
        setShowOTP(true);
        toast.info(
          response.data.message || "Please enter the OTP sent to your email.",
        );
        return;
      }

      // Unexpected response
      throw new Error("Unexpected response from server");
    } catch (error) {
      const err = error as Error;
      console.error("❌ Login error:", err);
      toast.error("Login failed", {
        description:
          err.message || "Invalid email or password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handles verifying OTP
  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();

    if (!loginEmail || !otp) {
      toast.error("Please enter the OTP");
      return;
    }

    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsOTPLoading(true);

    try {
      console.log("🔐 Verifying OTP for:", loginEmail);

      const response = await verifyLoginOTP(loginEmail, otp);

      console.log("📥 OTP Verification Response:", response);

      // Check for token in response
      if (response.success && response.token) {
        console.log("✅ OTP verified - device session created for 7 days");
        handleSuccessfulLogin(
          response.token,
          response.role || response.user?.role,
        );
        return;
      }

      throw new Error(response.message || "OTP verification failed");
    } catch (error) {
      const err = error as Error;
      console.error("❌ OTP verification error:", err);

      toast.error("OTP verification failed", {
        description: err.message || "Invalid OTP. Please try again.",
      });

      setOTP("");
    } finally {
      setIsOTPLoading(false);
    }
  }

  // Handles resending OTP
  async function handleResendOTP() {
    if (!loginEmail) {
      toast.error("Session expired. Please login again.");
      handleBackToLogin();
      return;
    }

    setIsOTPLoading(true);
    try {
      console.log("📤 Resending OTP to:", loginEmail);
      const response = await resendLoginOTP(loginEmail);

      if (response.success) {
        toast.success("OTP resent successfully", {
          description: "Please check your email for the new OTP.",
        });
        setOTP("");
      } else {
        throw new Error(response.message || "Failed to resend OTP");
      }
    } catch (error) {
      const err = error as Error;
      console.error("❌ Resend OTP error:", err);
      toast.error("Failed to resend OTP", {
        description: err.message,
      });
    } finally {
      setIsOTPLoading(false);
    }
  }

  // Handles going back to login form
  function handleBackToLogin() {
    setShowOTP(false);
    setOTP("");
    setLoginEmail("");
    setLoginPassword("");
    form.reset();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <LogIn className="mx-auto h-12 w-12 text-gray-400" />
        <CardTitle className="mt-4 text-2xl">
          {showOTP ? "Verify Your Email" : "Welcome back"}
        </CardTitle>
        <CardDescription>
          {showOTP
            ? "Enter the OTP sent to your email address"
            : "Enter your credentials to access your account"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!showOTP ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Enter your email"
                          disabled={isLoading}
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          disabled={isLoading}
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium">
                Enter OTP
              </label>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOTP(e.target.value.replace(/\D/g, ""))}
                disabled={isOTPLoading}
                maxLength={6}
                autoFocus
                className="text-center text-lg tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-2">
                OTP sent to {loginEmail}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isOTPLoading || otp.length !== 6}
            >
              {isOTPLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify OTP & Login"
              )}
            </Button>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleBackToLogin}
                disabled={isOTPLoading}
              >
                Back to Login
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={handleResendOTP}
                disabled={isOTPLoading}
              >
                {isOTPLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  "Resend OTP"
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        {!showOTP && (
          <>
            <div className="relative w-full flex items-center gap-2">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                or continue with
              </span>
              <div className="flex-1 border-t border-border" />
            </div>
            {/* <a
              href={`https://alpa-be.onrender.com/api/auth/saml/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
              className="w-full"
            > */}
            <a
              href={
                `${API_BASE_URL}/api/auth/saml/login` +
                (redirectTo
                  ? "?redirectTo=" + encodeURIComponent(redirectTo)
                  : "")
              }
              className="w-full"
            >
              <Button type="button" variant="outline" className="w-full gap-2">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Sign in with SSO
              </Button>
            </a>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
