"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ServiceModuleService, PaginatedServices } from "@/lib/api/service";
import { ProductService } from "@/lib/api/product";
import { IService, ICategory } from "@nexora/shared-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Image as ImageIcon, 
  Box, 
  Package, 
  Edit2, 
  Trash2, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  FolderPlus,
  Star,
  Briefcase,
  DollarSign,
  Tag
} from "lucide-react";

export default function ServicesPage() {
  const { user } = useAuth();
  const businessId = user?.businesses?.[0]?.id;

  // Services States
  const [servicesData, setServicesData] = useState<PaginatedServices | null>(null);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog & Form States
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingService, setEditingService] = useState<IService | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Service Form Fields
  const [srvName, setSrvName] = useState("");
  const [srvDescription, setSrvDescription] = useState("");
  const [srvPrice, setSrvPrice] = useState("");
  const [srvPriceLabel, setSrvPriceLabel] = useState("");
  const [srvCategoryId, setSrvCategoryId] = useState("");
  const [srvIsFeatured, setSrvIsFeatured] = useState(false);
  const [srvImages, setSrvImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  // Category Form Fields
  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");

  // Load services and categories
  useEffect(() => {
    async function loadCatalog() {
      if (!businessId) return;
      try {
        setIsLoading(true);
        const [servData, catData] = await Promise.all([
          ServiceModuleService.getServices(businessId, currentPage, 10),
          ProductService.getCategories(businessId)
        ]);
        setServicesData(servData);
        setCategories(catData);
      } catch (error) {
        console.error("Failed to fetch service catalog", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCatalog();
  }, [businessId, currentPage]);

  const reloadServices = async () => {
    if (!businessId) return;
    try {
      const servData = await ServiceModuleService.getServices(businessId, currentPage, 10);
      setServicesData(servData);
    } catch (e) {
      console.error(e);
    }
  };

  // Open Dialogs
  const openCreateServiceDialog = () => {
    setEditingService(null);
    setSrvName("");
    setSrvDescription("");
    setSrvPrice("");
    setSrvPriceLabel("");
    setSrvCategoryId(categories[0]?.id || "");
    setSrvIsFeatured(false);
    setSrvImages([]);
    setActionError(null);
    setShowServiceDialog(true);
  };

  const openEditServiceDialog = (service: IService) => {
    setEditingService(service);
    setSrvName(service.name);
    setSrvDescription(service.description || "");
    setSrvPrice(service.price ? service.price.toString() : "");
    setSrvPriceLabel(service.priceLabel || "");
    setSrvCategoryId(service.categoryId || "");
    setSrvIsFeatured((service as any).isFeatured || false);
    setSrvImages(service.images || []);
    setActionError(null);
    setShowServiceDialog(true);
  };

  // Image helpers
  const addImage = () => {
    if (!newImageUrl.trim()) return;
    setSrvImages([...srvImages, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const removeImage = (idx: number) => {
    setSrvImages(srvImages.filter((_, i) => i !== idx));
  };

  // Form submits
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    if (!srvName.trim()) {
      setActionError("Service Name is required");
      return;
    }
    const priceNum = srvPrice ? parseFloat(srvPrice) : undefined;
    if (priceNum !== undefined && (isNaN(priceNum) || priceNum < 0)) {
      setActionError("Please enter a valid Price");
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      if (editingService) {
        // Update service
        await ServiceModuleService.updateService(businessId, editingService.id, {
          name: srvName,
          description: srvDescription,
          price: priceNum,
          priceLabel: srvPriceLabel || undefined,
          categoryId: srvCategoryId || undefined,
          isFeatured: srvIsFeatured
        });
      } else {
        // Create service
        await ServiceModuleService.createService(businessId, {
          name: srvName,
          description: srvDescription,
          price: priceNum,
          priceLabel: srvPriceLabel || undefined,
          categoryId: srvCategoryId || undefined,
          images: srvImages,
          isFeatured: srvIsFeatured
        });
      }

      await reloadServices();
      setShowServiceDialog(false);
    } catch (error: any) {
      console.error(error);
      setActionError(error.message || "Failed to save service.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    if (!catName.trim()) {
      setActionError("Category Name is required");
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const newCat = await ProductService.createCategory(businessId, {
        name: catName,
        description: catDescription
      });
      setCategories([...categories, newCat]);
      setSrvCategoryId(newCat.id);
      setShowCategoryDialog(false);
      setCatName("");
      setCatDescription("");
    } catch (error: any) {
      console.error(error);
      setActionError(error.message || "Failed to save category.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteService = async () => {
    if (!businessId || !deletingServiceId) return;
    setActionLoading(true);
    try {
      await ServiceModuleService.deleteService(businessId, deletingServiceId);
      await reloadServices();
      setDeletingServiceId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter local items
  const filteredServices = servicesData?.data.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "ALL" || service.categoryId === categoryFilter;

    return matchesSearch && matchesCategory;
  }) || [];

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full flex flex-col relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground mt-1">Showcase services, add pricing labels, and highlight featured offerings.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" className="w-1/2 md:w-auto" onClick={() => setShowCategoryDialog(true)}>
            <FolderPlus className="w-4 h-4 mr-2" /> Categories
          </Button>
          <Button variant="gradient" className="w-1/2 md:w-auto" onClick={openCreateServiceDialog}>
            <Plus className="w-4 h-4 mr-2" /> Add Service
          </Button>
        </div>
      </div>

      {/* Main Grid List */}
      <Card className="glass flex-1 min-h-0 flex flex-col">
        {/* Search Bar */}
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-border gap-4 flex-shrink-0">
          <div className="flex gap-3 flex-1 flex-wrap items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search services..." 
                className="pl-9 bg-background/50" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Category selection filter */}
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <select
                className="h-9 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs focus-visible:outline-none"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground sm:block hidden">
            Showing {filteredServices.length} of {servicesData?.total || 0} services
          </p>
        </CardHeader>

        {/* Content Table */}
        <CardContent className="p-0 flex-1 overflow-auto min-h-0">
          <div className="w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 sticky top-0 backdrop-blur-md border-b">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">Service</th>
                  <th scope="col" className="px-6 py-4 font-bold">Category</th>
                  <th scope="col" className="px-6 py-4 font-bold">Price Details</th>
                  <th scope="col" className="px-6 py-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => {
                  const displayImg = service.images?.[0];
                  return (
                    <tr key={service.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg border border-border/50 overflow-hidden bg-secondary flex items-center justify-center flex-shrink-0 relative">
                            {displayImg ? (
                              <img src={displayImg} alt={service.name} className="w-full h-full object-cover" />
                            ) : (
                              <Briefcase className="w-5 h-5 text-muted-foreground" />
                            )}
                            {(service as any).isFeatured && (
                              <div className="absolute top-0 right-0 bg-amber-500 text-white p-0.5 rounded-bl">
                                <Star className="w-2.5 h-2.5 fill-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{service.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{service.description || "No description provided."}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        <div className="flex items-center gap-2">
                          <Box className="w-3.5 h-3.5" />
                          {(service as any).category?.name || "Uncategorized"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-baseline gap-1 font-bold">
                          {service.price ? (
                            <>
                              {service.priceLabel && <span className="text-xs text-muted-foreground font-normal">{service.priceLabel}</span>}
                              <span>₦{parseFloat(service.price.toString()).toLocaleString()}</span>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground">Contact for Price</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEditServiceDialog(service)}>
                            <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeletingServiceId(service.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredServices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 border">
                  <Briefcase className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold mb-1">No services found</h3>
                <p className="text-muted-foreground max-w-xs text-xs mb-6">List the professional services you provide to showcase them on your website.</p>
                <Button variant="gradient" onClick={openCreateServiceDialog}>Add Service</Button>
              </div>
            )}
          </div>
        </CardContent>

        {/* Pagination */}
        {servicesData && servicesData.totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center bg-secondary/10 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              Page {servicesData.page} of {servicesData.totalPages}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="w-8 h-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="w-8 h-8"
                disabled={currentPage === servicesData.totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Modal */}
      {deletingServiceId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md glass animate-in zoom-in-95 duration-150">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Delete Service Offering?</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Are you sure you want to remove this service? It will no longer be visible on your website.
              </CardDescription>
            </CardHeader>
            <div className="p-6 pt-0 flex justify-end gap-3">
              <Button variant="outline" disabled={actionLoading} onClick={() => setDeletingServiceId(null)}>Cancel</Button>
              <Button variant="destructive" disabled={actionLoading} onClick={handleDeleteService}>
                {actionLoading ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md glass animate-in zoom-in-95 duration-150">
            <CardHeader className="flex flex-row justify-between items-start pb-4 border-b">
              <div>
                <CardTitle className="text-lg font-bold">Manage Categories</CardTitle>
                <CardDescription className="text-xs font-medium">Categories are shared between products and services.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowCategoryDialog(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSaveCategory}>
              <CardContent className="space-y-4 pt-4">
                {actionError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs p-2.5 rounded-lg">
                    {actionError}
                  </div>
                )}
                
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Active Categories</Label>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border bg-card max-h-[120px] overflow-y-auto custom-scrollbar">
                    {categories.map((c) => (
                      <Badge key={c.id} variant="secondary" className="px-2.5 py-1 text-xs">
                        {c.name}
                      </Badge>
                    ))}
                    {categories.length === 0 && (
                      <span className="text-[10px] text-muted-foreground">No categories defined yet.</span>
                    )}
                  </div>
                </div>

                <hr className="border-border/60" />

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">New Category Name</Label>
                  <Input 
                    placeholder="e.g. Consulting" 
                    value={catName} 
                    onChange={(e) => setCatName(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Description</Label>
                  <Input 
                    placeholder="Optional details" 
                    value={catDescription} 
                    onChange={(e) => setCatDescription(e.target.value)} 
                  />
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end gap-3 border-t mt-4 pt-4">
                <Button variant="outline" type="button" onClick={() => setShowCategoryDialog(false)}>Close</Button>
                <Button variant="gradient" type="submit" disabled={actionLoading}>
                  {actionLoading ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add / Edit Service Form Dialog */}
      {showServiceDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-xl glass animate-in zoom-in-95 duration-150 my-8">
            <CardHeader className="flex flex-row justify-between items-start pb-4 border-b">
              <div>
                <CardTitle className="text-lg font-bold">
                  {editingService ? "Edit Service" : "Add New Service"}
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  Provide pricing labels and description details for this service offering.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowServiceDialog(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSaveService}>
              <CardContent className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {actionError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs p-2.5 rounded-lg">
                    {actionError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs font-semibold">Service Name *</Label>
                    <Input 
                      placeholder="e.g. Hair Styling" 
                      value={srvName} 
                      onChange={(e) => setSrvName(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Price (₦) (Optional)</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 5000 (leave blank if contact for price)" 
                      value={srvPrice} 
                      onChange={(e) => setSrvPrice(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Price Label / Prefix</Label>
                    <Input 
                      placeholder="e.g. Starting from, per hour" 
                      value={srvPriceLabel} 
                      onChange={(e) => setSrvPriceLabel(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs font-semibold">Category</Label>
                    <select 
                      className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none"
                      value={srvCategoryId}
                      onChange={(e) => setSrvCategoryId(e.target.value)}
                    >
                      <option value="">No Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Description</Label>
                  <textarea 
                    className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none"
                    placeholder="Provide details about what is included, duration, etc."
                    value={srvDescription} 
                    onChange={(e) => setSrvDescription(e.target.value)} 
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={srvIsFeatured} 
                    onChange={(e) => setSrvIsFeatured(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                  />
                  Feature this service on homepage
                </label>

                <hr className="border-border/60" />

                {/* Gallery Images */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Service Gallery Images</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Paste image URL (e.g. https://unsplash.com/...)" 
                      value={newImageUrl} 
                      onChange={(e) => setNewImageUrl(e.target.value)} 
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addImage}>Add</Button>
                  </div>

                  {/* Previews */}
                  <div className="flex gap-2 flex-wrap mt-2 p-2 rounded-lg border bg-card/50 min-h-[60px] items-center">
                    {srvImages.map((url, idx) => (
                      <div key={idx} className="w-14 h-14 border rounded-md overflow-hidden relative group bg-secondary flex-shrink-0 font-bold">
                        <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] shadow"
                          onClick={() => removeImage(idx)}
                        >
                          x
                        </button>
                      </div>
                    ))}
                    {srvImages.length === 0 && (
                      <span className="text-[10px] text-muted-foreground pl-2">Add image links to showcase this service visually.</span>
                    )}
                  </div>
                  {/* Preset quick links */}
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span>Quick presets:</span>
                    <button 
                      type="button" 
                      className="underline hover:text-foreground"
                      onClick={() => setSrvImages([...srvImages, "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400"])}
                    >
                      Service 1
                    </button>
                    <button 
                      type="button" 
                      className="underline hover:text-foreground"
                      onClick={() => setSrvImages([...srvImages, "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400"])}
                    >
                      Service 2
                    </button>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end gap-3 border-t mt-4 pt-4">
                <Button variant="outline" type="button" onClick={() => setShowServiceDialog(false)}>Cancel</Button>
                <Button variant="gradient" type="submit" disabled={actionLoading}>
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Service"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
