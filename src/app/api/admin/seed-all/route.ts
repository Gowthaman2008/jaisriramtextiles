import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createServiceClient();

  try {
    // 1. Fetch live categories to map slugs to UUIDs
    const { data: dbCategories, error: catError } = await supabase
      .from("categories")
      .select("id, slug");
    
    if (catError || !dbCategories) {
      throw new Error("Categories must be seeded first in your database.");
    }

    const categoryMap = new Map<string, string>();
    dbCategories.forEach((c) => {
      categoryMap.set(c.slug, c.id);
    });

    // 2. Define mock products to seed
    const defaultProducts = [
      {
        name: "Classic White Veshti — 2 Metre",
        slug: "classic-white-veshti-2m",
        price_paise: 74900,
        compare_at_paise: 99900,
        cashback_paise: 3000,
        stock: 50,
        is_on_sale: true,
        is_active: true,
        category_slug: "white-dhoti",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/white-dhoti",
      },
      {
        name: "Zari-Border Colour Dhoti",
        slug: "zari-border-colour-dhoti",
        price_paise: 129900,
        compare_at_paise: null,
        cashback_paise: 6000,
        stock: 35,
        is_on_sale: true,
        is_active: true,
        category_slug: "colour-dhoti",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/colour-dhoti",
      },
      {
        name: "Handloom Bath Towel",
        slug: "handloom-bath-towel",
        price_paise: 49900,
        compare_at_paise: 64900,
        cashback_paise: 2000,
        stock: 120,
        is_on_sale: false,
        is_active: true,
        category_slug: "towels",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/towels",
      },
      {
        name: "Cotton Everyday Scarf",
        slug: "cotton-everyday-scarf",
        price_paise: 39900,
        compare_at_paise: 54900,
        cashback_paise: 1500,
        stock: 80,
        is_on_sale: true,
        is_active: true,
        category_slug: "scarfs",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/scarfs",
      },
      {
        name: "Reusable Jute Tote",
        slug: "reusable-jute-tote",
        price_paise: 29900,
        compare_at_paise: null,
        cashback_paise: 1000,
        stock: 150,
        is_on_sale: false,
        is_active: true,
        category_slug: "jute-bags",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/jute-bags",
      },
      {
        name: "Premium Gold-Border Veshti",
        slug: "premium-gold-border-veshti",
        price_paise: 159900,
        compare_at_paise: 199900,
        cashback_paise: 8000,
        stock: 25,
        is_on_sale: true,
        is_active: true,
        category_slug: "white-dhoti",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/gold-border-veshti",
      },
    ];

    let productsCount = 0;
    for (const p of defaultProducts) {
      // Skip if slug already exists in database
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("slug", p.slug)
        .maybeSingle();
      
      if (existing) continue;

      const categoryId = categoryMap.get(p.category_slug);
      if (!categoryId) continue;

      // Insert product
      const { data: newProd, error: insertError } = await supabase
        .from("products")
        .insert({
          name: p.name,
          slug: p.slug,
          price_paise: p.price_paise,
          compare_at_paise: p.compare_at_paise,
          cashback_paise: p.cashback_paise,
          stock: p.stock,
          is_on_sale: p.is_on_sale,
          is_active: p.is_active,
          category_id: categoryId,
        })
        .select("id")
        .single();
      
      if (insertError || !newProd) throw insertError || new Error("Failed to seed product");

      // Insert product primary image
      await supabase.from("product_images").insert({
        product_id: newProd.id,
        url: p.image_url,
        alt: p.name,
        sort_order: 1,
      });

      productsCount++;
    }

    // 3. Define slides to seed
    const defaultSlides = [
      {
        eyebrow: "Since a generation of weavers",
        title: "The art of the woven thread",
        subtitle: "JAI SRI RAM TEXTILES crafts dhotis, towels, scarfs and jute bags on traditional looms in Komarapalayam, Tamil Nadu.",
        cta_label: "Our story",
        cta_href: "/about",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/white-dhoti",
        sort_order: 1,
        is_active: true
      },
      {
        eyebrow: "Premium manufacturing",
        title: "Woven with precision, finished by hand",
        subtitle: "Combed cotton, true zari borders and rigorous quality checks on every metre we make.",
        cta_label: "See our craft",
        cta_href: "/manufacturing",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/gold-border-veshti",
        sort_order: 2,
        is_active: true
      },
      {
        eyebrow: "Limited-time offers",
        title: "Festive savings on our finest",
        subtitle: "Selected dhotis and towels now on sale — while stocks last.",
        cta_label: "Shop the offers",
        cta_href: "/shop/sale",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/colour-dhoti",
        sort_order: 3,
        is_active: true
      },
      {
        eyebrow: "New arrivals",
        title: "Fresh off the loom",
        subtitle: "The latest additions to our collection, ready to ship across India.",
        cta_label: "Browse new arrivals",
        cta_href: "/shop?sort=newest",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/scarfs",
        sort_order: 4,
        is_active: true
      },
      {
        eyebrow: "Best sellers",
        title: "Loved across Tamil Nadu",
        subtitle: "The pieces our customers return for, again and again.",
        cta_label: "Shop best sellers",
        cta_href: "/shop?sort=popularity",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/towels",
        sort_order: 5,
        is_active: true
      },
      {
        eyebrow: "Festival collections",
        title: "Dressed for every celebration",
        subtitle: "Traditional whites and rich colour dhotis for temple days and festivities.",
        cta_label: "Explore collections",
        cta_href: "/shop/colour-dhoti",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/white-dhoti",
        sort_order: 6,
        is_active: true
      },
      {
        eyebrow: "Bulk & wholesale",
        title: "Supplying temples, hotels & retailers",
        subtitle: "Custom manufacturing and wholesale pricing for institutions and businesses.",
        cta_label: "Enquire about bulk orders",
        cta_href: "/bulk-orders",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/jute-bags",
        sort_order: 7,
        is_active: true
      },
      {
        eyebrow: "A gift for you",
        title: "10% off your first order",
        subtitle: "New here? Your welcome discount is waiting at checkout.",
        cta_label: "Start shopping",
        cta_href: "/shop",
        image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/gold-border-veshti",
        sort_order: 8,
        is_active: true
      }
    ];

    let slidesCount = 0;
    // Clear and re-insert default slides
    const { data: existingSlides } = await supabase.from("carousel_slides").select("id");
    if (!existingSlides || existingSlides.length === 0) {
      const { error: slideInsertErr } = await supabase.from("carousel_slides").insert(defaultSlides);
      if (slideInsertErr) throw slideInsertErr;
      slidesCount = defaultSlides.length;
    }

    // 4. Seed Banners
    let bannersCount = 0;
    const { data: existingBanners } = await supabase
      .from("banners")
      .select("id")
      .eq("placement", "announcement");
    
    if (!existingBanners || existingBanners.length === 0) {
      const { error: bannerInsertErr } = await supabase.from("banners").insert({
        placement: "announcement",
        is_active: true,
        content: {
          messages: [
            "Free shipping on orders above ₹699",
            "Earn cashback on every order — credited after delivery",
            "Bulk & wholesale enquiries welcome"
          ]
        }
      });
      if (bannerInsertErr) throw bannerInsertErr;
      bannersCount = 1;
    }

    return NextResponse.json({
      success: true,
      message: "Seeding defaults completed successfully!",
      seeded: {
        products: productsCount,
        slides: slidesCount,
        banners: bannersCount
      }
    });

  } catch (err: any) {
    console.error("Seeder error:", err);
    return NextResponse.json({ error: err.message || "Failed to seed defaults" }, { status: 500 });
  }
}
