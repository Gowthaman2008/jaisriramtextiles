"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { EmailCampaign } from "@/lib/marketing/types";
import { RefreshCw, Download, Search, CheckCircle2, Eye, MousePointer, Users, BarChart3, Check, X } from "lucide-react";
import { useNotification } from "@/components/providers/notification-provider";

interface CampaignAnalyticsModalProps {
  campaign: EmailCampaign;
  onClose: () => void;
}

export function CampaignAnalyticsModal({ campaign, onClose }: CampaignAnalyticsModalProps) {
  const { notify } = useNotification();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [recipientStatusFilter, setRecipientStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingEmail, setMarkingEmail] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    loadAnalytics();
    loadRecipients();
  }, []);

  useEffect(() => {
    loadRecipients();
  }, [recipientStatusFilter, page, search]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaign.id}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data.metrics);
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecipients() {
    setRecipientsLoading(true);
    try {
      const url = `/api/admin/marketing/campaigns/${campaign.id}/recipients?status=${recipientStatusFilter}&search=${encodeURIComponent(search)}&page=${page}&limit=25`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecipients(data.recipients || []);
        setTotalPages(Math.ceil((data.total || 1) / 25));
      }
    } catch (err) {
      console.error("Recipients fetch error:", err);
    } finally {
      setRecipientsLoading(false);
    }
  }

  async function handleRefreshAll() {
    await Promise.all([loadAnalytics(), loadRecipients()]);
    notify("Live campaign metrics refreshed!");
  }

  async function handleMarkRecipientOpened(email: string) {
    setMarkingEmail(email);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaign.id}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "mark_opened" }),
      });
      if (res.ok) {
        notify(`Marked email as opened for ${email}`);
        await Promise.all([loadAnalytics(), loadRecipients()]);
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err: any) {
      notify("Error: " + err.message);
    } finally {
      setMarkingEmail(null);
    }
  }

  async function handleMarkRecipientClicked(email: string) {
    setMarkingEmail(email);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaign.id}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "mark_clicked" }),
      });
      if (res.ok) {
        notify(`Recorded link click for ${email}`);
        await Promise.all([loadAnalytics(), loadRecipients()]);
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err: any) {
      notify("Error: " + err.message);
    } finally {
      setMarkingEmail(null);
    }
  }

  const m = analyticsData || {
    total: campaign.total_recipients,
    sent: campaign.sent_count,
    delivered: campaign.delivered_count,
    opened: campaign.opened_count,
    clicked: campaign.clicked_count,
    bounced: campaign.bounced_count,
    failed: campaign.failed_count,
    unsubscribed: campaign.unsubscribed_count,
    openRate: campaign.delivered_count > 0 ? Number(((campaign.opened_count / campaign.delivered_count) * 100).toFixed(1)) : 0,
    clickRate: campaign.opened_count > 0 ? Number(((campaign.clicked_count / campaign.opened_count) * 100).toFixed(1)) : 0,
    deliveryRate: campaign.sent_count > 0 ? 100 : 0,
    bounceRate: 0,
  };

  if (!mounted) return null;

  const modalContent = (
    <div
      data-lenis-prevent="true"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-ink/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-lenis-prevent="true"
        className="bg-white border border-line rounded-card max-w-4xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto overscroll-contain animate-scale-up relative z-10"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zari-deep bg-cream/70 px-2 py-0.5 rounded border border-line">
                Campaign Report
              </span>
              <span className="text-xs font-mono text-muted">ID: {campaign.id.substring(0, 8)}...</span>
            </div>
            <h2 className="font-display text-xl text-ink font-bold mt-1">{campaign.name}</h2>
            <p className="text-xs text-taupe">Subject: "{campaign.subject}"</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshAll}
              className="px-3 py-1.5 rounded-lg border border-line bg-cream/30 hover:bg-cream text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-zari ${loading || recipientsLoading ? "animate-spin" : ""}`} />
              <span>Refresh Stats</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-taupe hover:text-ink text-sm p-1.5 rounded-md hover:bg-cream/40 cursor-pointer"
              title="Close Report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Funnel Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-cream/20 border border-line rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between text-taupe text-xs">
              <span>Recipients</span>
              <Users className="w-3.5 h-3.5 text-ink" />
            </div>
            <p className="text-2xl font-display text-ink font-bold">{m.total || 0}</p>
            <p className="text-[10px] text-muted">{m.sent || m.total || 0} emails dispatched</p>
          </div>

          <div className="bg-cream/20 border border-line rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between text-taupe text-xs">
              <span>Delivery Rate</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            </div>
            <p className="text-2xl font-display text-success font-bold">{m.deliveryRate || 100}%</p>
            <p className="text-[10px] text-muted">{m.delivered || m.sent || m.total || 0} delivered</p>
          </div>

          <div className="bg-cream/20 border border-line rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between text-taupe text-xs">
              <span>Open Rate</span>
              <Eye className="w-3.5 h-3.5 text-zari" />
            </div>
            <p className="text-2xl font-display text-zari-deep font-bold">{m.openRate || 0}%</p>
            <p className="text-[10px] text-muted">{m.opened || 0} opens recorded</p>
          </div>

          <div className="bg-cream/20 border border-line rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between text-taupe text-xs">
              <span>Click Rate (CTR)</span>
              <MousePointer className="w-3.5 h-3.5 text-brand-gold" />
            </div>
            <p className="text-2xl font-display text-brand-gold font-bold">{m.clickRate || 0}%</p>
            <p className="text-[10px] text-muted">{m.clicked || 0} link clicks recorded</p>
          </div>
        </div>

        {/* Recipient-Level Audit Inspector */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-display text-base text-ink font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-zari" /> Recipient-Level Activity Log
            </h3>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-taupe absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search recipient..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
                />
              </div>

              <select
                value={recipientStatusFilter}
                onChange={(e) => {
                  setRecipientStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs border border-line rounded-lg bg-cream/15 text-ink"
              >
                <option value="all">All Statuses</option>
                <option value="queued">Queued</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="opened">Opened</option>
                <option value="clicked">Clicked</option>
                <option value="bounced">Bounced</option>
                <option value="failed">Failed</option>
              </select>

              <a
                href={`/api/admin/marketing/campaigns/${campaign.id}/recipients?status=${recipientStatusFilter}&export=true`}
                download
                className="px-3 py-1.5 rounded-lg border border-line hover:bg-cream/40 text-xs font-semibold text-ink flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3 text-zari" /> Export CSV
              </a>
            </div>
          </div>

          <div className="bg-white border border-line rounded-lg overflow-hidden">
            {recipientsLoading ? (
              <div className="p-8 text-center text-taupe space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin text-zari mx-auto" />
                <p className="text-xs">Loading recipient logs...</p>
              </div>
            ) : recipients.length === 0 ? (
              <div className="p-8 text-center text-taupe text-xs">
                No recipients found matching your filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-cream/40 border-b border-line text-[10px] font-bold text-taupe uppercase tracking-wider">
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Delivered</th>
                      <th className="py-2.5 px-3">Opened</th>
                      <th className="py-2.5 px-3">Clicked</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {recipients.map((r) => {
                      const isOpened = r.status === "opened" || !!r.opened_at || r.status === "clicked";
                      const isClicked = r.status === "clicked" || !!r.clicked_at;

                      return (
                        <tr key={r.id || r.email} className="hover:bg-cream/15 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-ink">{r.name || "Customer"}</div>
                            <div className="text-taupe font-mono text-[11px]">{r.email}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                isClicked
                                  ? "bg-brand-gold/15 text-brand-gold border border-brand-gold/30 font-bold"
                                  : isOpened
                                  ? "bg-zari/15 text-zari-deep border border-zari/30 font-bold"
                                  : r.status === "delivered" || r.status === "sent"
                                  ? "bg-success/10 text-success"
                                  : r.status === "failed" || r.status === "bounced"
                                  ? "bg-danger/10 text-danger"
                                  : "bg-cream text-taupe"
                              }`}
                            >
                              {isClicked ? "CLICKED" : isOpened ? "OPENED" : r.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-taupe font-mono text-[11px]">
                            {r.delivered_at
                              ? new Date(r.delivered_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                              : r.sent_at
                              ? new Date(r.sent_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {r.opened_at ? (
                              <span className="text-zari-deep font-semibold">
                                {new Date(r.opened_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            ) : (
                              <span className="text-taupe">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {r.clicked_at ? (
                              <span className="text-brand-gold font-semibold">
                                {new Date(r.clicked_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            ) : (
                              <span className="text-taupe">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isOpened && (
                                <button
                                  type="button"
                                  disabled={markingEmail === r.email}
                                  onClick={() => handleMarkRecipientOpened(r.email)}
                                  className="text-[10px] font-semibold text-zari-deep hover:underline cursor-pointer disabled:opacity-50"
                                  title="Mark as Opened"
                                >
                                  {markingEmail === r.email ? "Saving..." : "Mark Opened"}
                                </button>
                              )}
                              {!isClicked ? (
                                <button
                                  type="button"
                                  disabled={markingEmail === r.email}
                                  onClick={() => handleMarkRecipientClicked(r.email)}
                                  className="text-[10px] font-semibold text-brand-gold hover:underline cursor-pointer disabled:opacity-50"
                                  title="Record Link Click"
                                >
                                  {markingEmail === r.email ? "Saving..." : "Mark Clicked"}
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-brand-gold font-semibold">
                                  <Check className="w-3 h-3" /> Clicked
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center text-xs text-taupe pt-2">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-2.5 py-1 rounded border border-line bg-cream/20 hover:bg-cream/60 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-2.5 py-1 rounded border border-line bg-cream/20 hover:bg-cream/60 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-pill bg-ink text-ivory text-xs font-semibold hover:bg-black cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
