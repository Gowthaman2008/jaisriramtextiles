import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl || !imageUrl.startsWith("http")) {
      return new NextResponse("Invalid or missing image URL", { status: 400 });
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return new NextResponse("Failed to fetch upstream image", { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (error: any) {
    console.error("Share image proxy error:", error);
    return new NextResponse(error.message || "Internal server error", { status: 500 });
  }
}
