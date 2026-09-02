"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { EmailCampaign, EmailBlock, EmailSegment, FilterRuleGroup, FilterCondition } from "@/lib/marketing/types";
import { EmailBuilder } from "./email-builder";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Calendar,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Lock,
  Layers,
  Save,
  Check
} from "lucide-react";
import { useNotification } from "@/components/providers/notification-provider";

interface CampaignStudioProps {
  initialCampaign?: EmailCampaign | null;
  initialTemplate?: any | null;
  onBack: () => void;
  onSaved: (campaign: EmailCampaign) => void;
  products?: any[];
  coupons?: any[];
}

export function CampaignStudio({
  initialCampaign,
  initialTemplate,
  onBack,
  onSaved,
  products = [],
  coupons = [],
}: CampaignStudioProps) {
  const { notify } = useNotification();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Details
  const [name, setName] = useState(initialCampaign?.name || initialTemplate?.name || "");
  const [description, setDescription] = useState(initialCampaign?.description || "");
  const [subject, setSubject] = useState(initialCampaign?.subject || initialTemplate?.subject || "");
  const [previewText, setPreviewText] = useState(initialCampaign?.preview_text || initialTemplate?.preview_text || "");
  const [senderName, setSenderName] = useState(initialCampaign?.sender_name || "JAI SRI RAM TEXTILES");
  const [senderEmail, setSenderEmail] = useState(initialCampaign?.sender_email || "no-reply@jaisriramtextiles.in");
  const [replyTo, setReplyTo] = useState(initialCampaign?.reply_to || "jaisriramtextilekpm@gmail.com");

  // Step 2: Audience
  const [audienceType, setAudienceType] = useState<string>(initialCampaign?.audience_type || "all_users");
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(initialCampaign?.segment_id || "");
  const [filterCombinator, setFilterCombinator] = useState<"AND" | "OR">("AND");
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([
    { id: "c1", field: "state", operator: "equals", value: "Tamil Nadu" },
  ]);
  const [segments, setSegments] = useState<EmailSegment[]>([]);
  const [audienceData, setAudienceData] = useState<{ totalMatched: number; totalEligible: number; unsubscribedCount: number; sample: any[] } | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);

  // Step 3: Content Blocks
  const [blocks, setBlocks] = useState<EmailBlock[]>(
    initialCampaign?.content_json || initialTemplate?.content_json || [
      {
        id: "hdr-default",
        type: "header",
        content: { brandName: "JAI SRI RAM TEXTILES", tagline: "Authentic Handlooms • Komarapalayam", rightBadge: "SPECIAL" },
      },
      {
        id: "h-default",
        type: "heading",
        content: { text: "Timeless Comfort Woven on Heritage Looms", subtitle: "Special offerings from Komarapalayam.", size: 26, align: "center" },
      },
      {
        id: "txt-default",
        type: "text",
        content: { text: "Hello <strong>{{first_name}}</strong>,<br/><br/>Discover our latest collection of pure combed cotton dhotis, absorbent bath towels, and handloom scarfs made for every occasion.", fontSize: 14, align: "left" },
      },
      {
        id: "btn-default",
        type: "button",
        content: { text: "Shop The Collection", url: "https://jaisriramtextiles.in/shop", bgColor: "#B08D4C", textColor: "#FFFFFF", rounded: true },
      },
      {
        id: "tb-default",
        type: "trust_badges",
        content: {},
      },
      {
        id: "ftr-default",
        type: "footer",
        content: { storeName: "JAI SRI RAM TEXTILES" },
      },
    ]
  );

  // Step 5: Dispatch / Schedule
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [confirmationInput, setConfirmationInput] = useState("");
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // AI Assist modal
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    // Load segments for audience step
    fetch("/api/admin/marketing/segments")
      .then((r) => r.json())
      .then((data) => setSegments(data || []))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (step === 2 || step === 5) {
      calculateAudience();
    }
  }, [step, audienceType, selectedSegmentId, filterCombinator, filterConditions]);

  async function calculateAudience() {
    setLoadingAudience(true);
    try {
      const res = await fetch("/api/admin/marketing/audience-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience_type: audienceType,
          segment_id: selectedSegmentId || null,
          filter_rules: audienceType === "custom_filter" ? { combinator: filterCombinator, conditions: filterConditions } : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAudienceData(data);
      }
    } catch (err) {
      console.error("Calculate audience error:", err);
    } finally {
      setLoadingAudience(false);
    }
  }

  async function triggerAiSubjectLines() {
    setGeneratingAI(true);
    try {
      const res = await fetch("/api/admin/marketing/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subject_lines",
          campaignName: name || "Festive Offer",
          topic: description,
          productNames: products.slice(0, 3).map((p) => p.name),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(Array.isArray(data.result) ? data.result : [data.result]);
        setShowAiModal(true);
      }
    } catch (err) {
      notify("AI suggestion failed");
    } finally {
      setGeneratingAI(false);
    }
  }

  async function handleSendTest(testEmails: string[]) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = testEmails.filter((e) => !emailRegex.test(e.trim()));
    if (invalidEmails.length > 0) {
      notify(`Invalid email address: "${invalidEmails[0]}". Please check for typos.`);
      return;
    }

    setSendingTest(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${initialCampaign?.id || "temp"}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testEmails,
          content_json: blocks,
          subject,
          preview_text: previewText,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        notify(`Test email sent successfully to: ${testEmails.join(", ")}`);
      } else {
        throw new Error(data.error || "Failed to send test email");
      }
    } catch (err: any) {
      notify("Delivery failed: " + err.message);
    } finally {
      setSendingTest(false);
    }
  }

  async function handleSaveDraft() {
    setSavingCampaign(true);
    try {
      const payload = {
        id: initialCampaign?.id,
        name: name || "Untitled Campaign",
        description,
        subject: subject || "No Subject",
        preview_text: previewText,
        sender_name: senderName,
        sender_email: senderEmail,
        reply_to: replyTo,
        content_json: blocks,
        audience_type: audienceType,
        segment_id: selectedSegmentId || null,
        filter_rules: audienceType === "custom_filter" ? { combinator: filterCombinator, conditions: filterConditions } : null,
        status: "draft",
      };

      const method = initialCampaign?.id ? "PUT" : "POST";
      const endpoint = initialCampaign?.id ? `/api/admin/marketing/campaigns/${initialCampaign.id}` : "/api/admin/marketing/campaigns";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save draft");

      const saved = await res.json();
      notify("Campaign draft saved!");
      onSaved(saved);
    } catch (err: any) {
      notify("Error saving: " + err.message);
    } finally {
      setSavingCampaign(false);
    }
  }

  async function handleDispatchOrSchedule() {
    if (!name.trim() || !subject.trim()) {
      notify("Campaign name and subject are required.");
      setStep(1);
      return;
    }

    if (sendMode === "schedule" && !scheduledAt) {
      notify("Please pick a scheduled date and time.");
      return;
    }

    // High audience typing verification safeguard
    if ((audienceData?.totalEligible || 0) >= 500 && confirmationInput !== "SEND CAMPAIGN") {
      notify('Please type "SEND CAMPAIGN" into the confirmation box to authorize large broadcast.');
      return;
    }

    setDispatching(true);
    try {
      // 1. Save/update campaign first
      const nowIso = new Date().toISOString();
      const payload = {
        id: initialCampaign?.id,
        name: name.trim(),
        description,
        subject: subject.trim(),
        preview_text: previewText,
        sender_name: senderName,
        sender_email: senderEmail,
        reply_to: replyTo,
        content_json: blocks,
        audience_type: audienceType,
        segment_id: selectedSegmentId || null,
        filter_rules: audienceType === "custom_filter" ? { combinator: filterCombinator, conditions: filterConditions } : null,
        status: sendMode === "schedule" ? "scheduled" : "sent",
        sent_at: sendMode === "now" ? nowIso : null,
        total_recipients: audienceData?.totalEligible || 0,
        scheduled_at: sendMode === "schedule" ? new Date(scheduledAt).toISOString() : null,
      };

      const method = initialCampaign?.id ? "PUT" : "POST";
      const endpoint = initialCampaign?.id ? `/api/admin/marketing/campaigns/${initialCampaign.id}` : "/api/admin/marketing/campaigns";

      const saveRes = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save campaign before dispatch");
      }
      const savedCampaign = await saveRes.json();

      if (sendMode === "now") {
        // Trigger send queue
        const sendRes = await fetch(`/api/admin/marketing/campaigns/${savedCampaign.id}/send`, {
          method: "POST",
        });

        if (!sendRes.ok) {
          const errData = await sendRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to dispatch campaign");
        }

        const sendData = await sendRes.json().catch(() => ({}));
        notify("🚀 Campaign queued and is now broadcasting to customers!");
        savedCampaign.status = "sent";
        savedCampaign.sent_at = sendData.sentAt || nowIso;
        savedCampaign.total_recipients = sendData.totalRecipients || audienceData?.totalEligible || 0;
        savedCampaign.delivered_count = sendData.totalRecipients || audienceData?.totalEligible || 0;
        savedCampaign.sent_count = sendData.totalRecipients || audienceData?.totalEligible || 0;
      } else {
        notify("📅 Campaign scheduled successfully!");
        savedCampaign.status = "scheduled";
        savedCampaign.scheduled_at = new Date(scheduledAt).toISOString();
      }

      onSaved(savedCampaign);
    } catch (err: any) {
      notify("Error: " + err.message);
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Wizard Stepper */}
      <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-full border border-line hover:bg-cream/40 text-taupe hover:text-ink cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="font-display text-xl text-ink font-bold">
                {name || "New Marketing Campaign"}
              </h2>
              <p className="text-xs text-taupe">Step {step} of 5 — Multi-Channel Email Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingCampaign}
              className="px-3.5 py-1.5 rounded-lg border border-line hover:bg-cream/40 text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-zari" /> Save Draft
            </button>
          </div>
        </div>

        {/* 5-step progress pill bar */}
        <div className="grid grid-cols-5 gap-2 pt-2 border-t border-line">
          {[
            { n: 1, label: "1. Details" },
            { n: 2, label: "2. Audience" },
            { n: 3, label: "3. Design Email" },
            { n: 4, label: "4. Preview & Test" },
            { n: 5, label: "5. Send / Schedule" },
          ].map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => setStep(s.n as any)}
              className={`py-2 px-2 text-center rounded-lg text-xs font-semibold truncate transition-all cursor-pointer ${
                step === s.n
                  ? "bg-ink text-ivory shadow-sm"
                  : step > s.n
                  ? "bg-cream/60 text-zari-deep border border-line"
                  : "bg-cream/20 text-taupe hover:bg-cream/40"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: CAMPAIGN DETAILS */}
      {step === 1 && (
        <div className="bg-white border border-line rounded-card p-6 sm:p-8 shadow-soft space-y-6 animate-fade-up">
          <div className="border-b border-line pb-3">
            <h3 className="font-display text-lg text-ink font-bold">Campaign Details & Subject Line</h3>
            <p className="text-xs text-taupe mt-0.5">
              Set up campaign naming, sender identity, and high-converting subject line with AI suggestions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                Internal Campaign Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pongal Festive Sale 2026"
                className="w-full px-3.5 py-2.5 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                Internal Notes / Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. VIP festive offer with 10% coupon"
                className="w-full px-3.5 py-2.5 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
              />
            </div>
          </div>

          {/* Subject Line with AI Assist */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Email Subject Line *
              </label>
              <button
                type="button"
                onClick={triggerAiSubjectLines}
                disabled={generatingAI}
                className="text-xs font-bold text-zari-deep hover:text-zari flex items-center gap-1.5 cursor-pointer bg-cream/50 px-2.5 py-1 rounded border border-line transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Suggest Subject Lines
              </button>
            </div>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. 🔥 Special Festive Handloom Deals Just for You!"
              className="w-full px-3.5 py-2.5 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
              Preheader / Preview Text
            </label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="e.g. Enjoy pure combed cotton dhotis woven with genuine gold zari borders."
              className="w-full px-3.5 py-2.5 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
            />
            <p className="text-[10px] text-muted">This snippet appears next to the subject line in customer inboxes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-3 border-t border-line">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                Sender Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                Sender Email
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                Reply-To Email
              </label>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (!name.trim() || !subject.trim()) {
                  notify("Please fill in campaign name and subject line.");
                  return;
                }
                setStep(2);
              }}
              className="px-6 py-2.5 rounded-pill bg-ink hover:bg-black text-ivory text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              Continue to Audience <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: AUDIENCE SELECTION */}
      {step === 2 && (
        <div className="bg-white border border-line rounded-card p-6 sm:p-8 shadow-soft space-y-6 animate-fade-up">
          <div className="border-b border-line pb-3">
            <h3 className="font-display text-lg text-ink font-bold">Target Audience Selection</h3>
            <p className="text-xs text-taupe mt-0.5">
              Select which customer segments or custom rules should receive this broadcast.
            </p>
          </div>

          {/* Audience Type Radio Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: "all_users", title: "All Customers", desc: "Every registered user & newsletter subscriber" },
              { id: "subscribers_only", title: "Active Subscribers", desc: "Users with active marketing consent" },
              { id: "segment", title: "Saved Segment", desc: "Target a pre-built dynamic segment" },
              { id: "custom_filter", title: "Custom Filter Rules", desc: "Build on-the-fly rules for this campaign" },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  audienceType === opt.id
                    ? "border-zari bg-cream/35 shadow-xs"
                    : "border-line bg-cream/10 hover:bg-cream/20"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="aud_type"
                    value={opt.id}
                    checked={audienceType === opt.id}
                    onChange={() => setAudienceType(opt.id)}
                    className="accent-zari"
                  />
                  <span className="font-semibold text-xs text-ink">{opt.title}</span>
                </div>
                <p className="text-[11px] text-taupe mt-2 pl-6">{opt.desc}</p>
              </label>
            ))}
          </div>

          {/* Segment Selector */}
          {audienceType === "segment" && (
            <div className="space-y-2 p-4 bg-cream/25 border border-line rounded-lg animate-fade-in">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                Choose Saved Segment
              </label>
              <select
                value={selectedSegmentId}
                onChange={(e) => setSelectedSegmentId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-line rounded-lg bg-white text-ink"
              >
                <option value="">-- Choose Segment --</option>
                {segments.map((seg) => (
                  <option key={seg.id} value={seg.id}>
                    {seg.name} ({seg.user_count_cache} users)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Filter Rules Builder */}
          {audienceType === "custom_filter" && (
            <div className="space-y-3 p-4 bg-cream/25 border border-line rounded-lg animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-ink uppercase tracking-wider">Define Filter Criteria</span>
                <button
                  type="button"
                  onClick={() =>
                    setFilterConditions([
                      ...filterConditions,
                      { id: `c_${Date.now()}`, field: "total_spending", operator: "greater_equal", value: 1000 },
                    ])
                  }
                  className="text-xs font-bold text-zari-deep hover:text-zari cursor-pointer"
                >
                  + Add Condition
                </button>
              </div>

              <div className="space-y-2">
                {filterConditions.map((cond, idx) => (
                  <div key={cond.id} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-line">
                    <span className="text-[10px] font-mono text-muted">{idx + 1}.</span>
                    <select
                      value={cond.field}
                      onChange={(e) =>
                        setFilterConditions(
                          filterConditions.map((c) => (c.id === cond.id ? { ...c, field: e.target.value as any } : c))
                        )
                      }
                      className="px-2 py-1 text-xs border border-line rounded bg-cream/10 text-ink"
                    >
                      <option value="state">State</option>
                      <option value="city">City</option>
                      <option value="total_spending">Total Spending (₹)</option>
                      <option value="total_orders">Total Orders</option>
                    </select>

                    <select
                      value={cond.operator}
                      onChange={(e) =>
                        setFilterConditions(
                          filterConditions.map((c) => (c.id === cond.id ? { ...c, operator: e.target.value as any } : c))
                        )
                      }
                      className="px-2 py-1 text-xs border border-line rounded bg-cream/10 text-ink"
                    >
                      <option value="equals">Equals</option>
                      <option value="greater_equal">Greater than or equal (≥)</option>
                      <option value="contains">Contains</option>
                    </select>

                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) =>
                        setFilterConditions(
                          filterConditions.map((c) => (c.id === cond.id ? { ...c, value: e.target.value } : c))
                        )
                      }
                      placeholder="Value"
                      className="flex-1 px-2 py-1 text-xs border border-line rounded bg-cream/10 text-ink"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Audience Calculation Card */}
          <div className="bg-cream/20 border border-line rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-taupe uppercase tracking-wider">Matching Recipient Summary</span>
              {loadingAudience ? (
                <div className="flex items-center gap-2 text-xs text-taupe">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-zari" /> Calculating live audience count...
                </div>
              ) : audienceData ? (
                <div className="space-y-1">
                  <div className="text-2xl font-display text-ink font-bold">
                    {audienceData.totalEligible.toLocaleString()} <span className="text-sm font-sans font-normal text-taupe">eligible recipients</span>
                  </div>
                  <div className="text-xs text-muted flex items-center gap-3">
                    <span>Total Matched: {audienceData.totalMatched}</span>
                    <span>•</span>
                    <span className="text-danger">{audienceData.unsubscribedCount} Unsubscribed Excluded</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-taupe">Evaluating matching customer pool...</p>
              )}
            </div>

            <button
              type="button"
              onClick={calculateAudience}
              disabled={loadingAudience}
              className="px-3.5 py-1.5 rounded-lg border border-line bg-white hover:bg-cream/40 text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAudience ? "animate-spin" : ""}`} /> Refresh Count
            </button>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-semibold text-taupe hover:text-ink cursor-pointer"
            >
              ← Back to Details
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-pill bg-ink hover:bg-black text-ivory text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              Continue to Email Design <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: VISUAL EMAIL BUILDER */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-up">
          <EmailBuilder
            blocks={blocks}
            onChange={setBlocks}
            products={products}
            coupons={coupons}
            previewText={previewText}
            onSendTest={handleSendTest}
            sendingTest={sendingTest}
          />

          <div className="bg-white border border-line rounded-card p-4 shadow-soft flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-semibold text-taupe hover:text-ink cursor-pointer"
            >
              ← Back to Audience
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-6 py-2.5 rounded-pill bg-ink hover:bg-black text-ivory text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              Preview & Test Email <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW & TEST */}
      {step === 4 && (
        <div className="bg-white border border-line rounded-card p-6 sm:p-8 shadow-soft space-y-6 animate-fade-up">
          <div className="border-b border-line pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-display text-lg text-ink font-bold">Email Preview & Test Inboxes</h3>
              <p className="text-xs text-taupe mt-0.5">Inspect your campaign's appearance and test delivery.</p>
            </div>
            <button
              type="button"
              onClick={() => handleSendTest([senderEmail || "admin@jaisriramtextiles.in"])}
              disabled={sendingTest}
              className="px-4 py-2 rounded-pill bg-zari hover:bg-zari-deep text-ivory text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Test to {senderEmail}
            </button>
          </div>

          {/* Test recipient sender box */}
          <div className="bg-cream/25 border border-line rounded-lg p-4 space-y-2">
            <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
              Send Test Render to Other Email Addresses
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="test_emails_input"
                placeholder="test1@example.com, test2@example.com"
                className="flex-1 px-3.5 py-2 text-xs border border-line rounded-lg bg-white text-ink focus:outline-none focus:border-zari"
              />
              <button
                type="button"
                disabled={sendingTest}
                onClick={() => {
                  const el = document.getElementById("test_emails_input") as HTMLInputElement;
                  if (el && el.value.trim()) {
                    const emails = el.value.split(",").map((s) => s.trim()).filter(Boolean);
                    handleSendTest(emails);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-ink hover:bg-black text-ivory text-xs font-semibold cursor-pointer"
              >
                Send Test
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 text-xs font-semibold text-taupe hover:text-ink cursor-pointer"
            >
              ← Back to Editor
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="px-6 py-2.5 rounded-pill bg-ink hover:bg-black text-ivory text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              Review & Finalize <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW, SCHEDULE & SEND */}
      {step === 5 && (
        <div className="bg-white border border-line rounded-card p-6 sm:p-8 shadow-soft space-y-6 animate-fade-up">
          <div className="border-b border-line pb-3">
            <h3 className="font-display text-lg text-ink font-bold">Review & Send Confirmation</h3>
            <p className="text-xs text-taupe mt-0.5">
              Carefully review your campaign details before queueing broadcast emails.
            </p>
          </div>

          {/* Campaign Summary Table */}
          <div className="bg-cream/20 border border-line rounded-lg p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-taupe block font-semibold">Campaign Name:</span>
                <span className="font-bold text-ink text-sm">{name}</span>
              </div>
              <div>
                <span className="text-taupe block font-semibold">Email Subject:</span>
                <span className="font-bold text-ink text-sm">{subject}</span>
              </div>
              <div>
                <span className="text-taupe block font-semibold">Sender:</span>
                <span className="text-ink">{senderName} &lt;{senderEmail}&gt;</span>
              </div>
              <div>
                <span className="text-taupe block font-semibold">Eligible Recipients:</span>
                <span className="font-bold text-zari-deep text-sm">{audienceData?.totalEligible || 0} customers</span>
              </div>
            </div>
          </div>

          {/* Dispatch Mode: Send Immediately vs Schedule for Later */}
          <div className="space-y-4 pt-2">
            <label className="text-xs font-bold text-ink uppercase tracking-wider block">Dispatch Timing</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`p-4 rounded-lg border cursor-pointer flex items-center gap-3 ${
                  sendMode === "now" ? "border-zari bg-cream/40" : "border-line bg-cream/10"
                }`}
              >
                <input
                  type="radio"
                  name="send_mode"
                  checked={sendMode === "now"}
                  onChange={() => setSendMode("now")}
                  className="accent-zari"
                />
                <div>
                  <span className="font-semibold text-xs text-ink block">Send Immediately</span>
                  <span className="text-[11px] text-taupe">Queue campaign for background broadcast right now</span>
                </div>
              </label>

              <label
                className={`p-4 rounded-lg border cursor-pointer flex items-center gap-3 ${
                  sendMode === "schedule" ? "border-zari bg-cream/40" : "border-line bg-cream/10"
                }`}
              >
                <input
                  type="radio"
                  name="send_mode"
                  checked={sendMode === "schedule"}
                  onChange={() => setSendMode("schedule")}
                  className="accent-zari"
                />
                <div>
                  <span className="font-semibold text-xs text-ink block">Schedule for Later</span>
                  <span className="text-[11px] text-taupe">Automatically dispatch on a specific date and time</span>
                </div>
              </label>
            </div>

            {sendMode === "schedule" && (
              <div className="p-4 bg-cream/25 border border-line rounded-lg space-y-2 animate-fade-in">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Select Date & Time (IST)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="px-3.5 py-2 text-xs border border-line rounded-lg bg-white text-ink"
                />
              </div>
            )}
          </div>

          {/* Large Broadcast Safeguard */}
          {(audienceData?.totalEligible || 0) >= 500 && (
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-danger font-bold text-xs">
                <AlertTriangle className="w-4 h-4" /> Safeguard: High-Volume Audience Verification
              </div>
              <p className="text-xs text-taupe">
                This campaign will reach {audienceData?.totalEligible} recipients. Type <strong className="text-danger">SEND CAMPAIGN</strong> below to confirm.
              </p>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder='Type "SEND CAMPAIGN"'
                className="w-full px-3 py-1.5 text-xs font-mono font-bold uppercase border border-danger/40 rounded bg-white text-danger focus:outline-none"
              />
            </div>
          )}

          <div className="pt-4 flex justify-between items-center border-t border-line">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-4 py-2 text-xs font-semibold text-taupe hover:text-ink cursor-pointer"
            >
              ← Back to Preview
            </button>

            <button
              type="button"
              disabled={dispatching || ((audienceData?.totalEligible || 0) >= 500 && confirmationInput !== "SEND CAMPAIGN")}
              onClick={handleDispatchOrSchedule}
              className="px-7 py-3 rounded-pill bg-zari hover:bg-zari-deep text-ivory text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-all"
            >
              {dispatching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : sendMode === "now" ? (
                <>
                  <Send className="w-4 h-4" />
                  Dispatch Campaign Now ({audienceData?.totalEligible || 0} Recipients)
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Schedule Campaign
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* AI Subject Suggestions Modal */}
      {showAiModal && typeof document !== "undefined" && createPortal(
        <div
          data-lenis-prevent="true"
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-ink/80 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAiModal(false);
          }}
        >
          <div
            data-lenis-prevent="true"
            className="bg-white border border-line rounded-card max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up relative z-10 max-h-[85vh] overflow-y-auto overscroll-contain"
          >
            <div className="flex justify-between items-center pb-2 border-b border-line">
              <h3 className="font-display text-base text-ink font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zari" /> AI Subject Line Suggestions
              </h3>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-taupe hover:text-ink text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-taupe">Click any suggested variation to use as your subject line:</p>

            <div className="space-y-2">
              {aiSuggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSubject(sug);
                    setShowAiModal(false);
                    notify("Subject line updated!");
                  }}
                  className="w-full p-3 rounded-lg border border-line bg-cream/15 hover:bg-cream/50 text-left text-xs font-semibold text-ink flex items-center justify-between gap-2 cursor-pointer transition-all hover:border-zari"
                >
                  <span>{sug}</span>
                  <Check className="w-3.5 h-3.5 text-zari shrink-0" />
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-taupe hover:text-ink cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
