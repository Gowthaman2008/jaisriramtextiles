import { EmailTemplate } from "./types";

export const BUILT_IN_TEMPLATES: EmailTemplate[] = [
  {
    id: "tpl-festive-sale",
    name: "Festive Grand Sale & Special Offers",
    category: "festival",
    subject: "🪔 Festive Grand Sale — Pure Handlooms Woven for Celebrations!",
    preview_text: "Enjoy up to 20% off authentic dhotis, towels and scarfs from our looms.",
    is_built_in: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content_json: [
      {
        id: "hdr-1",
        type: "header",
        content: {
          brandName: "JAI SRI RAM TEXTILES",
          tagline: "Authentic Handlooms • Komarapalayam",
          rightBadge: "🪔 FESTIVE SALE",
        },
      },
      {
        id: "img-1",
        type: "image",
        content: {
          url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_1200/jai-sri-ram-textiles/placeholders/gold-border-veshti",
          alt: "Festive Collection",
          fullWidth: true,
        },
      },
      {
        id: "h-1",
        type: "heading",
        content: {
          text: "Woven with Tradition, Crafted for Celebration",
          subtitle: "Celebrate your auspicious occasions with pure combed cotton and genuine zari borders.",
          size: 26,
        },
      },
      {
        id: "txt-1",
        type: "text",
        content: {
          text: "Hello <strong>{{first_name}}</strong>,<br/><br/>Festivals are made special by timeless traditions. Straight from our master weavers in Komarapalayam, we bring you our finest collection of pure cotton dhotis, absorbent bath towels, and handloom scarfs.",
        },
      },
      {
        id: "cpn-1",
        type: "coupon_box",
        content: {
          title: "SPECIAL FESTIVE PROMO CODE",
          code: "FESTIVE10",
          description: "Apply at checkout to enjoy a flat 10% discount on your entire order.",
          expiry: "Limited Period",
        },
      },
      {
        id: "btn-1",
        type: "button",
        content: {
          text: "Explore Festive Collection",
          url: "https://jaisriramtextiles.in/shop",
          bgColor: "#B08D4C",
          textColor: "#FFFFFF",
          rounded: true,
        },
      },
      {
        id: "tb-1",
        type: "trust_badges",
        content: {},
      },
      {
        id: "ftr-1",
        type: "footer",
        content: {
          storeName: "JAI SRI RAM TEXTILES",
        },
      },
    ],
  },
  {
    id: "tpl-welcome-gift",
    name: "Customer Welcome & 10% Welcome Voucher",
    category: "welcome",
    subject: "✨ Welcome to Jai Sri Ram Textiles — Here is your ₹10% Welcome Gift",
    preview_text: "Start exploring our authentic Tamil Nadu handloom collections today.",
    is_built_in: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content_json: [
      {
        id: "hdr-welcome",
        type: "header",
        content: {
          brandName: "JAI SRI RAM TEXTILES",
          tagline: "Authentic Handlooms • Komarapalayam",
          rightBadge: "WELCOME GIFT",
        },
      },
      {
        id: "h-welcome",
        type: "heading",
        content: {
          text: "Welcome to the Family, {{first_name}}!",
          subtitle: "Discover the unparalleled comfort and heritage of pure combed cotton handlooms.",
          size: 26,
        },
      },
      {
        id: "txt-welcome",
        type: "text",
        content: {
          text: "Thank you for joining us at JAI SRI RAM TEXTILES! Every garment we weave is made on heritage pit looms in Komarapalayam, Tamil Nadu — using fine combed cotton and authentic metallic zari threads.",
        },
      },
      {
        id: "cpn-welcome",
        type: "coupon_box",
        content: {
          title: "YOUR FIRST PURCHASE VOUCHER",
          code: "WELCOME10",
          description: "Get 10% OFF your very first order at checkout. No minimum purchase required!",
        },
      },
      {
        id: "btn-welcome",
        type: "button",
        content: {
          text: "Claim Your Welcome Offer",
          url: "https://jaisriramtextiles.in/shop",
          bgColor: "#1A1612",
          textColor: "#FFFFFF",
        },
      },
      {
        id: "tb-welcome",
        type: "trust_badges",
        content: {},
      },
      {
        id: "ftr-welcome",
        type: "footer",
        content: {
          storeName: "JAI SRI RAM TEXTILES",
        },
      },
    ],
  },
  {
    id: "tpl-new-arrivals",
    name: "New Arrivals Off The Loom",
    category: "new_arrivals" as any,
    subject: "✨ Fresh Off The Loom — Explore Our New Handloom Arrivals",
    preview_text: "New designs, rich colour borders, and premium dhotis are now in stock.",
    is_built_in: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content_json: [
      {
        id: "hdr-new",
        type: "header",
        content: {
          brandName: "JAI SRI RAM TEXTILES",
          tagline: "Authentic Handlooms • Komarapalayam",
          rightBadge: "NEW ARRIVALS",
        },
      },
      {
        id: "h-new",
        type: "heading",
        content: {
          text: "Fresh off the Loom — Handcrafted for You",
          subtitle: "Explore our newest handloom creations with intricate borders and superior breathability.",
          size: 26,
        },
      },
      {
        id: "txt-new",
        type: "text",
        content: {
          text: "Hi <strong>{{first_name}}</strong>,<br/><br/>Our weavers have just finished the latest batch of combed cotton dhotis and soft bath towels. Stock is limited for each weave, so order early to ensure your favorite designs don't sell out.",
        },
      },
      {
        id: "btn-new",
        type: "button",
        content: {
          text: "Shop New Arrivals",
          url: "https://jaisriramtextiles.in/shop?sort=newest",
          bgColor: "#B08D4C",
          textColor: "#FFFFFF",
          rounded: true,
        },
      },
      {
        id: "tb-new",
        type: "trust_badges",
        content: {},
      },
      {
        id: "ftr-new",
        type: "footer",
        content: {
          storeName: "JAI SRI RAM TEXTILES",
        },
      },
    ],
  },
  {
    id: "tpl-re-engagement",
    name: "Customer Re-Engagement & Special Reward",
    category: "re_engagement",
    subject: "🌸 We Miss You, {{first_name}} — Here is a Special Treat For You!",
    preview_text: "Come back to your favorite handloom textiles with an exclusive discount.",
    is_built_in: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content_json: [
      {
        id: "hdr-re",
        type: "header",
        content: {
          brandName: "JAI SRI RAM TEXTILES",
          tagline: "Authentic Handlooms • Komarapalayam",
          rightBadge: "SPECIAL REWARD",
        },
      },
      {
        id: "h-re",
        type: "heading",
        content: {
          text: "It's Been a While, {{first_name}}!",
          subtitle: "We'd love to welcome you back with a special gift from our master weavers.",
          size: 26,
        },
      },
      {
        id: "txt-re",
        type: "text",
        content: {
          text: "We noticed you haven't visited us recently. We've added exciting new cotton collections, enhanced our cashback rewards, and sped up delivery across India.<br/><br/>To celebrate your return, here is an exclusive coupon code for your next order:",
        },
      },
      {
        id: "cpn-re",
        type: "coupon_box",
        content: {
          title: "WELCOME BACK VOUCHER",
          code: "COMEBACK10",
          description: "Get 10% off your entire cart + earn instant cashback into your wallet.",
        },
      },
      {
        id: "btn-re",
        type: "button",
        content: {
          text: "Revisit Your Collection",
          url: "https://jaisriramtextiles.in/shop",
          bgColor: "#B08D4C",
          textColor: "#FFFFFF",
          rounded: true,
        },
      },
      {
        id: "tb-re",
        type: "trust_badges",
        content: {},
      },
      {
        id: "ftr-re",
        type: "footer",
        content: {
          storeName: "JAI SRI RAM TEXTILES",
        },
      },
    ],
  },
];
