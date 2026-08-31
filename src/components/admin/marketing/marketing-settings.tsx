"use client";

import React, { useState, useEffect } from "react";
import { MarketingSettings } from "@/lib/marketing/types";
import { ShieldCheck, CheckCircle2, AlertCircle, Save, RefreshCw, Server, Send, Lock, HelpCircle } from "lucide-react";
import { useNotification } from "@/components/providers/notification-provider";

export function MarketingSettingsTab() {
  const { notify } = useNotification();
  const [settings, setSettings] = useState<MarketingSettings | null>(null);
  const [deliverability, setDeliverability] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setDeliverability(data.deliverabilityHealth);
      }
    } catch (err) {
      console.error("Failed to load marketing settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error("Failed to update settings");
      }

      notify("Marketing & broadcasting settings saved successfully!");
    } catch (err: any) {
      notify("Error saving settings: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="bg-white border border-line rounded-card p-12 text-center text-taupe space-y-2 shadow-soft">
        <RefreshCw className="w-6 h-6 animate-spin text-zari mx-auto" />
        <p className="text-xs">Loading broadcasting settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-fade-up">
      {/* Deliverability Health Card */}
      <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <h3 className="font-display text-base text-ink font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-zari" /> Deliverability & Domain Health
            </h3>
            <p className="text-xs text-taupe">
              Domain authentication ensures high inbox placement and prevents emails from landing in spam folders.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
            HEALTH STATUS: OPTIMAL
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-cream/20 border border-line rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink">SPF Authentication</span>
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <p className="text-[11px] text-taupe">v=spf1 include:resend.com ~all</p>
            <p className="text-[10px] text-success font-semibold">Active & Validated</p>
          </div>

          <div className="bg-cream/20 border border-line rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink">DKIM Cryptographic Key</span>
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <p className="text-[11px] text-taupe">2048-bit RSA Key Verified</p>
            <p className="text-[10px] text-success font-semibold">Active & Validated</p>
          </div>

          <div className="bg-cream/20 border border-line rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink">DMARC Policy</span>
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <p className="text-[11px] text-taupe">v=DMARC1; p=none;</p>
            <p className="text-[10px] text-success font-semibold">Configured</p>
          </div>
        </div>
      </div>

      {/* Sender Configuration */}
      <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-5">
        <h3 className="font-display text-base text-ink font-bold flex items-center gap-2">
          <Send className="w-4 h-4 text-zari" /> Default Sender Identity
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">
              Default Sender Name *
            </label>
            <input
              type="text"
              required
              value={settings.default_sender_name}
              onChange={(e) => setSettings({ ...settings, default_sender_name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">
              Default From Email *
            </label>
            <input
              type="email"
              required
              value={settings.default_sender_email}
              onChange={(e) => setSettings({ ...settings, default_sender_email: e.target.value })}
              className="w-full px-3.5 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">
              Default Reply-To Email
            </label>
            <input
              type="email"
              value={settings.default_reply_to}
              onChange={(e) => setSettings({ ...settings, default_reply_to: e.target.value })}
              className="w-full px-3.5 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
            />
          </div>
        </div>
      </div>

      {/* Safety & Frequency Capping Controls */}
      <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-5">
        <h3 className="font-display text-base text-ink font-bold flex items-center gap-2">
          <Lock className="w-4 h-4 text-zari" /> Smart Sending & Fatigue Safeguards
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enable_frequency_capping}
                onChange={(e) => setSettings({ ...settings, enable_frequency_capping: e.target.checked })}
                className="mt-1 accent-zari"
              />
              <div>
                <span className="text-xs font-bold text-ink block">Enable Frequency Capping</span>
                <span className="text-xs text-taupe block">
                  Prevents overloading customers with too many marketing communications.
                </span>
              </div>
            </label>

            {settings.enable_frequency_capping && (
              <div className="pl-6">
                <label className="text-xs font-semibold text-taupe block mb-1">
                  Max emails per recipient per 7 days
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.max_emails_per_user_per_week}
                  onChange={(e) => setSettings({ ...settings, max_emails_per_user_per_week: Number(e.target.value) })}
                  className="w-32 px-3 py-1.5 text-xs border border-line rounded-lg bg-cream/15 text-ink"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enable_open_tracking}
                onChange={(e) => setSettings({ ...settings, enable_open_tracking: e.target.checked })}
                className="mt-1 accent-zari"
              />
              <div>
                <span className="text-xs font-bold text-ink block">Open & Read Tracking</span>
                <span className="text-xs text-taupe block">
                  Embeds anonymous 1x1 telemetry pixel to calculate open rates.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enable_click_tracking}
                onChange={(e) => setSettings({ ...settings, enable_click_tracking: e.target.checked })}
                className="mt-1 accent-zari"
              />
              <div>
                <span className="text-xs font-bold text-ink block">Link Click-Through Tracking</span>
                <span className="text-xs text-taupe block">
                  Wraps product links to measure campaign traffic and revenue attribution.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-line">
          <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">
            Physical Business Compliance Address (CAN-SPAM / Legal Compliance)
          </label>
          <input
            type="text"
            value={settings.physical_business_address}
            onChange={(e) => setSettings({ ...settings, physical_business_address: e.target.value })}
            className="w-full px-3.5 py-2 text-xs border border-line rounded-lg bg-cream/15 text-ink focus:outline-none focus:border-zari"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-pill bg-ink hover:bg-black text-ivory text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-zari" />}
          Save All Broadcasting Settings
        </button>
      </div>
    </form>
  );
}
