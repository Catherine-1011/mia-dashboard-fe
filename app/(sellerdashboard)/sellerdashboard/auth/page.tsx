"use client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogIn, UserPlus, Lock, Mail, Shield, Key } from "lucide-react";
import Link from "next/link";

const authPages = [
	{
		title: "Login",
		description: "A classic login form with email and password fields.",
		icon: LogIn,
		href: "/login",
		status: "Ready",
	},
	{
		title: "Register",
		description: "A registration form to sign up new users.",
		icon: UserPlus,
		href: "/register",
		status: "Ready",
	},
	{
		title: "Forgot Password",
		description: "A form for users to reset their password via email.",
		icon: Lock,
		href: "/forgot-password",
		status: "Ready",
	},
	{
		title: "Email Verification",
		description:
			"A page to inform users to check their email for a verification link.",
		icon: Mail,
		href: "/verify-email",
		status: "Ready",
	},
	{
		title: "Two-Factor Auth",
		description: "A page for users to set up two-factor authentication.",
		icon: Shield,
		href: "/setup-2fa",
		status: "Ready",
	},
	{
		title: "API Keys",
		description: "A page to manage API keys for applications and services.",
		icon: Key,
		href: "/sellerdashboard/settings/api-keys",
		status: "Ready",
	},
];

export default function AuthPage() {
	return (
		<div className="space-y-4">
			<div className="text-center">
				<h1 className="text-3xl font-bold">Authentication Pages</h1>
				<p className="text-muted-foreground">
					Here are the authentication-related pages. These now live in their own
					full-screen layout.
				</p>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{authPages.map((page) => (
					<Link href={page.href} key={page.title}>
						<Card className="flex h-full transform flex-col transition-transform duration-300 hover:scale-105">
							<CardHeader>
								<div className="mb-2 flex justify-between">
									<CardTitle>{page.title}</CardTitle>
									<Badge
										variant={page.status === "Ready" ? "default" : "secondary"}
									>
										{page.status}
									</Badge>
								</div>
								<p className="text-sm text-muted-foreground">
									{page.description}
								</p>
							</CardHeader>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}


// "use client";
// import { useState } from "react";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { LogIn, Mail, Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

// // Mock API calls (replace with your actual API)
// const mockLogin = async (email: string, password: string, role: 'seller' | 'admin') => {
//   await new Promise(resolve => setTimeout(resolve, 1000));
  
//   if (!email || !password) {
//     throw new Error('Please fill in all fields');
//   }
  
//   if (email === 'test@example.com' && password === 'password') {
//     return {
//       token: 'mock_jwt_token_' + Math.random().toString(36).substr(2, 9),
//       user: {
//         id: '1',
//         email: email,
//         name: 'Test User',
//         role: role,
//       }
//     };
//   }
  
//   throw new Error('Invalid email or password');
// };

// export default function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [role, setRole] = useState<'seller' | 'admin'>('seller');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState(false);

//   const handleLogin = async () => {
//     setError('');
//     setSuccess(false);
//     setLoading(true);

//     try {
//       const response = await mockLogin(email, password, role);
      
//       // Store token and user data
//       localStorage.setItem('auth_token', response.token);
//       localStorage.setItem('user_data', JSON.stringify(response.user));
      
//       setSuccess(true);
      
//       setTimeout(() => {
//         if (response.user.role === 'admin') {
//           window.location.href = '/admin/dashboard';
//         } else {
//           window.location.href = '/seller/dashboard';
//         }
//       }, 1500);
      
//     } catch (err: any) {
//       setError(err.message || 'Login failed. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && !loading) {
//       handleLogin();
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
//       <Card className="w-full max-w-md">
//         <CardHeader className="space-y-1">
//           <div className="flex items-center justify-center mb-4">
//             <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
//               <LogIn className="h-6 w-6 text-primary" />
//             </div>
//           </div>
//           <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
//           <CardDescription className="text-center">
//             Sign in to your account to continue
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="space-y-4">
//             <div className="space-y-2">
//               <Label>Login as</Label>
//               <div className="flex gap-2">
//                 <Button
//                   type="button"
//                   variant={role === 'seller' ? 'default' : 'outline'}
//                   className="flex-1"
//                   onClick={() => setRole('seller')}
//                   disabled={loading}
//                 >
//                   Seller
//                 </Button>
//                 <Button
//                   type="button"
//                   variant={role === 'admin' ? 'default' : 'outline'}
//                   className="flex-1"
//                   onClick={() => setRole('admin')}
//                   disabled={loading}
//                 >
//                   Admin
//                 </Button>
//               </div>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="email">Email</Label>
//               <div className="relative">
//                 <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
//                 <Input
//                   id="email"
//                   type="email"
//                   placeholder="you@example.com"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   onKeyPress={handleKeyPress}
//                   className="pl-10"
//                   disabled={loading}
//                 />
//               </div>
//             </div>

//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <Label htmlFor="password">Password</Label>
//                 <a href="/forgot-password" className="text-xs text-primary hover:underline">
//                   Forgot password?
//                 </a>
//               </div>
//               <div className="relative">
//                 <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
//                 <Input
//                   id="password"
//                   type="password"
//                   placeholder="••••••••"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   onKeyPress={handleKeyPress}
//                   className="pl-10"
//                   disabled={loading}
//                 />
//               </div>
//             </div>

//             {error && (
//               <Alert variant="destructive">
//                 <AlertCircle className="h-4 w-4" />
//                 <AlertDescription>{error}</AlertDescription>
//               </Alert>
//             )}

//             {success && (
//               <Alert className="bg-green-50 text-green-900 border-green-200">
//                 <CheckCircle2 className="h-4 w-4" />
//                 <AlertDescription>
//                   Login successful! Redirecting...
//                 </AlertDescription>
//               </Alert>
//             )}

//             <Button onClick={handleLogin} className="w-full" disabled={loading}>
//               {loading ? (
//                 <>
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                   Signing in...
//                 </>
//               ) : (
//                 <>
//                   <LogIn className="mr-2 h-4 w-4" />
//                   Sign in
//                 </>
//               )}
//             </Button>
//           </div>

//           {/* <div className="mt-6 p-3 bg-muted rounded-lg">
//             <p className="text-xs font-semibold mb-2">Demo Credentials:</p>
//             <p className="text-xs text-muted-foreground">
//               Email: test@example.com<br />
//               Password: password
//             </p>
//           </div> */}

//           <div className="mt-4 text-center text-sm">
//             <span className="text-muted-foreground">Don't have an account? </span>
//             <a href="/register" className="text-primary hover:underline font-medium">
//               Sign up
//             </a>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }