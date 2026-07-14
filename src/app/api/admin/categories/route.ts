import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

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

// POST: create a new category
export async function POST(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, slug, tagline, image_url, sort_order, is_active } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and Slug are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name,
        slug,
        tagline: tagline || null,
        image_url: image_url || null,
        sort_order: sort_order !== undefined ? Number(sort_order) : 0,
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/shop/[category]");
    return NextResponse.json({ success: true, category: data });
  } catch (error: any) {
    console.error("Create category error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: update category details
export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, name, slug, tagline, imageUrl, image_url, sort_order, is_active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (tagline !== undefined) updateData.tagline = tagline || null;
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (sort_order !== undefined) updateData.sort_order = Number(sort_order);
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/shop/[category]");
    return NextResponse.json({ success: true, category: data });
  } catch (error: any) {
    console.error("Update category error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: delete a category
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/shop/[category]");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

