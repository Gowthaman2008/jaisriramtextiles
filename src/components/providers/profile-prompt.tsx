"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ProfilePrompt() {
  const [show, setShow] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkProfile() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Check if logged in with Google
      const isGoogle = authUser.app_metadata?.provider === "google" || 
                       authUser.identities?.some(id => id.provider === "google");
      
      if (!isGoogle) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", authUser.id)
        .maybeSingle();

      // If name or phone is missing, prompt for details
      if (!profile || !profile.phone || !profile.full_name || !profile.full_name.trim()) {
        setUser(authUser);
        setName(profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || "");
        setPhone(profile?.phone || "");
        setShow(true);
      }
    }

    // Delay checking slightly to ensure session initialization completes
    const timer = setTimeout(checkProfile, 1500);
    return () => clearTimeout(timer);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Please fill in both fields");
      return;
    }
    if (phone.trim().length < 10) {
      setError("Please enter a valid mobile number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      
      // 1. Update profiles table
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          phone: phone.trim(),
        })
        .eq("id", user.id);

      if (updateErr) throw updateErr;

      setShow(false);
    } catch (err: any) {
      console.error("Failed to save profile details:", err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="zari-frame bg-white border-2 border-zari rounded-card max-w-[400px] w-full p-6 shadow-lift space-y-4">
        <div className="text-center space-y-1.5">
          <h2 className="font-display text-xl text-ink">Complete Your Profile</h2>
          <p className="text-xs text-taupe">
            Please provide your name and mobile number to complete your registration.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="prompt-name" className="text-[10px] font-bold text-taupe uppercase">
              Full Name *
            </label>
            <input
              id="prompt-name"
              type="text"
              required
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none focus:border-zari"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="prompt-phone" className="text-[10px] font-bold text-taupe uppercase">
              Mobile Number *
            </label>
            <input
              id="prompt-phone"
              type="tel"
              required
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none focus:border-zari"
            />
          </div>

          {error && (
            <p className="text-xs text-danger font-semibold bg-danger/5 p-2 rounded text-center">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="gold"
            className="w-full h-11"
            disabled={loading}
          >
            {loading ? "Saving Details..." : "Save & Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
