"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { categories as mockCategories } from "@/data/mock";
import type { Product } from "@/lib/types";

type DbCategory = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  image_url: string | null;
};

export function FeaturedCategories({
  dbCategories = [],
  products = [],
}: {
  dbCategories?: DbCategory[];
  products?: Product[];
}) {
  // Map database categories to Category format. Fallback to mock categories if empty.
  const activeCategories = dbCategories.length > 0
    ? dbCategories
        .filter((cat) => cat.slug !== "all" && cat.slug !== "bulk-orders") // exclude virtual lists
        .map((dbCat) => {
          const count = products.filter((p) => p.category === dbCat.slug).length;
          const mockCat = mockCategories.find((m) => m.slug === dbCat.slug);
          return {
            slug: dbCat.slug,
            label: dbCat.name,
            tagline: dbCat.tagline || mockCat?.tagline || "",
            image: dbCat.image_url || mockCat?.image || "",
            count: count,
          };
        })
    : mockCategories;

  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Explore the collection"
          title="Crafted for every occasion"
          intro="From temple-ready whites to everyday essentials, each range is woven to last."
        />

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {activeCategories.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
              className={i === 0 ? "col-span-2 md:col-span-1" : ""}
            >
              <Link
                href={`/shop/${c.slug}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-card"
              >
                <Image
                  src={c.image}
                  alt={c.label}
                  fill
                  sizes="(max-width:768px) 50vw, 20vw"
                  className="object-cover transition-transform duration-700 ease-silk group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-display text-lg text-ivory">{c.label}</p>
                  <p className="mt-0.5 text-xs text-ivory/70">{c.count} products</p>
                  <span className="mt-2 inline-flex translate-y-1 items-center gap-1 text-xs font-medium text-zari-soft opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    Shop now <ArrowUpRight size={13} />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
