"use client";

import React, { useState, useEffect } from "react";
import { useNotification } from "@/components/providers/notification-provider";
import {
  Package,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Upload,
  Copy,
  Check,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  X,
  AlertTriangle,
  Gift,
  ExternalLink,
  ShieldCheck,
  FileText
} from "lucide-react";

interface PlatformOrder {
  id: string;
  platform: "amazon" | "flipkart";
  order_id: string;
  status: "available" | "claimed" | "disabled";
  claimed_by?: string;
  claimed_at?: string;
  gift_card_id?: string;
  notes?: string;
  created_at: string;
  claimer?: { id: string; full_name?: string; email?: string; phone?: string };
  gift_card?: { id: string; code: string; amount_paise: number; status: string };
}

interface PlatformOrderMetrics {
  total: number;
  available: number;
  claimed: number;
  amazonCount: number;
  flipkartCount: number;
}

export function PlatformOrdersManager() {
  const { notify } = useNotification();

  const [orders, setOrders] = useState<PlatformOrder[]>([]);
  const [metrics, setMetrics] = useState<PlatformOrderMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Single Order Modal
  const [showAddSingleModal, setShowAddSingleModal] = useState(false);
  const [singlePlatform, setSinglePlatform] = useState<"amazon" | "flipkart">("amazon");
  const [singleOrderId, setSingleOrderId] = useState("");
  const [singleNotes, setSingleNotes] = useState("");
  const [isAddingSingle, setIsAddingSingle] = useState(false);

  // Bulk Import Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPlatform, setBulkPlatform] = useState<"amazon" | "flipkart">("amazon");
  const [bulkText, setBulkText] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [platformFilter, statusFilter]);

  async function fetchOrders(isManualRefresh = false) {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (platformFilter !== "all") params.append("platform", platformFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/admin/platform-orders?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load platform orders");
      }

      setOrders(data.orders || []);
      setMetrics(data.metrics || null);
    } catch (err: any) {
      setError(err.message || "Failed to load platform orders");
      notify(err.message || "Error fetching platform orders", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      notify(`Copied ${text} to clipboard!`, "success");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      notify("Failed to copy", "error");
    }
  }

  // Handle Add Single
  async function handleAddSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!singleOrderId.trim()) {
      notify("Please enter an Order ID", "error");
      return;
    }

    setIsAddingSingle(true);
    try {
      const res = await fetch("/api/admin/platform-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: singlePlatform,
          order_id: singleOrderId.trim(),
          notes: singleNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add Order ID");
      }

      notify(`Added Order ID ${singleOrderId.trim()} for ${singlePlatform.toUpperCase()}`, "success");
      setShowAddSingleModal(false);
      setSingleOrderId("");
      setSingleNotes("");
      fetchOrders(true);
    } catch (err: any) {
      notify(err.message || "Failed to add Order ID", "error");
    } finally {
      setIsAddingSingle(false);
    }
  }

  // Handle Bulk Import
  async function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkText.trim()) {
      notify("Please paste at least one Order ID", "error");
      return;
    }

    setIsBulkAdding(true);
    try {
      const res = await fetch("/api/admin/platform-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: bulkPlatform,
          raw_order_ids: bulkText,
          notes: bulkNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import Order IDs");
      }

      notify(data.message || `Imported ${data.added} Order IDs!`, "success");
      setShowBulkModal(false);
      setBulkText("");
      setBulkNotes("");
      fetchOrders(true);
    } catch (err: any) {
      notify(err.message || "Failed to bulk import Order IDs", "error");
    } finally {
      setIsBulkAdding(false);
    }
  }

  // Delete Order ID
  async function handleDeleteOrder(id: string) {
    try {
      const res = await fetch(`/api/admin/platform-orders?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete Order ID");
      }

      notify("Platform Order ID deleted successfully", "success");
      setDeletingId(null);
      fetchOrders(true);
    } catch (err: any) {
      notify(err.message || "Failed to delete Order ID", "error");
    }
  }

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase().trim();
    const idMatch = o.order_id.toLowerCase().includes(term);
    const platformMatch = o.platform.toLowerCase().includes(term);
    const notesMatch = (o.notes || "").toLowerCase().includes(term);
    const claimerMatch = (o.claimer?.full_name || o.claimer?.email || "").toLowerCase().includes(term);
    const giftCodeMatch = (o.gift_card?.code || "").toLowerCase().includes(term);
    return idMatch || platformMatch || notesMatch || claimerMatch || giftCodeMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-line rounded-card p-5 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-zari/10 text-zari-deep">
              <Package size={20} />
            </span>
            <div>
              <h2 className="font-display text-xl text-ink">Verified Platform Order IDs (Amazon & Flipkart)</h2>
              <p className="text-xs text-taupe mt-0.5">
                Pre-load eligible Amazon & Flipkart order IDs so customer reviews are automatically verified before gift cards are issued
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-cream/40 text-xs font-bold text-ink shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-zari" : ""} />
            Sync
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-cream/40 text-xs font-bold text-ink shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload size={14} />
            Bulk Import IDs
          </button>
          <button
            onClick={() => setShowAddSingleModal(true)}
            className="px-4 py-2 rounded-xl bg-ink hover:bg-zari text-ivory text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            Add Single Order ID
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-line rounded-card p-4 shadow-soft space-y-1">
          <span className="text-[10px] font-bold text-taupe uppercase tracking-wider">Total Verified IDs</span>
          <p className="font-display text-2xl text-ink">{metrics?.total ?? orders.length}</p>
          <p className="text-[10px] text-taupe">Amazon + Flipkart pool</p>
        </div>
        <div className="bg-white border border-line rounded-card p-4 shadow-soft space-y-1">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Available to Claim</span>
          <p className="font-display text-2xl text-emerald-700">{metrics?.available ?? 0}</p>
          <p className="text-[10px] text-emerald-600 font-medium">Ready for customer use</p>
        </div>
        <div className="bg-white border border-line rounded-card p-4 shadow-soft space-y-1">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Claimed IDs</span>
          <p className="font-display text-2xl text-purple-700">{metrics?.claimed ?? 0}</p>
          <p className="text-[10px] text-purple-600 font-medium">Used 1 time & locked</p>
        </div>
        <div className="bg-white border border-line rounded-card p-4 shadow-soft space-y-1">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Amazon Orders</span>
          <p className="font-display text-2xl text-amber-800">{metrics?.amazonCount ?? 0}</p>
          <p className="text-[10px] text-taupe">Amazon verified pool</p>
        </div>
        <div className="bg-white border border-line rounded-card p-4 shadow-soft space-y-1">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Flipkart Orders</span>
          <p className="font-display text-2xl text-blue-800">{metrics?.flipkartCount ?? 0}</p>
          <p className="text-[10px] text-taupe">Flipkart verified pool</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-line rounded-card p-4 shadow-soft flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
          <input
            type="text"
            placeholder="Search Order ID, user, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-line bg-cream/20 text-xs text-ink placeholder:text-muted/70 focus:outline-none focus:border-zari"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-taupe hover:text-ink cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Platform & Status Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* Platform Filter */}
          <div className="flex items-center gap-1 bg-cream/50 p-1 rounded-xl border border-line text-xs">
            {["all", "amazon", "flipkart"].map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-3 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                  platformFilter === p
                    ? "bg-ink text-ivory shadow-xs"
                    : "text-taupe hover:text-ink"
                }`}
              >
                {p === "all" ? "All Platforms" : p}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-cream/50 p-1 rounded-xl border border-line text-xs">
            {["all", "available", "claimed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                  statusFilter === s
                    ? "bg-zari text-ivory shadow-xs"
                    : "text-taupe hover:text-ink"
                }`}
              >
                {s === "all" ? "All Status" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-line rounded-card overflow-hidden shadow-soft">
        {loading ? (
          <div className="p-16 text-center text-taupe space-y-2">
            <RefreshCw size={24} className="animate-spin mx-auto text-zari" />
            <p className="text-xs font-semibold">Loading verified platform orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-taupe space-y-3">
            <Package size={36} className="mx-auto text-taupe/40" />
            <p className="text-sm font-semibold text-ink">No Verified Order IDs Found</p>
            <p className="text-xs text-taupe max-w-sm mx-auto">
              Add eligible Amazon and Flipkart order IDs using the &quot;Add Single Order ID&quot; or &quot;Bulk Import IDs&quot; buttons above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-cream/60 border-b border-line text-taupe font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Platform Order ID</th>
                  <th className="py-3 px-4">Claim Status</th>
                  <th className="py-3 px-4">Claimed Customer</th>
                  <th className="py-3 px-4">Gift Card Code</th>
                  <th className="py-3 px-4">Date Added / Claimed</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredOrders.map((order) => {
                  const isAmazon = order.platform === "amazon";
                  const isClaimed = order.status === "claimed";

                  return (
                    <tr key={order.id} className="hover:bg-cream/15 transition-colors">
                      {/* Platform */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                            isAmazon
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-blue-50 text-blue-800 border-blue-200"
                          }`}
                        >
                          <span>{isAmazon ? "📦 Amazon" : "🛍️ Flipkart"}</span>
                        </span>
                      </td>

                      {/* Order ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-ink">
                          <span>{order.order_id}</span>
                          <button
                            onClick={() => handleCopy(order.order_id, order.id)}
                            title="Copy Order ID"
                            className="p-1 text-taupe hover:text-ink rounded transition-colors cursor-pointer"
                          >
                            {copiedId === order.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isClaimed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-extrabold uppercase tracking-wide">
                            <CheckCircle2 size={11} /> Claimed (1-time used)
                          </span>
                        ) : order.status === "available" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wide">
                            ✓ Available to Claim
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-[10px] font-bold uppercase tracking-wide">
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Claimed Customer */}
                      <td className="py-3 px-4">
                        {isClaimed && order.claimer ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-ink text-xs">{order.claimer.full_name || "Customer"}</p>
                            <p className="text-[10px] text-taupe">{order.claimer.email}</p>
                          </div>
                        ) : (
                          <span className="text-taupe italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Linked Gift Card */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {order.gift_card?.code ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-zari-deep">
                            <Gift size={12} className="text-zari" />
                            <span>{order.gift_card.code}</span>
                            <button
                              onClick={() => handleCopy(order.gift_card!.code, `gc-${order.id}`)}
                              title="Copy Gift Card Code"
                              className="p-1 text-taupe hover:text-ink rounded transition-colors cursor-pointer"
                            >
                              {copiedId === `gc-${order.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-taupe italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-taupe text-[11px]">
                        {isClaimed && order.claimed_at ? (
                          <div>
                            <span className="font-semibold text-purple-800 block">Claimed: {new Date(order.claimed_at).toLocaleDateString("en-IN")}</span>
                            <span className="text-[10px] text-taupe">Added: {new Date(order.created_at).toLocaleDateString("en-IN")}</span>
                          </div>
                        ) : (
                          <span>Added: {new Date(order.created_at).toLocaleDateString("en-IN")}</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 max-w-[150px] truncate text-taupe text-[11px]" title={order.notes || ""}>
                        {order.notes || "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setDeletingId(order.id)}
                            className="w-8 h-8 rounded-xl border border-red-300 bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                            title="Delete Order ID"
                          >
                            <Trash2 size={14} />
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

      {/* MODAL 1: ADD SINGLE ORDER ID */}
      {showAddSingleModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 backdrop-blur-md p-3 sm:p-4 overflow-y-auto overscroll-contain animate-fade-in"
          onClick={() => setShowAddSingleModal(false)}
        >
          <div
            className="relative bg-white border border-line rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto overscroll-contain animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <h3 className="font-display text-lg text-ink flex items-center gap-2">
                <Plus size={18} className="text-zari" />
                Add Verified Platform Order ID
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSingleModal(false)}
                className="w-8 h-8 rounded-full bg-cream hover:bg-stone-200 text-taupe hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSingle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-taupe uppercase tracking-wider mb-1">
                  Platform *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSinglePlatform("amazon")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      singlePlatform === "amazon"
                        ? "bg-amber-50 text-amber-900 border-amber-300 shadow-xs"
                        : "bg-white border-line text-taupe hover:text-ink"
                    }`}
                  >
                    📦 Amazon
                  </button>
                  <button
                    type="button"
                    onClick={() => setSinglePlatform("flipkart")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      singlePlatform === "flipkart"
                        ? "bg-blue-50 text-blue-900 border-blue-300 shadow-xs"
                        : "bg-white border-line text-taupe hover:text-ink"
                    }`}
                  >
                    🛍️ Flipkart
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-taupe uppercase tracking-wider mb-1">
                  Platform Order ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 402-1234567-8901234 or OD123456789"
                  value={singleOrderId}
                  onChange={(e) => setSingleOrderId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-taupe uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified delivered order batch #1"
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isAddingSingle}
                  className="flex-1 py-3 px-4 rounded-xl bg-ink hover:bg-zari text-ivory text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isAddingSingle ? "Adding Order ID..." : "Save Verified Order ID"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSingleModal(false)}
                  className="py-3 px-4 rounded-xl border border-line text-xs font-bold text-taupe hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK IMPORT ORDER IDS */}
      {showBulkModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 backdrop-blur-md p-3 sm:p-4 overflow-y-auto overscroll-contain animate-fade-in"
          onClick={() => setShowBulkModal(false)}
        >
          <div
            className="relative bg-white border border-line rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto overscroll-contain animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <h3 className="font-display text-lg text-ink flex items-center gap-2">
                <Upload size={18} className="text-zari" />
                Bulk Import Verified Order IDs
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="w-8 h-8 rounded-full bg-cream hover:bg-stone-200 text-taupe hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-taupe uppercase tracking-wider mb-1">
                  Select Platform for this batch *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkPlatform("amazon")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      bulkPlatform === "amazon"
                        ? "bg-amber-50 text-amber-900 border-amber-300 shadow-xs"
                        : "bg-white border-line text-taupe hover:text-ink"
                    }`}
                  >
                    📦 Amazon
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkPlatform("flipkart")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      bulkPlatform === "flipkart"
                        ? "bg-blue-50 text-blue-900 border-blue-300 shadow-xs"
                        : "bg-white border-line text-taupe hover:text-ink"
                    }`}
                  >
                    🛍️ Flipkart
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-taupe uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Paste Order IDs (One per line or comma-separated) *</span>
                  <span className="text-[10px] text-taupe font-normal">
                    {bulkText.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean).length} IDs detected
                  </span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder={`402-1234567-8901234\n403-9876543-2109876\n404-5554443-1122334`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari font-mono resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-taupe uppercase tracking-wider mb-1">
                  Batch Tag / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. September Amazon Sales Orders batch"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isBulkAdding}
                  className="flex-1 py-3 px-4 rounded-xl bg-ink hover:bg-zari text-ivory text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isBulkAdding ? "Importing..." : `Import ${bulkText.split(/[\r\n,;]+/).filter((s) => s.trim()).length || ""} Order IDs`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="py-3 px-4 rounded-xl border border-line text-xs font-bold text-taupe hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 backdrop-blur-md p-3 sm:p-4 overflow-y-auto overscroll-contain animate-fade-in"
          onClick={() => setDeletingId(null)}
        >
          <div
            className="relative bg-white border border-line rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto overscroll-contain animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle size={20} />
              <h3 className="font-display text-base text-ink">Delete Platform Order ID?</h3>
            </div>
            <p className="text-xs text-taupe leading-relaxed">
              Are you sure you want to delete this verified Order ID? Customers will no longer be able to claim a gift card with this ID.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteOrder(deletingId)}
                className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Delete ID
              </button>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="py-2.5 px-3 border border-line text-xs font-bold text-taupe hover:text-ink rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
