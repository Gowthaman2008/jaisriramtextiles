"use client";

import React, { useState, useEffect } from "react";
import { EmailCampaign, EmailSubscriber } from "@/lib/marketing/types";
import {
  Users,
  Send,
  CheckCircle2,
  Eye,
  MousePointer,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  RefreshCw,
  BarChart3,
  Mail
} from "lucide-react";

interface MarketingDashboardProps {
  campaigns: EmailCampaign[];
  subscribers: EmailSubscriber[];
  onCreateCampaign: () => void;
  onNavigateTab: (tab: string) => void;
  onViewAnalytics: (campaign: EmailCampaign) => void;
}

export function MarketingDashboard({
  campaigns,
  subscribers,
  onCreateCampaign,
  onNavigateTab,
  onViewAnalytics,
}: MarketingDashboardProps) {
  const [period, setPeriod] = useState("30days");

  const totalSubscribers = subscribers.length;
  const activeSubscribers = subscribers.filter((s) => s.status === "subscribed").length;
  const unsubscribedUsers = subscribers.filter((s) => s.status === "unsubscribed").length;

  const totalCampaigns = campaigns.length;
  const sentCampaigns = campaigns.filter((c) => c.status === "sent").length;
  const scheduledCampaigns = campaigns.filter((c) => c.status === "scheduled").length;
  const draftCampaigns = campaigns.filter((c) => c.status === "draft").length;

  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.delivered_count || 0), 0);
  const totalOpens = campaigns.reduce((acc, c) => acc + (c.opened_count || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicked_count || 0), 0);
  const totalBounces = campaigns.reduce((acc, c) => acc + (c.bounced_count || 0), 0);
  const totalUnsubs = campaigns.reduce((acc, c) => acc + (c.unsubscribed_count || 0), 0);

  const avgOpenRate = totalDelivered > 0 ? ((totalOpens / totalDelivered) * 100).toFixed(1) : totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : "0.0";
  const avgClickRate = totalDelivered > 0 ? ((totalClicks / totalDelivered) * 100).toFixed(1) : totalOpens > 0 ? ((totalClicks / totalOpens) * 100).toFixed(1) : "0.0";
  const ctorRate = totalOpens > 0 ? ((totalClicks / totalOpens) * 100).toFixed(1) : "0.0";
  const bounceRate = totalSent > 0 ? ((totalBounces / totalSent) * 100).toFixed(1) : "0.0";
  const unsubRate = totalSent > 0 ? ((totalUnsubs / totalSent) * 100).toFixed(1) : "0.0";
  const [cashbackReminderStats, setCashbackReminderStats] = useState<{ totalWithBalance: number; dueNowCount: number; users: any[] } | null>(null);
  const [loadingCashbackStats, setLoadingCashbackStats] = useState(false);
  const [sendingCashbackReminders, setSendingCashbackReminders] = useState(false);
  const [cashbackSendResult, setCashbackSendResult] = useState<string | null>(null);
  const [showCashbackPreviewModal, setShowCashbackPreviewModal] = useState(false);

  useEffect(() => {
    async function loadCashbackStats() {
      setLoadingCashbackStats(true);
      try {
        const res = await fetch("/api/marketing/cashback-reminder");
        if (res.ok) {
          const data = await res.json();
          setCashbackReminderStats(data);
        }
      } catch (err) {
        console.error("Failed to load cashback reminder stats:", err);
      } finally {
        setLoadingCashbackStats(false);
      }
    }
    loadCashbackStats();
  }, []);

  async function handleDispatchCashbackReminders(forceAll = false) {
    setSendingCashbackReminders(true);
    setCashbackSendResult(null);
    try {
      const res = await fetch("/api/marketing/cashback-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceAll }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch reminders");
      setCashbackSendResult(`✅ Successfully sent ${data.sentCount} reminder email(s)! (${data.skippedCount} skipped due to 10-day cycle limit)`);
      const refreshRes = await fetch("/api/marketing/cashback-reminder");
      if (refreshRes.ok) {
        setCashbackReminderStats(await refreshRes.json());
      }
    } catch (err: any) {
      setCashbackSendResult(`❌ Error: ${err.message}`);
    } finally {
      setSendingCashbackReminders(false);
    }
  }

  // Best performing campaigns sorted by open count or click count
  const topCampaigns = [...campaigns]
    .filter((c) => c.sent_count > 0 || c.total_recipients > 0 || c.status === "sent")
    .sort((a, b) => (b.opened_count || 0) - (a.opened_count || 0))
    .slice(0, 4);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Top Banner & Quick Action */}
      <div className="bg-white border border-line rounded-card p-6 shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zari-deep">
            Marketing & Customer Broadcasting
          </span>
          <h2 className="font-display text-2xl text-ink font-bold">Mail Broadcasting Hub</h2>
          <p className="text-xs text-taupe">
            Manage email campaigns, segment audiences, create rich visual handloom emails, and track delivery health.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateCampaign}
          className="px-5 py-2.5 rounded-pill bg-ink text-ivory text-xs font-semibold hover:bg-black transition-colors flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Campaign
        </button>
      </div>

      {/* KPI Funnel Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Audience Pool Card */}
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-3">
          <div className="flex justify-between items-center text-taupe text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">Subscribers Pool</span>
            <Users className="w-4 h-4 text-ink" />
          </div>
          <div>
            <div className="text-2xl font-display text-ink font-bold">{totalSubscribers.toLocaleString()}</div>
            <div className="text-xs text-success mt-0.5 font-medium">
              {activeSubscribers.toLocaleString()} Active Opt-Ins
            </div>
          </div>
          <div className="pt-2 border-t border-line text-[11px] text-muted flex justify-between items-center">
            <span>Unsubscribed: {unsubscribedUsers}</span>
            <button
              type="button"
              onClick={() => onNavigateTab("subscribers")}
              className="text-zari-deep font-semibold hover:underline cursor-pointer flex items-center gap-1"
            >
              View All →
            </button>
          </div>
        </div>

        {/* Campaigns Sent Card */}
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-3">
          <div className="flex justify-between items-center text-taupe text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">Campaigns Overview</span>
            <Mail className="w-4 h-4 text-zari" />
          </div>
          <div>
            <div className="text-2xl font-display text-ink font-bold">{totalCampaigns}</div>
            <div className="text-xs text-taupe mt-0.5">
              {sentCampaigns} Sent • {scheduledCampaigns} Scheduled
            </div>
          </div>
          <div className="pt-2 border-t border-line text-[11px] text-muted flex justify-between items-center">
            <span>{draftCampaigns} Drafts</span>
            <button
              type="button"
              onClick={() => onNavigateTab("campaigns")}
              className="text-zari-deep font-semibold hover:underline cursor-pointer flex items-center gap-1"
            >
              Manage →
            </button>
          </div>
        </div>

        {/* Open Rate Card */}
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-3">
          <div className="flex justify-between items-center text-taupe text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">Average Open Rate</span>
            <Eye className="w-4 h-4 text-zari" />
          </div>
          <div>
            <div className="text-2xl font-display text-zari-deep font-bold">{avgOpenRate}%</div>
            <div className="text-xs text-taupe mt-0.5">
              {totalOpens.toLocaleString()} Total Opens Recorded
            </div>
          </div>
          <div className="pt-2 border-t border-line text-[11px] text-muted">
            Delivered: {totalDelivered > 0 ? totalDelivered.toLocaleString() : totalSent.toLocaleString()}
          </div>
        </div>

        {/* Click Rate Card */}
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-3">
          <div className="flex justify-between items-center text-taupe text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">Average Click Rate</span>
            <MousePointer className="w-4 h-4 text-brand-gold" />
          </div>
          <div>
            <div className="text-2xl font-display text-brand-gold font-bold">{avgClickRate}%</div>
            <div className="text-xs text-taupe mt-0.5">
              {totalClicks.toLocaleString()} Total Link Clicks {totalOpens > 0 ? `(${ctorRate}% CTOR)` : ""}
            </div>
          </div>
          <div className="pt-2 border-t border-line text-[11px] text-muted flex justify-between">
            <span>Bounce Rate: {bounceRate}%</span>
            <span>Unsub: {unsubRate}%</span>
          </div>
        </div>
      </div>

      {/* Automated 10-Day Cashback Expiry Marketing Hub */}
      <div className="bg-gradient-to-br from-cream/40 via-white to-zari-tint/20 border border-zari/35 rounded-card p-6 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-line/60 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zari/15 border border-zari/30 text-zari-deep text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Automated 10-Day Retention Engine
            </div>
            <h3 className="font-display text-lg text-ink font-bold">10-Day Cashback Expiry Reminders</h3>
            <p className="text-xs text-taupe max-w-2xl leading-relaxed">
              Sends an email reminder every 10 days to users who have an active cashback balance in their wallet, notifying them of their upcoming expiration date (90-day validity window) and inviting them to order and redeem.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowCashbackPreviewModal(true)}
              className="px-3.5 py-2 rounded-pill bg-white border border-line hover:border-zari text-ink text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Inspect Active Recipients ({cashbackReminderStats?.totalWithBalance || 0})
            </button>
            <button
              type="button"
              onClick={() => handleDispatchCashbackReminders(false)}
              disabled={sendingCashbackReminders || loadingCashbackStats}
              className="px-4 py-2 rounded-pill bg-zari-deep hover:bg-ink text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sendingCashbackReminders ? "Dispatching..." : `Send Due Cycle (${cashbackReminderStats?.dueNowCount || 0})`}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-3 bg-white/80 border border-line/70 rounded-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider text-taupe">Accounts With Active Cashback</span>
            <p className="text-xl font-display font-bold text-ink mt-0.5">
              {loadingCashbackStats ? "..." : cashbackReminderStats?.totalWithBalance || 0} users
            </p>
          </div>
          <div className="p-3 bg-white/80 border border-line/70 rounded-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider text-taupe">Due For 10-Day Reminder Now</span>
            <p className="text-xl font-display font-bold text-success mt-0.5">
              {loadingCashbackStats ? "..." : cashbackReminderStats?.dueNowCount || 0} users
            </p>
          </div>
          <div className="p-3 bg-white/80 border border-line/70 rounded-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider text-taupe">Automated Frequency</span>
            <p className="text-xs font-bold text-ink mt-1.5">
              Strictly once per 10 days per user &middot; 90-day expiry notice
            </p>
          </div>
        </div>

        {cashbackSendResult && (
          <div className="p-3 rounded-lg bg-cream/70 border border-zari/30 text-xs text-ink font-medium">
            {cashbackSendResult}
          </div>
        )}
      </div>

      {/* Recipient Preview Modal */}
      {showCashbackPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-line rounded-card shadow-lift max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-line bg-cream/30 flex justify-between items-center">
              <div>
                <h4 className="font-display font-bold text-ink text-base">Active Cashback Accounts</h4>
                <p className="text-xs text-taupe">Users currently holding unexpired cashback credits</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCashbackPreviewModal(false)}
                className="text-taupe hover:text-ink font-bold text-lg cursor-pointer px-2"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(!cashbackReminderStats?.users || cashbackReminderStats.users.length === 0) ? (
                <p className="text-xs text-taupe text-center py-6">No users currently have an active cashback balance.</p>
              ) : (
                cashbackReminderStats.users.map((u: any) => (
                  <div key={u.profileId} className="p-3 border border-line rounded-lg bg-ivory/5 flex justify-between items-center gap-3">
                    <div>
                      <p className="text-xs font-bold text-ink">{u.name} <span className="font-mono text-[10px] text-taupe font-normal">({u.email})</span></p>
                      <p className="text-[11px] text-taupe mt-0.5">
                        Cashback Balance: <strong className="text-success">₹{(u.balancePaise / 100).toFixed(2)}</strong> &middot; Expires in <strong>{u.daysRemaining} days</strong>
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      u.isDueNow ? "bg-success/15 text-success border border-success/30" : "bg-muted text-taupe border border-line"
                    }`}>
                      {u.isDueNow ? "Due For 10-Day Mail" : "Sent Recently (<10d)"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-line bg-cream/20 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCashbackPreviewModal(false)}
                className="px-4 py-1.5 rounded bg-cream text-ink text-xs font-semibold cursor-pointer border border-line"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Launchpad Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigateTab("segments")}
          className="bg-white border border-line rounded-card p-5 shadow-soft hover:border-zari cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">Customer Segments</span>
            <ArrowRight className="w-4 h-4 text-taupe group-hover:text-zari transition-colors" />
          </div>
          <p className="text-xs text-taupe">
            Group customers by spending threshold, location (e.g. Tamil Nadu), or order count.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab("templates")}
          className="bg-white border border-line rounded-card p-5 shadow-soft hover:border-zari cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">Email Templates</span>
            <ArrowRight className="w-4 h-4 text-taupe group-hover:text-zari transition-colors" />
          </div>
          <p className="text-xs text-taupe">
            Browse pre-built templates for festive sales, welcome onboard gifts, and new arrivals.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab("settings")}
          className="bg-white border border-line rounded-card p-5 shadow-soft hover:border-zari cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">Deliverability Health</span>
            <ArrowRight className="w-4 h-4 text-taupe group-hover:text-zari transition-colors" />
          </div>
          <p className="text-xs text-taupe">
            Verify SPF, DKIM, and DMARC domain keys for zero-spam inbox deliverability.
          </p>
        </div>
      </div>

      {/* Top Performing Campaigns Table */}
      <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-base text-ink font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zari" /> Best Performing Broadcasts
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab("campaigns")}
            className="text-xs font-semibold text-zari-deep hover:text-zari cursor-pointer"
          >
            View All Campaigns →
          </button>
        </div>

        {topCampaigns.length === 0 ? (
          <p className="text-xs text-taupe py-4">No completed broadcasts yet. Dispatched campaigns will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line text-taupe text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5">Campaign Name</th>
                  <th className="py-2.5">Recipients</th>
                  <th className="py-2.5">Open Rate</th>
                  <th className="py-2.5">Click Rate</th>
                  <th className="py-2.5 text-right">Analytics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {topCampaigns.map((c) => {
                  const oRate = c.delivered_count > 0 ? ((c.opened_count / c.delivered_count) * 100).toFixed(1) : "0.0";
                  const cRate = c.opened_count > 0 ? ((c.clicked_count / c.opened_count) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={c.id} className="hover:bg-cream/15">
                      <td className="py-3 font-semibold text-ink">{c.name}</td>
                      <td className="py-3 text-taupe">{c.total_recipients.toLocaleString()}</td>
                      <td className="py-3 font-bold text-zari-deep">{oRate}%</td>
                      <td className="py-3 font-bold text-brand-gold">{cRate}%</td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onViewAnalytics(c)}
                          className="px-2.5 py-1 rounded bg-cream/40 hover:bg-cream text-ink text-xs font-semibold cursor-pointer border border-line"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
