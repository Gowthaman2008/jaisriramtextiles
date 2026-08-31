"use client";

import React, { useState } from "react";
import { EmailBlock, EmailBlockType } from "@/lib/marketing/types";
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Type,
  Heading as HeadingIcon,
  Image as ImageIcon,
  MousePointer,
  Minus,
  Sparkles,
  ShoppingBag,
  Ticket,
  ShieldCheck,
  Code,
  Layout,
  Smartphone,
  Monitor,
  Send,
  Eye,
  RefreshCw,
  Copy,
  ChevronDown
} from "lucide-react";
import { compileEmailHtml } from "@/lib/marketing/email-compiler";

interface EmailBuilderProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
  products?: any[];
  coupons?: any[];
  previewText?: string;
  onSendTest?: (emails: string[]) => Promise<void>;
  sendingTest?: boolean;
}

export function EmailBuilder({
  blocks,
  onChange,
  products = [],
  coupons = [],
  previewText = "",
  onSendTest,
  sendingTest = false,
}: EmailBuilderProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(blocks[0]?.id || null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState("");
  const [showInsertTagDropdown, setShowInsertTagDropdown] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  const addBlock = (type: EmailBlockType) => {
    let newBlock: EmailBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      content: {},
    };

    switch (type) {
      case "header":
        newBlock.content = {
          brandName: "JAI SRI RAM TEXTILES",
          tagline: "Authentic Handlooms • Komarapalayam",
          rightBadge: "SPECIAL OFFER",
        };
        break;
      case "heading":
        newBlock.content = {
          text: "Woven with Tradition, Crafted for You",
          subtitle: "Explore our signature collection of pure combed cotton handlooms.",
          size: 26,
          align: "center",
        };
        break;
      case "text":
        newBlock.content = {
          text: "Hello <strong>{{first_name}}</strong>,<br/><br/>We are delighted to share our latest creations fresh off our heritage looms in Komarapalayam. Every piece is woven with 100% pure combed cotton and real zari borders.",
          align: "left",
          fontSize: 14,
        };
        break;
      case "image":
        newBlock.content = {
          url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_1200/jai-sri-ram-textiles/placeholders/gold-border-veshti",
          alt: "Handloom Collection",
          caption: "Handcrafted pure cotton veshtis with genuine zari border.",
          fullWidth: false,
          linkUrl: "https://jaisriramtextiles.in/shop",
        };
        break;
      case "button":
        newBlock.content = {
          text: "Explore Full Collection",
          url: "https://jaisriramtextiles.in/shop",
          bgColor: "#B08D4C",
          textColor: "#FFFFFF",
          align: "center",
          rounded: true,
        };
        break;
      case "divider":
        newBlock.content = { padding: 16, opacity: 0.6 };
        break;
      case "spacer":
        newBlock.content = { height: 24 };
        break;
      case "coupon_box":
        newBlock.content = {
          title: "SPECIAL DISCOUNT CODE",
          code: coupons[0]?.code || "FESTIVE10",
          description: "Use this coupon code at checkout to enjoy special savings on your order.",
          expiry: "Limited Period Offer",
        };
        break;
      case "product_card":
        const p1 = products[0];
        newBlock.content = {
          title: p1 ? p1.name : "Classic White Veshti — 2 Metre",
          category: p1?.categories?.name || "White Dhoti",
          description: "Pure combed cotton with traditional woven gold zari border.",
          price: p1 ? `₹${(p1.price_paise / 100).toFixed(0)}` : "₹749",
          compareAt: p1?.compare_at_paise ? `₹${(p1.compare_at_paise / 100).toFixed(0)}` : "₹999",
          discount: "25% OFF",
          imageUrl: p1?.product_images?.[0]?.url || "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_600/jai-sri-ram-textiles/placeholders/gold-border-veshti",
          productUrl: p1 ? `https://jaisriramtextiles.in/product/${p1.slug}` : "https://jaisriramtextiles.in/shop",
        };
        break;
      case "product_grid":
        newBlock.content = {
          sectionTitle: "Recommended Handloom Favorites",
          items: products.slice(0, 2).map((p) => ({
            title: p.name,
            price: `₹${(p.price_paise / 100).toFixed(0)}`,
            compareAt: p.compare_at_paise ? `₹${(p.compare_at_paise / 100).toFixed(0)}` : undefined,
            imageUrl: p.product_images?.[0]?.url || "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_600/jai-sri-ram-textiles/placeholders/white-dhoti",
            productUrl: `https://jaisriramtextiles.in/product/${p.slug}`,
          })),
        };
        break;
      case "trust_badges":
        newBlock.content = {};
        break;
      case "footer":
        newBlock.content = {
          storeName: "JAI SRI RAM TEXTILES",
        };
        break;
      case "html_block":
        newBlock.content = {
          html: `<div style="padding: 12px; background-color: #FBF9F4; border-radius: 6px; text-align: center; font-size: 13px; color: #8A6D33;">Custom banner announcement block</div>`,
        };
        break;
    }

    const updated = [...blocks, newBlock];
    onChange(updated);
    setSelectedBlockId(newBlock.id);
  };

  const updateBlockContent = (blockId: string, updates: Record<string, any>) => {
    const updated = blocks.map((b) => (b.id === blockId ? { ...b, content: { ...b.content, ...updates } } : b));
    onChange(updated);
  };

  const removeBlock = (blockId: string) => {
    const updated = blocks.filter((b) => b.id !== blockId);
    onChange(updated);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(updated[0]?.id || null);
    }
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const copy = [...blocks];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    onChange(copy);
  };

  const compiledHtml = compileEmailHtml(blocks, {
    previewText,
  });

  const insertMergeTag = (tag: string) => {
    if (!selectedBlock || (selectedBlock.type !== "text" && selectedBlock.type !== "heading")) return;
    const currentText = selectedBlock.content.text || "";
    updateBlockContent(selectedBlock.id, { text: currentText + " " + tag });
    setShowInsertTagDropdown(false);
  };

  return (
    <div className="space-y-6">
      {/* Top action toolbar */}
      <div className="bg-white border border-line rounded-card p-4 shadow-soft flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-taupe uppercase tracking-wider">Preview Mode:</span>
          <div className="flex bg-cream/55 p-1 rounded-lg border border-line">
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                previewMode === "desktop" ? "bg-ink text-ivory shadow-sm" : "text-taupe hover:text-ink"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                previewMode === "mobile" ? "bg-ink text-ivory shadow-sm" : "text-taupe hover:text-ink"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className="px-3 py-1.5 rounded-lg border border-zari text-zari-deep hover:bg-zari/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> Send Test Email
          </button>
        </div>
      </div>

      {/* Main visual builder grid: [Block Palette & Hierarchy | Selected Block Inspector | Live Interactive Preview] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Blocks Palette & Reorder Hierarchy (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Add Blocks Palette */}
          <div className="bg-white border border-line rounded-card p-4 shadow-soft">
            <h3 className="text-xs font-bold text-taupe uppercase tracking-wider mb-3">Add Content Block</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "header", label: "Header & Logo", icon: <Layout className="w-3.5 h-3.5" /> },
                { type: "heading", label: "Heading", icon: <HeadingIcon className="w-3.5 h-3.5" /> },
                { type: "text", label: "Text Block", icon: <Type className="w-3.5 h-3.5" /> },
                { type: "image", label: "Image Banner", icon: <ImageIcon className="w-3.5 h-3.5" /> },
                { type: "button", label: "Action Button", icon: <MousePointer className="w-3.5 h-3.5" /> },
                { type: "product_card", label: "Product Card", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
                { type: "product_grid", label: "Product Grid (2x)", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
                { type: "coupon_box", label: "Coupon Code", icon: <Ticket className="w-3.5 h-3.5" /> },
                { type: "trust_badges", label: "Trust Badges", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                { type: "divider", label: "Divider Rule", icon: <Minus className="w-3.5 h-3.5" /> },
                { type: "footer", label: "Footer & Unsub", icon: <Layout className="w-3.5 h-3.5" /> },
                { type: "html_block", label: "Custom HTML", icon: <Code className="w-3.5 h-3.5" /> },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addBlock(item.type as EmailBlockType)}
                  className="p-2.5 rounded-lg border border-line bg-cream/15 hover:bg-cream/40 text-left text-xs font-semibold text-ink flex items-center gap-2 cursor-pointer transition-all hover:border-zari"
                >
                  <span className="text-zari">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Block Hierarchy List */}
          <div className="bg-white border border-line rounded-card p-4 shadow-soft space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-taupe uppercase tracking-wider">Email Structure</h3>
              <span className="text-[11px] font-mono text-muted">{blocks.length} blocks</span>
            </div>

            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {blocks.map((block, idx) => (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    selectedBlockId === block.id
                      ? "border-zari bg-cream/40 text-ink shadow-sm"
                      : "border-line/60 bg-cream/10 text-taupe hover:bg-cream/25 hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-[10px] text-muted">{idx + 1}</span>
                    <span className="capitalize font-semibold text-ink">{block.type.replace("_", " ")}</span>
                    <span className="text-[10px] text-muted truncate">
                      {block.content.text || block.content.title || block.content.brandName || ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveBlock(idx, "up")}
                      className="p-1 rounded text-taupe hover:text-ink disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === blocks.length - 1}
                      onClick={() => moveBlock(idx, "down")}
                      className="p-1 rounded text-taupe hover:text-ink disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="p-1 rounded text-danger/70 hover:text-danger cursor-pointer ml-1"
                      title="Delete Block"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Block Inspector / Content Form */}
          {selectedBlock && (
            <div className="bg-white border border-line rounded-card p-4 shadow-soft space-y-4 animate-fade-up">
              <div className="flex justify-between items-center pb-2 border-b border-line">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                  <span>Edit {selectedBlock.type.replace("_", " ")}</span>
                </h3>
                <span className="text-[10px] font-mono text-muted">{selectedBlock.id}</span>
              </div>

              {/* Dynamic properties based on block type */}
              {selectedBlock.type === "heading" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Heading Text</label>
                    <input
                      type="text"
                      value={selectedBlock.content.text || ""}
                      onChange={(e) => updateBlockContent(selectedBlock.id, { text: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Subtitle (Optional)</label>
                    <input
                      type="text"
                      value={selectedBlock.content.subtitle || ""}
                      onChange={(e) => updateBlockContent(selectedBlock.id, { subtitle: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-taupe block mb-1">Font Size (px)</label>
                      <input
                        type="number"
                        value={selectedBlock.content.size || 26}
                        onChange={(e) => updateBlockContent(selectedBlock.id, { size: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-taupe block mb-1">Alignment</label>
                      <select
                        value={selectedBlock.content.align || "center"}
                        onChange={(e) => updateBlockContent(selectedBlock.id, { align: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedBlock.type === "text" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold text-taupe">Body Content</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowInsertTagDropdown(!showInsertTagDropdown)}
                        className="text-[10px] font-bold text-zari-deep hover:text-zari flex items-center gap-1 cursor-pointer bg-cream/40 px-2 py-1 rounded border border-line"
                      >
                        <Sparkles className="w-2.5 h-2.5" /> Insert Variable <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      {showInsertTagDropdown && (
                        <div className="absolute right-0 top-7 z-20 w-44 bg-white border border-line rounded-lg shadow-lg py-1 text-xs">
                          {[
                            { tag: "{{first_name}}", label: "First Name" },
                            { tag: "{{last_name}}", label: "Last Name" },
                            { tag: "{{city}}", label: "City" },
                            { tag: "{{state}}", label: "State" },
                            { tag: "{{coupon_code}}", label: "Coupon Code" },
                            { tag: "{{total_spending}}", label: "Total Spent" },
                          ].map((t) => (
                            <button
                              key={t.tag}
                              type="button"
                              onClick={() => insertMergeTag(t.tag)}
                              className="w-full text-left px-3 py-1.5 hover:bg-cream/40 text-ink text-xs block cursor-pointer"
                            >
                              {t.label} <span className="text-muted text-[10px]">({t.tag})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={5}
                    value={selectedBlock.content.text || ""}
                    onChange={(e) => updateBlockContent(selectedBlock.id, { text: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari font-sans leading-relaxed"
                  />
                  <p className="text-[10px] text-muted">HTML tags like &lt;strong&gt;, &lt;br/&gt;, &lt;em&gt; are supported.</p>
                </div>
              )}

              {selectedBlock.type === "button" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Button Text</label>
                    <input
                      type="text"
                      value={selectedBlock.content.text || ""}
                      onChange={(e) => updateBlockContent(selectedBlock.id, { text: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Destination URL</label>
                    <input
                      type="text"
                      value={selectedBlock.content.url || ""}
                      onChange={(e) => updateBlockContent(selectedBlock.id, { url: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-taupe block mb-1">Button Color</label>
                      <input
                        type="color"
                        value={selectedBlock.content.bgColor || "#B08D4C"}
                        onChange={(e) => updateBlockContent(selectedBlock.id, { bgColor: e.target.value })}
                        className="w-full h-8 p-1 border border-line rounded-lg cursor-pointer bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-taupe block mb-1">Shape</label>
                      <select
                        value={selectedBlock.content.rounded ? "pill" : "rounded"}
                        onChange={(e) => updateBlockContent(selectedBlock.id, { rounded: e.target.value === "pill" })}
                        className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                      >
                        <option value="pill">Pill (Rounded)</option>
                        <option value="rounded">Square Corners</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedBlock.type === "coupon_box" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Select from Active Coupons</label>
                    <select
                      onChange={(e) => {
                        const cp = coupons.find((c) => c.code === e.target.value);
                        if (cp) {
                          updateBlockContent(selectedBlock.id, {
                            code: cp.code,
                            description: `Enjoy ${cp.type === "percent" ? `${cp.value}% off` : `₹${cp.value / 100} off`} on your purchase!`,
                          });
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink mb-2"
                    >
                      <option value="">-- Choose active coupon --</option>
                      {coupons.map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.code} ({c.type === "percent" ? `${c.value}%` : `₹${c.value / 100}`} OFF)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Coupon Code</label>
                    <input
                      type="text"
                      value={selectedBlock.content.code || ""}
                      onChange={(e) => updateBlockContent(selectedBlock.id, { code: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-line rounded-lg bg-cream/15 text-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Offer Description</label>
                    <input
                      type="text"
                      value={selectedBlock.content.description || ""}
                      onChange={(e) => updateBlockContent(selectedBlock.id, { description: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                    />
                  </div>
                </div>
              )}

              {selectedBlock.type === "product_card" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Pick Live Product from Catalog</label>
                    <select
                      onChange={(e) => {
                        const p = products.find((prod) => prod.id === e.target.value);
                        if (p) {
                          updateBlockContent(selectedBlock.id, {
                            title: p.name,
                            category: p.categories?.name || "",
                            price: `₹${(p.price_paise / 100).toFixed(0)}`,
                            compareAt: p.compare_at_paise ? `₹${(p.compare_at_paise / 100).toFixed(0)}` : "",
                            imageUrl: p.product_images?.[0]?.url || "",
                            productUrl: `https://jaisriramtextiles.in/product/${p.slug}`,
                          });
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink mb-2"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{(p.price_paise / 100).toFixed(0)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Product Title</label>
                    <input
                      type="text"
                      value={selectedBlock.content.title || ""}
                      onChange={(e) => updateBlockContent(selectedBlock.id, { title: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-taupe block mb-1">Selling Price</label>
                      <input
                        type="text"
                        value={selectedBlock.content.price || ""}
                        onChange={(e) => updateBlockContent(selectedBlock.id, { price: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-taupe block mb-1">Strike-through Price</label>
                      <input
                        type="text"
                        value={selectedBlock.content.compareAt || ""}
                        onChange={(e) => updateBlockContent(selectedBlock.id, { compareAt: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Product Image URL</label>
                    <input
                      type="text"
                      value={selectedBlock.content.imageUrl || ""}
                      onChange={(e) => updateBlockContent(selectedBlock.id, { imageUrl: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                    />
                  </div>
                </div>
              )}

              {selectedBlock.type === "image" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Image URL (Cloudinary)</label>
                    <input
                      type="text"
                      value={selectedBlock.content.url || ""}
                      onChange={(e) => updateBlockContent(selectedBlock.id, { url: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-taupe block mb-1">Click Destination URL (Optional)</label>
                    <input
                      type="text"
                      value={selectedBlock.content.linkUrl || ""}
                      onChange={(e) => updateBlockContent(selectedBlock.id, { linkUrl: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Interactive Preview (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-cream/40 border border-line rounded-card p-4 shadow-soft">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink uppercase tracking-wider">Live HTML Render</span>
                <span className="text-[10px] text-muted">({previewMode === "mobile" ? "375px viewport" : "600px desktop"})</span>
              </div>
              <span className="text-[11px] text-taupe font-mono">
                {previewText ? `Preheader: "${previewText.substring(0, 45)}..."` : "No preheader set"}
              </span>
            </div>

            {/* Iframe preview box */}
            <div className="flex justify-center bg-[#ECE6D8] p-4 sm:p-6 rounded-lg border border-line overflow-x-auto min-h-[600px]">
              <div
                className={`transition-all duration-300 bg-white rounded-lg shadow-xl overflow-hidden ${
                  previewMode === "mobile" ? "w-[375px] max-w-[375px]" : "w-[600px] max-w-[600px]"
                }`}
              >
                <iframe
                  srcDoc={compiledHtml}
                  title="Email Preview"
                  className="w-full min-h-[650px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-line rounded-card max-w-md w-full p-6 shadow-lift space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-line">
              <h3 className="font-display text-lg text-ink flex items-center gap-2">
                <Send className="w-4 h-4 text-zari" /> Send Test Email
              </h3>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="text-taupe hover:text-ink text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-taupe leading-relaxed">
              Send a real test render of this email to your inbox to inspect mobile rendering, subject line display, and merge tag fallbacks.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                Recipient Email Addresses (comma-separated)
              </label>
              <input
                type="text"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                placeholder="admin@example.com, tester@example.com"
                className="w-full px-3.5 py-2.5 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-xs font-semibold text-taupe hover:text-ink cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingTest || !testEmailInput.trim()}
                onClick={async () => {
                  if (onSendTest) {
                    const emails = testEmailInput.split(",").map((s) => s.trim()).filter(Boolean);
                    await onSendTest(emails);
                    setShowTestModal(false);
                  }
                }}
                className="px-5 py-2 rounded-pill bg-zari hover:bg-zari-deep text-ivory text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {sendingTest && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Send Test Email Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
