"use client";

import { useState } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

interface UploadedImage {
  url: string;
  publicId: string;
}

export default function AdminUploadPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthenticating(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin/upload-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Incorrect password");
      }
      setAuthenticated(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAuthenticating(false);
    }
  }

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
        if (res.status === 401) setAuthenticated(false);
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

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ivory">
        <Container className="max-w-sm">
          <h1 className="mb-6 font-display text-2xl text-ink">Admin access</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-ink outline-none focus-visible:border-zari"
            />
            {authError && <p className="text-sm text-danger">{authError}</p>}
            <Button type="submit" size="md" className="w-full" disabled={authenticating}>
              {authenticating ? "Checking…" : "Enter"}
            </Button>
          </form>
        </Container>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory py-16">
      <Container className="max-w-2xl">
        <h1 className="mb-8 font-display text-2xl text-ink">Upload product image</h1>

        <form onSubmit={handleUpload} className="mb-8 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-taupe"
          />
          <Button type="submit" size="sm" disabled={!file || uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </form>

        {uploadError && <p className="mb-6 text-sm text-danger">{uploadError}</p>}

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img) => (
            <li key={img.publicId} className="space-y-2">
              <div className="relative aspect-square overflow-hidden rounded-card border border-line">
                <Image src={img.url} alt="Uploaded product image" fill className="object-cover" unoptimized />
              </div>
              <input
                readOnly
                value={img.url}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full truncate rounded border border-line bg-white px-2 py-1 text-xs text-taupe"
              />
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
