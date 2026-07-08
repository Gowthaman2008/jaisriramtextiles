"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type Message = {
  role: "user" | "assistant";
  content: string;
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
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Vanakkam! I am your **JAI SRI RAM TEXTILES** AI assistant. How can I help you explore our premium handloom veshtis, towels, or custom bulk loom orders today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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
    const profile = userContext?.profile;
    const lines = ["Hi, I need help with my JAI SRI RAM TEXTILES account."];
    if (profile?.full_name) lines.push(`Name: ${profile.full_name}`);
    if (profile?.email) lines.push(`Email: ${profile.email}`);
    if (profile?.phone) lines.push(`Phone: ${profile.phone}`);

    const url = `https://wa.me/918072719603?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
      playReplyChime();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, I am experiencing a temporary connection issue. Please verify your connection or try again shortly.",
        },
      ]);
      playReplyChime();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
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
                  <p className="text-[10px] text-muted-foreground mt-0.5">Online &bull; Powered by Groq AI</p>
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

            {/* Messages Area */}
            <div
              ref={scrollRef}
              className="flex-1 flex flex-col overflow-y-auto overscroll-contain p-4 space-y-4 scrollbar-none"
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
                        <div className="space-y-1">{parseMarkdown(m.content)}</div>
                      </div>
                    </div>

                    {/* Chat Now button — shown whenever the bot's reply mentions it */}
                    {mentionsChatNow && (
                      <button
                        type="button"
                        onClick={handleChatNow}
                        className="ml-9 flex items-center gap-1.5 px-3 py-1.5 bg-ink border border-ink rounded-full text-[11px] font-bold text-ivory hover:bg-zari-deep transition cursor-pointer w-fit"
                      >
                        💬 Chat Now
                      </button>
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

            {/* Quick Option Menu */}
            <div className="px-4 py-2 border-t border-line bg-cream/35 flex gap-2 overflow-x-auto scrollbar-none whitespace-nowrap shrink-0">
              <button
                type="button"
                onClick={() => handleQuickOption("Track my active orders")}
                className="px-3 py-1.5 bg-white border border-line rounded-full text-[11px] font-medium text-ink hover:border-zari hover:bg-zari-tint transition cursor-pointer"
              >
                📦 Track Orders
              </button>
              <button
                type="button"
                onClick={() => handleQuickOption("Show my cashback wallet balance")}
                className="px-3 py-1.5 bg-white border border-line rounded-full text-[11px] font-medium text-ink hover:border-zari hover:bg-zari-tint transition cursor-pointer"
              >
                💰 Wallet Balance
              </button>
              <button
                type="button"
                onClick={() => handleQuickOption("Show my saved shipping addresses")}
                className="px-3 py-1.5 bg-white border border-line rounded-full text-[11px] font-medium text-ink hover:border-zari hover:bg-zari-tint transition cursor-pointer"
              >
                📍 My Addresses
              </button>
              <button
                type="button"
                onClick={() => handleQuickOption("What is your return and replacement policy?")}
                className="px-3 py-1.5 bg-white border border-line rounded-full text-[11px] font-medium text-ink hover:border-zari hover:bg-zari-tint transition cursor-pointer"
              >
                🛡️ Return Policy
              </button>
              <button
                type="button"
                onClick={() => handleQuickOption("Are there any discount offers or promo coupon codes?")}
                className="px-3 py-1.5 bg-white border border-line rounded-full text-[11px] font-medium text-ink hover:border-zari hover:bg-zari-tint transition cursor-pointer"
              >
                🎟️ Promo Offers
              </button>
              <button
                type="button"
                onClick={() => handleQuickOption("Tell me about JAI SRI RAM TEXTILES handloom heritage")}
                className="px-3 py-1.5 bg-white border border-line rounded-full text-[11px] font-medium text-ink hover:border-zari hover:bg-zari-tint transition cursor-pointer"
              >
                🏭 Craftsmanship
              </button>
              <button
                type="button"
                onClick={handleChatNow}
                className="px-3 py-1.5 bg-ink border border-ink rounded-full text-[11px] font-bold text-ivory hover:bg-zari-deep transition cursor-pointer shrink-0"
              >
                💬 Chat Now
              </button>
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
        <MessageSquare size={24} className="group-hover:scale-110 transition-transform duration-300" />
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
