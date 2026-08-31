import { EmailBlock } from "./types";

const BRAND_LOGO_URL =
  "https://res.cloudinary.com/vgwavi5t/image/upload/v1783939101/jai-sri-ram-textiles/brand/logo-ram.jpg";

export function compileEmailHtml(
  blocks: EmailBlock[],
  options: {
    previewText?: string;
    siteUrl?: string;
  } = {}
): string {
  const { previewText = "", siteUrl = "https://jaisriramtextiles.in" } = options;

  const renderedBlocks = blocks.map((block) => renderBlock(block, siteUrl)).join("\n");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title></title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* CSS Reset */
    html, body {
      margin: 0 auto !important;
      padding: 0 !important;
      height: 100% !important;
      width: 100% !important;
      background-color: #F5F2EB !important;
      background-image: linear-gradient(#F5F2EB, #F5F2EB) !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    div[style*="margin: 16px 0"] {
      margin: 0 !important;
    }
    table, td {
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }
    table {
      border-spacing: 0 !important;
      border-collapse: collapse !important;
      margin: 0 auto !important;
    }
    img {
      -ms-interpolation-mode: bicubic;
      max-width: 100%;
      display: block;
    }
    a {
      text-decoration: none;
      color: #B08D4C;
    }

    /* Dark Mode Protection for Gmail App */
    @media (prefers-color-scheme: dark) {
      body, .email-bg {
        background-color: #F5F2EB !important;
        background-image: linear-gradient(#F5F2EB, #F5F2EB) !important;
        color: #2A2622 !important;
      }
      .email-container, .email-card {
        background-color: #FDFBF7 !important;
        background-image: linear-gradient(#FDFBF7, #FDFBF7) !important;
        color: #2A2622 !important;
        border-color: #E5DFD2 !important;
      }
      .mobile-header {
        background-color: #F3ECDD !important;
        background-image: linear-gradient(#F3ECDD, #F3ECDD) !important;
      }
      .mobile-logo, h1, h2, h3, h4, p, td, span, div, strong, b {
        color: #2A2622 !important;
      }
    }
    [data-ogsb] body, [data-ogsb] .email-bg {
      background-color: #F5F2EB !important;
      background-image: linear-gradient(#F5F2EB, #F5F2EB) !important;
    }
    [data-ogsb] .email-container, [data-ogsb] .email-card {
      background-color: #FDFBF7 !important;
      background-image: linear-gradient(#FDFBF7, #FDFBF7) !important;
    }
    [data-ogsb] .mobile-header {
      background-color: #F3ECDD !important;
      background-image: linear-gradient(#F3ECDD, #F3ECDD) !important;
    }
    [data-ogsc] .mobile-logo {
      color: #8A6D33 !important;
    }

    /* Mobile Styles */
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: auto !important;
        border-radius: 0 !important;
      }
      .mobile-padding {
        padding-left: 14px !important;
        padding-right: 14px !important;
      }
      .mobile-header {
        padding: 12px 10px !important;
      }
      .mobile-logo {
        font-size: 13px !important;
        letter-spacing: 0.8px !important;
      }
      .mobile-logo-sub {
        font-size: 7px !important;
        letter-spacing: 1.2px !important;
      }
      .mobile-badge {
        font-size: 8.5px !important;
        padding: 2px 5px !important;
      }
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      .mobile-grid-cell {
        display: block !important;
        width: 100% !important;
        margin-bottom: 16px !important;
      }
      .mobile-center {
        text-align: center !important;
      }
      .mobile-text-xl {
        font-size: 22px !important;
        line-height: 1.25 !important;
      }
      .mobile-button {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body class="email-bg" style="margin: 0; padding: 0; background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  ${
    previewText
      ? `<!-- Preview Text Hidden Hack -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
    ${previewText}
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>`
      : ""
  }

  <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-bg" style="background-color: #F5F2EB; padding: 16px 6px;">
    <tr>
      <td align="center" valign="top">
        <!-- Main Email Card -->
        <table class="email-container email-card" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #FDFBF7; border: 1px solid #E5DFD2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(42, 38, 34, 0.06);">
          ${renderedBlocks}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderBlock(block: EmailBlock, siteUrl: string): string {
  const { type, content = {} } = block;

  switch (type) {
    case "header":
      return `
        <!-- Block: Header -->
        <tr>
          <td class="mobile-header" style="background-color: #F3ECDD; padding: 14px 18px; border-bottom: 3px solid #B08D4C;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="table-layout: auto;">
              <tr>
                <td style="vertical-align: middle; white-space: nowrap; text-align: left;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="table-layout: auto;">
                    <tr>
                      <td style="width: 40px; min-width: 40px; max-width: 40px; padding-right: 10px; vertical-align: middle;">
                        <img src="${content.logoUrl || BRAND_LOGO_URL}" alt="JAI SRI RAM TEXTILES" width="36" height="36" style="width: 36px; min-width: 36px; max-width: 36px; height: 36px; min-height: 36px; max-height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #B08D4C; display: block;" />
                      </td>
                      <td style="vertical-align: middle; white-space: nowrap;">
                        <div class="mobile-logo" style="font-family: 'Times New Roman', Georgia, serif; font-size: 15px; font-weight: bold; color: #8A6D33; letter-spacing: 1.2px; text-transform: uppercase; line-height: 1.2; white-space: nowrap;">
                          ${content.brandName || "JAI SRI RAM TEXTILES"}
                        </div>
                        <div class="mobile-logo-sub" style="font-family: Arial, sans-serif; font-size: 7.5px; font-weight: bold; color: #6E655A; letter-spacing: 1.8px; text-transform: uppercase; margin-top: 2px; white-space: nowrap;">
                          ${content.tagline || "Authentic Handlooms • Komarapalayam"}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
                ${
                  content.rightBadge
                    ? `<td align="right" style="vertical-align: middle; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #B08D4C; text-transform: uppercase; letter-spacing: 0.5px; padding-left: 8px; white-space: nowrap;">
                        <span class="mobile-badge" style="display: inline-block; background-color: rgba(176, 141, 76, 0.12); border: 1px solid rgba(176, 141, 76, 0.3); border-radius: 4px; padding: 3px 7px;">
                          ${content.rightBadge}
                        </span>
                      </td>`
                    : ""
                }
              </tr>
            </table>
          </td>
        </tr>`;

    case "heading":
      return `
        <!-- Block: Heading -->
        <tr>
          <td class="mobile-padding" style="padding: ${content.paddingTop || 24}px 32px ${content.paddingBottom || 8}px 32px; text-align: ${content.align || "center"};">
            <h1 class="mobile-text-xl" style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: ${content.size || 28}px; font-weight: bold; color: ${content.color || "#1A1612"}; line-height: 1.25;">
              ${content.text || "Exclusive Handloom Collection"}
            </h1>
            ${
              content.subtitle
                ? `<p style="margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #6E655A; line-height: 1.5;">
                    ${content.subtitle}
                  </p>`
                : ""
            }
          </td>
        </tr>`;

    case "text":
      return `
        <!-- Block: Text -->
        <tr>
          <td class="mobile-padding" style="padding: ${content.paddingTop || 12}px 32px ${content.paddingBottom || 12}px 32px; text-align: ${content.align || "left"};">
            <div style="font-family: Arial, sans-serif; font-size: ${content.fontSize || 14}px; line-height: ${content.lineHeight || 1.6}; color: ${content.color || "#2A2622"};">
              ${content.text || "Hello {{first_name}}, welcome to our exclusive collection."}
            </div>
          </td>
        </tr>`;

    case "image":
      return `
        <!-- Block: Image -->
        <tr>
          <td align="center" style="padding: ${content.paddingTop || 8}px ${content.fullWidth ? 0 : 24}px ${content.paddingBottom || 12}px ${content.fullWidth ? 0 : 24}px;">
            ${content.linkUrl ? `<a href="${content.linkUrl}" target="_blank" style="text-decoration: none; display: block;">` : ""}
              <img src="${content.url || "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_1200/jai-sri-ram-textiles/placeholders/gold-border-veshti"}" alt="${content.alt || "Product Banner"}" style="width: 100%; max-width: ${content.fullWidth ? "600px" : "552px"}; border-radius: ${content.fullWidth ? "0" : "8px"}; border: ${content.border ? "1px solid #E5DFD2" : "none"}; display: block;" />
            ${content.linkUrl ? `</a>` : ""}
            ${content.caption ? `<p style="margin: 6px 0 0 0; font-size: 11px; color: #9A9084; font-family: Arial, sans-serif;">${content.caption}</p>` : ""}
          </td>
        </tr>`;

    case "button":
      return `
        <!-- Block: Button -->
        <tr>
          <td class="mobile-padding" align="${content.align || "center"}" style="padding: ${content.paddingTop || 16}px 32px ${content.paddingBottom || 20}px 32px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: ${content.align === "center" ? "0 auto" : content.align === "right" ? "0 0 0 auto" : "0"};">
              <tr>
                <td align="center" style="border-radius: ${content.rounded ? "9999px" : "6px"}; background-color: ${content.bgColor || "#B08D4C"};">
                  <a href="${content.url || siteUrl + "/shop"}" target="_blank" class="mobile-button" style="display: inline-block; padding: 14px 32px; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: ${content.textColor || "#FFFFFF"}; text-decoration: none; border-radius: ${content.rounded ? "9999px" : "6px"}; text-transform: uppercase; letter-spacing: 1.5px; border: 1px solid ${content.bgColor || "#B08D4C"};">
                    ${content.text || "Explore Collection"}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

    case "divider":
      return `
        <!-- Block: Divider -->
        <tr>
          <td style="padding: ${content.padding || 16}px 32px;">
            <div style="height: 1px; background: linear-gradient(90deg, transparent, #B08D4C 30%, #B08D4C 70%, transparent); opacity: ${content.opacity || 0.6};"></div>
          </td>
        </tr>`;

    case "spacer":
      return `
        <!-- Block: Spacer -->
        <tr>
          <td height="${content.height || 24}" style="height: ${content.height || 24}px; font-size: 1px; line-height: 1px;">&nbsp;</td>
        </tr>`;

    case "coupon_box":
      return `
        <!-- Block: Coupon Box -->
        <tr>
          <td class="mobile-padding" style="padding: 16px 28px;">
            <div style="background-color: #F8F4EA; border: 2px dashed #B08D4C; border-radius: 8px; padding: 20px; text-align: center;">
              <div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #8A6D33; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                ${content.title || "SPECIAL DISCOUNT CODE"}
              </div>
              <div style="display: inline-block; background-color: #FFFFFF; border: 1px solid #E5DFD2; padding: 10px 24px; border-radius: 6px; font-family: monospace; font-size: 22px; font-weight: bold; color: #1A1612; letter-spacing: 3px; margin: 8px 0; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                ${content.code || "FESTIVE10"}
              </div>
              <p style="margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 12px; color: #6E655A;">
                ${content.description || "Use this code at checkout to get flat 10% off your purchase."}
              </p>
              ${
                content.expiry
                  ? `<div style="margin-top: 6px; font-size: 10.5px; color: #A24B3E; font-weight: bold;">Expires on: ${content.expiry}</div>`
                  : ""
              }
            </div>
          </td>
        </tr>`;

    case "product_card":
      return `
        <!-- Block: Single Product Card -->
        <tr>
          <td class="mobile-padding" style="padding: 16px 28px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; overflow: hidden;">
              <tr>
                <td class="mobile-stack" width="40%" style="vertical-align: top; padding: 0;">
                  <a href="${content.productUrl || siteUrl + "/shop"}" style="display: block;">
                    <img src="${content.imageUrl || "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_600/jai-sri-ram-textiles/placeholders/gold-border-veshti"}" alt="${content.title || "Product"}" style="width: 100%; height: 180px; object-fit: cover; display: block;" />
                  </a>
                </td>
                <td class="mobile-stack" width="60%" style="padding: 20px; vertical-align: middle;">
                  ${content.category ? `<div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #8A6D33; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${content.category}</div>` : ""}
                  <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: bold; color: #1A1612; margin-bottom: 6px; line-height: 1.3;">
                    ${content.title || "Classic White Veshti — 2 Metre"}
                  </div>
                  <div style="font-family: Arial, sans-serif; font-size: 12px; color: #6E655A; line-height: 1.4; margin-bottom: 12px;">
                    ${content.description || "Pure combed cotton with traditional woven gold zari border."}
                  </div>
                  <div style="margin-bottom: 14px;">
                    <span style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #1A1612;">${content.price || "₹749"}</span>
                    ${content.compareAt ? `<span style="font-family: Arial, sans-serif; font-size: 13px; color: #9A9084; text-decoration: line-through; margin-left: 6px;">${content.compareAt}</span>` : ""}
                    ${content.discount ? `<span style="display: inline-block; background-color: #A24B3E; color: #FFFFFF; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 3px; margin-left: 6px;">${content.discount}</span>` : ""}
                  </div>
                  <div>
                    <a href="${content.productUrl || siteUrl + "/shop"}" target="_blank" style="display: inline-block; padding: 9px 20px; background-color: #1A1612; color: #FDFBF7; font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                      Shop Now
                    </a>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

    case "product_grid":
      const items = content.items || [];
      const itemRows = [];
      for (let i = 0; i < items.length; i += 2) {
        const item1 = items[i];
        const item2 = items[i + 1];
        itemRows.push(`
          <tr>
            <td class="mobile-grid-cell" width="48%" style="vertical-align: top; padding-bottom: 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; overflow: hidden; height: 100%;">
                <tr>
                  <td>
                    <a href="${item1.productUrl || siteUrl + "/shop"}" style="display: block;">
                      <img src="${item1.imageUrl}" alt="${item1.title}" style="width: 100%; height: 150px; object-fit: cover; display: block;" />
                    </a>
                    <div style="padding: 14px;">
                      <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: bold; color: #1A1612; line-height: 1.3; height: 34px; overflow: hidden;">
                        ${item1.title}
                      </div>
                      <div style="margin-top: 8px; margin-bottom: 12px;">
                        <span style="font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #1A1612;">${item1.price}</span>
                        ${item1.compareAt ? `<span style="font-family: Arial, sans-serif; font-size: 11px; color: #9A9084; text-decoration: line-through; margin-left: 4px;">${item1.compareAt}</span>` : ""}
                      </div>
                      <a href="${item1.productUrl || siteUrl + "/shop"}" target="_blank" style="display: block; text-align: center; padding: 8px 12px; background-color: #F3ECDD; border: 1px solid #B08D4C; color: #1A1612; font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 4px; text-transform: uppercase;">
                        View Product
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td width="4%">&nbsp;</td>
            ${
              item2
                ? `
            <td class="mobile-grid-cell" width="48%" style="vertical-align: top; padding-bottom: 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; overflow: hidden; height: 100%;">
                <tr>
                  <td>
                    <a href="${item2.productUrl || siteUrl + "/shop"}" style="display: block;">
                      <img src="${item2.imageUrl}" alt="${item2.title}" style="width: 100%; height: 150px; object-fit: cover; display: block;" />
                    </a>
                    <div style="padding: 14px;">
                      <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: bold; color: #1A1612; line-height: 1.3; height: 34px; overflow: hidden;">
                        ${item2.title}
                      </div>
                      <div style="margin-top: 8px; margin-bottom: 12px;">
                        <span style="font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #1A1612;">${item2.price}</span>
                        ${item2.compareAt ? `<span style="font-family: Arial, sans-serif; font-size: 11px; color: #9A9084; text-decoration: line-through; margin-left: 4px;">${item2.compareAt}</span>` : ""}
                      </div>
                      <a href="${item2.productUrl || siteUrl + "/shop"}" target="_blank" style="display: block; text-align: center; padding: 8px 12px; background-color: #F3ECDD; border: 1px solid #B08D4C; color: #1A1612; font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 4px; text-transform: uppercase;">
                        View Product
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>`
                : `<td width="48%">&nbsp;</td>`
            }
          </tr>
        `);
      }

      return `
        <!-- Block: Product Grid -->
        <tr>
          <td class="mobile-padding" style="padding: 16px 28px;">
            ${
              content.sectionTitle
                ? `<div style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: bold; color: #1A1612; margin-bottom: 16px; text-align: center;">${content.sectionTitle}</div>`
                : ""
            }
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              ${itemRows.join("")}
            </table>
          </td>
        </tr>`;

    case "trust_badges":
      return `
        <!-- Block: Trust Badges -->
        <tr>
          <td style="padding: 20px 24px; background-color: #1A1612; color: #E5DFD2;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td align="center" width="33%" style="font-family: Arial, sans-serif; font-size: 10px; line-height: 1.3; color: #E5DFD2; padding: 0 4px;">
                  <div style="font-size: 16px; margin-bottom: 4px;">✨</div>
                  <strong style="color: #FFFFFF; font-size: 10.5px;">100% Authentic</strong><br/>
                  <span style="color: #9A9084; font-size: 9px;">Heritage Handlooms</span>
                </td>
                <td align="center" width="33%" style="font-family: Arial, sans-serif; font-size: 10px; line-height: 1.3; color: #E5DFD2; border-left: 1px solid #332C24; border-right: 1px solid #332C24; padding: 0 4px;">
                  <div style="font-size: 16px; margin-bottom: 4px;">🚚</div>
                  <strong style="color: #FFFFFF; font-size: 10.5px;">Free Shipping</strong><br/>
                  <span style="color: #9A9084; font-size: 9px;">On orders over ₹699</span>
                </td>
                <td align="center" width="33%" style="font-family: Arial, sans-serif; font-size: 10px; line-height: 1.3; color: #E5DFD2; padding: 0 4px;">
                  <div style="font-size: 16px; margin-bottom: 4px;">💰</div>
                  <strong style="color: #FFFFFF; font-size: 10.5px;">Cashback Rewards</strong><br/>
                  <span style="color: #9A9084; font-size: 9px;">On every order</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

    case "html_block":
      return `
        <!-- Block: Custom HTML -->
        <tr>
          <td class="mobile-padding" style="padding: 16px 28px;">
            ${content.html || ""}
          </td>
        </tr>`;

    case "footer":
      return `
        <!-- Block: Footer -->
        <tr>
          <td style="padding: 24px 28px; background-color: #F7F5EE; border-top: 1px solid #E5DFD2; text-align: center; font-family: Arial, sans-serif; font-size: 11px; color: #6E655A; line-height: 1.6;">
            <div style="font-weight: bold; font-size: 12px; color: #1A1612; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
              ${content.storeName || "JAI SRI RAM TEXTILES"}
            </div>
            <div style="margin-bottom: 12px; color: #6E655A;">
              5/136/5, Shasti Smart City, Kallankattuvalasu, Komarapalayam, Namakkal, Tamil Nadu - 638183<br/>
              Support: <a href="mailto:jaisriramtextilekpm@gmail.com" style="color: #B08D4C; font-weight: bold;">jaisriramtextilekpm@gmail.com</a>
            </div>
            <div style="font-size: 10.5px; color: #9A9084; border-top: 1px solid #E5DFD2; padding-top: 12px; margin-top: 12px;">
              You received this email because you registered or placed an order at JAI SRI RAM TEXTILES.<br/>
              To manage your email preferences or opt-out, <a href="{{unsubscribe_link}}" target="_blank" style="color: #B08D4C; text-decoration: underline; font-weight: bold;">Unsubscribe here</a>.
            </div>
          </td>
        </tr>`;

    default:
      return "";
  }
}
