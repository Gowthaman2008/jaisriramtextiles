"use client";

import React, { useState, useEffect } from "react";
import { EmailTemplate } from "@/lib/marketing/types";
import { Plus, Eye, Copy, ArrowRight, Sparkles, Layout, Trash2, Edit2 } from "lucide-react";
import { compileEmailHtml } from "@/lib/marketing/email-compiler";

interface TemplateLibraryProps {
  onUseTemplate: (template: EmailTemplate) => void;
}

export function TemplateLibrary({ onUseTemplate }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    { key: "all", label: "All Templates" },
    { key: "festival", label: "Festival & Sales" },
    { key: "welcome", label: "Welcome & Onboarding" },
    { key: "new_arrivals", label: "New Arrivals" },
    { key: "re_engagement", label: "Re-Engagement" },
    { key: "promotional", label: "Promotional" },
  ];

  const filtered = templates.filter((t) => {
    if (categoryFilter === "all") return true;
    return t.category === categoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Bar */}
      <div className="bg-white border border-line rounded-card p-5 shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">Email Templates Library</h2>
          <p className="text-xs text-taupe mt-1">
            Pick from beautifully pre-designed handloom marketing templates or customize your own.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 bg-cream/55 p-1 rounded-lg border border-line">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategoryFilter(c.key)}
              className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all ${
                categoryFilter === c.key ? "bg-ink text-ivory shadow-sm" : "text-taupe hover:text-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-line rounded-card h-72 shadow-soft" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white border border-line rounded-card overflow-hidden shadow-soft flex flex-col justify-between hover:border-zari/60 transition-all group"
            >
              {/* Template miniature preview box */}
              <div className="relative bg-[#ECE6D8] p-4 border-b border-line h-48 overflow-hidden flex items-center justify-center">
                <div className="w-[85%] bg-white rounded shadow-md pointer-events-none transform scale-90 origin-top overflow-hidden h-[300px]">
                  <iframe
                    srcDoc={compileEmailHtml(tpl.content_json, { previewText: tpl.preview_text || "" })}
                    title={tpl.name}
                    className="w-full h-full border-0"
                    tabIndex={-1}
                  />
                </div>

                {/* Hover overlay preview button */}
                <div className="absolute inset-0 bg-ink/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-2xs">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(tpl)}
                    className="px-3.5 py-2 rounded-pill bg-white text-ink text-xs font-semibold shadow-lift flex items-center gap-1.5 cursor-pointer hover:bg-cream"
                  >
                    <Eye className="w-3.5 h-3.5 text-zari" /> Full Preview
                  </button>
                </div>
              </div>

              {/* Template Details & Action */}
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zari-deep bg-cream/70 px-2 py-0.5 rounded border border-line">
                    {tpl.category.replace("_", " ")}
                  </span>
                  {tpl.is_built_in ? (
                    <span className="text-[10px] text-muted font-medium">Built-in</span>
                  ) : (
                    <span className="text-[10px] text-zari font-medium">Custom</span>
                  )}
                </div>

                <div>
                  <h3 className="font-display text-base text-ink font-bold">{tpl.name}</h3>
                  <p className="text-xs text-taupe mt-1 line-clamp-1">{tpl.subject || "No default subject"}</p>
                </div>

                <div className="pt-3 border-t border-line flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(tpl)}
                    className="text-xs font-semibold text-taupe hover:text-ink flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>

                  <button
                    type="button"
                    onClick={() => onUseTemplate(tpl)}
                    className="px-3.5 py-1.5 rounded-pill bg-zari hover:bg-zari-deep text-ivory text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    Use Template <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-line rounded-card max-w-3xl w-full p-6 shadow-lift space-y-4 max-h-[90vh] flex flex-col animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-line">
              <div>
                <h3 className="font-display text-lg text-ink font-bold">{previewTemplate.name}</h3>
                <p className="text-xs text-taupe mt-0.5">Subject: "{previewTemplate.subject}"</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="text-taupe hover:text-ink text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 bg-[#ECE6D8] p-4 rounded-lg border border-line overflow-y-auto flex justify-center min-h-[450px]">
              <div className="w-[580px] max-w-full bg-white rounded shadow-lg overflow-hidden">
                <iframe
                  srcDoc={compileEmailHtml(previewTemplate.content_json, { previewText: previewTemplate.preview_text || "" })}
                  title="Template Full Preview"
                  className="w-full min-h-[550px] border-0"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-line">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-xs font-semibold text-taupe hover:text-ink cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  const tpl = previewTemplate;
                  setPreviewTemplate(null);
                  onUseTemplate(tpl);
                }}
                className="px-5 py-2 rounded-pill bg-zari hover:bg-zari-deep text-ivory text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                Use This Template in Campaign <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
