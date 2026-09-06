"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { formatINR } from "@/lib/utils";
import { useNotification } from "@/components/providers/notification-provider";
import {
  Gift,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Download,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Edit2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Calendar,
  Clock,
  User,
  X,
  AlertTriangle,
  FileImage,
  Layers,
  ArrowUpDown,
  Package,
  Video
} from "lucide-react";
import { PlatformOrdersManager } from "./platform-orders-manager";
import { TutorialVideoManager } from "./tutorial-video-manager";

interface GiftCardRecord {
  id: string;
  code: string;
  amount_paise: number;
  status: "active" | "redeemed" | "disabled" | "expired";
  platform: string;
  review_screenshot_url?: string;
  order_reference?: string;
  created_by?: string;
  user_id?: string;
  redeemed_by?: string;
  redeemed_at?: string;
  expires_at?: string;
  notes?: string;
  created_at: string;
  creator?: { id: string; full_name?: string; email?: string; phone?: string; role?: string; created_at?: string };
  redeemer?: { id: string; full_name?: string; email?: string; phone?: string; role?: string; created_at?: string };
}

interface GiftCardMetrics {
  totalIssued: number;
  totalActive: number;
  totalRedeemed: number;
  totalRedeemedPaise: number;
  totalRedeemedRupees: number;
  totalScreenshotSubmissions: number;
}

