"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

type Message = {
  role: "user" | "assistant";
  content: string;
  products?: {
    id: string;
    slug: string;
    name: string;
    price: number;
    imageUrl: string;
  }[];
  categorySlug?: string;
  trackingUrl?: string;
  orderNumber?: string;
  orderImageUrl?: string;
};

/** Short, light two-tone notification chime — synthesized so no audio asset is needed. */
function playReplyChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    [880, 1174.7].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio isn't critical — fail silently (e.g. autoplay-blocked browsers).
  }
}



export function AIChatbot() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  useEffect(() => {
    async function loadChatbotCategories() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("categories")
          .select("id, name, slug")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (data) {
          setDbCategories(data);
        }
      } catch (err) {
        console.error("Chatbot failed to load categories:", err);
      }
    }
    if (isOpen) {
      loadChatbotCategories();
    }
  }, [isOpen]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Vanakkam! I am your **JAI SRI RAM TEXTILES** AI assistant. How can I help you explore our premium handloom veshtis, towels, or custom bulk loom orders today?",
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);

  function getDynamicOptions(m: Message) {
    const text = m.content.toLowerCase();
    
    if (text.includes("vanakkam! i am your")) {
      return [
        { label: "🛍️ Explore Products", action: "explore_products" },
        { label: "📦 Track Orders", action: "track_orders" },
        { label: "💰 Wallet Balance", action: "wallet_balance" },
        { label: "🛡️ Return Policy", query: "What is your return and replacement policy?" },
        { label: "💬 Contact Support", action: "support" },
        { label: "❓ Other", action: "other" }
      ];
    }

    const isProfileUpdate = 
      text.includes("personal details") || 
      text.includes("personal info") || 
      text.includes("contact details") || 
      text.includes("contact email") ||
      text.includes("update contact email") || 
      text.includes("change contact mail") || 
      text.includes("update profile") || 
      text.includes("edit profile") ||
      text.includes("update email") ||
      text.includes("change email") ||
      text.includes("update phone") ||
      text.includes("change phone") ||
      text.includes("update name") ||
      text.includes("change name") ||
      text.includes("profile details");

    if (isProfileUpdate) {
      return [
        { label: "👤 Edit Profile / Account", action: "edit_profile" },
        { label: "🏠 Main Menu", action: "main_menu" }
      ];
    }
    
    if (text.includes("select a category to explore")) {
      const liveOpts = dbCategories.map((c) => ({
        label: c.name,
        categorySlug: c.slug,
        labelText: c.name
      }));
      
      const fallbackOpts = liveOpts.length > 0 ? liveOpts : [
        { label: "⬜ White Dhoti", categorySlug: "white-dhoti", labelText: "White Dhoti" },
        { label: "🎨 Colour Dhoti", categorySlug: "colour-dhoti", labelText: "Colour Dhoti" },
        { label: "🧣 Towels", categorySlug: "towels", labelText: "Towels" },
        { label: "🧣 Scarfs", categorySlug: "scarfs", labelText: "Scarfs" },
        { label: "🛍️ Jute Bags", categorySlug: "jute-bags", labelText: "Jute Bags" }
      ];

      return [
        ...fallbackOpts,
        { label: "🏠 Main Menu", action: "main_menu" }
      ];
    }

    if (text.includes("please select an order to track or click")) {
      const last5 = (userContext?.orders || []).slice(0, 5);
      const orderOpts = last5.map((o: any) => ({
        label: `📦 #${o.order_number.replace("JSRT-", "")}`,
        orderNumber: o.order_number
      }));
      return [
        ...orderOpts,
        { label: "📂 View All Orders", action: "view_all_orders" },
        { label: "🏠 Main Menu", action: "main_menu" }
      ];
    }

    if (m.orderNumber) {
      const opts = [];
      if (m.trackingUrl) {
        opts.push({ label: "🌐 Track Courier", action: "track_courier", trackingUrl: m.trackingUrl });
      }
      opts.push({ label: "📂 View All Orders", action: "view_all_orders" });
      opts.push({ label: "🏠 Main Menu", action: "main_menu" });
      return opts;
    }

    if (m.categorySlug) {
      return [
        { label: "🔗 Explore More", action: "explore_more", categorySlug: m.categorySlug },
        { label: "🏠 Main Menu", action: "main_menu" }
      ];
    }
    
    return [
      { label: "🏠 Main Menu", action: "main_menu" }
    ];
  }

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Play chime automatically when assistant replies are received/updated
  const prevMessagesCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesCount.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && isOpen) {
        playReplyChime();
      }
    }
    prevMessagesCount.current = messages.length;
  }, [messages, isOpen]);

  // Prevent Lenis / external scroll hijack on the chat body
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const preventScrollHijack = (e: any) => {
      e.stopPropagation();
    };

    el.addEventListener("wheel", preventScrollHijack, { passive: true });
    el.addEventListener("touchmove", preventScrollHijack, { passive: true });

    return () => {
      el.removeEventListener("wheel", preventScrollHijack);
      el.removeEventListener("touchmove", preventScrollHijack);
    };
  }, []);

  // Fetch authenticated user context from browser when chat opens
  useEffect(() => {
    async function fetchUserContext() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUserContext(null);
          return;
        }

        // 1. Fetch Profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        // 2. Fetch Orders
        const { data: orders } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("user_id", user.id)
          .order("placed_at", { ascending: false });

        // 3. Fetch Addresses
        const { data: addresses } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id);

        // 4. Fetch Wallet history to calculate dynamic active balance
        const { data: txns } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", user.id);

        let walletBalance = 0;
        const now = new Date();
        (txns || []).forEach((t: any) => {
          if (t.type === "cashback_credit") {
            const exp = t.expires_at ? new Date(t.expires_at) : null;
            if (!exp || exp > now) {
              walletBalance += t.amount_paise;
            }
          } else {
            walletBalance += t.amount_paise;
          }
        });

        setUserContext({
          profile,
          orders: orders || [],
          addresses: addresses || [],
          walletBalance: Math.max(0, walletBalance)
        });
      } catch (err) {
        console.error("Chatbot failed to query user context:", err);
      }
    }

    if (isOpen) {
      fetchUserContext();
    }
  }, [isOpen]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    await sendMessage(userText);
  }

  async function handleQuickOption(text: string) {
    if (loading) return;
    await sendMessage(text);
  }

  function handleChatNow() {
    window.location.href = "/account?tab=contact";
  }

  async function handleOptionClick(opt: any) {
    if (opt.action === "support") {
      handleChatNow();
    } else if (opt.action === "wallet_balance") {
      if (!userContext) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: "Wallet Balance" },
          { role: "assistant", content: "Please sign in to view your cashback wallet balance." }
        ]);
        return;
      }
      
      const balanceRupees = (userContext.walletBalance || 0) / 100;
      const formattedBalance = `₹${balanceRupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Wallet Balance" },
        {
          role: "assistant",
          content: `💰 **Cashback Wallet Balance**: ${formattedBalance}\n\n⏰ **Expiry**: 15 days from last delivery date\n📅 **Last Updated**: ${new Date().toLocaleDateString()}`
        }
      ]);
    } else if (opt.action === "edit_profile") {
      window.location.href = "/account?tab=overview";
    } else if (opt.action === "explore_products") {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Explore Products" },
        { role: "assistant", content: "Please select a category to explore our premium handloom catalog:" }
      ]);
    } else if (opt.action === "explore_more" && opt.categorySlug) {
      window.location.href = `/shop/${opt.categorySlug}`;
    } else if (opt.action === "view_all_orders") {
      window.location.href = "/account?tab=orders";
    } else if (opt.action === "track_courier" && opt.trackingUrl) {
      window.open(opt.trackingUrl, "_blank");
    } else if (opt.action === "track_orders") {
      if (!userContext) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: "Track Orders" },
          { role: "assistant", content: "Please sign in to track your orders." }
        ]);
        return;
      }
      
      const orders = userContext.orders || [];
      if (orders.length === 0) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: "Track Orders" },
          { role: "assistant", content: "You don't have any placed orders yet." }
        ]);
        return;
      }
      
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Track Orders" },
        { role: "assistant", content: "Please select an order to track or click \"View All Orders\" to see your complete history:" }
      ]);
    } else if (opt.orderNumber) {
      const order = (userContext?.orders || []).find((o: any) => o.order_number === opt.orderNumber);
      if (!order) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: `Track #${opt.orderNumber}` },
          { role: "assistant", content: `Sorry, I couldn't find the details for order **#${opt.orderNumber}**.` }
        ]);
        return;
      }
      
      const status = order.status || "Pending";
      const courierPartner = order.shipping_address?.courier_name || order.shipping_address?.carrier_name || "Not assigned yet";
      const trackingId = order.tracking_id || "Not assigned yet";
      const placedDate = order.placed_at ? new Date(order.placed_at).toLocaleDateString() : "Unknown";
      const totalAmount = order.total_paise ? `₹${order.total_paise / 100}` : "Unknown";
      
      const itemsList = (order.order_items || []).map((oi: any) => `- ${oi.name} x ${oi.quantity}`).join("\n");
      const orderImageUrl = (order.order_items || []).find((oi: any) => oi.image_url)?.image_url || undefined;

      const responseContent = `Here are the tracking details for Order **#${order.order_number}**:

📦 **Status**: ${status.toUpperCase()}
🚚 **Courier Partner**: ${courierPartner}
🎟️ **Tracking ID**: ${trackingId}
📅 **Placed At**: ${placedDate}
💰 **Total Paid**: ${totalAmount}

**Items Ordered**:
${itemsList || "- No items listed"}`;

      setMessages((prev) => [
        ...prev,
        { role: "user", content: `Track #${order.order_number}` },
        {
          role: "assistant",
          content: responseContent,
          trackingUrl: order.courier_tracking_url || undefined,
          orderNumber: order.order_number,
          orderImageUrl
        }
      ]);
    } else if (opt.categorySlug) {
      setLoading(true);
      try {
        const supabase = createClient();
        
        // 1. Fetch category id
        const { data: category } = await supabase
          .from("categories")
          .select("id, name, slug")
          .eq("slug", opt.categorySlug)
          .maybeSingle();

        if (!category) {
          setMessages((prev) => [
            ...prev,
            { role: "user", content: opt.labelText || opt.label },
            { role: "assistant", content: "I'm sorry, I couldn't find details for that category right now." }
          ]);
          return;
        }

        // 2. Fetch 3 active products with their first image
        const { data: dbProducts } = await supabase
          .from("products")
          .select(`
            id,
            slug,
            name,
            price_paise,
            product_images (
              url,
              sort_order
            )
          `)
          .eq("category_id", category.id)
          .eq("is_active", true)
          .limit(3);

        const products = (dbProducts || []).map((p: any) => {
          const images = [...(p.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
          const imageUrl = images[0]?.url || "/placeholder-product.jpg";
          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            price: p.price_paise / 100,
            imageUrl
          };
        });

        setMessages((prev) => [
          ...prev,
          { role: "user", content: opt.labelText || opt.label },
          {
            role: "assistant",
            content: `Here are 3 of our premium handloom products from the **${category.name}** catalog. Tap any product to view details or click "Explore More" below to view the entire collection.`,
            products,
            categorySlug: category.slug
          }
        ]);
      } catch (err) {
        console.error("Failed to fetch products for category:", err);
        setMessages((prev) => [
          ...prev,
          { role: "user", content: opt.labelText || opt.label },
          { role: "assistant", content: "Sorry, I had trouble retrieving the products. Please try again." }
        ]);
      } finally {
        setLoading(false);
      }
    } else if (opt.action === "other") {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Other" },
        { role: "assistant", content: "Please write your issue or question below and hit send. I will reply to help you right away." }
      ]);
    } else if (opt.action === "main_menu") {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Vanakkam! I am your **JAI SRI RAM TEXTILES** AI assistant. How can I help you explore our premium handloom dhotis, towels, or custom bulk orders today?" }
      ]);
    } else if (opt.query) {
      await handleQuickOption(opt.query);
    }
  }

  async function sendMessage(text: string) {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const history = [...messages, { role: "user", content: text }].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: history,
          userContext: userContext 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete message response");

      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, I am experiencing a temporary connection issue. Please verify your connection or try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 35 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 35 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
            className="mb-4 w-[calc(100vw-3rem)] max-w-[340px] sm:max-w-[380px] h-[min(520px,75dvh)] bg-ivory/95 border border-zari rounded-card overflow-hidden flex flex-col shadow-lift backdrop-blur-md"
          >
            {/* Header */}
            <div className="bg-ink text-ivory p-4 flex justify-between items-center border-b border-zari-deep">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zari opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zari"></span>
                </span>
                <div>
                  <h3 className="font-display text-sm sm:text-base tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-zari" />
                    Loom Assistant
                  </h3>
                  <p className="text-[10px] text-zari mt-0.5 font-bold">Online &bull; Ready to help</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-ivory transition-colors p-1 hover:bg-white/5 rounded-full cursor-pointer"
                aria-label="Close Chat"
              >
                <X size={18} />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 flex flex-col overflow-y-auto overscroll-contain p-4 space-y-4 chatbot-scrollbar"
              data-lenis-prevent
            >
              {messages.map((m, idx) => {
                const isAI = m.role === "assistant";
                const mentionsChatNow = isAI && /chat now/i.test(m.content);
                return (
                  <div key={idx} className={cn("flex flex-col gap-1.5 max-w-[85%]", isAI ? "self-start" : "self-end")}>
                    <div className={cn("flex gap-2.5", isAI ? "" : "flex-row-reverse")}>
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-[10px]",
                          isAI ? "bg-cream text-zari-deep" : "bg-ink text-ivory"
                        )}
                      >
                        {isAI ? <Bot size={14} /> : <User size={14} />}
                      </span>
                      <div
                        className={cn(
                          "rounded-2xl p-3 text-xs leading-relaxed shadow-soft border",
                          isAI
                            ? "bg-cream/45 text-ink border-line rounded-tl-none font-medium"
                            : "bg-ink text-ivory border-ink rounded-tr-none font-medium"
                        )}
                      >
                        {isAI && m.orderImageUrl ? (
                          <div className="flex gap-3 items-start min-w-[200px]">
                            <div className="flex-1 space-y-1">{parseMarkdown(m.content)}</div>
                            <img
                              src={m.orderImageUrl}
                              alt="Order Item"
                              className="w-12 h-12 object-cover rounded-lg border border-line bg-white shrink-0 shadow-sm"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">{parseMarkdown(m.content)}</div>
                        )}
                      </div>
                    </div>

                    {/* Chat Now button — shown whenever the bot's reply mentions it */}
                    {mentionsChatNow && (
                      <button
                        type="button"
                        onClick={handleChatNow}
                        className="ml-9 flex items-center gap-1.5 px-3 py-1.5 bg-ink border border-ink rounded-full text-[11px] font-bold text-ivory hover:bg-zari-deep transition cursor-pointer w-fit shadow-sm"
                      >
                        💬 Chat Now
                      </button>
                    )}

                    {isAI && m.products && m.products.length > 0 && (
                      <div className="ml-9 mt-1.5 grid grid-cols-3 gap-2 pb-1">
                        {m.products.map((p) => (
                          <a
                            key={p.id}
                            href={`/product/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white border border-line rounded-xl p-1.5 flex flex-col hover:border-zari transition shadow-sm hover:shadow active:scale-98"
                          >
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-12 object-cover rounded-lg bg-cream/35"
                            />
                            <p className="mt-1 text-[9px] font-bold text-ink truncate leading-tight">{p.name}</p>
                            <p className="text-[8px] font-bold text-zari-deep mt-0.5">₹{p.price}</p>
                          </a>
                        ))}
                      </div>
                    )}

                    {isAI && idx === messages.length - 1 && (
                      <div className="ml-9 flex flex-wrap gap-1.5 mt-1 pb-1">
                        {getDynamicOptions(m).map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleOptionClick(opt)}
                            className="px-2.5 py-1 bg-white border border-zari/35 rounded-full text-[10px] font-bold text-zari-deep hover:border-zari hover:bg-cream transition cursor-pointer shadow-sm active:scale-95"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-2.5 max-w-[85%] self-start animate-pulse">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-cream text-zari-deep text-[10px]">
                    <Bot size={14} />
                  </span>
                  <div className="rounded-2xl p-3 bg-cream/45 text-ink border border-line rounded-tl-none flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-taupe rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-taupe rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-taupe rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>



            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-3 border-t border-line bg-white flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about materials, shipping, or cashback..."
                className="flex-1 rounded-pill border border-line bg-ivory px-4 py-2 text-xs text-ink outline-none focus:border-zari"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="grid h-8 w-8 place-items-center rounded-full bg-zari text-ink hover:bg-zari-deep hover:text-ivory disabled:opacity-50 transition-all duration-200 cursor-pointer"
                aria-label="Send message"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="grid h-14 w-14 place-items-center rounded-full bg-zari text-ink hover:bg-zari-deep hover:text-ivory shadow-lift transition-all duration-300 relative group border border-zari-deep/20 cursor-pointer"
        aria-label="Toggle AI Chatbot"
      >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zari/20 opacity-75"></span>
        {isOpen ? (
          <X size={24} className="group-hover:scale-110 transition-transform duration-300" />
        ) : (
          <Bot size={24} className="group-hover:scale-110 transition-transform duration-300" />
        )}
      </button>
    </div>
  );
}

// Markdown parser helpers
function parseMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    
    // Check for bullet list
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
    if (isBullet) {
      const content = trimmed.substring(2);
      return (
        <li key={lineIdx} className="list-disc ml-4 my-1">
          {renderInlineMarkdown(content)}
        </li>
      );
    }

    // Check for numbered list
    const isNumbered = /^\d+\.\s/.test(trimmed);
    if (isNumbered) {
      const match = trimmed.match(/^(\d+)\.\s(.*)/);
      if (match) {
        const content = match[2];
        return (
          <li key={lineIdx} className="list-decimal ml-4 my-1">
            {renderInlineMarkdown(content)}
          </li>
        );
      }
    }

    // Regular paragraph
    return (
      <p key={lineIdx} className="mb-1 last:mb-0">
        {renderInlineMarkdown(line)}
      </p>
    );
  });
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
