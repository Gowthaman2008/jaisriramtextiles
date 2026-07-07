import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { FirstOrderPopup } from "@/components/providers/first-order-popup";
import { AnalyticsTracker } from "@/components/providers/analytics-tracker";
import { CartProvider } from "@/components/providers/cart-provider";
import { WishlistProvider } from "@/components/providers/wishlist-provider";
import { AIChatbot } from "@/components/layout/ai-chatbot";
import { BUSINESS } from "@/lib/constants";
import { ProfilePrompt } from "@/components/providers/profile-prompt";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "JAI SRI RAM TEXTILES — Handloom Dhotis, Towels, Scarfs & Jute Bags",
    template: "%s · JAI SRI RAM TEXTILES",
  },
  description:
    "Traditional Indian textile manufacturer in Komarapalayam, Tamil Nadu. Shop premium white & colour dhotis, towels, scarfs and jute bags with cashback rewards and fast delivery.",
  keywords: [
    "dhoti", "veshti", "handloom towels", "cotton scarf", "jute bags",
    "textile manufacturer Tamil Nadu", "wholesale dhoti", "Komarapalayam textiles",
  ],
  openGraph: {
    type: "website",
    siteName: BUSINESS.name,
    title: "JAI SRI RAM TEXTILES",
    description: "Premium handloom dhotis, towels, scarfs & jute bags.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "JAI SRI RAM TEXTILES",
    description: "Premium handloom textiles from Tamil Nadu.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#FBF9F4",
};

// JSON-LD structured data for the business (Schema.org)
const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: BUSINESS.name,
  email: BUSINESS.email,
  url: siteUrl,
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.address.line1,
    addressLocality: BUSINESS.address.city,
    addressRegion: BUSINESS.address.state,
    postalCode: BUSINESS.address.pincode,
    addressCountry: "IN",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <SmoothScroll>
          <WishlistProvider>
            <CartProvider>
              <AnalyticsTracker />
              <AnnouncementBar />
              <Navbar />
              <main>{children}</main>
              <Footer />
              <AIChatbot />
              <ProfilePrompt />
            </CartProvider>
          </WishlistProvider>
        </SmoothScroll>
        {/* Phase 2: pass eligible={user has 0 completed orders} */}
        <FirstOrderPopup />
      </body>
    </html>
  );
}
