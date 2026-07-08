import { jsPDF } from "jspdf";

// Helper: Convert number to Words (INR format)
export function numberToWords(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Zero";

  const formatTens = (n: number): string => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
  };

  const formatHundreds = (n: number): string => {
    if (n > 99) {
      return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + formatTens(n % 100) : "");
    }
    return formatTens(n);
  };

  let rupeeVal = Math.floor(num);
  let paiseVal = Math.round((num - rupeeVal) * 100);

  let result = "";
  if (rupeeVal >= 10000000) {
    result += formatHundreds(Math.floor(rupeeVal / 10000000)) + " Crore ";
    rupeeVal %= 10000000;
  }
  if (rupeeVal >= 100000) {
    result += formatHundreds(Math.floor(rupeeVal / 100000)) + " Lakh ";
    rupeeVal %= 100000;
  }
  if (rupeeVal >= 1000) {
    result += formatHundreds(Math.floor(rupeeVal / 1000)) + " Thousand ";
    rupeeVal %= 1000;
  }
  if (rupeeVal > 0) {
    result += formatHundreds(rupeeVal);
  }

  result = result.trim() + " Rupees";

  if (paiseVal > 0) {
    result += " and " + formatTens(paiseVal) + " Paise";
  }

  return result + " Only";
}

// Helper: Get state code for GST (India)
export function getStateGSTCode(stateName?: string): { code: string; short: string } {
  const normalized = (stateName || "").toLowerCase().trim();
  const states: Record<string, { code: string; short: string }> = {
    "jammu": { code: "01", short: "JK" },
    "kashmir": { code: "01", short: "JK" },
    "himachal": { code: "02", short: "HP" },
    "punjab": { code: "03", short: "PB" },
    "chandigarh": { code: "04", short: "CH" },
    "uttarakhand": { code: "05", short: "UK" },
    "haryana": { code: "06", short: "HR" },
    "delhi": { code: "07", short: "DL" },
    "rajasthan": { code: "08", short: "RJ" },
    "uttar pradesh": { code: "09", short: "UP" },
    "bihar": { code: "10", short: "BR" },
    "sikkim": { code: "11", short: "SK" },
    "arunachal": { code: "12", short: "AR" },
    "nagaland": { code: "13", short: "NL" },
    "manipur": { code: "14", short: "MN" },
    "mizoram": { code: "15", short: "MZ" },
    "tripura": { code: "16", short: "TR" },
    "meghalaya": { code: "17", short: "ML" },
    "assam": { code: "18", short: "AS" },
    "west bengal": { code: "19", short: "WB" },
    "jharkhand": { code: "20", short: "JH" },
    "odisha": { code: "21", short: "OR" },
    "chhattisgarh": { code: "22", short: "CG" },
    "madhya pradesh": { code: "23", short: "MP" },
    "gujarat": { code: "24", short: "GJ" },
    "maharashtra": { code: "27", short: "MH" },
    "karnataka": { code: "29", short: "KA" },
    "goa": { code: "30", short: "GA" },
    "lakshadweep": { code: "31", short: "LD" },
    "kerala": { code: "32", short: "KL" },
    "tamil nadu": { code: "33", short: "TN" },
    "tamilnadu": { code: "33", short: "TN" },
    "puducherry": { code: "34", short: "PY" },
    "telangana": { code: "36", short: "TS" }
  };
  for (const key of Object.keys(states)) {
    if (normalized.includes(key)) {
      return states[key];
    }
  }
  return { code: "33", short: "TN" }; // default to Tamil Nadu if not matched
}

// Helper: Extract HSN added by admin in product details
export function getProductHSN(item: any): string {
  if (item.hsn) return String(item.hsn).trim();
  if (item.hsn_code) return String(item.hsn_code).trim();
  if (item.product?.hsn) return String(item.product.hsn).trim();
  if (item.product?.hsn_code) return String(item.product.hsn_code).trim();

  // Try parsing from name or description
  const nameMatch = String(item.name || "").match(/hsn\s*:?\s*(\d{4,8})/i);
  if (nameMatch) return nameMatch[1];

  const descMatch = String(item.product?.description || item.description || "").match(/hsn\s*:?\s*(\d{4,8})/i);
  if (descMatch) return descMatch[1];

  // Try parsing from SKU
  const skuMatch = String(item.sku || "").match(/hsn\s*-?\s*(\d{4,8})/i);
  if (skuMatch) return skuMatch[1];

  // Default HSN for clothing/textiles
  return "52081190";
}

