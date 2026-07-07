"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ImageIcon, RefreshCw } from "lucide-react";

interface UploadedImage {
  url: string;
  publicId: string;
}

export default function AdminUploadPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = `/sign-in?redirect=${encodeURIComponent("/admin/upload")}`;
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profile || !["admin", "staff"].includes(profile.role)) {
          window.location.href = "/";
          return;
        }

        setAuthorized(true);
      } catch (err) {
        console.error("Auth check failed:", err);
        window.location.href = "/";
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      setImages((prev) => [{ url: data.url, publicId: data.publicId }, ...prev]);
      setFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-ivory flex flex-col items-center justify-center py-20">
        <RefreshCw className="animate-spin text-zari w-12 h-12 mb-4" />
        <p className="text-sm font-medium text-taupe font-sans">Verifying administration access...</p>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-ivory py-16">
      <Container className="max-w-2xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl text-ink">Upload product image</h1>
          <p className="text-xs text-taupe mt-1 font-sans">Upload assets directly to your Cloudinary storage folder.</p>
        </div>

        <form onSubmit={handleUpload} className="mb-8 flex flex-wrap items-center gap-3 bg-white p-6 border border-line rounded-card shadow-soft">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-taupe font-sans"
          />
          <Button type="submit" size="sm" variant="gold" disabled={!file || uploading}>
            {uploading ? "Uploading…" : "Upload to Cloudinary"}
          </Button>
        </form>

        {uploadError && <p className="mb-6 text-sm text-danger font-semibold font-sans">{uploadError}</p>}

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img) => (
            <li key={img.publicId} className="space-y-2">
              <div className="relative aspect-square overflow-hidden rounded-card border border-line bg-cream/15">
                <Image src={img.url} alt="Uploaded product image" fill className="object-cover" unoptimized />
              </div>
              <input
                readOnly
                value={img.url}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full truncate rounded border border-line bg-white px-2 py-1 text-xs text-taupe font-mono"
              />
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
