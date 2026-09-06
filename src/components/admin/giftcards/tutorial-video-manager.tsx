"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  UploadCloud,
  Play,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Eye,
  FileVideo,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { useNotification } from "@/components/providers/notification-provider";

interface TutorialSettings {
  video_url: string;
  title: string;
  description: string;
  enabled: boolean;
  updated_at?: string;
}

export function TutorialVideoManager() {
  const { notify } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<TutorialSettings>({
    video_url: "",
    title: "How to Review on Amazon, Flipkart & Google for ₹100 Gift Card",
    description: "Watch this quick step-by-step video guide to learn where to find your order ID, submit your 5-star review, capture the 2 screenshots, and claim your instant ₹100 reward.",
    enabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewLocalUrl, setPreviewLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const res = await fetch("/api/giftcards/tutorial-video");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to load tutorial video settings:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|mov|webm|mkv|avi)$/i)) {
      notify("Please select a valid video file (MP4, MOV, WebM).", "error");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      notify("Video file is too large (Max 100MB).", "error");
      return;
    }

    setSelectedFile(file);
    if (previewLocalUrl) URL.revokeObjectURL(previewLocalUrl);
    setPreviewLocalUrl(URL.createObjectURL(file));
  }

  function handleRemoveSelectedFile() {
    setSelectedFile(null);
    if (previewLocalUrl) {
      URL.revokeObjectURL(previewLocalUrl);
      setPreviewLocalUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (selectedFile) {
        // Upload via FormData
        const formData = new FormData();
        formData.append("video", selectedFile);
        formData.append("title", settings.title);
        formData.append("description", settings.description);
        formData.append("enabled", String(settings.enabled));

        const res = await fetch("/api/giftcards/tutorial-video", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to upload video");

        setSettings(data.settings);
        setSelectedFile(null);
        if (previewLocalUrl) {
          URL.revokeObjectURL(previewLocalUrl);
          setPreviewLocalUrl(null);
        }
        notify("🎉 Tutorial video uploaded and saved successfully!", "success");
      } else {
        // Save JSON settings
        const res = await fetch("/api/giftcards/tutorial-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save settings");

        setSettings(data.settings);
        notify("Tutorial video settings saved successfully!", "success");
      }
    } catch (err: any) {
      notify(err.message || "Failed to save tutorial settings", "error");
    } finally {
      setSaving(false);
    }
  }

  const activeVideoUrl = previewLocalUrl || settings.video_url;
  const isYouTube = activeVideoUrl?.includes("youtube.com") || activeVideoUrl?.includes("youtu.be");

  function getYouTubeEmbedUrl(url: string): string {
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${id}?autoplay=0`;
    }
    if (url.includes("watch?v=")) {
      const id = url.split("watch?v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${id}?autoplay=0`;
    }
    return url;
  }

  return (
    <div className="bg-white border border-line rounded-3xl p-6 sm:p-8 shadow-soft space-y-6 text-ink">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line/60 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zari/10 border border-zari/30 text-zari-deep text-xs font-bold uppercase tracking-wider">
            <Video size={14} className="text-zari" />
            <span>Customer Guidance Settings</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl text-ink">
            &quot;How to Review&quot; Tutorial Video Manager
          </h2>
          <p className="text-xs text-taupe max-w-xl">
            Upload or link a video that will play inside a popup when customers click the &quot;How to Review&quot; button on the claim page.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-1.5 bg-cream/50 hover:bg-cream border border-line rounded-xl text-xs font-semibold text-ink transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-zari" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Video Upload & Link */}
          <div className="lg:col-span-7 space-y-5">
            {/* Direct Video File Upload */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                1. Upload Video File (Cloudinary MP4/WebM)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/mov"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zari/40 hover:border-zari bg-cream/20 hover:bg-cream/40 rounded-2xl p-6 text-center transition-all duration-200 group flex flex-col items-center justify-center space-y-2 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-zari/10 group-hover:bg-zari/20 text-zari flex items-center justify-center transition-colors">
                  <UploadCloud size={24} />
                </div>
                <p className="font-bold text-xs text-ink group-hover:text-zari transition-colors">
                  {selectedFile ? `Selected: ${selectedFile.name}` : "Click to select and upload video from your device"}
                </p>
                <span className="text-[10px] text-taupe">
                  Supports MP4, WebM, MOV (Max 100MB)
                </span>
                {selectedFile && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                      Ready to upload ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSelectedFile();
                      }}
                      className="text-xs text-red-600 hover:text-red-800 underline font-bold"
                    >
                      Cancel file
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* OR Video URL Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5 flex items-center justify-between">
                <span>2. Or Direct Video URL (YouTube, Vimeo, Cloudinary, MP4)</span>
                <span className="text-[10px] text-taupe lowercase font-normal">Optional if file uploaded</span>
              </label>
              <input
                type="url"
                placeholder="https://youtu.be/xxxx or https://res.cloudinary.com/.../video.mp4"
                value={settings.video_url}
                onChange={(e) => setSettings({ ...settings, video_url: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-line focus:border-zari rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-zari/40 transition-all font-mono"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                Popup Title
              </label>
              <input
                type="text"
                required
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-line focus:border-zari rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-zari/40 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                Popup Description / Instructions
              </label>
              <textarea
                rows={3}
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-line focus:border-zari rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-zari/40 transition-all resize-none"
              />
            </div>

            {/* Toggle Enabled */}
            <div className="flex items-center justify-between p-4 bg-cream/20 border border-line rounded-2xl">
              <div>
                <span className="text-xs font-bold text-ink block">Show &quot;How to Review&quot; Button</span>
                <span className="text-[10px] text-taupe block">Toggle button visibility on the customer claim page</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Right Column: Live Video Preview */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink">
                Live Video Preview
              </label>
              {activeVideoUrl && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Video Active
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-stone-950 overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[260px] relative aspect-video">
              {activeVideoUrl ? (
                isYouTube ? (
                  <iframe
                    src={getYouTubeEmbedUrl(activeVideoUrl)}
                    title="Tutorial Video Preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <video
                    src={activeVideoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                <div className="p-6 text-center text-stone-400 space-y-2">
                  <FileVideo size={40} className="mx-auto text-stone-600" />
                  <p className="text-xs font-semibold">No video selected or linked yet</p>
                  <p className="text-[10px] text-stone-500 max-w-xs">
                    Upload a video file or enter a YouTube/Cloudinary URL on the left to see live preview.
                  </p>
                </div>
              )}
            </div>

            {/* Popup Info Box */}
            <div className="p-4 bg-cream/30 border border-line rounded-2xl space-y-1.5 text-xs">
              <span className="font-bold text-ink flex items-center gap-1">
                <Eye size={13} className="text-zari" />
                Preview in Customer Modal:
              </span>
              <p className="font-bold text-ink/90">{settings.title}</p>
              <p className="text-[11px] text-taupe line-clamp-2">{settings.description}</p>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="border-t border-line/60 pt-5 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-ink via-ink to-[#1a1612] hover:from-zari hover:via-zari-deep hover:to-[#8C6D2D] text-ivory text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Sparkles size={14} className="animate-spin text-zari" />
                <span>Uploading & Saving Video...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Video Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
