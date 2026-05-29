'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Plus, Search, Edit, Trash2, Eye, Calendar, Tag, Upload, X, Image } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// Blog interface matching the API response
interface Blog {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  content: string;
  tags: string[];
  ctaText: string;
  coverImage?: string;
  status: 'PUBLISHED' | 'DRAFT';
  createdAt: string;
  updatedAt: string;
}

interface BlogsResponse {
  success: boolean;
  total: number;
  page: number;
  totalPages: number;
  blogs: Blog[];
}

// Skeleton components for loading states
const BlogCardSkeleton = () => (
  <Card className="overflow-hidden">
    <div className="border-b bg-muted/30 p-4 flex flex-wrap justify-between items-center gap-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
    <CardContent className="p-6">
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-2">
          <Skeleton className="h-7 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-2/3 mb-3" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-16 w-20 mt-2 rounded" />
        </div>
        <div>
          <Skeleton className="h-4 w-12 mb-2" />
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-8 mt-4 mb-1" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-8 mt-2 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const StatCardSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-12 mt-2" />
    </CardContent>
  </Card>
);

const BlogsLoadingSkeleton = () => (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <div>
      <Skeleton className="h-9 w-64 mb-2" />
      <Skeleton className="h-4 w-96" />
    </div>

    {/* Controls Skeleton */}
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-24" />
    </div>

    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>

    {/* Tabs Skeleton */}
    <div>
      <div className="flex space-x-1 mb-6">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-20" />
      </div>
      
      {/* Blog Cards Skeleton */}
      <div className="space-y-4">
        <BlogCardSkeleton />
        <BlogCardSkeleton />
        <BlogCardSkeleton />
        <BlogCardSkeleton />
      </div>
    </div>
  </div>
);

