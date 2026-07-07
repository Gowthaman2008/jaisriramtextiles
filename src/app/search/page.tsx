import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-[720px]">
        <SectionHeading eyebrow="Find products" title="Search" />
        <div className="mt-8 flex h-12 items-center rounded-pill border border-line bg-ivory px-5 text-sm text-muted shadow-soft">
          Search coming soon — browse by category for now
        </div>
      </Container>
    </div>
  );
}
