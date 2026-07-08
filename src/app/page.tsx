import { HeroCarousel } from "@/components/home/hero-carousel";
import { FeaturedCategories } from "@/components/home/featured-categories";
import { FeaturedProducts } from "@/components/home/featured-products";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { CashbackBanner } from "@/components/home/cashback-banner";
import { ShippingInfo } from "@/components/home/shipping-info";
import { BulkOrderBanner } from "@/components/home/bulk-order-banner";
import { ReviewsMarquee } from "@/components/home/reviews-marquee";
import { Faq } from "@/components/home/faq";
import { Newsletter } from "@/components/home/newsletter";
import { getAllProducts } from "@/lib/supabase/queries";

export default async function HomePage() {
  const products = await getAllProducts();

  return (
    <>
      <HeroCarousel />
      <FeaturedCategories />
      <FeaturedProducts products={products} />
      <WhyChooseUs />
      <ShippingInfo />
      <CashbackBanner />
      <BulkOrderBanner />
      <ReviewsMarquee />
      <Faq />
      <Newsletter />
    </>
  );
}
