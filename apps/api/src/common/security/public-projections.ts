import type {
  Business,
  Category,
  Product,
  ProductImage,
  Service,
} from '@prisma/client';

export function publicBusiness(business: Business) {
  const {
    id,
    name,
    slug,
    description,
    logoUrl,
    bannerUrl,
    phone,
    whatsapp,
    email,
    address,
    workingHours,
    socialLinks,
  } = business;
  return {
    id,
    name,
    slug,
    description,
    logoUrl,
    bannerUrl,
    phone,
    whatsapp,
    email,
    address,
    workingHours,
    socialLinks,
  };
}
export function publicCategory(
  category: Category | null | undefined,
  businessId: string,
) {
  return category && !category.deletedAt && category.businessId === businessId
    ? { id: category.id, name: category.name, slug: category.slug }
    : null;
}
export function publicProduct(
  product: Product & { images: ProductImage[]; category: Category | null },
) {
  const {
    id,
    name,
    slug,
    description,
    price,
    compareAtPrice,
    availability,
    isFeatured,
  } = product;
  return {
    id,
    name,
    slug,
    description,
    price,
    compareAtPrice,
    availability,
    isFeatured,
    category: publicCategory(product.category, product.businessId),
    images: product.images.map(({ url, altText, order }) => ({
      url,
      altText,
      order,
    })),
  };
}
export function publicService(
  service: Service & { category: Category | null },
) {
  const { id, name, slug, description, price, priceLabel, isFeatured, images } =
    service;
  return {
    id,
    name,
    slug,
    description,
    price,
    priceLabel,
    isFeatured,
    images,
    category: publicCategory(service.category, service.businessId),
  };
}
