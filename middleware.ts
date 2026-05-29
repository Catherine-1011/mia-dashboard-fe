// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// export function middleware(request: NextRequest) {
//   // Middleware doesn't run for dashboard routes
//   // Token validation is handled client-side via localStorage
//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/login", "/register", "/forgot-password", "/verify-email", "/setup-2fa"],
// };



// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// export function middleware(request: NextRequest) {
//   const token = request.cookies.get("token")?.value;
//   const userRole = request.cookies.get("userRole")?.value;
  
//   const { pathname } = request.nextUrl;

//   // Define public routes (auth pages)
//   const publicRoutes = ["/login", "/register", "/forgot-password", "/verify-email", "/setup-2fa"];
//   const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

//   // If user is authenticated (has token and role)
//   if (token && userRole) {
//     // If trying to access public routes (login, register, etc.), redirect to dashboard
//     if (isPublicRoute) {
//       return NextResponse.redirect(new URL(`/dashboard/role`, request.url));
//     }
//     // Allow access to all other routes when authenticated
//     return NextResponse.next();
//   }

//   // If not authenticated
//   if (!token || !userRole) {
//     // Allow access to public routes
//     if (isPublicRoute) {
//       return NextResponse.next();
//     }

//     // Redirect to login for dashboard routes only
//     if (pathname.startsWith("/dashboard")) {
//       return NextResponse.redirect(new URL("/login", request.url));
//     }
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: [
//     "/login",
//     "/register",
//     "/forgot-password",
//     "/verify-email",
//     "/setup-2fa",
//     "/dashboard/:path*",
//   ],
// };



import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJWT } from "./lib/jwt";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const userRole = request.cookies.get("userRole")?.value;
  
  const { pathname } = request.nextUrl;

  // Define public routes (auth pages)
  const publicRoutes = ["/login", "/register", "/forgot-password", "/verify-email", "/setup-2fa"];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Verify token validity and handle expiration
  if (token) {
    const decoded = decodeJWT(token);
    const isExpired = decoded?.exp ? (decoded.exp as number) < Date.now() / 1000 : false;
    
    if (!decoded || isExpired) {
      const response = isPublicRoute 
        ? NextResponse.next() 
        : NextResponse.redirect(new URL("/login", request.url));
      
      response.cookies.delete("token");
      response.cookies.delete("userRole");
      return response;
    }
  }

  // If user is authenticated (has token and role)
  if (token && userRole) {
    // If trying to access public routes (login, register, etc.), redirect to their dashboard
    if (isPublicRoute) {
      const dest =
        (userRole === "ADMIN" || userRole === "SUPER_ADMIN") ? "/admindashboard" :
        userRole === "SELLER"   ? "/sellerdashboard" :
        "/customerdashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // Role-based route guard — redirect immediately if visiting the wrong dashboard
    // This prevents client-side flicker; the redirect happens before any page renders.
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
    const wrongDashboard =
      (pathname.startsWith("/admindashboard")    && !isAdmin)              ||
      (pathname.startsWith("/sellerdashboard")   && userRole !== "SELLER") ||
      (pathname.startsWith("/customerdashboard") && userRole !== "CUSTOMER");

    if (wrongDashboard) {
      const correctDest =
        isAdmin              ? "/admindashboard" :
        userRole === "SELLER" ? "/sellerdashboard" :
        "/customerdashboard";
      return NextResponse.redirect(new URL(correctDest, request.url));
    }

    // Allow access to all other routes when authenticated
    return NextResponse.next();
  }

  // If not authenticated
  if (!token || !userRole) {
    // Allow access to public routes
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // Redirect to login for any role-specific dashboard route
    if (
      pathname.startsWith("/admindashboard") ||
      pathname.startsWith("/sellerdashboard") ||
      pathname.startsWith("/customerdashboard")
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/forgot-password",
    "/verify-email",
    "/setup-2fa",
    "/admindashboard/:path*",
    "/sellerdashboard/:path*",
    "/customerdashboard/:path*",
  ],
};
