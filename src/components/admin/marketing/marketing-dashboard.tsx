"use client";

import React, { useState } from "react";
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
  const avgClickRate = totalOpens > 0 ? ((totalClicks / totalOpens) * 100).toFixed(1) : "0.0";
  const bounceRate = totalSent > 0 ? ((totalBounces / totalSent) * 100).toFixed(1) : "0.0";
  const unsubRate = totalSent > 0 ? ((totalUnsubs / totalSent) * 100).toFixed(1) : "0.0";

  // Best performing campaigns sorted by open count or click count
  const topCampaigns = [...campaigns]
    .filter((c) => c.sent_count > 0)
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCreateCampaign}
            className="px-5 py-2.5 rounded-pill bg-ink hover:bg-black text-ivory text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 text-zari" /> Create New Campaign
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Subscribers Card */}
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-3">
          <div className="flex justify-between items-center text-taupe text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">Subscribers Pool</span>
            <Users className="w-4 h-4 text-zari" />
          </div>
          <div>
            <div className="text-2xl font-display text-ink font-bold">{totalSubscribers.toLocaleString()}</div>
            <div className="text-xs text-success font-semibold flex items-center gap-1 mt-0.5">
              <span>{activeSubscribers} Active Opt-Ins</span>
            </div>
          </div>
          <div className="pt-2 border-t border-line text-[11px] text-muted flex justify-between">
            <span>Unsubscribed: {unsubscribedUsers}</span>
            <button
              type="button"
              onClick={() => onNavigateTab("subscribers")}
              className="text-zari-deep hover:underline cursor-pointer font-semibold"
            >
              View All →
            </button>
          </div>
        </div>

        {/* Campaigns Card */}
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-3">
          <div className="flex justify-between items-center text-taupe text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">Campaigns Overview</span>
            <Mail className="w-4 h-4 text-zari" />
          </div>
          <div>
            <div className="text-2xl font-display text-ink font-bold">{totalCampaigns}</div>
            <div className="text-xs text-taupe mt-0.5 font-medium">
              {sentCampaigns} Sent • {scheduledCampaigns} Scheduled
            </div>
          </div>
          <div className="pt-2 border-t border-line text-[11px] text-muted flex justify-between">
            <span>{draftCampaigns} Drafts</span>
            <button
              type="button"
              onClick={() => onNavigateTab("campaigns")}
              className="text-zari-deep hover:underline cursor-pointer font-semibold"
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
              {totalClicks.toLocaleString()} Total Link Clicks
            </div>
          </div>
          <div className="pt-2 border-t border-line text-[11px] text-muted flex justify-between">
            <span>Bounce Rate: {bounceRate}%</span>
            <span>Unsub: {unsubRate}%</span>
          </div>
        </div>
      </div>

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