const BlogManagementPage = () => {
  // State management following existing patterns
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Form state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewBlog, setViewBlog] = useState<Blog | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    shortDescription: '',
    content: '',
    tags: '',
    ctaText: '',
    coverImage: '',
    status: 'DRAFT' as 'PUBLISHED' | 'DRAFT'
  });
  
  // Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);

  // Fetch blogs from API
  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response: BlogsResponse = await api.get('/api/blogs/admin/all');
      if (response.success) {
        setBlogs(response.blogs);
      }
    } catch (error) {
      console.error('Failed to fetch blogs:', error);
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  // Filter blogs based on search and tab
  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         blog.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (blog.tags && blog.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    
    if (activeTab === 'published') return matchesSearch && blog.status === 'PUBLISHED';
    if (activeTab === 'draft') return matchesSearch && blog.status === 'DRAFT';
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredBlogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBlogs = filteredBlogs.slice(startIndex, startIndex + itemsPerPage);

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear image selection
  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview('');
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Append text fields
      formDataToSend.append('title', formData.title);
      formDataToSend.append('slug', formData.slug || generateSlug(formData.title));
      formDataToSend.append('shortDescription', formData.shortDescription);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('ctaText', formData.ctaText);
      formDataToSend.append('status', formData.status);
      
      // Handle tags - send as JSON string (matching backend expectation)
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      // Convert to JSON string format like: ["javascript", "tutorial"]
      const tagsJsonString = JSON.stringify(tagsArray);
      formDataToSend.append('tags', tagsJsonString);
      
      // Debug log to match backend example
      console.log('Tags being sent:', formDataToSend.get('tags'));
      
      // Append image if selected
      if (selectedFile) {
        formDataToSend.append('coverImage', selectedFile);
      }

      let response;
      if (selectedBlog) {
        // Update existing blog
        response = await api.put(`/api/blogs/${selectedBlog.id}`, formDataToSend);
        toast.success('Blog updated successfully!');
        setIsEditDialogOpen(false);
      } else {
        // Create new blog
        response = await api.post('/api/blogs', formDataToSend);
        toast.success('Blog created successfully!');
        setIsCreateDialogOpen(false);
      }
      
      // Refresh the blogs list
      await fetchBlogs();
      resetForm();
    } catch (error: any) {
      console.error('Error submitting blog:', error);
      toast.error(error.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete - open confirmation dialog
  const handleDelete = (blog: Blog) => {
    setBlogToDelete(blog);
    setIsDeleteDialogOpen(true);
  };
  
  // Confirm and execute delete
  const confirmDelete = async () => {
    if (!blogToDelete) return;
    
    setLoading(true);
    try {
      await api.delete(`/api/blogs/${blogToDelete.id}`);
      await fetchBlogs(); // Refresh list
      toast.success('Blog deleted successfully!');
      setIsDeleteDialogOpen(false);
      setBlogToDelete(null);
    } catch (error: any) {
      console.error('Error deleting blog:', error);
      toast.error(error.response?.data?.message || 'Failed to delete blog.');
    } finally {
      setLoading(false);
    }
  };

  // Handle status toggle
  const toggleStatus = async (blogId: string) => {
    setLoading(true);
    try {
      // Try different possible endpoint variations
      let response;
      try {
        // Try POST method first (most common for toggle operations)
        response = await api.patch(`/api/blogs/${blogId}/toggle-publish`);
      } catch (postError: any) {
        if (postError.response?.status === 404) {
          try {
            // Try PATCH method
            response = await api.patch(`/api/blogs/${blogId}/toggle-publish`);
          } catch (patchError: any) {
            if (patchError.response?.status === 404) {
              try {
                // Try different endpoint pattern
                response = await api.post(`/api/blogs/${blogId}/publish-toggle`);
              } catch (altError: any) {
                if (altError.response?.status === 404) {
                  // Try simple status update
                  const currentBlog = blogs.find(b => b.id === blogId);
                  const newStatus = currentBlog?.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
                  response = await api.patch(`/api/blogs/${blogId}`, { status: newStatus });
                } else {
                  throw altError;
                }
              }
            } else {
              throw patchError;
            }
          }
        } else {
          throw postError;
        }
      }
      
      await fetchBlogs(); // Refresh list
      toast.success('Blog status updated successfully!');
    } catch (error: any) {
      console.error('Error toggling blog status:', error);
      toast.error(error.response?.data?.message || 'Failed to update blog status. Endpoint may not be available.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      shortDescription: '',
      content: '',
      tags: '',
      ctaText: '',
      coverImage: '',
      status: 'DRAFT'
    });
    setSelectedBlog(null);
    setSelectedFile(null);
    setImagePreview('');
    setUploadProgress(0);
  };

  // Open edit dialog
  const openEditDialog = (blog: Blog) => {
    setSelectedBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      shortDescription: blog.shortDescription,
      content: blog.content,
      tags: (blog.tags || []).join(', '),
      ctaText: blog.ctaText,
      coverImage: blog.coverImage || '',
      status: blog.status
    });
    // Set image preview if editing and has cover image
    if (blog.coverImage) {
      setImagePreview(blog.coverImage);
    }
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Show skeleton loading while fetching initial data */}
      {loading && blogs.length === 0 ? (
        <BlogsLoadingSkeleton />
      ) : (
        <>
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Blog Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage your blog content, create new posts, and control visibility
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search blogs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Blog
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded bg-blue-500" />
                  <span className="text-sm font-medium">Total Blogs</span>
                </div>
                <p className="text-2xl font-bold mt-2">{blogs.length}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded bg-green-500" />
                  <span className="text-sm font-medium">Published</span>
                </div>
                <p className="text-2xl font-bold mt-2">{blogs.filter(b => b.status === 'PUBLISHED').length}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded bg-orange-500" />
                  <span className="text-sm font-medium">Draft</span>
                </div>
                <p className="text-2xl font-bold mt-2">{blogs.filter(b => b.status === 'DRAFT').length}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded bg-purple-500" />
                  <span className="text-sm font-medium">Total Tags</span>
                </div>
                <p className="text-2xl font-bold mt-2">{blogs.reduce((acc, blog) => acc + (blog.tags?.length || 0), 0)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Blogs ({blogs.length})</TabsTrigger>
              <TabsTrigger value="published">Published ({blogs.filter(b => b.status === 'PUBLISHED').length})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({blogs.filter(b => b.status === 'DRAFT').length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <div className="space-y-4">
                {paginatedBlogs.length === 0 ? (
                  <Card>
                    <CardContent className="p-12">
                      <div className="text-center">
                        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No blogs found</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchQuery ? 'Try adjusting your search terms.' : 'Get started by creating your first blog post.'}
                        </p>
                        {!searchQuery && (
                          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                              <Button onClick={resetForm}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Your First Blog
                              </Button>
                        </DialogTrigger>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              paginatedBlogs.map((blog) => (
                <Card key={blog.id} className="overflow-hidden">
                  {/* Card Header */}
                  <div className="border-b bg-muted/30 p-4 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center space-x-4">
                      <Badge variant={blog.status === 'PUBLISHED' ? "default" : "secondary"}>
                        {blog.status === 'PUBLISHED' ? "Published" : "Draft"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                          ID: {blog.id}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={blog.status === 'PUBLISHED'}
                        onCheckedChange={() => toggleStatus(blog.id)}
                        disabled={loading}
                      />
                      <span className="text-sm text-muted-foreground">
                        {blog.status === 'PUBLISHED' ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-4 gap-6">
                      {/* Column 1: Content */}
                      <div className="md:col-span-2">
                        <h3 className="font-semibold text-lg mb-2">{blog.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {blog.shortDescription}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(blog.createdAt).toLocaleDateString('en-GB')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Tag className="h-4 w-4" />
                            <span>{blog.tags?.length || 0} tags</span>
                          </div>
                        </div>
                        
                        {/* Cover Image Preview */}
                        {blog.coverImage && (
                          <div className="mt-2">
                            <img 
                              src={blog.coverImage} 
                              alt="Cover" 
                              className="w-20 h-16 object-cover rounded border"
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Column 2: Tags & Details */}
                      <div>
                        <Label className="text-sm font-medium">Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {blog.tags && blog.tags.length > 0 ? blog.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          )) : (
                            <span className="text-xs text-muted-foreground">No tags</span>
                          )}
                        </div>
                        <div className="mt-4">
                          <Label className="text-sm font-medium">Slug</Label>
                          <p className="text-sm text-muted-foreground font-mono">
                            /{blog.slug}
                          </p>
                        </div>
                        <div className="mt-2">
                          <Label className="text-sm font-medium">CTA</Label>
                          <p className="text-sm text-muted-foreground">
                            {blog.ctaText || '-'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Column 3: Actions */}
                      <div className="flex flex-col space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(blog)}
                          disabled={loading}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewBlog(blog);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        {blog.status === 'PUBLISHED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://apla-fe.vercel.app/blog/${blog.slug}`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(blog)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center space-x-2">
                <Label className="text-sm">Items per page:</Label>
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewBlog?.title}</DialogTitle>
          </DialogHeader>
          {viewBlog && (
            <div className="space-y-4">
              {viewBlog.coverImage && (
                <img src={viewBlog.coverImage} alt="Cover" className="w-full max-h-64 object-cover rounded-md" />
              )}
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant={viewBlog.status === 'PUBLISHED' ? "default" : "secondary"}>
                  {viewBlog.status === 'PUBLISHED' ? "Published" : "Draft"}
                </Badge>
                <span>{new Date(viewBlog.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-2">Short Description</h3>
                <p className="text-muted-foreground">{viewBlog.shortDescription}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-2">Content</h3>
                <div className="whitespace-pre-wrap">{viewBlog.content}</div>
              </div>
              {viewBlog.tags && viewBlog.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {viewBlog.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {viewBlog.ctaText && (
                <div>
                  <h3 className="font-semibold text-lg border-b pb-2 mb-2">CTA Text</h3>
                  <p className="text-muted-foreground">{viewBlog.ctaText}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBlog ? 'Edit Blog' : 'Create New Blog'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      title: e.target.value,
                      slug: generateSlug(e.target.value)
                    });
                  }}
                  placeholder="Enter blog title..."
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated-from-title"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="shortDescription">Short Description <span className="text-destructive">*</span></Label>
              <Textarea
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="Brief description for previews and SEO..."
                rows={3}
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="content">Content <span className="text-destructive">*</span></Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your blog content here..."
                rows={12}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate tags with commas
                </p>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="ctaText">Call to Action Text</Label>
                <Input
                  id="ctaText"
                  value={formData.ctaText}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                  placeholder="e.g., Learn More, Contact Us..."
                />
              </div>
            </div>
            
            {/* Cover Image Upload */}
            <div className="space-y-1.5">
              <Label>Cover Image</Label>
              <div className="mt-2">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-32 h-24 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                      onClick={clearImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Upload cover image</p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                      <Label htmlFor="image-upload" className="cursor-pointer flex justify-center">
                      <Button type="button" variant="outline" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Choose Image
                        </span>
                      </Button>
                    </Label>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  Max size: 5MB. Supported: JPG, PNG, GIF, WebP
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !formData.title || !formData.shortDescription || !formData.content}
            >
              {loading ? 'Saving...' : (selectedBlog ? 'Update Blog' : 'Create Blog')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Blog Post
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this blog post? This action cannot be undone.
            </p>
            
            {blogToDelete && (
              <div className="bg-muted/30 p-3 rounded-lg border border-destructive/20">
                <h4 className="font-medium text-sm">{blogToDelete.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  ID: {blogToDelete.id.slice(0, 8)}... � Status: {blogToDelete.status}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setBlogToDelete(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Blog
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
};

export default BlogManagementPage;

