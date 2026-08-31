"use client";

import React, { useState, useEffect } from "react";
import { EmailCampaign, EmailSubscriber, EmailSegment, EmailTemplate } from "@/lib/marketing/types";
import { MarketingDashboard } from "./marketing-dashboard";
import { CampaignList } from "./campaign-list";
import { CampaignStudio } from "./campaign-studio";
import { SegmentManager } from "./segment-manager";
import { TemplateLibrary } from "./template-library";
import { SubscriberManager } from "./subscriber-manager";
import { MarketingSettingsTab } from "./marketing-settings";
import { CampaignAnalyticsModal } from "./campaign-analytics-modal";
import {
  LayoutDashboard,
  Send,
  Plus,
  Users,
  Layout,
  Mail,
  ShieldCheck,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { useNotification } from "@/components/providers/notification-provider";

interface MarketingHubProps {
  products?: any[];
  coupons?: any[];
}

export function MarketingHub({ products = [], coupons = [] }: MarketingHubProps) {
  const { notify } = useNotification();
  const [activeSubTab, setActiveSubTab] = useState<string>("overview");
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [loading, setLoading] = useState(true);

  // Studio states
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [selectedTemplateForNew, setSelectedTemplateForNew] = useState<EmailTemplate | null>(null);

  // Analytics Modal
  const [selectedAnalyticsCampaign, setSelectedAnalyticsCampaign] = useState<EmailCampaign | null>(null);

  useEffect(() => {
    loadInitialMarketingData();
  }, []);

  async function loadInitialMarketingData() {
    setLoading(true);
    try {
      const [campRes, subsRes] = await Promise.all([
        fetch("/api/admin/marketing/campaigns"),
        fetch("/api/admin/marketing/subscribers"),
      ]);

      if (campRes.ok) setCampaigns(await campRes.json());
      if (subsRes.ok) setSubscribers(await subsRes.json());
    } catch (err) {
      console.error("Failed to load marketing data:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateNewCampaign() {
    setEditingCampaign(null);
    setSelectedTemplateForNew(null);
    setActiveSubTab("create_campaign");
  }

  function handleEditCampaign(c: EmailCampaign) {
    setEditingCampaign(c);
    setSelectedTemplateForNew(null);
    setActiveSubTab("create_campaign");
  }

  function handleDuplicateCampaign(c: EmailCampaign) {
    const duplicated: EmailCampaign = {
      ...c,
      id: "",
      name: `Copy of ${c.name}`,
      status: "draft",
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      created_at: new Date().toISOString(),
    };
    setEditingCampaign(duplicated);
    setSelectedTemplateForNew(null);
    setActiveSubTab("create_campaign");
    notify("Campaign duplicated! Review and configure audience before sending.");
  }

  function handleUseTemplate(tpl: EmailTemplate) {
    setSelectedTemplateForNew(tpl);
    setEditingCampaign(null);
    setActiveSubTab("create_campaign");
    notify(`Loaded template "${tpl.name}" into campaign studio!`);
  }

  async function handleDeleteCampaign(id: string) {
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        notify("Campaign deleted.");
        setCampaigns(campaigns.filter((c) => c.id !== id));
      }
    } catch (err: any) {
      notify("Failed to delete campaign: " + err.message);
    }
  }

  const subTabs = [
    { key: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: "campaigns", label: "Campaigns", icon: <Send className="w-4 h-4" />, badge: campaigns.length },
    { key: "create_campaign", label: editingCampaign ? "Edit Campaign" : "Create Campaign", icon: <Plus className="w-4 h-4" /> },
    { key: "segments", label: "Segments", icon: <Users className="w-4 h-4" /> },
    { key: "templates", label: "Templates", icon: <Layout className="w-4 h-4" /> },
    { key: "subscribers", label: "Subscribers", icon: <Mail className="w-4 h-4" />, badge: subscribers.length },
    { key: "settings", label: "Settings & Deliverability", icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Marketing Sub-Navigation Bar */}
      <div className="bg-white border border-line rounded-card p-2 sm:p-2.5 shadow-soft flex overflow-x-auto gap-1 items-center scrollbar-none">
        {subTabs.map((t) => {
          const isActive = activeSubTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                if (t.key === "create_campaign" && activeSubTab !== "create_campaign") {
                  setEditingCampaign(null);
                  setSelectedTemplateForNew(null);
                }
                setActiveSubTab(t.key);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
                isActive
                  ? "bg-ink text-ivory shadow-sm"
                  : "text-taupe hover:text-ink hover:bg-cream/40"
              }`}
            >
              <span className={isActive ? "text-zari" : "text-muted"}>{t.icon}</span>
              <span>{t.label}</span>
              {t.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? "bg-zari text-ivory" : "bg-cream/70 text-taupe border border-line"
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content Display */}
      {loading ? (
        <div className="bg-white border border-line rounded-card p-16 text-center text-taupe space-y-3 shadow-soft animate-pulse">
          <RefreshCw className="w-6 h-6 animate-spin text-zari mx-auto" />
          <p className="text-xs">Loading marketing broadcasting suite...</p>
        </div>
      ) : (
        <>
          {activeSubTab === "overview" && (
            <MarketingDashboard
              campaigns={campaigns}
              subscribers={subscribers}
              onCreateCampaign={handleCreateNewCampaign}
              onNavigateTab={(tab) => setActiveSubTab(tab)}
              onViewAnalytics={(c) => setSelectedAnalyticsCampaign(c)}
            />
          )}

          {activeSubTab === "campaigns" && (
            <CampaignList
              campaigns={campaigns}
              onCreateNew={handleCreateNewCampaign}
              onEditCampaign={handleEditCampaign}
              onDuplicateCampaign={handleDuplicateCampaign}
              onViewAnalytics={(c) => setSelectedAnalyticsCampaign(c)}
              onDeleteCampaign={handleDeleteCampaign}
              onRefresh={loadInitialMarketingData}
            />
          )}

          {activeSubTab === "create_campaign" && (
            <CampaignStudio
              initialCampaign={editingCampaign}
              initialTemplate={selectedTemplateForNew}
              onBack={() => setActiveSubTab("campaigns")}
              onSaved={(saved) => {
                setCampaigns([saved, ...campaigns.filter((c) => c.id !== saved.id)]);
                setActiveSubTab("campaigns");
              }}
              products={products}
              coupons={coupons}
            />
          )}

          {activeSubTab === "segments" && (
            <SegmentManager
              onSelectSegmentForCampaign={(seg) => {
                setEditingCampaign(null);
                setSelectedTemplateForNew(null);
                setActiveSubTab("create_campaign");
                notify(`Selected segment "${seg.name}" for new campaign.`);
              }}
            />
          )}

          {activeSubTab === "templates" && (
            <TemplateLibrary onUseTemplate={handleUseTemplate} />
          )}

          {activeSubTab === "subscribers" && <SubscriberManager />}

          {activeSubTab === "settings" && <MarketingSettingsTab />}
        </>
      )}

      {/* Analytics Modal */}
      {selectedAnalyticsCampaign && (
        <CampaignAnalyticsModal
          campaign={selectedAnalyticsCampaign}
          onClose={() => setSelectedAnalyticsCampaign(null)}
        />
      )}
    </div>
  );
}
