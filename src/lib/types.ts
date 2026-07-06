export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  pricePaise: number;
  compareAtPaise: number | null; // original price for showing discount
  cashbackPaise: number; // configurable per product, credited after delivery
  rating: number; // 0–5
  reviewCount: number;
  image: string;
  images?: string[];
  colors?: string[];
  sizes?: string[];
  inStock: boolean;
  badges?: ("new" | "bestseller" | "trending" | "sale")[];
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
