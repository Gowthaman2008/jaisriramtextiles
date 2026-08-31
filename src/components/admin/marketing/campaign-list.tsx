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
  Send
} from "lucide-react";
import { useNotification } from "@/components/providers/notification-provider";

interface CampaignListProps {
  campaigns: EmailCampaign[];
  onCreateNew: () => void;
  onEditCampaign: (campaign: EmailCampaign) => void;
  onDuplicateCampaign: (campaign: EmailCampaign) => void;
  onViewAnalytics: (campaign: EmailCampaign) => void;
  onDeleteCampaign: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export function CampaignList({
  campaigns,
  onCreateNew,
  onEditCampaign,
  onDuplicateCampaign,
  onViewAnalytics,
  onDeleteCampaign,
  onRefresh,
}: CampaignListProps) {
  const { notify, confirm } = useNotification();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
            <CheckCircle2 className="w-3 h-3" /> Sent
          </span>
        );
      case "sending":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zari-deep bg-zari/15 px-2 py-0.5 rounded-full border border-zari/30 animate-pulse">
            <Send className="w-3 h-3" /> Sending
          </span>
        );
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-ink bg-cream/70 px-2 py-0.5 rounded-full border border-line">
            <Clock className="w-3 h-3 text-zari" /> Scheduled
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-taupe bg-cream/40 px-2 py-0.5 rounded-full border border-line">
            Draft
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full border border-danger/20">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted bg-cream/20 px-2 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Search Bar */}
      <div className="bg-white border border-line rounded-card p-5 shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-taupe absolute left-3 top-1/2 -translate-y-1/2" />
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
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
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
            <Plus className="w-4 h-4 text-zari" /> Create Campaign
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
                  <th className="py-3.5 px-4">Campaign & Subject</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Recipients</th>
                  <th className="py-3.5 px-4">Open Rate</th>
                  <th className="py-3.5 px-4">Click Rate</th>
                  <th className="py-3.5 px-4">Dispatched On</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-ink">
                {filtered.map((c) => {
                  const openRate = c.delivered_count > 0 ? ((c.opened_count / c.delivered_count) * 100).toFixed(1) : "—";
                  const clickRate = c.opened_count > 0 ? ((c.clicked_count / c.opened_count) * 100).toFixed(1) : "—";

                  return (
                    <tr key={c.id} className="hover:bg-cream/15 transition-colors">
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-ink text-sm truncate">{c.name}</div>
                        <div className="text-taupe text-xs truncate mt-0.5 font-sans">
                          Subject: "{c.subject}"
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">{getStatusBadge(c.status)}</td>
                      <td className="py-4 px-4 font-semibold text-ink whitespace-nowrap">
                        {c.total_recipients > 0 ? c.total_recipients.toLocaleString() : "—"}
                      </td>
                      <td className="py-4 px-4 text-zari-deep font-bold whitespace-nowrap">
                        {openRate !== "—" ? `${openRate}%` : "—"}
                      </td>
                      <td className="py-4 px-4 text-brand-gold font-bold whitespace-nowrap">
                        {clickRate !== "—" ? `${clickRate}%` : "—"}
                      </td>
                      <td className="py-4 px-4 text-taupe font-mono text-[11px] whitespace-nowrap">
                        {c.sent_at ? new Date(c.sent_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : c.scheduled_at ? `Sched: ${new Date(c.scheduled_at).toLocaleDateString("en-IN")}` : "Draft"}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewAnalytics(c)}
                            className="p-1.5 rounded hover:bg-cream text-zari-deep hover:text-zari cursor-pointer"
                            title="View Analytics & Logs"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDuplicateCampaign(c)}
                            className="p-1.5 rounded hover:bg-cream text-taupe hover:text-ink cursor-pointer"
                            title="Duplicate Campaign"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {c.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => onEditCampaign(c)}
                              className="p-1.5 rounded hover:bg-cream text-taupe hover:text-ink cursor-pointer"
                              title="Edit Campaign"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={async () => {
                              if (await confirm(`Delete campaign "${c.name}"?`, { danger: true })) {
                                await onDeleteCampaign(c.id);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-cream text-danger/70 hover:text-danger cursor-pointer"
                            title="Delete Campaign"
                          >
                            <Trash2 className="w-4 h-4" />
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
