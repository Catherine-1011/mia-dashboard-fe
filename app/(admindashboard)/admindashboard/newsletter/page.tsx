'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';

import {
  Plus,
  Search,
  Trash2,
  Eye,
  Edit,
  Send,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  MailOpen,
  ImageIcon,
  Copy,
  Download,
  UserCheck,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignStatus = 'DRAFT' | 'SENDING' | 'SENT';

interface Campaign {
  id: string;
  subject: string;
  content: string;
  bannerImage?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string | null;
}

interface Subscriber {
  id: string;
  email: string;
  name?: string | null;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string | null;
}

interface CampaignFormData {
  subject: string;
  content: string;
  bannerImage: string;
  buttonText: string;
  buttonLink: string;
}

const EMPTY_FORM: CampaignFormData = {
  subject: '',
  content: '',
  bannerImage: '',
  buttonText: '',
  buttonLink: '',
};

// ─── Skeleton components ──────────────────────────────────────────────────────

const CampaignRowSkeleton = () => (
  <Card className="overflow-hidden">
    <div className="p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        <div className="space-y-1.5 min-w-0">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  </Card>
);

const PageSkeleton = () => (
  <div className="space-y-6">
    <div>
      <Skeleton className="h-8 w-56 mb-1" />
      <Skeleton className="h-4 w-80" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}><CardContent className="p-5"><Skeleton className="h-7 w-10 mb-1" /><Skeleton className="h-3 w-20" /></CardContent></Card>
      ))}
    </div>
    <div className="flex flex-col sm:flex-row gap-3 justify-between">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-36" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => <CampaignRowSkeleton key={i} />)}
    </div>
  </div>
);

// ─── Status helpers ───────────────────────────────────────────────────────────