export function drawInvoicePdf(doc: jsPDF, order: any, profileUserId?: string | number) {
  // Invoice Metadata
  const orderNumber = order.order_number;
  const cleanOrderNumber = String(orderNumber || "").startsWith("JSRT") ? String(orderNumber) : `JSRT-${orderNumber}`;
  const placedDate = new Date(order.placed_at || order.created_at || new Date()).toLocaleDateString("en-IN", { dateStyle: "long" });
  const recipientName = order.shipping_address?.recipient || order.profiles?.full_name || order.profiles?.email || "Customer";
  const items = (order.order_items || []).filter((item: any) => {
    const isFree = item.unit_price_paise === 0 || (item.name || "").toLowerCase().includes("free gift");
    return !isFree;
  });
  const shippingAddress = order.shipping_address || {};
  const subtotalPaise = order.subtotal_paise || 0;
  const discountPaise = order.discount_paise || 0;
  const shippingPaise = order.shipping_paise || 0;
  const walletUsedPaise = order.wallet_used_paise || 0;
  const totalPaise = order.total_paise || 0;
  const carrierName = "SHADOWFAX";
  const awbNumber = order.tracking_id || "AWAITING DISPATCH";

  // Seller Details
  const shopName = "JAI SRI RAM TEXTILES";
  const shopAddressLine1 = "Survey No. 437/4, Sasti Nagar, Kallangattuvalasu";
  const shopAddressLine2 = "Komarapalayam, Namakkal, Tamil Nadu, PIN: 638183";
  const shopGSTIN = "33BTFPR7051F1ZP";
  const shopEmail = "support@jaisriramtextiles.in";
  const shopPhone = "+91 8608386872";

  // State Code / Place of Supply Calculation
  const shipState = shippingAddress.state || "Tamil Nadu";
  const gstStateCode = getStateGSTCode(shipState);
  const placeOfSupply = `${gstStateCode.short} (${gstStateCode.code})`;

  // Determine intra-state or inter-state transaction
  const isIntraState = gstStateCode.code === "33"; // Tamil Nadu code is 33

  // Margins & Dimensions (A4 Page width = 210, height = 297)
  const ml = 12; // margin left
  const mr = 198; // margin right
  const mt = 12; // margin top
  const width = mr - ml; // 186mm

  // Border outline configuration (drawn at the end of function to overlay fills)
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);

  // --- SECTION 1: HEADER & LOGO ---
  // Store Branding Logo (Aligned Left)
  doc.setTextColor(176, 141, 76); // Gold Accent (#B08D4C)
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text(shopName, ml + 4, mt + 8);

  // Subtitle (Aligned Left)
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("PREMIUM WEAVERS & TEXTILE MANUFACTURERS", ml + 4, mt + 13);

  // Right Header: Invoice Label & Tax Info (Aligned Right)
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("TAX INVOICE", mr - 4, mt + 7, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Original For Recipient", mr - 4, mt + 11, { align: "right" });
  doc.text(`TAX INVOICE NO: ${cleanOrderNumber}`, mr - 4, mt + 15, { align: "right" });
  doc.text(`DATE: ${placedDate}`, mr - 4, mt + 19, { align: "right" });

  // Draw divider line under branding
  doc.line(ml, mt + 21, mr, mt + 21);

  // --- SECTION 1B: SELLER / CONSIGNOR DETAILS & BARCODE ---
  // Left: Seller Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("SELLER/CONSIGNOR: JAI SRI RAM TEXTILES", ml + 4, mt + 25);
  doc.setFont("helvetica", "normal");
  doc.text(shopAddressLine1, ml + 4, mt + 29);
  doc.text(shopAddressLine2, ml + 4, mt + 33);
  doc.text(`Customer Support: ${shopPhone} | Email: ${shopEmail}`, ml + 4, mt + 37);
  doc.setFont("helvetica", "bold");
  doc.text(`GSTIN: ${shopGSTIN}`, ml + 4, mt + 41);

  // Right: Faux Barcode representation (horizontal rectangles like AWB layout)
  const barcodeX = mr - 54;
  const barcodeY = mt + 24;
  doc.setFillColor(40, 40, 40);
  // Barcode line patterns
  const pattern = [2, 1, 3, 1, 2, 2, 1, 3, 2, 1, 1, 3, 2, 2, 1, 2, 1, 3];
  let currX = barcodeX;
  pattern.forEach((w) => {
    doc.rect(currX, barcodeY, w, 12, "F");
    currX += w + 1;
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`*${cleanOrderNumber}*`, barcodeX + 25, barcodeY + 15, { align: "center" });

  // Draw division line
  doc.line(ml, mt + 44, mr, mt + 44);

  // --- SECTION 2: BILL TO & SHIP FROM COLUMNS ---
  // Outer divider line
  doc.line(105, mt + 44, 105, mt + 84);

  // Column 1: Bill To
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("BILL TO / SHIP TO:", ml + 4, mt + 49);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(recipientName, ml + 4, mt + 54);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const addrLines = [
    shippingAddress.line1 || "",
    shippingAddress.line2 || "",
    `${shippingAddress.city || ""}, ${shippingAddress.district || ""}`,
    `${shippingAddress.state || ""} - ${shippingAddress.pincode || ""}`
  ].filter(l => l.trim() !== "");

  let addrY = mt + 58;
  addrLines.forEach((line) => {
    doc.text(line, ml + 4, addrY);
    addrY += 4;
  });

  doc.setFont("helvetica", "normal");
  doc.text("Mobile No.", ml + 4, mt + 74);
  doc.text(":", ml + 26, mt + 74);
  doc.text(shippingAddress.phone || "", ml + 28, mt + 74);

  doc.text("State Code", ml + 4, mt + 78);
  doc.text(":", ml + 26, mt + 78);
  doc.text(gstStateCode.code, ml + 28, mt + 78);

  doc.text("Place Of Supply", ml + 4, mt + 82);
  doc.text(":", ml + 26, mt + 82);
  doc.text(placeOfSupply, ml + 28, mt + 82);

  // Column 2: Ship From Address
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("SHIP FROM ADDRESS:", 105 + 4, mt + 49);
  doc.setFont("helvetica", "bold");
  doc.text(shopName, 105 + 4, mt + 54);
  doc.setFont("helvetica", "normal");
  doc.text(shopAddressLine1, 105 + 4, mt + 58);
  doc.text(shopAddressLine2, 105 + 4, mt + 62);
  doc.text(`GSTIN: ${shopGSTIN}`, 105 + 4, mt + 66);
  doc.text(`State Code: 33 (Tamil Nadu)`, 105 + 4, mt + 70);

  // Divider line
  doc.line(ml, mt + 84, mr, mt + 84);

  // --- SECTION 3: ORDER META STRIP (2 Rows to prevent AWB and Carrier overlaps) ---
  doc.setFillColor(248, 246, 240); // Soft background cream
  doc.rect(ml, mt + 84, width, 16, "F");
  doc.line(ml, mt + 100, mr, mt + 100);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  // Row 1
  doc.text(`ORDER NUMBER: ${cleanOrderNumber}`, ml + 4, mt + 89);
  doc.text(`PAYMENT MODE: ${totalPaise === 0 ? "ONLINE/WALLET" : "PREPAID"}`, ml + 100, mt + 89);
  // Row 2
  doc.text(`CARRIER NAME: ${carrierName}`, ml + 4, mt + 95);
  doc.text(`AWB NUMBER: ${awbNumber}`, ml + 100, mt + 95);

  // --- SECTION 4: ITEMS TABLE HEADERS ---
  const tableY = mt + 103;
  doc.setFillColor(240, 238, 230);
  doc.rect(ml, tableY, width, 8, "F");
  doc.line(ml, tableY, mr, tableY); // table top border
  doc.line(ml, tableY + 8, mr, tableY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  doc.text("HSN Code", ml + 1, tableY + 5.5);
  doc.text("Description of Goods", ml + 17, tableY + 5.5);
  doc.text("Qty", ml + 77.5, tableY + 5.5, { align: "center" });
  doc.text("MRP", ml + 94, tableY + 5.5, { align: "right" });
  doc.text("Disc/Unit", ml + 109, tableY + 5.5, { align: "right" });
  doc.text("Net Price", ml + 124, tableY + 5.5, { align: "right" });
  doc.text("Base Price", ml + 139, tableY + 5.5, { align: "right" });
  doc.text("Taxable Val", ml + 155, tableY + 5.5, { align: "right" });
  doc.text("Tax Amt", ml + 170, tableY + 5.5, { align: "right" });
  doc.text("Total (INR)", mr - 1, tableY + 5.5, { align: "right" });

  // Explicit column limits:
  // HSN: ml to ml+16 [12 to 28]
  // Desc: ml+16 to ml+74 [28 to 86]
  // Qty: ml+74 to ml+81 [86 to 93]
  // MRP: ml+81 to ml+95 [93 to 107]
  // Disc/Unit: ml+95 to ml+110 [107 to 122]
  // Net Price: ml+110 to ml+125 [122 to 137]
  // Base Price: ml+125 to ml+140 [137 to 152]
  // Taxable Val: ml+140 to ml+156 [152 to 168]
  // Tax Amt: ml+156 to ml+171 [168 to 183]
  // Total (INR): ml+171 to mr (198) [183 to 198]
  const cols = [16, 74, 81, 95, 110, 125, 140, 156, 171];
  cols.forEach(x => {
    doc.line(ml + x, tableY, ml + x, tableY + 8);
  });

  // Calculate proportional discount for goods items
  const totalDiscountPaise = discountPaise + walletUsedPaise;
  const rawItemsTotalPaise = items.reduce((sum: number, it: any) => sum + (it.unit_price_paise * it.quantity), 0);

  // Print Items
  let currentY = tableY + 8;
  let runningQtySum = 0;
  let runningTaxableSum = 0;
  let runningTaxAmtSum = 0;
  let runningTotalSum = 0;

  // Track goods tax details for tax summary table
  let goodsTaxableTotal = 0;
  let goodsTaxAmtTotal = 0;
  // Let's store primary HSN from first goods item
  let primaryGoodsHSN = "52081190";

  items.forEach((item: any) => {
    const itemHSN = getProductHSN(item);
    primaryGoodsHSN = itemHSN;

    const itemRawTotal = item.unit_price_paise * item.quantity;
    const discountShare = rawItemsTotalPaise > 0 ? Math.round(totalDiscountPaise * (itemRawTotal / rawItemsTotalPaise)) : 0;
    const netTotalPaise = itemRawTotal - discountShare;

    const mrpUnit = item.unit_price_paise / 100;
    const discPerUnit = (discountShare / item.quantity) / 100;
    const netPriceInclTax = netTotalPaise / item.quantity / 100;

    // 5% GST on apparel/fabrics
    const basePriceUnit = netPriceInclTax / 1.05;
    const taxableVal = basePriceUnit * item.quantity;
    const taxAmt = (netPriceInclTax * item.quantity) - taxableVal;
    const totalAmount = netPriceInclTax * item.quantity;

    // Update running totals
    runningQtySum += item.quantity;
    runningTaxableSum += taxableVal;
    runningTaxAmtSum += taxAmt;
    runningTotalSum += totalAmount;

    // Accumulate for tax summary goods row
    goodsTaxableTotal += taxableVal;
    goodsTaxAmtTotal += taxAmt;

    const fullDesc = `${item.name}${item.variant ? ` (${item.variant})` : ""}`;
    const descLines: string[] = doc.splitTextToSize(fullDesc, 55);
    const itemHeight = Math.max(descLines.length * 4.5 + 4, 10);

    // Draw item row values
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(itemHSN, ml + 1, currentY + 5);

    descLines.forEach((line, lineIdx) => {
      doc.text(line, ml + 17, currentY + 5 + (lineIdx * 4));
    });

    // Precise right-alignments inside the column ranges to prevent any overlapping
    doc.text(`${item.quantity}`, ml + 77.5, currentY + 5, { align: "center" });
    doc.text(mrpUnit.toFixed(2), ml + 94, currentY + 5, { align: "right" });
    doc.text(discPerUnit.toFixed(2), ml + 109, currentY + 5, { align: "right" });
    doc.text(netPriceInclTax.toFixed(2), ml + 124, currentY + 5, { align: "right" });
    doc.text(basePriceUnit.toFixed(2), ml + 139, currentY + 5, { align: "right" });
    doc.text(taxableVal.toFixed(2), ml + 155, currentY + 5, { align: "right" });
    doc.text(taxAmt.toFixed(2), ml + 170, currentY + 5, { align: "right" });
    doc.text(totalAmount.toFixed(2), mr - 1, currentY + 5, { align: "right" });

    // Draw vertical cell borders
    cols.forEach(x => {
      doc.line(ml + x, currentY, ml + x, currentY + itemHeight);
    });

    currentY += itemHeight;
    doc.line(ml, currentY, mr, currentY);
  });

  // Courier/Shipping Charges row (if applicable) - SAC Code 99681
  let shippingTaxable = 0;
  let shippingTax = 0;
  let shippingTotal = 0;
  const shippingHSN = "9965"; // Postal and courier services SAC

  if (shippingPaise > 0) {
    shippingTotal = shippingPaise / 100;
    // Courier services generally carry 18% GST
    const shippingBase = shippingTotal / 1.18;
    shippingTaxable = shippingBase;
    shippingTax = shippingTotal - shippingBase;

    runningTaxableSum += shippingTaxable;
    runningTaxAmtSum += shippingTax;
    runningTotalSum += shippingTotal;

    const shippingRowHeight = 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(shippingHSN, ml + 1, currentY + 5);
    doc.text("Courier Charges / Shipping Convenience Fee", ml + 17, currentY + 5);
    doc.text("1", ml + 77.5, currentY + 5, { align: "center" });
    doc.text(shippingTotal.toFixed(2), ml + 94, currentY + 5, { align: "right" });
    doc.text("0.00", ml + 109, currentY + 5, { align: "right" });
    doc.text(shippingTotal.toFixed(2), ml + 124, currentY + 5, { align: "right" });
    doc.text(shippingBase.toFixed(2), ml + 139, currentY + 5, { align: "right" });
    doc.text(shippingBase.toFixed(2), ml + 155, currentY + 5, { align: "right" });
    doc.text(shippingTax.toFixed(2), ml + 170, currentY + 5, { align: "right" });
    doc.text(shippingTotal.toFixed(2), mr - 1, currentY + 5, { align: "right" });

    cols.forEach(x => {
      doc.line(ml + x, currentY, ml + x, currentY + shippingRowHeight);
    });

    currentY += shippingRowHeight;
    doc.line(ml, currentY, mr, currentY);
  }

  // Draw Items Table Totals row
  doc.setFillColor(252, 250, 245);
  doc.rect(ml, currentY, width, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Total :", ml + 17, currentY + 5.5);
  doc.text(`${runningQtySum}`, ml + 77.5, currentY + 5.5, { align: "center" });
  doc.text(runningTaxableSum.toFixed(2), ml + 155, currentY + 5.5, { align: "right" });
  doc.text(runningTaxAmtSum.toFixed(2), ml + 170, currentY + 5.5, { align: "right" });
  doc.text(runningTotalSum.toFixed(2), mr - 1, currentY + 5.5, { align: "right" });

  cols.forEach(x => {
    doc.line(ml + x, currentY, ml + x, currentY + 8);
  });
  currentY += 8;
  doc.line(ml, currentY, mr, currentY);

  // Draw outer vertical borders of the items table
  doc.line(ml, tableY, ml, currentY);
  doc.line(mr, tableY, mr, currentY);

  // --- SECTION 5: TAX SUMMARY SECTION (Grid lines and explicit centered coordinates to avoid any jumbled look) ---
  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Tax Summary", ml + 4, currentY + 4);
  currentY += 6;

  // Tax Table Columns:
  // HSN: ml+4 to ml+24 [16 to 36] (Width 20)
  // CGST: ml+24 to ml+62 [36 to 74] (Width 38)
  // SGST: ml+62 to ml+100 [74 to 112] (Width 38)
  // IGST: ml+100 to ml+138 [112 to 150] (Width 38)
  // Cess: ml+138 to ml+156 [150 to 168] (Width 18)
  // Total Tax: ml+156 to mr-4 [168 to 194] (Width 26)
  const taxCols = [20, 58, 96, 134, 152];
  const taxTableHeight = 8;
  const taxStartY = currentY;
  doc.setFillColor(242, 240, 232);
  doc.rect(ml + 4, currentY, width - 8, taxTableHeight, "F");
  doc.line(ml + 4, taxStartY, mr - 4, taxStartY); // tax table top border
  doc.line(ml + 4, currentY + taxTableHeight, mr - 4, currentY + taxTableHeight);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("HSN Code", ml + 14, currentY + 5.5, { align: "center" });
  doc.text("CGST (Rate/Amt)", ml + 43, currentY + 5.5, { align: "center" });
  doc.text("SGST (Rate/Amt)", ml + 81, currentY + 5.5, { align: "center" });
  doc.text("IGST (Rate/Amt)", ml + 119, currentY + 5.5, { align: "center" });
  doc.text("Cess Amt", ml + 147, currentY + 5.5, { align: "center" });
  doc.text("Total Tax Value", mr - 8, currentY + 5.5, { align: "right" });

  // Draw header vertical divider lines
  taxCols.forEach(x => {
    doc.line(ml + 4 + x, currentY, ml + 4 + x, currentY + taxTableHeight);
  });

  currentY += taxTableHeight;

  // 1. First Row: Goods GST (5%)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(primaryGoodsHSN, ml + 14, currentY + 5, { align: "center" });

  if (isIntraState) {
    doc.text(`2.50 %  |  ${(goodsTaxAmtTotal / 2).toFixed(2)}`, ml + 43, currentY + 5, { align: "center" });
    doc.text(`2.50 %  |  ${(goodsTaxAmtTotal / 2).toFixed(2)}`, ml + 81, currentY + 5, { align: "center" });
    doc.text(`0.00 %  |  0.00`, ml + 119, currentY + 5, { align: "center" });
  } else {
    doc.text(`0.00 %  |  0.00`, ml + 43, currentY + 5, { align: "center" });
    doc.text(`0.00 %  |  0.00`, ml + 81, currentY + 5, { align: "center" });
    doc.text(`5.00 %  |  ${goodsTaxAmtTotal.toFixed(2)}`, ml + 119, currentY + 5, { align: "center" });
  }
  doc.text("0.00", ml + 147, currentY + 5, { align: "center" });
  doc.text(goodsTaxAmtTotal.toFixed(2), mr - 8, currentY + 5, { align: "right" });

  taxCols.forEach(x => {
    doc.line(ml + 4 + x, currentY, ml + 4 + x, currentY + 7);
  });
  currentY += 7;
  doc.line(ml + 4, currentY, mr - 4, currentY);

  // 2. Second Row: Courier/Shipping GST (18%) (if applicable) - SAC Code 99681
  if (shippingPaise > 0) {
    doc.text(shippingHSN, ml + 14, currentY + 5, { align: "center" });
    if (isIntraState) {
      doc.text(`9.00 %  |  ${(shippingTax / 2).toFixed(2)}`, ml + 43, currentY + 5, { align: "center" });
      doc.text(`9.00 %  |  ${(shippingTax / 2).toFixed(2)}`, ml + 81, currentY + 5, { align: "center" });
      doc.text(`0.00 %  |  0.00`, ml + 119, currentY + 5, { align: "center" });
    } else {
      doc.text(`0.00 %  |  0.00`, ml + 43, currentY + 5, { align: "center" });
      doc.text(`0.00 %  |  0.00`, ml + 81, currentY + 5, { align: "center" });
      doc.text(`18.00 %  |  ${shippingTax.toFixed(2)}`, ml + 119, currentY + 5, { align: "center" });
    }
    doc.text("0.00", ml + 147, currentY + 5, { align: "center" });
    doc.text(shippingTax.toFixed(2), mr - 8, currentY + 5, { align: "right" });

    taxCols.forEach(x => {
      doc.line(ml + 4 + x, currentY, ml + 4 + x, currentY + 7);
    });
    currentY += 7;
    doc.line(ml + 4, currentY, mr - 4, currentY);
  }

  // Tax Table Totals Row
  doc.setFillColor(250, 248, 242);
  doc.rect(ml + 4, currentY, width - 8, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("TOTAL TAX", ml + 14, currentY + 5, { align: "center" });
  if (isIntraState) {
    const totalCGST = (goodsTaxAmtTotal / 2) + (shippingTax / 2);
    doc.text(totalCGST.toFixed(2), ml + 43, currentY + 5, { align: "center" });
    doc.text(totalCGST.toFixed(2), ml + 81, currentY + 5, { align: "center" });
    doc.text("0.00", ml + 119, currentY + 5, { align: "center" });
  } else {
    doc.text("0.00", ml + 43, currentY + 5, { align: "center" });
    doc.text("0.00", ml + 81, currentY + 5, { align: "center" });
    doc.text(runningTaxAmtSum.toFixed(2), ml + 119, currentY + 5, { align: "center" });
  }
  doc.text("0.00", ml + 147, currentY + 5, { align: "center" });
  doc.text(runningTaxAmtSum.toFixed(2), mr - 8, currentY + 5, { align: "right" });

  taxCols.forEach(x => {
    doc.line(ml + 4 + x, currentY, ml + 4 + x, currentY + 7);
  });
  currentY += 7;
  doc.line(ml + 4, currentY, mr - 4, currentY);

  // Draw outer borders of the Tax Summary table
  doc.line(ml + 4, taxStartY, ml + 4, currentY);
  doc.line(mr - 4, taxStartY, mr - 4, currentY);

  // --- SECTION 6: SUMMARY METADATA STRIP ---
  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`TOTAL INVOICE VALUE: INR ${runningTotalSum.toFixed(2)}`, ml + 4, currentY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`TOTAL IN WORDS: ${numberToWords(runningTotalSum)}`, ml + 4, currentY + 9);
  doc.setFont("helvetica", "bold");
  doc.text(`NET PAYABLE AMOUNT: INR ${runningTotalSum.toFixed(2)}`, ml + 4, currentY + 14);

  // Fine lines details disclaimer
  currentY += 19;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text("1. Products being sent under this tax invoice are for consumer usage and not intended for commercial trade re-sale.", ml + 4, currentY);
  doc.text("2. This tax invoice reflects applicable Input Tax credit benefits shared downstream where business registration is validated.", ml + 4, currentY + 4);

  // Bottom Legal metadata
  currentY = 270;
  doc.line(ml, currentY, mr, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text("E. & O. E.", ml + 4, currentY + 5);
  doc.text("An electronic tax invoice generated in compliance under provisions of the IT Act, 2000.", ml + 4, currentY + 9);

  // Right Signatory box
  doc.setFont("helvetica", "bold");
  doc.text("For JAI SRI RAM TEXTILES", mr - 60, currentY + 5);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Authorized Signatory (Digital)", mr - 60, currentY + 11);

  // Draw border surrounding page contents at the end to ensure it overlays cleanly on top of all filled regions
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(ml, mt, width, 273);
}
