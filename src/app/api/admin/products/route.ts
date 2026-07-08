import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

// Utility to verify admin/staff role
async function checkAdminAuth() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

let adminHasShowSizeColumn: boolean | null = null;

async function checkShowSizeColumn(supabase: any) {
  if (adminHasShowSizeColumn !== null) return adminHasShowSizeColumn;
  try {
    const { error } = await supabase.from("products").select("show_size").limit(1);
    adminHasShowSizeColumn = !(error && error.message.includes("show_size"));
  } catch {
    adminHasShowSizeColumn = false;
  }
  return adminHasShowSizeColumn;
}

// GET: Fetch all products with images, variants, and categories
export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const hasShowSize = await checkShowSizeColumn(supabase);
    
    const selectClause = hasShowSize
      ? `
        id, slug, name, description, price_paise, compare_at_paise, 
        cashback_paise, stock, is_active, is_on_sale, rating_avg, rating_count, show_size,
        category_id,
        categories (slug, name),
        product_images (id, url, alt, sort_order),
        product_variants (id, size, color, sku, stock)
      `
      : `
        id, slug, name, description, price_paise, compare_at_paise, 
        cashback_paise, stock, is_active, is_on_sale, rating_avg, rating_count,
        category_id,
        categories (slug, name),
        product_images (id, url, alt, sort_order),
        product_variants (id, size, color, sku, stock)
      `;

    const { data: products, error } = await supabase
      .from("products")
      .select(selectClause)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(products);
  } catch (error: any) {
    console.error("Fetch products error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new product with images and variants
export async function POST(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      name,
      slug,
      description,
      category_id,
      price_paise,
      compare_at_paise,
      cashback_paise,
      stock,
      is_active,
      is_on_sale,
      show_size,
      images, // Array of strings or object {url, alt, sort_order}
      variants, // Array of {size, color, sku, stock}
    } = await request.json();

    if (!name || !slug || price_paise === undefined) {
      return NextResponse.json({ error: "Name, Slug, and Price are required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Insert product
    const insertPayload: any = {
      name,
      slug,
      description,
      category_id: category_id || null,
      price_paise,
      compare_at_paise: compare_at_paise || null,
      cashback_paise: cashback_paise || 0,
      stock: stock || 0,
      is_active: is_active !== undefined ? is_active : true,
      is_on_sale: is_on_sale || false,
    };

    const hasShowSize = await checkShowSizeColumn(supabase);
    if (hasShowSize) {
      insertPayload.show_size = show_size || false;
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert(insertPayload)
      .select("id")
      .single();

    if (productError || !product) {
      throw productError || new Error("Failed to insert product");
    }

    const productId = product.id;

    // 2. Insert images
    if (images && images.length > 0) {
      const imageRows = images.map((img: any, index: number) => {
        if (typeof img === "string") {
          return { product_id: productId, url: img, alt: name, sort_order: index };
        }
        return {
          product_id: productId,
          url: img.url,
          alt: img.alt || name,
          sort_order: img.sort_order !== undefined ? img.sort_order : index,
        };
      });

      const { error: imgError } = await supabase.from("product_images").insert(imageRows);
      if (imgError) throw imgError;
    }

    // 3. Insert variants
    if (variants && variants.length > 0) {
      const variantRows = variants.map((v: any) => ({
        product_id: productId,
        size: v.size || null,
        color: v.color || null,
        sku: v.sku || null,
        stock: v.stock !== undefined ? v.stock : 0,
      }));

      const { error: varError } = await supabase.from("product_variants").insert(variantRows);
      if (varError) throw varError;
    }

    return NextResponse.json({ success: true, productId });
  } catch (error: any) {
    console.error("Add product error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update existing product, including images and variants
export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      id,
      name,
      slug,
      description,
      category_id,
      price_paise,
      compare_at_paise,
      cashback_paise,
      stock,
      is_active,
      is_on_sale,
      show_size,
      images,
      variants,
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Product ID is required for updates" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Update product base info
    const updatePayload: any = {
      name,
      slug,
      description,
      category_id: category_id || null,
      price_paise,
      compare_at_paise: compare_at_paise || null,
      cashback_paise: cashback_paise || 0,
      stock: stock || 0,
      is_active: is_active !== undefined ? is_active : true,
      is_on_sale: is_on_sale || false,
    };

    const hasShowSize = await checkShowSizeColumn(supabase);
    if (hasShowSize) {
      updatePayload.show_size = show_size || false;
    }

    const { error: productError } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", id);

    if (productError) throw productError;

    // 2. Sync images (delete and re-insert for simplicity)
    if (images !== undefined) {
      await supabase.from("product_images").delete().eq("product_id", id);
      if (images && images.length > 0) {
        const imageRows = images.map((img: any, index: number) => {
          if (typeof img === "string") {
            return { product_id: id, url: img, alt: name, sort_order: index };
          }
          return {
            product_id: id,
            url: img.url,
            alt: img.alt || name,
            sort_order: img.sort_order !== undefined ? img.sort_order : index,
          };
        });
        const { error: imgError } = await supabase.from("product_images").insert(imageRows);
        if (imgError) throw imgError;
      }
    }

    // 3. Sync variants (delete and re-insert)
    if (variants !== undefined) {
      await supabase.from("product_variants").delete().eq("product_id", id);
      if (variants && variants.length > 0) {
        const variantRows = variants.map((v: any) => ({
          product_id: id,
          size: v.size || null,
          color: v.color || null,
          sku: v.sku || null,
          stock: v.stock !== undefined ? v.stock : 0,
        }));
        const { error: varError } = await supabase.from("product_variants").insert(variantRows);
        if (varError) throw varError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a product by ID
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    
    // Delete the product. Cascading delete should handle product_images and product_variants.
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
