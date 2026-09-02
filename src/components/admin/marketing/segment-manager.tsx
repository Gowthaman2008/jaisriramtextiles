"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { EmailSegment, FilterRuleGroup, FilterCondition, FilterField, FilterOperator } from "@/lib/marketing/types";
import { Plus, Trash2, Edit2, Users, RefreshCw, Sparkles, Filter, Copy, ArrowRight, CheckCircle2 } from "lucide-react";
import { useNotification } from "@/components/providers/notification-provider";

interface SegmentManagerProps {
  onSelectSegmentForCampaign?: (segment: EmailSegment) => void;
}

export function SegmentManager({ onSelectSegmentForCampaign }: SegmentManagerProps) {
  const { notify, confirm } = useNotification();
  const [segments, setSegments] = useState<EmailSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<EmailSegment | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [combinator, setCombinator] = useState<"AND" | "OR">("AND");
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { id: "c1", field: "total_spending", operator: "greater_equal", value: 1000 },
  ]);
  const [previewingCount, setPreviewingCount] = useState(false);
  const [previewData, setPreviewData] = useState<{ totalMatched: number; totalEligible: number; unsubscribedCount: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSegments();
  }, []);

  async function loadSegments() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/segments");
      if (res.ok) {
        const data = await res.json();
        setSegments(data || []);
      }
    } catch (err) {
      console.error("Failed to load segments:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingSegment(null);
    setName("");
    setDescription("");
    setCombinator("AND");
    setConditions([{ id: `c_${Date.now()}`, field: "total_spending", operator: "greater_equal", value: 2000 }]);
    setPreviewData(null);
    setShowModal(true);
  }

  function openEditModal(seg: EmailSegment) {
    setEditingSegment(seg);
    setName(seg.name);
    setDescription(seg.description || "");
    setCombinator(seg.filter_rules?.combinator || "AND");
    setConditions(seg.filter_rules?.conditions || []);
    setPreviewData(null);
    setShowModal(true);
  }

  const addCondition = () => {
    setConditions([
      ...conditions,
      { id: `c_${Date.now()}`, field: "state", operator: "equals", value: "Tamil Nadu" },
    ]);
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeCondition = (id: string) => {
    if (conditions.length <= 1) return;
    setConditions(conditions.filter((c) => c.id !== id));
  };

  async function checkAudienceCount() {
    setPreviewingCount(true);
    try {
      const res = await fetch("/api/admin/marketing/audience-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience_type: "custom_filter",
          filter_rules: {
            combinator,
            conditions,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      }
    } catch (err) {
      console.error("Preview count error:", err);
    } finally {
      setPreviewingCount(false);
    }
  }

  async function handleSaveSegment(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        id: editingSegment ? editingSegment.id : undefined,
        name: name.trim(),
        description: description.trim() || null,
        filter_rules: {
          combinator,
          conditions,
        },
      };

      const method = editingSegment ? "PUT" : "POST";
      const res = await fetch("/api/admin/marketing/segments", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save segment");
      }

      notify(editingSegment ? "Segment updated successfully!" : "Segment created successfully!");
      setShowModal(false);
      await loadSegments();
    } catch (err: any) {
      notify("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSegment(id: string, segmentName: string) {
    if (!(await confirm(`Delete segment "${segmentName}"? This action cannot be undone.`, { danger: true }))) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/marketing/segments?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        notify("Segment deleted.");
        await loadSegments();
      }
    } catch (err: any) {
      notify("Error deleting segment: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-line rounded-card p-5 shadow-soft">
        <div>
          <h2 className="font-display text-xl text-ink">Customer Segments</h2>
          <p className="text-xs text-taupe mt-1">
            Build reusable multi-criteria audience filters based on purchase habits, location, and lifetime value.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-pill bg-ink text-ivory text-xs font-semibold hover:bg-black flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 text-zari" /> Create New Segment
        </button>
      </div>

      {/* Segments Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-line rounded-card p-5 h-44 shadow-soft" />
          ))}
        </div>
      ) : segments.length === 0 ? (
        <div className="bg-white border border-line rounded-card p-12 text-center space-y-4 shadow-soft">
          <div className="mx-auto w-12 h-12 rounded-full bg-cream/80 text-zari flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-display text-lg text-ink">No Saved Segments Yet</h3>
          <p className="text-xs text-taupe max-w-md mx-auto">
            Create high-converting audience segments like VIP Spenders, Tamil Nadu buyers, or Inactive Shoppers.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-pill bg-zari hover:bg-zari-deep text-ivory text-xs font-semibold cursor-pointer"
          >
            Create Your First Segment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="bg-white border border-line rounded-card p-5 shadow-soft flex flex-col justify-between hover:border-zari/60 transition-all group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zari-deep bg-cream/60 px-2 py-0.5 rounded border border-line">
                    Segment
                  </span>
                  <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEditModal(seg)}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-line bg-white hover:bg-cream/60 text-taupe hover:text-ink shadow-xs cursor-pointer transition-all shrink-0"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSegment(seg.id, seg.name)}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-line bg-white hover:bg-rose-50 text-danger/70 hover:text-danger shadow-xs cursor-pointer transition-all shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-base text-ink font-bold">{seg.name}</h3>
                  <p className="text-xs text-taupe mt-1 line-clamp-2">{seg.description || "No description provided."}</p>
                </div>

                {/* Filter rules preview tag badges */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {seg.filter_rules?.conditions?.map((c, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-cream/35 text-ink/80 px-2 py-0.5 rounded border border-line/60 font-mono truncate max-w-full"
                    >
                      {c.field.replace("_", " ")} {c.operator === "equals" ? "=" : c.operator === "greater_equal" ? "≥" : c.operator} {String(c.value)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-line mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-ink font-semibold">
                  <Users className="w-4 h-4 text-zari" />
                  <span>{seg.user_count_cache ?? "~"} Users</span>
                </div>

                {onSelectSegmentForCampaign && (
                  <button
                    type="button"
                    onClick={() => onSelectSegmentForCampaign(seg)}
                    className="text-xs font-semibold text-zari-deep hover:text-zari flex items-center gap-1 cursor-pointer"
                  >
                    Use in Campaign <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Segment Create / Edit Modal with Visual Rule Builder */}
      {showModal && typeof document !== "undefined" && createPortal(
        <div
          data-lenis-prevent="true"
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-ink/80 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            data-lenis-prevent="true"
            className="bg-white border border-line rounded-card max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain animate-scale-up relative z-10"
          >
            <div className="flex justify-between items-center pb-2 border-b border-line">
              <h3 className="font-display text-lg text-ink flex items-center gap-2">
                <Filter className="w-4 h-4 text-zari" /> {editingSegment ? "Edit Segment" : "Create Audience Segment"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-taupe hover:text-ink text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSegment} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">
                    Segment Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. VIP Spenders (Over ₹5,000)"
                    className="w-full px-3.5 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Customers who purchased high-value dhotis"
                    className="w-full px-3.5 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
                  />
                </div>
              </div>

              {/* Visual Rule Builder */}
              <div className="bg-cream/25 border border-line rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink uppercase tracking-wider">Match Condition:</span>
                    <div className="flex bg-white rounded border border-line p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setCombinator("AND")}
                        className={`px-2.5 py-1 rounded cursor-pointer ${
                          combinator === "AND" ? "bg-ink text-ivory" : "text-taupe hover:text-ink"
                        }`}
                      >
                        ALL Rules (AND)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCombinator("OR")}
                        className={`px-2.5 py-1 rounded cursor-pointer ${
                          combinator === "OR" ? "bg-ink text-ivory" : "text-taupe hover:text-ink"
                        }`}
                      >
                        ANY Rule (OR)
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addCondition}
                    className="text-xs font-semibold text-zari-deep hover:text-zari flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Condition
                  </button>
                </div>

                <div className="space-y-2.5">
                  {conditions.map((cond, idx) => (
                    <div key={cond.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2.5 rounded-lg border border-line">
                      <span className="text-[10px] font-mono text-muted w-5">{idx + 1}.</span>
                      
                      {/* Field selector */}
                      <select
                        value={cond.field}
                        onChange={(e) => updateCondition(cond.id, { field: e.target.value as FilterField })}
                        className="px-2.5 py-1.5 text-xs border border-line rounded bg-cream/10 text-ink"
                      >
                        <option value="total_spending">Total Spending (₹)</option>
                        <option value="total_orders">Total Orders Count</option>
                        <option value="state">State (e.g. Tamil Nadu)</option>
                        <option value="city">City (e.g. Chennai, Komarapalayam)</option>
                        <option value="last_order_days">Days Since Last Order</option>
                        <option value="full_name">Customer Name</option>
                        <option value="email">Email Address</option>
                      </select>

                      {/* Operator selector */}
                      <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(cond.id, { operator: e.target.value as FilterOperator })}
                        className="px-2 py-1.5 text-xs border border-line rounded bg-cream/10 text-ink"
                      >
                        <option value="greater_equal">Greater than or equal (≥)</option>
                        <option value="less_equal">Less than or equal (≤)</option>
                        <option value="equals">Equals</option>
                        <option value="not_equals">Does not equal</option>
                        <option value="contains">Contains text</option>
                      </select>

                      {/* Value input */}
                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                        placeholder="Value"
                        className="flex-1 min-w-[100px] px-2.5 py-1.5 text-xs border border-line rounded bg-cream/10 text-ink focus:outline-none focus:border-zari"
                      />

                      <button
                        type="button"
                        onClick={() => removeCondition(cond.id)}
                        disabled={conditions.length <= 1}
                        className="p-1.5 text-danger/70 hover:text-danger disabled:opacity-30 cursor-pointer"
                        title="Remove condition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Audience Calculation Card */}
              <div className="bg-white border border-line rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-taupe uppercase tracking-wider block">Estimated Audience</span>
                  {previewData ? (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-lg font-display text-ink font-bold">{previewData.totalEligible} recipients</span>
                      <span className="text-muted">({previewData.unsubscribedCount} unsubscribed excluded)</span>
                    </div>
                  ) : (
                    <p className="text-xs text-taupe">Click Calculate to evaluate matching database records.</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={checkAudienceCount}
                  disabled={previewingCount}
                  className="px-3 py-1.5 rounded-lg border border-line bg-cream/30 hover:bg-cream/70 text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${previewingCount ? "animate-spin" : ""}`} />
                  Calculate Matching Users
                </button>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-taupe hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-5 py-2 rounded-pill bg-ink hover:bg-black text-ivory text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingSegment ? "Update Segment" : "Save Segment"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
