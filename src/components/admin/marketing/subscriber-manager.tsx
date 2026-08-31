"use client";

import React, { useState, useEffect } from "react";
import { EmailSubscriber } from "@/lib/marketing/types";
import { Search, Download, RefreshCw, Mail, CheckCircle2, XCircle, ShieldCheck, User, Phone, ShoppingBag } from "lucide-react";
import { useNotification } from "@/components/providers/notification-provider";

export function SubscriberManager() {
  const { notify } = useNotification();
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);

  useEffect(() => {
    loadSubscribers();
  }, [statusFilter]);

  async function loadSubscribers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/marketing/subscribers?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data || []);
      }
    } catch (err) {
      console.error("Failed to load subscribers:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(sub: EmailSubscriber) {
    const newStatus = sub.status === "subscribed" ? "unsubscribed" : "subscribed";
    setUpdatingEmail(sub.email);
    try {
      const res = await fetch("/api/admin/marketing/subscribers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: sub.email,
          status: newStatus,
        }),
      });

      if (res.ok) {
        notify(`Updated status for ${sub.email} to ${newStatus}`);
        setSubscribers(subscribers.map((s) => (s.email === sub.email ? { ...s, status: newStatus } : s)));
      }
    } catch (err: any) {
      notify("Error updating subscriber: " + err.message);
    } finally {
      setUpdatingEmail(null);
    }
  }

  const filtered = subscribers.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return s.email.toLowerCase().includes(term) || (s.name || "").toLowerCase().includes(term) || (s.phone || "").includes(term);
  });

  const totalCount = subscribers.length;
  const activeCount = subscribers.filter((s) => s.status === "subscribed").length;
  const unsubscribedCount = subscribers.filter((s) => s.status === "unsubscribed").length;

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-taupe">Total Customer Database</span>
          <p className="text-2xl font-display text-ink font-bold">{totalCount}</p>
          <p className="text-xs text-muted">Registered shoppers & newsletter signups</p>
        </div>
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-success">Active Marketing Subscribers</span>
          <p className="text-2xl font-display text-success font-bold">{activeCount}</p>
          <p className="text-xs text-muted">Eligible to receive promotional broadcasts</p>
        </div>
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-danger">Unsubscribed / Opted-Out</span>
          <p className="text-2xl font-display text-danger font-bold">{unsubscribedCount}</p>
          <p className="text-xs text-muted">Protected by compliance suppression</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white border border-line rounded-card p-5 shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-taupe absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, phone..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex bg-cream/55 p-1 rounded-lg border border-line">
            {[
              { key: "all", label: "All" },
              { key: "subscribed", label: "Subscribed" },
              { key: "unsubscribed", label: "Unsubscribed" },
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

          <a
            href={`/api/admin/marketing/subscribers?status=${statusFilter}&export=true`}
            download
            className="px-3 py-2 rounded-lg border border-line hover:bg-cream/40 text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zari" /> Export CSV
          </a>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white border border-line rounded-card shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-taupe space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-zari mx-auto" />
            <p className="text-xs">Loading subscribers list...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-taupe space-y-2">
            <p className="text-sm font-semibold text-ink">No subscribers matching your filters</p>
            <p className="text-xs">Try adjusting your search keywords or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-cream/40 border-b border-line text-[11px] font-bold text-taupe uppercase tracking-wider">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Orders / Spent</th>
                  <th className="py-3 px-4">Last Order</th>
                  <th className="py-3 px-4">Registered On</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-ink">
                {filtered.map((sub) => (
                  <tr key={sub.email} className="hover:bg-cream/15 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink">{sub.name}</div>
                      <div className="text-taupe font-mono text-[11px]">{sub.email}</div>
                      {sub.phone && <div className="text-muted text-[10px]">{sub.phone}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      {sub.status === "subscribed" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Subscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Unsubscribed
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink">₹{((sub.total_spending_paise || 0) / 100).toLocaleString("en-IN")}</div>
                      <div className="text-taupe text-[10px]">{sub.total_orders} orders placed</div>
                    </td>
                    <td className="py-3.5 px-4 text-taupe font-mono text-[11px]">
                      {sub.last_order_at ? new Date(sub.last_order_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-taupe font-mono text-[11px]">
                      {sub.created_at ? new Date(sub.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={updatingEmail === sub.email}
                        onClick={() => toggleStatus(sub)}
                        className={`text-[11px] font-semibold underline cursor-pointer disabled:opacity-50 ${
                          sub.status === "subscribed" ? "text-danger hover:text-danger/80" : "text-success hover:text-success/80"
                        }`}
                      >
                        {updatingEmail === sub.email ? "Updating..." : sub.status === "subscribed" ? "Opt-Out" : "Re-Subscribe"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
