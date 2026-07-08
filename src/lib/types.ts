export type Product = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  category: string;
  categoryLabel: string;
  pricePaise: number;
  compareAtPaise: number | null; // original price for showing discount
  cashbackPaise: number; // configurable per product, credited after delivery
  piecesPerPack?: number;
  rating: number; // 0–5
  reviewCount: number;
  image: string;
  images?: string[];
  colors?: string[];
  sizes?: string[];
  inStock: boolean;
  stock: number;
  badges?: ("new" | "bestseller" | "trending" | "sale")[];
  showSize?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isTrending?: boolean;
  variants?: {
    id: string;
    size: string | null;
    color: string | null;
    sku: string | null;
    stock: number;
  }[];
};

export type Category = {
  slug: string;
  label: string;
  tagline: string;
  image: string;
  count: number;
};

export type Review = {
  id: string;
  author: string;
  location: string;
  rating: number;
  text: string;
  product: string;
};
