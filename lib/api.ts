const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://alpa-be.onrender.com";

// Get auth token from localStorage (check both keys for compatibility)
const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("alpa_token");
  }
  return null;
};

// Check if error is auth-related (token expired/invalid)
// NOTE: 401 = unauthenticated (sign out). 403 = forbidden (show error, stay logged in).
const isAuthError = (status: number) => {
  return status === 401;
};

// Main API client
export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  // Only set Content-Type if there is a body AND it's not FormData
  const hasBody = !!options.body;
  const isFormData = options.body instanceof FormData;
  
  const headers: Record<string, string> = {
    // Only set JSON Content-Type if body exists and is not FormData
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token && { "Authorization": `Bearer ${token}` }),
  };

  // Merge with any custom headers from options
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (value) headers[key] = String(value);
    });
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  };

  try {
    console.log(`[API] ${options.method || 'GET'} ${endpoint}`, {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      url: `${API_BASE_URL}${endpoint}`
    });

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle auth errors globally (but NOT for login endpoint)
    if (isAuthError(response.status) && !endpoint.includes('/login')) {
      console.error(`[API] Authentication error (${response.status}) on ${endpoint}`);
      const expiredToken = localStorage.getItem("auth_token") || localStorage.getItem("alpa_token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("alpa_token");
      localStorage.removeItem("user");
      localStorage.removeItem("user_data");
      try { sessionStorage.clear(); } catch (_) { /* ignore */ }
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
      document.cookie = "userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
      document.cookie = "alpa_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // Fire-and-forget — never block navigation on a cold Render server
      fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(expiredToken ? { Authorization: `Bearer ${expiredToken}` } : {}),
        },
      }).catch(() => { /* best-effort */ });

      if (typeof window !== "undefined") {
        window.location.replace(
          "https://apla-fe.vercel.app/logout-callback?redirect=" +
          encodeURIComponent("https://apla-fe.vercel.app")
        );
      }
      throw new Error("Session expired. Please login again.");
    }

    if (!response.ok) {
      let errorData;
      const contentType = response.headers.get("content-type");
      
      // Try to parse JSON error if content-type is JSON
      if (contentType && contentType.includes("application/json")) {
        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }
      } else {
        // If not JSON, try to get text
        const text = await response.text();
        errorData = { message: text || `Request failed (${response.status})` };
      }

      const errorMessage = errorData.message || errorData.error || `Request failed (${response.status})`;
      console.error(`[API] Error on ${endpoint}:`, errorMessage);
      throw new Error(errorMessage);
    }

    // Handle empty responses (like 204 No Content)
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.log(`[API] Non-JSON response on ${endpoint}`);
      return null;
    }

    const data = await response.json();
    console.log(`[API] Success on ${endpoint}`, data);
    return data;
  } catch (error) {
    const err = error as Error;
    
    // Handle network errors
    if (err.message === "Failed to fetch" || err.name === "TypeError") {
      console.error("[API] Network error - server may be down or CORS issue");
      throw new Error("Network error. Please check your connection and ensure the server is running.");
    }
    
    throw err;
  }
};

// Convenience methods
export const api = {
  get: (endpoint: string, options?: { headers?: Record<string, string> }) =>
    apiClient(endpoint, { method: "GET", ...options }),

  post: <T = any>(endpoint: string, data?: T) => {
    const isFormData = data instanceof FormData;
    return apiClient(endpoint, {
      method: "POST",
      body: isFormData ? (data as FormData) : JSON.stringify(data),
    });
  },

  put: <T = any>(endpoint: string, data?: T, options?: { headers?: Record<string, string> }) => {
    const isFormData = data instanceof FormData;
    const requestOptions: RequestInit = {
      method: "PUT",
      body: isFormData ? (data as FormData) : JSON.stringify(data),
    };

    // Only add headers if it's not FormData (let browser set Content-Type for FormData)
    if (!isFormData || options?.headers) {
      requestOptions.headers = options?.headers;
    }

    return apiClient(endpoint, requestOptions);
  },

  patch: <T = any>(endpoint: string, data?: T) =>
    apiClient(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (endpoint: string, data?: any) =>
    apiClient(endpoint, { 
      method: "DELETE",
      body: data ? JSON.stringify(data) : undefined,
    }),
};