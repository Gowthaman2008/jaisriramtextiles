import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { InquiryForm } from "@/components/bulk-orders/inquiry-form";

export const metadata: Metadata = {
  title: "Bulk Orders",
  description:
    "Wholesale dhotis, towels, scarfs and jute bags for temples, hotels, retailers and corporate gifting from JAI SRI RAM TEXTILES.",
};

export default function BulkOrdersPage() {
  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-[720px]">
        <SectionHeading
          eyebrow="Wholesale"
          title="Bulk order enquiries"
          intro="Temples, hotels, retailers, corporates and wedding parties — tell us what you need and we'll get back with pricing and lead times."
        />
        <div className="mt-12">
          <InquiryForm />
        </div>
      </Container>
    </div>
  );
}
