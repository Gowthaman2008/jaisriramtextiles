"use client";

import React, { useState } from "react";
import { EmailCampaign, CampaignStatus } from "@/lib/marketing/types";
import {
  Search,
  Plus,
  BarChart3,
  Copy,
  Edit2,
  Trash2,
  Play,
  Pause,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Send,
  RefreshCw,
  MoreVertical
} from "lucide-react";
import { useNotification } from "@/components/providers/notification-provider";

interface CampaignListProps {
  campaigns: EmailCampaign[];
  onCreateNew: () => void;
  onEditCampaign: (campaign: EmailCampaign) => void;
  onDuplicateCampaign: (campaign: EmailCampaign) => void;
  onViewAnalytics: (campaign: EmailCampaign) => void;
  onDeleteCampaign: (id: string) => Promise<void>;
  onSendCampaign?: (campaign: EmailCampaign) => Promise<void>;
  onToggleStatus?: (campaign: EmailCampaign, newStatus: CampaignStatus) => Promise<void>;
  onRefresh: () => void;
}

export function CampaignList({
  campaigns,
  onCreateNew,
  onEditCampaign,
  onDuplicateCampaign,
  onViewAnalytics,
  onDeleteCampaign,
  onSendCampaign,
  onToggleStatus,
  onRefresh,
}: CampaignListProps) {
  const { notify, confirm } = useNotification();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sendingId, setSendingId] = useState<string | null>(null);

  const filtered = campaigns.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.subject.toLowerCase().includes(term);
  });

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Sent
          </span>
        );
      case "sending":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300 animate-pulse shadow-xs">
            <Send className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Sending...
          </span>
        );
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Scheduled
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
            Draft
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 shadow-xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-muted bg-cream/30 px-2 py-1 rounded-full border border-line">
            {status}
          </span>
        );
    }
  };

  async function handleQuickSend(c: EmailCampaign) {
    if (!onSendCampaign) return;
    const ok = await confirm(
      `Broadcast campaign "${c.name}" to all eligible audience members now?`,
      { title: "Confirm Broadcast" }
    );
    if (!ok) return;

    setSendingId(c.id);
    try {
      await onSendCampaign(c);
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Filter & Search Bar */}
      <div className="bg-white border border-line rounded-card p-5 shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-taupe absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns by name or subject..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex bg-cream/55 p-1 rounded-lg border border-line">
            {[
              { key: "all", label: "All" },
              { key: "sent", label: "Sent" },
              { key: "sending", label: "Sending" },
              { key: "scheduled", label: "Scheduled" },
              { key: "draft", label: "Drafts" },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === f.key ? "bg-ink text-ivory shadow-sm" : "text-taupe hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 rounded-pill bg-ink hover:bg-black text-ivory text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 text-zari shrink-0" /> Create Campaign
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-line rounded-card shadow-soft overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-taupe space-y-3">
            <p className="text-base font-display text-ink">No campaigns found</p>
            <p className="text-xs">Create your first broadcast or adjust your search filter.</p>
            <button
              type="button"
              onClick={onCreateNew}
              className="px-4 py-2 rounded-pill bg-zari hover:bg-zari-deep text-ivory text-xs font-semibold cursor-pointer"
            >
              Start New Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-cream/40 border-b border-line text-[11px] font-bold text-taupe uppercase tracking-wider">
                  <th className="py-4 px-5 min-w-[220px]">Campaign & Subject</th>
                  <th className="py-4 px-4 min-w-[110px]">Status</th>
                  <th className="py-4 px-4 min-w-[100px]">Recipients</th>
                  <th className="py-4 px-4 min-w-[90px]">Open Rate</th>
                  <th className="py-4 px-4 min-w-[90px]">Click Rate</th>
                  <th className="py-4 px-4 min-w-[130px]">Dispatched On</th>
                  <th className="py-4 px-5 text-right min-w-[200px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-ink">
                {filtered.map((c) => {
                  const openRate = c.delivered_count > 0 ? ((c.opened_count / c.delivered_count) * 100).toFixed(1) : "—";
                  const clickRate = c.opened_count > 0 ? ((c.clicked_count / c.opened_count) * 100).toFixed(1) : "—";
                  const isBusySending = sendingId === c.id || c.status === "sending";

                  return (
                    <tr key={c.id} className="hover:bg-cream/15 transition-colors">
                      <td className="py-4 px-5 max-w-sm">
                        <div className="font-bold text-ink text-sm truncate">{c.name}</div>
                        <div className="text-taupe text-xs truncate mt-0.5 font-sans">
                          Subject: "{c.subject}"
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(c.status)}
                          {onToggleStatus && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextStatus = c.status === "sent" ? "draft" : "sent";
                                onToggleStatus(c, nextStatus);
                              }}
                              className="text-[10px] text-taupe hover:text-zari-deep underline cursor-pointer"
                              title={c.status === "sent" ? "Mark as Draft" : "Mark as Sent"}
                            >
                              {c.status === "sent" ? "Set Draft" : "Set Sent"}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-ink whitespace-nowrap">
                        {c.total_recipients > 0 ? (
                          <span>{c.total_recipients.toLocaleString()} customers</span>
                        ) : c.sent_count > 0 ? (
                          <span>{c.sent_count.toLocaleString()} customers</span>
                        ) : (
                          <span className="text-taupe">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-zari-deep font-bold whitespace-nowrap">
                        {openRate !== "—" ? `${openRate}%` : "—"}
                      </td>
                      <td className="py-4 px-4 text-brand-gold font-bold whitespace-nowrap">
                        {clickRate !== "—" ? `${clickRate}%` : "—"}
                      </td>
                      <td className="py-4 px-4 text-taupe text-xs whitespace-nowrap">
                        {c.sent_at ? (
                          <span className="font-semibold text-ink">
                            {new Date(c.sent_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                          </span>
                        ) : c.scheduled_at ? (
                          <span className="text-blue-700 font-semibold">
                            {new Date(c.scheduled_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                          </span>
                        ) : (
                          <span className="text-muted italic">Draft</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                          {/* Broadcast / Send Now button */}
                          {onSendCampaign && c.status !== "sent" && (
                            <button
                              type="button"
                              disabled={isBusySending}
                              onClick={() => handleQuickSend(c)}
                              className="w-8.5 h-8.5 inline-flex items-center justify-center rounded-lg border border-zari/50 bg-zari/10 hover:bg-zari text-zari-deep hover:text-white shadow-xs cursor-pointer transition-all shrink-0 disabled:opacity-50"
                              title="Broadcast / Send Campaign Now"
                            >
                              {isBusySending ? (
                                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                              ) : (
                                <Send className="w-4 h-4 shrink-0" />
                              )}
                            </button>
                          )}

                          {/* Analytics Button */}
                          <button
                            type="button"
                            onClick={() => onViewAnalytics(c)}
                            className="w-8.5 h-8.5 inline-flex items-center justify-center rounded-lg border border-line bg-white hover:bg-cream/60 hover:border-zari text-zari-deep hover:text-zari shadow-xs cursor-pointer transition-all shrink-0"
                            title="View Analytics & Logs"
                          >
                            <BarChart3 className="w-4 h-4 shrink-0" />
                          </button>

                          {/* Duplicate Button */}
                          <button
                            type="button"
                            onClick={() => onDuplicateCampaign(c)}
                            className="w-8.5 h-8.5 inline-flex items-center justify-center rounded-lg border border-line bg-white hover:bg-cream/60 text-taupe hover:text-ink shadow-xs cursor-pointer transition-all shrink-0"
                            title="Duplicate Campaign"
                          >
                            <Copy className="w-4 h-4 shrink-0" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => onEditCampaign(c)}
                            className="w-8.5 h-8.5 inline-flex items-center justify-center rounded-lg border border-line bg-white hover:bg-cream/60 text-taupe hover:text-ink shadow-xs cursor-pointer transition-all shrink-0"
                            title="Edit Campaign"
                          >
                            <Edit2 className="w-4 h-4 shrink-0" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (await confirm(`Delete campaign "${c.name}"?`, { danger: true })) {
                                await onDeleteCampaign(c.id);
                              }
                            }}
                            className="w-8.5 h-8.5 inline-flex items-center justify-center rounded-lg border border-line bg-white hover:bg-rose-50 hover:border-rose-300 text-danger/80 hover:text-danger shadow-xs cursor-pointer transition-all shrink-0"
                            title="Delete Campaign"
                          >
                            <Trash2 className="w-4 h-4 shrink-0" />
                          </button>
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
    </div>
  );
}
