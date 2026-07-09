/**
 * Single source of truth for business rules.
 * These values are enforced again server-side (checkout API + DB triggers);
 * never trust the client copy for money math.
 */

export const BUSINESS = {
  name: "JAI SRI RAM TEXTILES",
  email: "jaisriramtextiles@gmail.com",
  // Deliberately no phone number anywhere on the public site.
  address: {
    line1: "5/136/5, Shasti Smart City, Kallankattuvalasu",
    city: "Kumarapalayam",
    district: "Namakkal",
    state: "Tamil Nadu",
    pincode: "638183",
    country: "India",
  },
} as const;

export const COMMERCE = {
  shippingChargePaise: 9900, // ₹99
  freeShippingThresholdPaise: 69900, // orders above ₹699
  deliveryEstimate: "4–7 business days",
  walletMaxUsagePercent: 20, // wallet caps at 20% of order value
  firstOrderCouponPercent: 10, // 10% off, first order only
  reviewEditWindowDays: 14,
} as const;

export const CATEGORIES = [
  { slug: "all", label: "All" },
  { slug: "white-dhoti", label: "White Dhoti" },
  { slug: "colour-dhoti", label: "Colour Dhoti" },
  { slug: "towels", label: "Towels" },
  { slug: "scarfs", label: "Scarfs" },
  { slug: "jute-bags", label: "Jute Bags" },
  { slug: "sale", label: "Live On Sale" },
  { slug: "bulk-orders", label: "Bulk Orders" },
] as const;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Best Rated" },
  { value: "popularity", label: "Popularity" },
  { value: "discount", label: "Biggest Discount" },
] as const;

/**
 * Compute shipping + free-shipping progress for a given subtotal (in paise).
 */
export function computeShipping(subtotalPaise: number) {
  const qualifiesFree = subtotalPaise >= COMMERCE.freeShippingThresholdPaise;
  return {
    qualifiesFree,
    shippingPaise: qualifiesFree ? 0 : COMMERCE.shippingChargePaise,
    remainingForFreePaise: qualifiesFree
      ? 0
      : COMMERCE.freeShippingThresholdPaise - subtotalPaise,
  };
}

/** Wallet redemption is capped at 20% of order value. */
export function maxWalletRedeemablePaise(orderValuePaise: number) {
  return Math.floor((orderValuePaise * COMMERCE.walletMaxUsagePercent) / 100);
}
