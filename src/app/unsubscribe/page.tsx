"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, Mail, ArrowLeft, RefreshCw, Sparkles } from "lucide-react";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const campaignId = searchParams.get("cid") || "";
  const recipientId = searchParams.get("rid") || "";

  const [email, setEmail] = useState(emailParam);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("too_frequent");
  const [customReason, setCustomReason] = useState("");
  const [resubscribed, setResubscribed] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  async function handleUnsubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/marketing/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          campaignId,
          recipientId,
          reason: reason === "other" ? customReason || "Other" : reason,
        }),
      });

      if (res.ok) {
        setUnsubscribed(true);
        setResubscribed(false);
      }
    } catch (err) {
      console.error("Unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/subscribers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          status: "subscribed",
        }),
      });

      if (res.ok) {
        setResubscribed(true);
        setUnsubscribed(false);
      }
    } catch (err) {
      console.error("Resubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory py-16 sm:py-24">
      <Container className="max-w-[580px]">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="block font-display text-2xl tracking-tight text-ink sm:text-3xl">
              JAI SRI RAM
            </span>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-eyebrow text-zari-deep">
              Textiles • Komarapalayam
            </span>
          </Link>
        </div>

        <div className="bg-white border border-line rounded-card p-6 sm:p-10 shadow-soft">
          {resubscribed ? (
            <div className="text-center space-y-4 py-4 animate-fade-up">
              <div className="mx-auto w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="font-display text-2xl text-ink">Welcome Back!</h1>
              <p className="text-sm text-taupe leading-relaxed">
                Your email <strong className="text-ink">{email}</strong> has been successfully re-subscribed. You will continue receiving exclusive handloom promotions and festive updates.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button href="/shop" variant="gold">
                  Explore Collections
                </Button>
              </div>
            </div>
          ) : unsubscribed ? (
            <div className="text-center space-y-4 py-4 animate-fade-up">
              <div className="mx-auto w-14 h-14 rounded-full bg-cream/70 text-zari flex items-center justify-center border border-line">
                <Mail className="w-7 h-7" />
              </div>
              <h1 className="font-display text-2xl text-ink">Unsubscribed Successfully</h1>
              <p className="text-sm text-taupe leading-relaxed">
                You have been unsubscribed from marketing and promotional emails for <strong className="text-ink">{email}</strong>.
              </p>
              <p className="text-xs text-muted">
                Please note: You will still receive essential transactional emails such as order confirmations and shipping receipts.
              </p>

              <div className="pt-6 border-t border-line flex flex-col sm:flex-row justify-center items-center gap-3">
                <button
                  type="button"
                  onClick={handleResubscribe}
                  disabled={loading}
                  className="text-xs font-semibold text-zari-deep hover:text-zari underline cursor-pointer"
                >
                  Unsubscribed by mistake? Click here to re-subscribe
                </button>
              </div>

              <div className="pt-4">
                <Button href="/" variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4" /> Back to Store
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUnsubscribe} className="space-y-6">
              <div className="text-center space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zari-deep">
                  Email Preferences
                </span>
                <h1 className="font-display text-2xl sm:text-3xl text-ink">
                  Manage Your Subscription
                </h1>
                <p className="text-xs text-taupe max-w-md mx-auto leading-relaxed">
                  We're sorry to see you go. If you no longer wish to receive special festive deals and new arrival alerts, please confirm below.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Your Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-line bg-cream/20 text-ink text-sm focus:outline-none focus:border-zari"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Reason for leaving (Optional)
                </label>
                <div className="space-y-2 text-sm text-taupe">
                  {[
                    { id: "too_frequent", label: "I receive emails too frequently" },
                    { id: "not_relevant", label: "The content is no longer relevant to me" },
                    { id: "did_not_signup", label: "I never signed up for these emails" },
                    { id: "other", label: "Other reason" },
                  ].map((item) => (
                    <label key={item.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="unsub_reason"
                        value={item.id}
                        checked={reason === item.id}
                        onChange={() => setReason(item.id)}
                        className="accent-zari"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>

                {reason === "other" && (
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Tell us how we could improve..."
                    className="w-full mt-2 p-3 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
                  />
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3.5 px-6 rounded-pill bg-ink text-ivory font-semibold text-sm hover:bg-black transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Confirm Unsubscribe
                </button>
              </div>

              <div className="text-center pt-2">
                <Link href="/" className="text-xs text-taupe hover:text-ink font-medium">
                  Never mind, return to store
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Security / Privacy reassurance */}
        <div className="mt-8 text-center text-xs text-muted flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-zari" />
          <span>Your privacy is 100% protected. We never sell your personal information.</span>
        </div>
      </Container>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ivory flex items-center justify-center"><RefreshCw className="animate-spin text-zari w-8 h-8" /></div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
