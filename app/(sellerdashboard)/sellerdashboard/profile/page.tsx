// "use client";
// import { useState, useEffect } from "react";
// import Link from "next/link";
// import { api } from "@/lib/api";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
// import { Button } from "@/components/ui/button";
// import { Skeleton } from "@/components/ui/skeleton";

// const ProfilePage = () => {
//   const [profile, setProfile] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     setLoading(true);
//     setError(null);
//     api.get(`/api/profile`)
//       .then((data) => {
//         setProfile(data.profile || data);
//         setLoading(false);
//       })
//       .catch((err) => {
//         setError(err.message || "Failed to load profile");
//         setLoading(false);
//       });
//   }, []);

//   if (loading) {
//     return (
//       <div className="max-w-2xl mx-auto p-6">
//         <Card className="shadow-lg border-0 bg-background/80">
//           <CardHeader className="flex flex-col items-center gap-4 border-b-0 pb-0">
//             <div className="relative">
//               <Skeleton className="size-20 rounded-full" />
//             </div>
//             <Skeleton className="h-8 w-32 mt-1" />
//             <Skeleton className="h-4 w-40" />
//           </CardHeader>
//           <CardContent className="space-y-6 mt-6">
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               {[...Array(6)].map((_, index) => (
//                 <div key={index} className="bg-muted/50 rounded-lg p-4 flex flex-col gap-2">
//                   <Skeleton className="h-3 w-16" />
//                   <Skeleton className="h-5 w-24" />
//                 </div>
//               ))}
//             </div>
//             <div className="pt-4 flex justify-center">
//               <Skeleton className="h-10 w-32" />
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-2xl mx-auto p-6">
//       <Card className="shadow-lg border-0 bg-background/80">
//         <CardHeader className="flex flex-col items-center gap-4 border-b-0 pb-0">
//           <div className="relative">
//             <Avatar className="size-16 ring-2 ring-primary/20 shadow-md overflow-hidden">
//               {profile?.profileImage ? (
//                 <img 
//                   src={profile.profileImage} 
//                   alt={profile?.name || 'Profile'} 
//                   className="w-20 h-20 object-cover rounded-full" 
//                   style={{ maxWidth: '5rem', maxHeight: '5rem', minWidth: '5rem', minHeight: '5rem' }}
//                 />
//               ) : (
//                 <AvatarFallback className="text-xl">{profile?.name?.[0] || 'U'}</AvatarFallback>
//               )}
//             </Avatar>
//           </div>
//           <CardTitle className="text-3xl font-bold text-center mt-1">
//             {profile?.name || 'User'}
//           </CardTitle>
//           <div className="text-muted-foreground text-center">
//             {profile?.email || 'user@example.com'}
//           </div>
//         </CardHeader>
//         <CardContent className="space-y-6 mt-6">
//           {error && (
//             <div className="text-destructive text-center bg-destructive/10 p-3 rounded-lg">
//               {error}
//             </div>
//           )}
//           {profile && (
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
//                 <span className="text-xs text-muted-foreground">Phone</span>
//                 <span className="font-medium text-base">
//                   {profile.phone || <span className="text-muted-foreground">-</span>}
//                 </span>
//               </div>
//               <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
//                 <span className="text-xs text-muted-foreground">Role</span>
//                 <span className="font-medium text-base">{profile.role}</span>
//               </div>
//               <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
//                 <span className="text-xs text-muted-foreground">Verified</span>
//                 <span className="font-medium text-base">
//                   {profile.isVerified ? 'Yes' : 'No'}
//                 </span>
//               </div>
//               <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
//                 <span className="text-xs text-muted-foreground">Email Verified</span>
//                 <span className="font-medium text-base">
//                   {profile.emailVerified ? 'Yes' : 'No'}
//                 </span>
//               </div>
//               <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
//                 <span className="text-xs text-muted-foreground">Created At</span>
//                 <span className="font-medium text-base">
//                   {profile.createdAt ? new Date(profile.createdAt).toLocaleString('en-GB') : '-'}
//                 </span>
//               </div>
//               <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
//                 <span className="text-xs text-muted-foreground">Updated At</span>
//                 <span className="font-medium text-base">
//                   {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString('en-GB') : '-'}
//                 </span>
//               </div>
//             </div>
//           )}
//           <div className="pt-4 flex justify-center">
//             {/* <Link href="/dashboard/settings" passHref legacyBehavior>
//               <Button asChild variant="default">
//                 <span>Edit Profile</span>
//               </Button>
//             </Link> */}
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default ProfilePage;


"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Building2, Store, CreditCard, FileText, Globe,
  Phone, Mail, MapPin, Calendar, Package, CheckCircle2, XCircle, ExternalLink,
} from "lucide-react";

type BusinessAddress = {
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

type KycDocument = {
  publicId: string;
  uploadedAt: string;
  documentUrl: string;
  documentType: string;
  originalName: string;
};

type BankDetails = {
  bsb?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
};

type SellerUser = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  profileImage?: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
};

type SellerProfile = {
  id: string;
  userId: string;
  contactPerson?: string;
  businessName?: string;
  abn?: string;
  businessAddress?: string;
  businessType?: string;
  yearsInBusiness?: number | null;
  website?: string | null;
  culturalBackground?: string | null;
  culturalStory?: string | null;
  artistName?: string | null;
  artistDescription?: string | null;
  storeName?: string;
  storeDescription?: string;
  storeLogo?: string | null;
  storeBanner?: string | null;
  storeLocation?: string | null;
  kycDocuments?: KycDocument[];
  kycSubmitted: boolean;
  bankDetails?: BankDetails;
  status: string;
  onboardingStep: number;
  productCount?: number;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user: SellerUser;
};

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="font-medium text-sm break-words">
        {value ?? <span className="text-muted-foreground italic">Not provided</span>}
      </span>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="font-semibold text-sm text-primary uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800 border-green-300",
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
    INACTIVE: "bg-gray-100 text-gray-600 border-gray-300",
    REJECTED: "bg-red-100 text-red-800 border-red-300",
    SUSPENDED: "bg-orange-100 text-orange-800 border-orange-300",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get("/api/seller-profile")
      .then((res) => {
        setProfile(res?.data ?? null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load seller profile");
        setLoading(false);
      });
  }, []);

  const parseAddress = (raw?: string): BusinessAddress | null => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header card skeleton */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <Skeleton className="h-24 w-24 rounded-full shrink-0" />
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="flex gap-3 pt-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section cards skeleton — 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Information */}
          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-4 flex flex-col gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-muted/50 rounded-lg p-4 flex flex-col gap-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Store Information */}
          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3.5 w-32" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-4 flex flex-col gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-muted/50 rounded-lg p-4 flex flex-col gap-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-4 flex flex-col gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* KYC Documents */}
          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-10 shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="shadow-sm lg:col-span-2">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-4 flex flex-col gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-destructive text-center bg-destructive/10 p-4 rounded-lg border border-destructive/20">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const address = parseAddress(profile.businessAddress);
  const addressString = address
    ? [address.street, address.city, address.state, address.postcode, address.country].filter(Boolean).join(", ")
    : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* Header Card */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="shrink-0">
              {profile.user?.profileImage ? (
                <img
                  src={profile.user.profileImage}
                  alt={profile.user?.name ?? "Seller"}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/20 shadow"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 shadow text-3xl font-bold text-primary">
                  {profile.user?.name?.[0] ?? "S"}
                </div>
              )}
            </div>

            {/* Name / meta */}
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-bold">{profile.user?.name ?? "Seller"}</h1>
                <StatusBadge status={profile.status} />
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{profile.user?.email}</span>
                {profile.user?.phone && (
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{profile.user.phone}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  {profile.user?.emailVerified
                    ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Email Verified</>
                    : <><XCircle className="h-3.5 w-3.5 text-red-500" /> Email Not Verified</>
                  }
                </span>
                <span className="flex items-center gap-1">
                  {profile.kycSubmitted
                    ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> KYC Submitted</>
                    : <><XCircle className="h-3.5 w-3.5 text-red-500" /> KYC Not Submitted</>
                  }
                </span>
                <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{profile.productCount ?? 0} Products</span>
                {profile.user?.createdAt && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Member since {new Date(profile.user.createdAt).toLocaleDateString('en-GB')}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Business Information */}
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <SectionTitle icon={Building2} title="Business Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Business Name" value={profile.businessName} />
              <InfoRow label="Contact Person" value={profile.contactPerson} />
              <InfoRow label="ABN" value={profile.abn} />
              <InfoRow label="Business Type" value={profile.businessType} />
              {/* <InfoRow label="Years in Business" value={profile.yearsInBusiness != null ? String(profile.yearsInBusiness) : undefined} /> */}
              {profile.website && (
                <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Website</span>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-primary flex items-center gap-1 hover:underline">
                    {profile.website} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {/* {!profile.website && <InfoRow label="Website" value={undefined} />} */}
            </div>
            {addressString && (
              <div className="mt-3 bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><MapPin className="h-3 w-3" />Business Address</span>
                <span className="font-medium text-sm">{addressString}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Store Information */}
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <SectionTitle icon={Store} title="Store Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Store Name" value={profile.storeName} />
              <InfoRow label="Store Location" value={profile.storeLocation ?? undefined} />
            </div>
            {profile.storeDescription && (
              <div className="mt-3 bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Store Description</span>
                <span className="font-medium text-sm">{profile.storeDescription}</span>
              </div>
            )}
            {profile.storeLogo && (
              <div className="mt-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Store Logo</span>
                <img src={profile.storeLogo} alt="Store Logo" className="h-16 mt-2 rounded object-contain" />
              </div>
            )}
            {profile.storeBanner && (
              <div className="mt-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Store Banner</span>
                <img src={profile.storeBanner} alt="Store Banner" className="w-full h-24 mt-2 rounded object-cover" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cultural / Artist Info */}
        {(profile.culturalBackground || profile.culturalStory || profile.artistName || profile.artistDescription) && (
          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <SectionTitle icon={User} title="Cultural & Artist Information" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow label="Cultural Background" value={profile.culturalBackground ?? undefined} />
                <InfoRow label="Artist Name" value={profile.artistName ?? undefined} />
              </div>
              {profile.culturalStory && (
                <div className="mt-3 bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Cultural Story</span>
                  <span className="font-medium text-sm">{profile.culturalStory}</span>
                </div>
              )}
              {profile.artistDescription && (
                <div className="mt-3 bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Artist Description</span>
                  <span className="font-medium text-sm">{profile.artistDescription}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bank Details */}
        {profile.bankDetails && (
          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <SectionTitle icon={CreditCard} title="Bank Details" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow label="Bank Name" value={profile.bankDetails.bankName} />
                <InfoRow label="Account Name" value={profile.bankDetails.accountName} />
                <InfoRow label="Account Number" value={profile.bankDetails.accountNumber ? `••••${profile.bankDetails.accountNumber.slice(-4)}` : undefined} />
                <InfoRow label="BSB" value={profile.bankDetails.bsb} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* KYC Documents */}
        {profile.kycDocuments && profile.kycDocuments.length > 0 && (
          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <SectionTitle icon={FileText} title="KYC Documents" />
              <div className="space-y-2">
                {profile.kycDocuments.map((doc) => (
                  <div key={doc.publicId} className="bg-muted/50 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm truncate">{doc.originalName}</span>
                      <span className="text-xs text-muted-foreground capitalize">{doc.documentType} &middot; {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}</span>
                    </div>
                    <a
                      href={doc.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-primary hover:underline flex items-center gap-1 text-xs font-medium"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Info */}
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <SectionTitle icon={Calendar} title="Account Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Role" value={profile.user?.role} />
              <InfoRow label="Approved At" value={profile.approvedAt ? new Date(profile.approvedAt).toLocaleString('en-GB') : undefined} />
              <InfoRow label="Member Since" value={new Date(profile.createdAt).toLocaleString('en-GB')} />
              <InfoRow label="Last Updated" value={new Date(profile.updatedAt).toLocaleString('en-GB')} />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default ProfilePage;