const statusBadge = (status: CampaignStatus) => {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Draft</Badge>;
    case 'SENDING':
      return <Badge className="gap-1 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"><Loader2 className="h-3 w-3 animate-spin" />Sending</Badge>;
    case 'SENT':
      return <Badge className="gap-1 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white"><CheckCircle2 className="h-3 w-3" />Sent</Badge>;
  }
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NewsletterCampaignsPage() {
  const [activeTab, setActiveTab] = useState<string>('campaigns');

  // ── Campaign state ──
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Subscriber state ──
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsPage, setSubsPage] = useState(1);
  const [subsSearch, setSubsSearch] = useState('');
  const [subsFilter, setSubsFilter] = useState<string>('all');

  // ── Sheet/Dialog state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<CampaignFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<CampaignFormData>>({});
  const [submitting, setSubmitting] = useState(false);

  // ── Banner image file state ──
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string>('');

  // Polling for SENDING campaigns
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Fetch campaigns ──────────────────────────────────────────────────────

  const fetchCampaigns = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await api.get(`/api/newsletter/campaigns?${params}`);
      if (res?.success) {
        setCampaigns(res.data ?? []);
        setTotal(res.pagination?.total ?? 0);
        setTotalPages(res.pagination?.totalPages ?? 1);
      }
    } catch (err: any) {
      if (!silent) toast.error(err?.message ?? 'Failed to load campaigns');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // ─── Fetch subscribers ────────────────────────────────────────────

  const fetchSubscribers = useCallback(async () => {
    setSubsLoading(true);
    try {
      const res = await api.get('/api/newsletter');
      const source: any[] = Array.isArray(res)
        ? res
        : res?.newsletters ?? res?.subscribers ?? res?.data ?? res?.results ?? [];

      const list: Subscriber[] = source
        .map((item: any, idx: number) => {
          if (typeof item === 'string') {
            return { id: `sub-${idx}`, email: item, isActive: true, subscribedAt: '' };
          }
          return {
            id: String(item?.id ?? item?._id ?? `sub-${idx}`),
            email: item?.email ?? item?.customerEmail ?? item?.user?.email ?? '',
            name: item?.name ?? item?.user?.name ?? null,
            isActive: item?.isActive ?? item?.active ?? item?.subscribed ?? true,
            subscribedAt: item?.subscribedAt ?? item?.createdAt ?? item?.updatedAt ?? '',
            unsubscribedAt: item?.unsubscribedAt ?? null,
          };
        })
        .filter((item) => Boolean(item.email));

      setSubscribers(list);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load subscribers');
    } finally {
      setSubsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'subscribers' || activeTab === 'emails') {
      fetchSubscribers();
    }
  }, [fetchSubscribers, activeTab]);

  useEffect(() => {
    const hasSending = campaigns.some((c) => c.status === 'SENDING');
    if (hasSending) {
      pollingRef.current = setInterval(() => fetchCampaigns(true), 5000);
    } else {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [campaigns, fetchCampaigns]);

  // Refresh viewCampaign while it's SENDING
  useEffect(() => {
    if (!viewCampaign || viewCampaign.status !== 'SENDING') return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/newsletter/campaigns/${viewCampaign.id}`);
        if (res?.success) {
          setViewCampaign(res.data);
          // Also update the list
          setCampaigns((prev) => prev.map((c) => c.id === res.data.id ? res.data : c));
          if (res.data.status === 'SENT') clearInterval(interval);
        }
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [viewCampaign?.id, viewCampaign?.status]);

  // ─── Form helpers ─────────────────────────────────────────────────────────

  const validateForm = (data: CampaignFormData) => {
    const errors: Partial<CampaignFormData> = {};
    if (!data.subject.trim()) errors.subject = 'Subject is required';
    if (!data.content.trim()) errors.content = 'Content is required';
    return errors;
  };

  const handleFormChange = (field: keyof CampaignFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleBannerChange = (file: File | null, preview: string) => {
    setBannerImageFile(file);
    setBannerImagePreview(preview);
  };

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setBannerImageFile(null);
    setBannerImagePreview('');
    setCreateOpen(true);
  };

  const openEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      subject: campaign.subject,
      content: campaign.content,
      bannerImage: campaign.bannerImage ?? '',
      buttonText: campaign.buttonText ?? '',
      buttonLink: campaign.buttonLink ?? '',
    });
    setFormErrors({});
    setBannerImageFile(null);
    setBannerImagePreview(campaign.bannerImage ?? '');
    setEditOpen(true);
  };

  const openView = (campaign: Campaign) => {
    setViewCampaign(campaign);
    setViewOpen(true);
  };

  const openDelete = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDeleteOpen(true);
  };

  const openSend = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSendOpen(true);
  };

  // ─── API actions ──────────────────────────────────────────────────────────

  const buildFormData = (saveDraft?: boolean) => {
    const fd = new FormData();
    fd.append('subject', formData.subject);
    fd.append('content', formData.content);
    if (bannerImageFile) {
      fd.append('bannerImage', bannerImageFile);
    } else if (formData.bannerImage) {
      fd.append('bannerImage', formData.bannerImage);
    }
    if (formData.buttonText) fd.append('buttonText', formData.buttonText);
    if (formData.buttonLink) fd.append('buttonLink', formData.buttonLink);
    if (saveDraft !== undefined) fd.append('saveDraft', String(saveDraft));
    return fd;
  };

  const handleCreate = async (saveDraft: boolean) => {
    const errors = validateForm(formData);
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/api/newsletter/campaigns', buildFormData(saveDraft));
      if (res?.success) {
        toast.success(saveDraft ? 'Campaign saved as draft.' : 'Campaign created.');
        setCreateOpen(false);
        fetchCampaigns();
        // If Send Now: immediately trigger send
        if (!saveDraft) {
          try {
            const sendRes = await api.post(`/api/newsletter/campaigns/${res.data.id}/send`);
            if (sendRes?.success) {
              toast.success(`Campaign sending started. Sending to ${sendRes.data?.totalRecipients ?? 0} subscribers.`);
              fetchCampaigns();
            }
          } catch (err: any) {
            toast.error(err?.message ?? 'Failed to start sending');
          }
        }
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCampaign) return;
    const errors = validateForm(formData);
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    setSubmitting(true);
    try {
      const res = await api.put(`/api/newsletter/campaigns/${selectedCampaign.id}`, buildFormData());
      if (res?.success) {
        toast.success('Campaign updated.');
        setEditOpen(false);
        fetchCampaigns();
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCampaign) return;
    setSubmitting(true);
    try {
      const res = await api.delete(`/api/newsletter/campaigns/${selectedCampaign.id}`);
      if (res?.success) {
        toast.success('Campaign deleted.');
        setDeleteOpen(false);
        fetchCampaigns();
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async () => {
    if (!selectedCampaign) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/api/newsletter/campaigns/${selectedCampaign.id}/send`);
      if (res?.success) {
        toast.success(`Campaign sending started. Sending to ${res.data?.totalRecipients ?? 0} subscribers.`);
        setSendOpen(false);
        fetchCampaigns();
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send campaign');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Derived counts ───────────────────────────────────────────────────────

  const draftCount = campaigns.filter((c) => c.status === 'DRAFT').length;
  const sendingCount = campaigns.filter((c) => c.status === 'SENDING').length;
  const sentCount = campaigns.filter((c) => c.status === 'SENT').length;
  const activeSubsCount = subscribers.filter((s) => s.isActive).length;

  const allEmails = subscribers.map((s) => s.email);
  const activeEmails = subscribers.filter((s) => s.isActive).map((s) => s.email);

  // Client-side subscriber filter + pagination
  const filteredSubscribers = subscribers.filter((s) => {
    if (subsFilter === 'active' && !s.isActive) return false;
    if (subsFilter === 'inactive' && s.isActive) return false;
    if (subsSearch.trim()) {
      const q = subsSearch.toLowerCase();
      return s.email.toLowerCase().includes(q) || (s.name ?? '').toLowerCase().includes(q);
    }
    return true;
  });
  const SUBS_PER_PAGE = 20;
  const subsTotalDerived = filteredSubscribers.length;
  const subsTotalPagesDerived = Math.max(1, Math.ceil(subsTotalDerived / SUBS_PER_PAGE));
  const pagedSubscribers = filteredSubscribers.slice((subsPage - 1) * SUBS_PER_PAGE, subsPage * SUBS_PER_PAGE);

  const copyEmails = (emails: string[]) => {
    navigator.clipboard.writeText(emails.join('\n'));
    toast.success(`${emails.length} email${emails.length !== 1 ? 's' : ''} copied to clipboard.`);
  };

  const downloadEmails = (emails: string[], filename: string) => {
    const blob = new Blob([emails.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Client-side subject search ───────────────────────────────────────────

  const filteredCampaigns = searchQuery.trim()
    ? campaigns.filter((c) => c.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    : campaigns;

  // ─── Pagination helpers ───────────────────────────────────────────────────

  const getPaginationPages = (currentPage: number, total: number) => {
    const pages: (number | '...')[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(total - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading && campaigns.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Newsletter
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage email campaigns and subscribers.
          </p>
        </div>
        {activeTab === 'campaigns' && (
          <Button onClick={openCreate} className="flex items-center gap-2 shrink-0">
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex">
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> All Campaigns
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Subscribers
          </TabsTrigger>
          <TabsTrigger value="emails" className="gap-1.5">
            <MailOpen className="h-3.5 w-3.5" /> Email List
          </TabsTrigger>
        </TabsList>

        {/* ── Campaigns Tab ──────────────────────────────────────────────── */}
        <TabsContent value="campaigns" className="space-y-6 mt-0">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Mail className="h-3 w-3" />Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold text-muted-foreground">{draftCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="h-3 w-3" />Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">{sendingCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Loader2 className="h-3 w-3" />Sending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold text-green-500 dark:text-green-400">{sentCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by subject…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
          >
            <SelectTrigger className="h-9 w-[130px] text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENDING">Sending</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => fetchCampaigns()} disabled={loading} title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Campaign list */}
      <div className="grid gap-3">
        {loading ? (
          <>
            <div className="hidden md:flex items-center justify-between px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 border rounded-lg">
              <span className="flex-1">Subject</span>
              <div className="flex items-center gap-10 mr-2">
                <span>Status</span>
                <span>Recipients</span>
                <span>Created</span>
              </div>
              <span>Actions</span>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-72" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <div className="space-y-1"><Skeleton className="h-3 w-10" /><Skeleton className="h-4 w-14" /></div>
                    <div className="space-y-1"><Skeleton className="h-3 w-10" /><Skeleton className="h-4 w-20" /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-16 rounded-md" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </div>
                </div>
              </Card>
            ))}
          </>
        ) : filteredCampaigns.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            {searchQuery
              ? `No campaigns match "${searchQuery}".`
              : statusFilter !== 'all'
              ? `No ${statusFilter.toLowerCase()} campaigns.`
              : 'No campaigns yet. Create your first one!'}
          </Card>
        ) : (
          <>
            {/* Column header */}
            <div className="hidden md:flex items-center justify-between px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 border rounded-lg">
              <span className="flex-1">Subject</span>
              <div className="flex items-center gap-10 mr-2">
                <span>Status</span>
                <span>Recipients</span>
                <span>Created</span>
              </div>
              <span>Actions</span>
            </div>

            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.id} className="overflow-hidden hover:shadow-sm transition-shadow">
                <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                  {/* Subject + snippet */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {campaign.status === 'SENT' ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{campaign.subject}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {campaign.content.replace(/<[^>]*>/g, '').slice(0, 80)}
                        {campaign.content.replace(/<[^>]*>/g, '').length > 80 && '…'}
                      </p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    {statusBadge(campaign.status)}

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Recipients</p>
                      {campaign.status === 'DRAFT' ? (
                        <p className="text-sm font-medium text-muted-foreground">—</p>
                      ) : (
                        <p className="text-sm font-medium">
                          <span className="text-green-600 dark:text-green-400">{campaign.sentCount}</span>
                          <span className="text-muted-foreground">/{campaign.totalRecipients}</span>
                          {campaign.failedCount > 0 && (
                            <span className="text-red-500 ml-1 text-xs">({campaign.failedCount} failed)</span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm">{fmtDate(campaign.createdAt)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={() => openView(campaign)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    {campaign.status === 'DRAFT' && (
                      <>
                        <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={() => openEdit(campaign)}>
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" className="gap-1 h-8 text-xs" onClick={() => openSend(campaign)}>
                          <Send className="h-3.5 w-3.5" /> Send
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => openDelete(campaign)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {campaign.status === 'SENT' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => openDelete(campaign)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && total > limit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              Showing{' '}
              <span className="font-medium text-foreground">
                {Math.min((page - 1) * limit + 1, total)}
              </span>
              {'–'}
              <span className="font-medium text-foreground">
                {Math.min(page * limit, total)}
              </span>
              {' of '}
              <span className="font-medium text-foreground">{total}</span>
              {' campaigns'}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline">Per page:</span>
              <Select
                value={String(limit)}
                onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPaginationPages(page, totalPages).map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm">…</span>
              ) : (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p as number)}>
                  {p}
                </Button>
              )
            )}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

        </TabsContent>

        {/* ── Subscribers Tab ────────────────────────────────────────────── */}
        <TabsContent value="subscribers" className="space-y-5 mt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-5">
              <p className="text-2xl font-bold">{subscribers.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Users className="h-3 w-3" />Total</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-2xl font-bold text-green-500 dark:text-green-400">{activeSubsCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><UserCheck className="h-3 w-3" />Active</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-2xl font-bold text-muted-foreground">{subscribers.length - activeSubsCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><UserX className="h-3 w-3" />Unsubscribed</p>
            </CardContent></Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search email or name…" value={subsSearch}
                onChange={(e) => { setSubsSearch(e.target.value); setSubsPage(1); }}
                className="pl-8 h-9 text-sm" />
              {subsSearch && (
                <button onClick={() => setSubsSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={subsFilter} onValueChange={(v) => { setSubsFilter(v); setSubsPage(1); }}>
                <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Unsubscribed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchSubscribers} title="Refresh">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {subsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><div className="p-4 flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
                  <Skeleton className="h-6 w-16" />
                </div></Card>
              ))}
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              {subsSearch || subsFilter !== 'all' ? 'No subscribers match the current filter.' : 'No subscribers found.'}
            </Card>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_1.5fr_auto_auto] items-center px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 border-b gap-4">
                <span>Name</span><span>Email</span><span>Status</span><span>Subscribed</span>
              </div>
              <div className="divide-y">
                {pagedSubscribers.map((sub) => (
                  <div key={sub.id} className="grid md:grid-cols-[1fr_1.5fr_auto_auto] items-center px-4 py-3 gap-3 md:gap-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                        {(sub.name ?? sub.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium truncate">{sub.name ?? '—'}</span>
                    </div>
                    <span className="text-sm text-muted-foreground truncate">{sub.email}</span>
                    <div>
                      {sub.isActive
                        ? <Badge className="gap-1 bg-green-500 dark:bg-green-600 text-white text-xs"><UserCheck className="h-3 w-3" />Active</Badge>
                        : <Badge variant="secondary" className="gap-1 text-xs"><UserX className="h-3 w-3" />Unsubscribed</Badge>
                      }
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(sub.subscribedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!subsLoading && subsTotalDerived > SUBS_PER_PAGE && (
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">{subsTotalDerived} subscriber{subsTotalDerived !== 1 ? 's' : ''} total</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={subsPage === 1} onClick={() => setSubsPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPaginationPages(subsPage, subsTotalPagesDerived).map((p, idx) =>
                  p === '...' ? <span key={`se-${idx}`} className="px-1 text-muted-foreground text-sm">…</span>
                  : <Button key={p} variant={p === subsPage ? 'default' : 'outline'} size="icon" className="h-8 w-8 text-xs" onClick={() => setSubsPage(p as number)}>{p}</Button>
                )}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={subsPage === subsTotalPagesDerived} onClick={() => setSubsPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Email List Tab ─────────────────────────────────────────────── */}
        <TabsContent value="emails" className="space-y-5 mt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Email Address List</h2>
              <p className="text-sm text-muted-foreground">{allEmails.length} total · {activeEmails.length} active</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => copyEmails(activeEmails)}>
                <Copy className="h-3.5 w-3.5" /> Copy Active
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => copyEmails(allEmails)}>
                <Copy className="h-3.5 w-3.5" /> Copy All
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => downloadEmails(activeEmails, 'active-subscribers.txt')}>
                <Download className="h-3.5 w-3.5" /> Export Active
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => downloadEmails(allEmails, 'all-subscribers.txt')}>
                <Download className="h-3.5 w-3.5" /> Export All
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchSubscribers} title="Refresh">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {subsLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}</div>
          ) : allEmails.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">No subscriber emails found.</Card>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto] items-center px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 border-b gap-4">
                <span>#</span><span>Email Address</span><span>Status</span>
              </div>
              <div className="divide-y max-h-[60vh] overflow-y-auto">
                {subscribers.map((sub, idx) => (
                  <div key={sub.id} className="grid grid-cols-[auto_1fr_auto] items-center px-4 py-2.5 gap-4 hover:bg-muted/20 transition-colors">
                    <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}</span>
                    <span className="text-sm font-mono truncate">{sub.email}</span>
                    <div>
                      {sub.isActive
                        ? <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3" />Active</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3 w-3" />Off</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/20 border-t flex items-center justify-between">
                <span>Page {subsPage} of {subsTotalPagesDerived}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={subsPage === 1} onClick={() => setSubsPage((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={subsPage === subsTotalPagesDerived} onClick={() => setSubsPage((p) => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

      </Tabs>

      {/* ── Create Campaign Sheet ──────────────────────────────────────────── */}
      <Sheet open={createOpen} onOpenChange={(o) => { if (!submitting) setCreateOpen(o); }}>
        <SheetContent side="right" className="sm:max-w-xl flex flex-col gap-0 p-0">
          <SheetHeader className="border-b px-6 py-4 shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> New Campaign
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <CampaignForm
              data={formData}
              errors={formErrors}
              onChange={handleFormChange}
              bannerPreview={bannerImagePreview}
              onBannerChange={handleBannerChange}
            />
          </div>
          <SheetFooter className="border-t px-6 py-4 shrink-0 flex-row justify-end gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleCreate(true)} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Draft
            </Button>
            <Button onClick={() => handleCreate(false)} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send Now
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Edit Campaign Sheet ────────────────────────────────────────────── */}
      <Sheet open={editOpen} onOpenChange={(o) => { if (!submitting) setEditOpen(o); }}>
        <SheetContent side="right" className="sm:max-w-xl flex flex-col gap-0 p-0">
          <SheetHeader className="border-b px-6 py-4 shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" /> Edit Campaign
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <CampaignForm
              data={formData}
              errors={formErrors}
              onChange={handleFormChange}
              bannerPreview={bannerImagePreview}
              onBannerChange={handleBannerChange}
            />
          </div>
          <SheetFooter className="border-t px-6 py-4 shrink-0 flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── View Campaign Sheet ────────────────────────────────────────────── */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent side="right" className="sm:max-w-xl flex flex-col gap-0 p-0">
          <SheetHeader className="border-b px-6 py-4 shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Campaign Details
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {viewCampaign && <CampaignView campaign={viewCampaign} />}
          </div>
          <SheetFooter className="border-t px-6 py-4 shrink-0 flex-row justify-end">
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Send Confirmation ──────────────────────────────────────────────── */}
      <Dialog open={sendOpen} onOpenChange={(o) => { if (!submitting) setSendOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-500" /> Send Campaign
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to send{' '}
            <span className="font-semibold text-foreground">
              &quot;{selectedCampaign?.subject}&quot;
            </span>?
            {' '}This will send the email to all active subscribers and cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!submitting) setDeleteOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Delete Campaign
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">
              &quot;{selectedCampaign?.subject}&quot;
            </span>?
            {' '}This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Campaign Form Component ──────────────────────────────────────────────────

function CampaignForm({
  data,
  errors,
  onChange,
  bannerPreview,
  onBannerChange,
}: {
  data: CampaignFormData;
  errors: Partial<CampaignFormData>;
  onChange: (field: keyof CampaignFormData, value: string) => void;
  bannerPreview: string;
  onBannerChange: (file: File | null, preview: string) => void;
}) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onBannerChange(file, reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 py-1">
      <div className="space-y-1.5">
        <Label htmlFor="subject">
          Subject <span className="text-destructive">*</span>
        </Label>
        <Input
          id="subject"
          placeholder="e.g. Our Summer Sale is Here!"
          value={data.subject}
          onChange={(e) => onChange('subject', e.target.value)}
          className={errors.subject ? 'border-destructive' : ''}
        />
        {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="content">
          Content <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="content"
          placeholder="Enter HTML or plain text content…"
          value={data.content}
          onChange={(e) => onChange('content', e.target.value)}
          className={`font-mono text-sm resize-none overflow-y-auto min-h-[260px] h-[260px] ${errors.content ? 'border-destructive' : ''}`}
        />
        {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
        <p className="text-xs text-muted-foreground">HTML is supported. Use tags like &lt;p&gt;, &lt;b&gt;, &lt;a href="..."&gt;, etc.</p>
      </div>

      <Separator />

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Optional Fields</p>

      <div className="space-y-1.5">
        <Label>Banner Image</Label>
        {bannerPreview ? (
          <div className="relative rounded-lg overflow-hidden border bg-muted/30">
            <img src={bannerPreview} alt="Banner preview" className="w-full object-cover max-h-40" />
            <button
              type="button"
              onClick={() => onBannerChange(null, '')}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="banner-upload"
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-6 text-sm cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <span className="text-muted-foreground">Upload banner image</span>
            <span className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</span>
            <input
              id="banner-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileSelect}
            />
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="buttonText">Button Text</Label>
          <Input
            id="buttonText"
            placeholder="e.g. Shop Now"
            value={data.buttonText}
            onChange={(e) => onChange('buttonText', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="buttonLink">Button Link</Label>
          <Input
            id="buttonLink"
            type="url"
            placeholder="https://yoursite.com/sale"
            value={data.buttonLink}
            onChange={(e) => onChange('buttonLink', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Campaign View Component ──────────────────────────────────────────────────

function CampaignView({ campaign }: { campaign: Campaign }) {
  const isSending = campaign.status === 'SENDING';
  const deliveryRate =
    campaign.totalRecipients > 0
      ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
      : 0;

  return (
    <div className="space-y-5 py-1">
      {/* Status + subject */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-lg leading-tight">{campaign.subject}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Created {fmtDateTime(campaign.createdAt)}
          </p>
        </div>
        {statusBadge(campaign.status)}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatItem
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          label="Total Recipients"
          value={campaign.totalRecipients === 0 && campaign.status === 'DRAFT' ? '—' : String(campaign.totalRecipients)}
        />
        <StatItem
          icon={<CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />}
          label="Successfully Sent"
          value={campaign.status === 'DRAFT' ? '—' : String(campaign.sentCount)}
          valueClass="text-green-600 dark:text-green-400"
        />
        <StatItem
          icon={<XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />}
          label="Failed"
          value={campaign.status === 'DRAFT' ? '—' : String(campaign.failedCount)}
          valueClass={campaign.failedCount > 0 ? 'text-red-500 dark:text-red-400' : undefined}
        />
        <StatItem
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          label="Sent At"
          value={campaign.sentAt ? fmtDateTime(campaign.sentAt) : '—'}
        />
      </div>

      {/* Delivery progress */}
      {campaign.status !== 'DRAFT' && campaign.totalRecipients > 0 && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              {isSending && <Loader2 className="h-3 w-3 animate-spin" />}
              Delivery Progress
            </span>
            <span>{deliveryRate}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${isSending ? 'bg-blue-500 dark:bg-blue-400' : 'bg-green-500 dark:bg-green-400'}`}
              style={{ width: `${deliveryRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {campaign.sentCount} of {campaign.totalRecipients} sent
            {campaign.failedCount > 0 && ` · ${campaign.failedCount} failed`}
          </p>
        </div>
      )}

      {isSending && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-sm text-blue-700 dark:text-blue-400">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          Campaign is currently sending. Stats update every 5 seconds.
        </div>
      )}

      <Separator />

      {/* Optional fields */}
      {campaign.bannerImage && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Banner Image</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={campaign.bannerImage} alt="Banner" className="rounded-lg border max-h-40 object-cover w-full" />
        </div>
      )}

      {(campaign.buttonText || campaign.buttonLink) && (
        <div className="grid grid-cols-2 gap-4">
          {campaign.buttonText && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Button Text</p>
              <p className="text-sm">{campaign.buttonText}</p>
            </div>
          )}
          {campaign.buttonLink && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Button Link</p>
              <a href={campaign.buttonLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
                {campaign.buttonLink}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Content preview */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Content Preview</p>
        <div
          className="text-sm border rounded-lg p-4 bg-muted/30 max-h-96 overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: campaign.content }}
        />
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p className={`text-base font-semibold ${valueClass ?? ''}`}>{value}</p>
    </div>
  );
}
