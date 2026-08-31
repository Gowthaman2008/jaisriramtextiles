import { NextResponse } from "next/server";
import { generateMarketingContent } from "@/lib/marketing/ai-generator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action = "subject_lines",
      campaignName = "Festive Sale",
      topic,
      tone,
      existingText,
      productNames,
      discountOffer,
    } = body;

    const res = await generateMarketingContent({
      action,
      campaignName,
      topic,
      tone,
      existingText,
      productNames,
      discountOffer,
    });

    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