export function GiftCardManager() {
  const { notify } = useNotification();

  const [cards, setCards] = useState<GiftCardRecord[]>([]);
  const [metrics, setMetrics] = useState<GiftCardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Sub-tab state
  const [subTab, setSubTab] = useState<"cards" | "orders" | "tutorial">("cards");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Screenshot viewer modal
  const [selectedScreenshotCard, setSelectedScreenshotCard] = useState<GiftCardRecord | null>(null);

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customAmountRupees, setCustomAmountRupees] = useState<number>(100);
  const [customPlatform, setCustomPlatform] = useState("direct");
  const [customCodePrefix, setCustomCodePrefix] = useState("JSRT-100");
  const [customNotes, setCustomNotes] = useState("");
  const [customExpiry, setCustomExpiry] = useState("");
  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [isCreating, setIsCreating] = useState(false);

  // Edit Modal state
  const [editingCard, setEditingCard] = useState<GiftCardRecord | null>(null);
  const [editStatus, setEditStatus] = useState<string>("active");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editAmountRupees, setEditAmountRupees] = useState<number>(100);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchGiftCards();
  }, [statusFilter, platformFilter]);

  async function fetchGiftCards(isManualRefresh = false) {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (platformFilter !== "all") params.append("platform", platformFilter);

      const res = await fetch(`/api/admin/giftcards?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load gift cards");
      }

      setCards(data.giftCards || []);
      setMetrics(data.metrics || null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch gift cards");
      notify(err.message || "Failed to load gift cards", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Copy code to clipboard
  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      notify(`Copied ${code} to clipboard!`, "success");
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      notify("Failed to copy code", "error");
    }
  }

  // Create Gift Card
  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);

    try {
      const res = await fetch("/api/admin/giftcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountRupees: customAmountRupees,
          platform: customPlatform,
          customCode: batchQuantity === 1 && customCodePrefix ? customCodePrefix : null,
          quantity: batchQuantity,
          notes: customNotes,
          expiresAt: customExpiry || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate gift card");

      notify(data.message || "Gift card(s) created successfully!", "success");
      setShowCreateModal(false);
      // Reset form
      setCustomAmountRupees(100);
      setCustomPlatform("direct");
      setCustomCodePrefix("JSRT-100");
      setCustomNotes("");
      setCustomExpiry("");
      setBatchQuantity(1);
      fetchGiftCards(true);
    } catch (err: any) {
      notify(err.message || "Error creating gift card", "error");
    } finally {
      setIsCreating(false);
    }
  }

  // Toggle status
  async function handleToggleStatus(card: GiftCardRecord) {
    const newStatus = card.status === "active" ? "disabled" : "active";
    try {
      const res = await fetch("/api/admin/giftcards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle status");

      notify(`Gift card status updated to ${newStatus}`, "success");
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: newStatus as any } : c));
    } catch (err: any) {
      notify(err.message || "Status update failed", "error");
    }
  }

  // Update Gift Card Modal Submit
  async function handleUpdateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCard) return;

    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/giftcards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCard.id,
          status: editStatus,
          notes: editNotes,
          amountRupees: editAmountRupees,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update gift card");

      notify("Gift card updated successfully!", "success");
      setEditingCard(null);
      fetchGiftCards(true);
    } catch (err: any) {
      notify(err.message || "Update failed", "error");
    } finally {
      setIsUpdating(false);
    }
  }

  // Delete Card
  async function handleDeleteCard(id: string) {
    if (!window.confirm("Are you sure you want to permanently delete this gift card?")) return;
    setDeletingId(id);

    try {
      const res = await fetch(`/api/admin/giftcards?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete gift card");

      notify("Gift card deleted successfully", "success");
      setCards(prev => prev.filter(c => c.id !== id));
      if (selectedScreenshotCard?.id === id) setSelectedScreenshotCard(null);
    } catch (err: any) {
      notify(err.message || "Delete failed", "error");
    } finally {
      setDeletingId(null);
    }
  }

  // Export to CSV
  function handleExportCSV() {
    if (cards.length === 0) {
      notify("No records to export", "error");
      return;
    }

    let csv = "Code,Amount (INR),Status,Platform,Has Screenshot,Order Ref,Created By,Redeemed By,Redeemed At,Created At,Notes\n";
    cards.forEach(c => {
      const code = `"${c.code}"`;
      const amount = (c.amount_paise / 100).toFixed(2);
      const status = `"${c.status}"`;
      const platform = `"${c.platform}"`;
      const hasScreenshot = c.review_screenshot_url ? "Yes" : "No";
      const orderRef = `"${c.order_reference || ""}"`;
      const createdBy = `"${c.creator?.full_name || c.creator?.email || "Admin"}"`;
      const redeemedBy = `"${c.redeemer?.full_name || c.redeemer?.email || ""}"`;
      const redeemedAt = c.redeemed_at ? `"${new Date(c.redeemed_at).toLocaleString("en-IN")}"` : '""';
      const createdAt = `"${new Date(c.created_at).toLocaleString("en-IN")}"`;
      const notes = `"${(c.notes || "").replace(/"/g, '""')}"`;

      csv += `${code},${amount},${status},${platform},${hasScreenshot},${orderRef},${createdBy},${redeemedBy},${redeemedAt},${createdAt},${notes}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `gift_cards_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filtered in-memory list by search term
  const filteredCards = cards.filter(c => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const codeMatch = c.code.toLowerCase().includes(term);
    const platformMatch = c.platform?.toLowerCase().includes(term);
    const notesMatch = c.notes?.toLowerCase().includes(term);
    const creatorMatch = (c.creator?.full_name || c.creator?.email || "").toLowerCase().includes(term);
    const redeemerMatch = (c.redeemer?.full_name || c.redeemer?.email || "").toLowerCase().includes(term);
    const refMatch = (c.order_reference || "").toLowerCase().includes(term);
    return codeMatch || platformMatch || notesMatch || creatorMatch || redeemerMatch || refMatch;
  });

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Switcher */}
      <div className="flex items-center gap-2 border-b border-line pb-3 overflow-x-auto whitespace-nowrap">
        <button
          type="button"
          onClick={() => setSubTab("cards")}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            subTab === "cards"
              ? "bg-ink text-ivory shadow-sm"
              : "bg-white border border-line text-taupe hover:text-ink"
          }`}
        >
          <Gift size={16} className={subTab === "cards" ? "text-zari" : ""} />
          <span>Gift Card Registry & Review Submissions</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
            {cards.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("orders")}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            subTab === "orders"
              ? "bg-ink text-ivory shadow-sm"
              : "bg-white border border-line text-taupe hover:text-ink"
          }`}
        >
          <Package size={16} className={subTab === "orders" ? "text-zari" : ""} />
          <span>Verified Order IDs (Amazon & Flipkart)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-zari text-ink font-bold">
            Auto-Verify
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("tutorial")}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            subTab === "tutorial"
              ? "bg-ink text-ivory shadow-sm"
              : "bg-white border border-line text-taupe hover:text-ink"
          }`}
        >
          <Video size={16} className={subTab === "tutorial" ? "text-zari" : ""} />
          <span>&quot;How to Review&quot; Tutorial Video</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-800 font-bold">
            Video Setup
          </span>
        </button>
      </div>

      {subTab === "orders" ? (
        <PlatformOrdersManager />
      ) : subTab === "tutorial" ? (
        <TutorialVideoManager />
      ) : (
        <>
          {/* Top Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-line rounded-card p-5 shadow-soft">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-zari/10 text-zari-deep">
                  <Gift size={20} />
                </span>
                <div>
                  <h2 className="font-display text-xl text-ink">Gift Card Management & Review Rewards</h2>
                  <p className="text-xs text-taupe mt-0.5">Manage ₹100 review reward codes, custom gift cards, and review screenshot submissions</p>
                </div>
              </div>
            </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchGiftCards(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-cream/40 text-xs font-bold text-ink shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-zari" : ""} />
            Sync
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-cream/40 text-xs font-bold text-ink shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-ink hover:bg-zari text-ivory text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            Generate Gift Cards
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Issued */}
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-1">
          <span className="text-[10px] font-bold text-taupe uppercase tracking-wider">Total Generated</span>
          <p className="font-display text-2xl sm:text-3xl text-ink">{metrics?.totalIssued ?? cards.length}</p>
          <p className="text-[11px] text-taupe">All issued gift codes</p>
        </div>

        {/* Active Cards */}
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-1">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active / Unused</span>
          <p className="font-display text-2xl sm:text-3xl text-emerald-700">
            {metrics?.totalActive ?? cards.filter(c => c.status === "active").length}
          </p>
          <p className="text-[11px] text-taupe">Available for redemption</p>
        </div>

        {/* Total Redeemed Value */}
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-1">
          <span className="text-[10px] font-bold text-zari-deep uppercase tracking-wider">Redeemed Cashback</span>
          <p className="font-display text-2xl sm:text-3xl text-zari-deep">
            {formatINR(metrics?.totalRedeemedPaise ?? 0, true)}
          </p>
          <p className="text-[11px] text-taupe">{metrics?.totalRedeemed ?? 0} cards credited to wallets</p>
        </div>

        {/* Screenshot Submissions */}
        <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-1">
          <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Review Submissions</span>
          <p className="font-display text-2xl sm:text-3xl text-sky-700">
            {metrics?.totalScreenshotSubmissions ?? cards.filter(c => !!c.review_screenshot_url).length}
          </p>
          <p className="text-[11px] text-taupe">With attached proof screenshots</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-line rounded-card p-4 shadow-soft space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe" />
            <input
              type="text"
              placeholder="Search code, customer name, email, platform, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 bg-cream/20 border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari focus:bg-white shadow-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-cream/20 border border-line rounded-xl text-xs text-ink font-semibold focus:outline-none focus:border-zari shadow-sm cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Unused)</option>
              <option value="redeemed">Redeemed</option>
              <option value="disabled">Disabled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Platform Filter */}
          <div className="md:col-span-3">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full px-3 py-2 bg-cream/20 border border-line rounded-xl text-xs text-ink font-semibold focus:outline-none focus:border-zari shadow-sm cursor-pointer"
            >
              <option value="all">All Platforms</option>
              <option value="amazon">Amazon</option>
              <option value="flipkart">Flipkart</option>
              <option value="google">Google Reviews</option>
              <option value="direct">Direct / Store</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gift Cards Table */}
      <div className="bg-white border border-line rounded-card overflow-hidden shadow-soft">
        {loading ? (
          <div className="p-14 text-center space-y-3">
            <RefreshCw className="animate-spin text-zari w-8 h-8 mx-auto" />
            <p className="text-xs font-bold text-taupe uppercase tracking-wider">Loading Gift Cards...</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="p-14 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-cream/70 text-taupe flex items-center justify-center mx-auto">
              <Gift size={24} />
            </div>
            <p className="font-display text-base text-ink">No Gift Cards Found</p>
            <p className="text-xs text-taupe max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all" || platformFilter !== "all"
                ? "No gift cards match your search or filter criteria."
                : "No gift cards have been generated yet. You can create custom codes or upload review screenshots."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[960px]">
              <thead>
                <tr className="bg-cream/45 border-b border-line text-taupe font-bold text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-3 min-w-[160px]">Code</th>
                  <th className="px-3 py-3 text-center min-w-[80px]">Value</th>
                  <th className="px-3 py-3 text-center min-w-[100px]">Status</th>
                  <th className="px-3 py-3 text-center min-w-[100px]">Platform</th>
                  <th className="px-3 py-3 text-center min-w-[120px]">Proof Screenshot</th>
                  <th className="px-4 py-3 min-w-[180px]">Customer / Submitter</th>
                  <th className="px-3 py-3 text-center min-w-[120px] whitespace-nowrap">Redeemed Status</th>
                  <th className="px-3 py-3 text-center min-w-[110px] whitespace-nowrap">Created Date</th>
                  <th className="px-4 py-3 text-right min-w-[170px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredCards.map((card) => {
                  const isRedeemed = card.status === "redeemed";
                  const isActive = card.status === "active";
                  const isCopied = copiedCode === card.code;

                  return (
                    <tr key={card.id} className="hover:bg-cream/10 transition-colors">
                      {/* Code */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-ink bg-cream/70 px-2.5 py-1 rounded-lg border border-line/60 select-all">
                            {card.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(card.code)}
                            title="Copy code"
                            className="p-1.5 text-taupe hover:text-ink hover:bg-cream rounded-lg transition-colors cursor-pointer border border-line/50"
                          >
                            {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                        {card.notes && (
                          <p className="text-[10px] text-taupe mt-1 max-w-[200px] truncate" title={card.notes}>
                            {card.notes}
                          </p>
                        )}
                      </td>

                      {/* Value */}
                      <td className="px-3 py-3.5 text-center font-bold text-ink whitespace-nowrap text-sm">
                        {formatINR(card.amount_paise, true)}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-xs ${
                            card.status === "active"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : card.status === "redeemed"
                              ? "bg-blue-50 text-blue-800 border-blue-300"
                              : card.status === "disabled"
                              ? "bg-neutral-100 text-neutral-700 border-neutral-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          {card.status}
                        </span>
                      </td>

                      {/* Platform */}
                      <td className="px-3 py-3.5 text-center uppercase text-[10px] font-bold text-taupe whitespace-nowrap">
                        <span className="bg-cream/80 px-2.5 py-1 rounded-md border border-line font-mono font-bold text-ink">
                          {card.platform}
                        </span>
                      </td>

                      {/* Proof Screenshot */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        {card.review_screenshot_url ? (
                          <button
                            type="button"
                            onClick={() => setSelectedScreenshotCard(card)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zari-deep hover:text-ink cursor-pointer bg-zari/15 hover:bg-zari/25 px-3 py-1.5 rounded-xl transition-all border border-zari/40 shadow-xs"
                          >
                            <Eye size={14} /> View Proof
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedScreenshotCard(card)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-taupe hover:text-ink cursor-pointer bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg border border-line"
                          >
                            <Eye size={12} /> Audit Info
                          </button>
                        )}
                      </td>

                      {/* Customer / Creator */}
                      <td className="px-4 py-3.5 text-ink">
                        {card.creator ? (
                          <div
                            onClick={() => setSelectedScreenshotCard(card)}
                            className="cursor-pointer group"
                            title="Click to view full user audit"
                          >
                            <p className="font-semibold text-xs text-ink group-hover:text-zari truncate max-w-[160px] transition-colors">
                              {card.creator.full_name || "Registered User"}
                            </p>
                            <p className="text-[10px] text-taupe group-hover:text-ink truncate max-w-[160px] font-mono transition-colors mt-0.5">
                              {card.creator.email || card.creator.phone}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-taupe font-medium">Store Admin</span>
                        )}
                      </td>

                      {/* Redeemed Info */}
                      <td className="px-3 py-3.5 text-center text-[10px] whitespace-nowrap">
                        {isRedeemed ? (
                          <div
                            onClick={() => setSelectedScreenshotCard(card)}
                            className="cursor-pointer group"
                            title="Click to inspect redemption details"
                          >
                            <span className="text-emerald-700 font-bold block group-hover:underline text-[11px]">✓ Redeemed</span>
                            <span className="text-taupe block text-[10px] mt-0.5">
                              {card.redeemed_at ? new Date(card.redeemed_at).toLocaleDateString("en-IN") : "Yes"}
                            </span>
                            {card.redeemer?.email && (
                              <span className="text-muted block text-[9px] max-w-[120px] truncate" title={card.redeemer.email}>
                                by {card.redeemer.email}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-taupe text-[11px] font-medium">Unredeemed</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-3 py-3.5 text-center text-taupe text-[11px] whitespace-nowrap">
                        {new Date(card.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {/* Inspect / View Details */}
                          <button
                            type="button"
                            onClick={() => setSelectedScreenshotCard(card)}
                            title="View Full Details & User Audit"
                            className="w-8 h-8 rounded-xl bg-zari/15 hover:bg-zari/30 text-zari-deep border border-zari/40 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Toggle Active / Deactivate */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(card)}
                            title={isActive ? "Deactivate Code" : "Activate Code"}
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 ${
                              isActive
                                ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                                : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300"
                            }`}
                          >
                            {isActive ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCard(card);
                              setEditStatus(card.status);
                              setEditNotes(card.notes || "");
                              setEditAmountRupees(card.amount_paise / 100);
                            }}
                            title="Edit Details"
                            className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-ink border border-stone-300 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete Card */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCard(card.id)}
                            disabled={deletingId === card.id}
                            title="Delete Gift Card"
                            className="w-8 h-8 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
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

      {/* ================= COMPREHENSIVE GIFT CARD & USER INSPECTOR MODAL ================= */}
      {selectedScreenshotCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-md animate-fade-in">
          <div
            className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-line overflow-hidden animate-scale-up max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-ink text-ivory p-5 sm:p-6 flex items-center justify-between border-b border-zari/30">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-zari/20 text-zari-soft flex items-center justify-center shrink-0 shadow-inner">
                  <Gift size={22} />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-lg text-ivory tracking-tight">
                      Gift Card Details & User Audit
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                        selectedScreenshotCard.status === "active"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : selectedScreenshotCard.status === "redeemed"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                          : selectedScreenshotCard.status === "disabled"
                          ? "bg-neutral-500/20 text-neutral-300 border-neutral-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      ● {selectedScreenshotCard.status}
                    </span>
                  </div>
                  <p className="text-xs text-taupe mt-0.5 font-mono">
                    ID: {selectedScreenshotCard.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedScreenshotCard(null)}
                className="text-ivory/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-cream/15">
              {/* 1. Gift Card Code & Value Box */}
              <div className="bg-gradient-to-r from-cream via-white to-cream p-4 rounded-2xl border border-zari/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-taupe uppercase tracking-wider block">
                    Gift Card Code
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="text-base sm:text-lg font-mono font-extrabold text-ink bg-white px-3 py-1 rounded-xl border border-line shadow-xs">
                      {selectedScreenshotCard.code}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedScreenshotCard.code)}
                      className="px-2.5 py-1 bg-ink text-ivory hover:bg-zari text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      {copiedCode === selectedScreenshotCard.code ? (
                        <>
                          <Check size={13} className="text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold text-taupe uppercase tracking-wider block">
                    Reward Value
                  </span>
                  <span className="text-xl sm:text-2xl font-display font-bold text-zari-deep">
                    {formatINR(selectedScreenshotCard.amount_paise, true)}
                  </span>
                </div>
              </div>

              {/* 2. User & Redemption Timestamps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* User / Submitter Profile */}
                <div className="bg-white p-4 rounded-2xl border border-line shadow-soft space-y-3">
                  <div className="flex items-center gap-2 text-ink font-bold border-b border-line/60 pb-2">
                    <User size={15} className="text-zari" />
                    <span>Customer & Submitter Details</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-taupe">Full Name:</span>
                      <strong className="text-ink font-semibold">
                        {selectedScreenshotCard.creator?.full_name || "Guest / Direct"}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-taupe">Email Address:</span>
                      <strong className="text-ink font-semibold font-mono">
                        {selectedScreenshotCard.creator?.email || "No email"}
                      </strong>
                    </div>

                    {selectedScreenshotCard.creator?.phone && (
                      <div className="flex justify-between items-center">
                        <span className="text-taupe">Phone:</span>
                        <strong className="text-ink font-semibold">
                          {selectedScreenshotCard.creator.phone}
                        </strong>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-taupe">Account Role:</span>
                      <span className="px-2 py-0.5 rounded bg-cream text-ink text-[10px] font-bold uppercase border border-line/60">
                        {selectedScreenshotCard.creator?.role || "Customer"}
                      </span>
                    </div>

                    {selectedScreenshotCard.creator?.created_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-taupe">Customer Since:</span>
                        <span className="text-ink">
                          {new Date(selectedScreenshotCard.creator.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}

                    {selectedScreenshotCard.creator?.id && (
                      <div className="pt-1 text-[10px] text-muted truncate border-t border-line/40">
                        User ID: {selectedScreenshotCard.creator.id}
                      </div>
                    )}
                  </div>
                </div>

                {/* Redemption & Validity Timestamps */}
                <div className="bg-white p-4 rounded-2xl border border-line shadow-soft space-y-3">
                  <div className="flex items-center gap-2 text-ink font-bold border-b border-line/60 pb-2">
                    <Clock size={15} className="text-zari" />
                    <span>Timestamps & Redemption Audit</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-taupe">Generated / Claimed At:</span>
                      <strong className="text-ink font-semibold">
                        {new Date(selectedScreenshotCard.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-taupe">1-Year Expiration:</span>
                      <strong className="text-ink font-semibold">
                        {selectedScreenshotCard.expires_at
                          ? new Date(selectedScreenshotCard.expires_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "1 Year from issue"}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-taupe">Redemption Status:</span>
                      {selectedScreenshotCard.status === "redeemed" ? (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                          ✓ Redeemed into Wallet
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                          Active / Available
                        </span>
                      )}
                    </div>

                    {selectedScreenshotCard.redeemed_at && (
                      <div className="flex justify-between items-center bg-blue-50/80 p-2 rounded-xl border border-blue-200">
                        <span className="text-blue-900 font-semibold">Redeemed At:</span>
                        <strong className="text-blue-950 font-bold">
                          {new Date(selectedScreenshotCard.redeemed_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </strong>
                      </div>
                    )}

                    {selectedScreenshotCard.redeemer && (
                      <div className="flex justify-between items-center">
                        <span className="text-taupe">Redeemed By:</span>
                        <span className="text-ink font-medium truncate max-w-[150px]" title={selectedScreenshotCard.redeemer.email}>
                          {selectedScreenshotCard.redeemer.full_name || selectedScreenshotCard.redeemer.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Platform & Order Reference Details */}
              <div className="bg-white p-4 rounded-2xl border border-line shadow-soft space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-line/60 pb-2">
                  <div className="flex items-center gap-2 text-ink font-bold">
                    <ShieldCheck size={15} className="text-zari" />
                    <span>Review Platform & Order Verification</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-cream font-bold text-ink uppercase text-[10px] border border-line">
                    {selectedScreenshotCard.platform}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                  <div>
                    <span className="text-taupe block text-[10px] uppercase font-bold">Platform Order ID</span>
                    <p className="font-semibold text-ink font-mono mt-0.5">
                      {selectedScreenshotCard.order_reference || "N/A (Google Review / Direct)"}
                    </p>
                  </div>
                  <div>
                    <span className="text-taupe block text-[10px] uppercase font-bold">System Log / Notes</span>
                    <p className="text-ink mt-0.5 leading-relaxed">
                      {selectedScreenshotCard.notes || "Standard issuance"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Uploaded Review Proof Screenshots */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-ink font-bold text-xs uppercase tracking-wider">
                    <FileImage size={15} className="text-zari" />
                    <span>Uploaded Review Proof Screenshots</span>
                  </div>
                  <span className="text-[10px] font-bold text-taupe">
                    Verified via Vision AI
                  </span>
                </div>

                {(() => {
                  const urls = selectedScreenshotCard.review_screenshot_url
                    ? selectedScreenshotCard.review_screenshot_url.split(",").map((u) => u.trim()).filter(Boolean)
                    : [];

                  if (urls.length === 0) {
                    return (
                      <div className="p-8 text-center bg-white rounded-2xl border border-line text-taupe text-xs">
                        No review screenshot proof attached (Direct/Admin created card).
                      </div>
                    );
                  }

                  return (
                    <div className={`grid gap-4 ${urls.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                      {urls.map((url, idx) => (
                        <div key={idx} className="bg-white p-3.5 rounded-2xl border border-line shadow-soft space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-taupe uppercase">
                            <span>
                              {idx === 0
                                ? "Screenshot 1: Review & Rating"
                                : "Screenshot 2: Review Submitted / Proof"}
                            </span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zari-deep hover:underline flex items-center gap-1 font-bold text-[10px] bg-zari/10 px-2 py-0.5 rounded-md"
                            >
                              <ExternalLink size={12} /> Open Full View
                            </a>
                          </div>
                          <div className="rounded-xl border border-line overflow-hidden bg-cream/15 max-h-[380px] flex items-center justify-center p-2 group relative">
                            <img
                              src={url}
                              alt={`Review Proof ${idx + 1}`}
                              className="max-h-[360px] w-auto object-contain mx-auto rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-cream/30 border-t border-line flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-taupe font-medium">
                  Current Status:
                </span>
                <span className="font-bold text-xs uppercase text-ink">
                  {selectedScreenshotCard.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScreenshotCard(null)}
                className="px-6 py-2 rounded-xl bg-ink text-ivory text-xs font-bold hover:bg-zari transition-colors cursor-pointer shadow-sm"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CREATE GIFT CARD MODAL ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-fade-in">
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-line overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-ink text-ivory p-5 flex items-center justify-between border-b border-zari/40">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-zari/20 text-zari-soft">
                  <Plus size={18} />
                </span>
                <div>
                  <h3 className="font-display text-base text-ivory">Generate Custom Gift Cards</h3>
                  <p className="text-[11px] text-taupe">Create custom single or batch gift card codes</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-ivory/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                    Value in Rupees (₹) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    required
                    value={customAmountRupees}
                    onChange={(e) => setCustomAmountRupees(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink font-bold focus:outline-none focus:border-zari shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                    Batch Quantity (1 to 50) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={batchQuantity}
                    onChange={(e) => setBatchQuantity(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink font-bold focus:outline-none focus:border-zari shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Platform / Category *
                </label>
                <select
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink font-semibold focus:outline-none focus:border-zari shadow-sm cursor-pointer"
                >
                  <option value="direct">Store Promotional / Direct</option>
                  <option value="amazon">Amazon Review Reward</option>
                  <option value="flipkart">Flipkart Review Reward</option>
                  <option value="google">Google Review Reward</option>
                </select>
              </div>

              {batchQuantity === 1 && (
                <div>
                  <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                    Custom Code or Prefix (Leave blank for auto-generate)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FESTIVE-100 or JSRT-100-XXXX-XXXX"
                    value={customCodePrefix}
                    onChange={(e) => setCustomCodePrefix(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs font-mono font-bold text-ink uppercase focus:outline-none focus:border-zari shadow-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-zari shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Internal Administrative Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Issued for festive customer giveaway campaign"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari shadow-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-line bg-white hover:bg-cream/60 text-xs font-bold text-ink transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 rounded-xl bg-ink hover:bg-zari text-ivory text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-soft cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreating ? "Generating..." : `Create ${batchQuantity} Gift Card${batchQuantity > 1 ? "s" : ""}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-fade-in">
          <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-line overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-ink text-ivory p-5 flex items-center justify-between border-b border-zari/40">
              <div>
                <h3 className="font-display text-base text-ivory">Edit Gift Card</h3>
                <p className="text-[11px] font-mono text-zari-soft">{editingCard.code}</p>
              </div>
              <button
                onClick={() => setEditingCard(null)}
                className="text-ivory/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateCard} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Status *
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink font-semibold focus:outline-none focus:border-zari shadow-sm cursor-pointer"
                >
                  <option value="active">Active (Unused)</option>
                  <option value="redeemed">Redeemed</option>
                  <option value="disabled">Disabled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Amount in Rupees (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  value={editAmountRupees}
                  onChange={(e) => setEditAmountRupees(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink font-bold focus:outline-none focus:border-zari shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Admin Notes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-zari shadow-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="px-4 py-2.5 rounded-xl border border-line bg-white hover:bg-cream/60 text-xs font-bold text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 rounded-xl bg-ink hover:bg-zari text-ivory text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-soft cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
