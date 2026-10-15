"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ProductService, PaginatedProducts } from "@/lib/api/product";
import { IProduct, ICategory, ProductAvailability } from "@nexora/shared-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  Filter, 
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
  Check, 
  FolderPlus,
  Star
} from "lucide-react";

export default function ProductsPage() {
  const { user } = useAuth();
  const businessId = user?.businesses?.[0]?.id;

  // Catalog States
  const [productsData, setProductsData] = useState<PaginatedProducts | null>(null);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog & Form States
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IProduct | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Product Form Fields
  const [prodName, setProdName] = useState("");
  const [prodDescription, setProdDescription] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCompareAtPrice, setProdCompareAtPrice] = useState("");
  const [prodCategoryId, setProdCategoryId] = useState("");
  const [prodAvailability, setProdAvailability] = useState<string>("IN_STOCK");
  const [prodIsFeatured, setProdIsFeatured] = useState(false);
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  // Category Form Fields
  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");

  // Load products and categories on mount or state changes
  useEffect(() => {
    async function loadCatalog() {
      if (!businessId) return;
      try {
        setIsLoading(true);
        const [prodData, catData] = await Promise.all([
          ProductService.getProducts(businessId, currentPage, 10),
          ProductService.getCategories(businessId)
        ]);
        setProductsData(prodData);
        setCategories(catData);
      } catch (error) {
        console.error("Failed to fetch product catalog", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCatalog();
  }, [businessId, currentPage]);

  // Handle reload helper
  const reloadProducts = async () => {
    if (!businessId) return;
    try {
      const prodData = await ProductService.getProducts(businessId, currentPage, 10);
      setProductsData(prodData);
    } catch (e) {
      console.error(e);
    }
  };

  // Open Dialogs
  const openCreateProductDialog = () => {
    setEditingProduct(null);
    setProdName("");
    setProdDescription("");
    setProdPrice("");
    setProdCompareAtPrice("");
    setProdCategoryId(categories[0]?.id || "");
    setProdAvailability("IN_STOCK");
    setProdIsFeatured(false);
    setProdImages([]);
    setActionError(null);
    setShowProductDialog(true);
  };

  const openEditProductDialog = (product: IProduct) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdDescription(product.description || "");
    setProdPrice(product.price.toString());
    setProdCompareAtPrice(product.compareAtPrice?.toString() || "");
    setProdCategoryId(product.categoryId || "");
    setProdAvailability(product.availability);
    setProdIsFeatured(product.isFeatured);
    setProdImages(product.images?.map(img => img.url) || []);
    setActionError(null);
    setShowProductDialog(true);
  };

  // Image helpers
  const addImage = () => {
    if (!newImageUrl.trim()) return;
    setProdImages([...prodImages, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const removeImage = (idx: number) => {
    setProdImages(prodImages.filter((_, i) => i !== idx));
  };

  // Form submit handlers
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    if (!prodName.trim()) {
      setActionError("Product Name is required");
      return;
    }
    const priceNum = parseFloat(prodPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setActionError("Please enter a valid Price");
      return;
    }

    setActionLoading(true);
    setActionError(null);

    const imagesPayload = prodImages.map((url, order) => ({
      url,
      altText: prodName,
      order
    }));

    try {
      if (editingProduct) {
        // Update product
        await ProductService.updateProduct(businessId, editingProduct.id, {
          name: prodName,
          description: prodDescription,
          price: priceNum,
          compareAtPrice: prodCompareAtPrice ? parseFloat(prodCompareAtPrice) : undefined,
          categoryId: prodCategoryId || undefined,
          availability: prodAvailability as any,
          isFeatured: prodIsFeatured
        });
      } else {
        // Create product
        await ProductService.createProduct(businessId, {
          name: prodName,
          description: prodDescription,
          price: priceNum,
          compareAtPrice: prodCompareAtPrice ? parseFloat(prodCompareAtPrice) : undefined,
          categoryId: prodCategoryId || undefined,
          availability: prodAvailability as any,
          isFeatured: prodIsFeatured,
          images: imagesPayload
        });
      }

      await reloadProducts();
      setShowProductDialog(false);
    } catch (error: any) {
      console.error(error);
      setActionError(error.message || "Failed to save product.");
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
      setProdCategoryId(newCat.id);
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

  const handleDeleteProduct = async () => {
    if (!businessId || !deletingProductId) return;
    setActionLoading(true);
    try {
      await ProductService.deleteProduct(businessId, deletingProductId);
      await reloadProducts();
      setDeletingProductId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter products locally for instant response
  const filteredProducts = productsData?.data.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || product.availability === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full flex flex-col relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products Catalog</h1>
          <p className="text-muted-foreground mt-1">Manage your inventory, pricing, and showcase featured items.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" className="w-1/2 md:w-auto" onClick={() => setShowCategoryDialog(true)}>
            <FolderPlus className="w-4 h-4 mr-2" /> Categories
          </Button>
          <Button variant="gradient" className="w-1/2 md:w-auto" onClick={openCreateProductDialog}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {/* Main Grid View */}
      <Card className="glass flex-1 min-h-0 flex flex-col">
        {/* Search and Filters Bar */}
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-border gap-4">
          <div className="flex gap-3 flex-1 flex-wrap items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                className="pl-9 bg-background/50" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Stock status filter buttons */}
            <div className="flex bg-secondary p-0.5 rounded-lg border text-xs">
              {["ALL", "IN_STOCK", "COMING_SOON", "OUT_OF_STOCK"].map((status) => (
                <button
                  key={status}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${statusFilter === status ? 'bg-background text-primary shadow' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground sm:block hidden">
            Showing {filteredProducts.length} of {productsData?.total || 0} products
          </p>
        </CardHeader>
        
        {/* Table Content */}
        <CardContent className="p-0 flex-1 overflow-auto min-h-0">
          <div className="w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 sticky top-0 backdrop-blur-md border-b">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">Product</th>
                  <th scope="col" className="px-6 py-4 font-bold">Category</th>
                  <th scope="col" className="px-6 py-4 font-bold">Price</th>
                  <th scope="col" className="px-6 py-4 font-bold">Status</th>
                  <th scope="col" className="px-6 py-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const displayImg = product.images?.[0]?.url;
                  return (
                    <tr key={product.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg border border-border/50 overflow-hidden bg-secondary flex items-center justify-center flex-shrink-0 relative">
                            {displayImg ? (
                              <img src={displayImg} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            )}
                            {product.isFeatured && (
                              <div className="absolute top-0 right-0 bg-amber-500 text-white p-0.5 rounded-bl">
                                <Star className="w-2.5 h-2.5 fill-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{product.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{product.description || "No description provided."}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        <div className="flex items-center gap-2">
                          <Box className="w-3.5 h-3.5" />
                          {(product as any).category?.name || "Uncategorized"}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        <div className="flex flex-col">
                          <span>₦{parseFloat(product.price.toString()).toLocaleString()}</span>
                          {product.compareAtPrice && (
                            <span className="text-xs text-muted-foreground line-through font-normal">
                              ₦{parseFloat(product.compareAtPrice.toString()).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={product.availability === 'IN_STOCK' ? 'success' : product.availability === 'COMING_SOON' ? 'outline' : 'destructive'}
                          className={product.availability === 'COMING_SOON' ? 'text-amber-500 border-amber-500/20 bg-amber-500/10' : ''}
                        >
                          {product.availability.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEditProductDialog(product)}>
                            <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeletingProductId(product.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 border">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold mb-1">No products found</h3>
                <p className="text-muted-foreground max-w-xs text-xs mb-6">Start populating your mini website by adding your first product.</p>
                <Button variant="gradient" onClick={openCreateProductDialog}>Add Product</Button>
              </div>
            )}
          </div>
        </CardContent>

        {/* Pagination Controls */}
        {productsData && productsData.totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center bg-secondary/10 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              Page {productsData.page} of {productsData.totalPages}
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
                disabled={currentPage === productsData.totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {deletingProductId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md glass animate-in zoom-in-95 duration-150">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Delete Product?</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Are you sure you want to delete this product? This action cannot be undone and it will be removed from your website storefront.
              </CardDescription>
            </CardHeader>
            <div className="p-6 pt-0 flex justify-end gap-3">
              <Button variant="outline" disabled={actionLoading} onClick={() => setDeletingProductId(null)}>Cancel</Button>
              <Button variant="destructive" disabled={actionLoading} onClick={handleDeleteProduct}>
                {actionLoading ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create / Edit Category Modal */}
      {showCategoryDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md glass animate-in zoom-in-95 duration-150">
            <CardHeader className="flex flex-row justify-between items-start pb-4 border-b">
              <div>
                <CardTitle className="text-lg font-bold">Manage Categories</CardTitle>
                <CardDescription className="text-xs">Group products into collections.</CardDescription>
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
                
                {/* List Categories */}
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
                    placeholder="e.g. Footwear" 
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

      {/* Add / Edit Product Modal */}
      {showProductDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-xl glass animate-in zoom-in-95 duration-150 my-8">
            <CardHeader className="flex flex-row justify-between items-start pb-4 border-b">
              <div>
                <CardTitle className="text-lg font-bold">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </CardTitle>
                <CardDescription className="text-xs">
                  Fill in your product details.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowProductDialog(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSaveProduct}>
              <CardContent className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {actionError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive-foreground text-xs p-2.5 rounded-lg">
                    {actionError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs font-semibold">Product Name *</Label>
                    <Input 
                      placeholder="e.g. Leather Bag" 
                      value={prodName} 
                      onChange={(e) => setProdName(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Price (₦) *</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 15000" 
                      value={prodPrice} 
                      onChange={(e) => setProdPrice(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Compare At Price (₦)</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 20000" 
                      value={prodCompareAtPrice} 
                      onChange={(e) => setProdCompareAtPrice(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Category</Label>
                    <select 
                      className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none"
                      value={prodCategoryId}
                      onChange={(e) => setProdCategoryId(e.target.value)}
                    >
                      <option value="">No Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Inventory Status</Label>
                    <select 
                      className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none"
                      value={prodAvailability}
                      onChange={(e) => setProdAvailability(e.target.value)}
                    >
                      <option value="IN_STOCK">In Stock</option>
                      <option value="COMING_SOON">Coming Soon</option>
                      <option value="OUT_OF_STOCK">Out of Stock</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Description</Label>
                  <textarea 
                    className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none"
                    placeholder="Provide details about your product features, sizing, etc."
                    value={prodDescription} 
                    onChange={(e) => setProdDescription(e.target.value)} 
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={prodIsFeatured} 
                    onChange={(e) => setProdIsFeatured(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                  />
                  Feature this product on homepage
                </label>

                <hr className="border-border/60" />

                {/* Multiple Images Support */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Product Gallery Images</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Paste image URL (e.g. https://unsplash.com/...)" 
                      value={newImageUrl} 
                      onChange={(e) => setNewImageUrl(e.target.value)} 
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addImage}>Add</Button>
                  </div>

                  {/* Thumbnail Previews */}
                  <div className="flex gap-2 flex-wrap mt-2 p-2 rounded-lg border bg-card/50 min-h-[60px] items-center">
                    {prodImages.map((url, idx) => (
                      <div key={idx} className="w-14 h-14 border rounded-md overflow-hidden relative group bg-secondary flex-shrink-0">
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
                    {prodImages.length === 0 && (
                      <span className="text-[10px] text-muted-foreground pl-2">Add image links to showcase this product in the gallery.</span>
                    )}
                  </div>
                  {/* Preset quick links for demo uploader testing */}
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span>Quick presets:</span>
                    <button 
                      type="button" 
                      className="underline hover:text-foreground"
                      onClick={() => setProdImages([...prodImages, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"])}
                    >
                      Preset 1
                    </button>
                    <button 
                      type="button" 
                      className="underline hover:text-foreground"
                      onClick={() => setProdImages([...prodImages, "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400"])}
                    >
                      Preset 2
                    </button>
                    <button 
                      type="button" 
                      className="underline hover:text-foreground"
                      onClick={() => setProdImages([...prodImages, "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400"])}
                    >
                      Preset 3
                    </button>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end gap-3 border-t mt-4 pt-4">
                <Button variant="outline" type="button" onClick={() => setShowProductDialog(false)}>Cancel</Button>
                <Button variant="gradient" type="submit" disabled={actionLoading}>
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Product"
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
