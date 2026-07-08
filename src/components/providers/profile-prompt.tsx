"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-white via-white to-[#FAF6EC]/35 border border-[#E9DBB7] rounded-3xl p-7 shadow-lift max-w-[380px] w-full relative overflow-hidden flex flex-col gap-5">
        {/* Aesthetic Golden Sparkle Circle Badge */}
        <div className="mx-auto w-10 h-10 rounded-full bg-gradient-to-br from-[#D9BE85] to-[#B08D4C] text-white flex items-center justify-center shadow-md animate-bounce">
          <Sparkles size={16} className="stroke-[2]" />
        </div>

        <div className="text-center space-y-1">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-wide">
            Complete Your Profile
          </h2>
          <p className="text-xs text-taupe leading-relaxed">
            Please provide your name and mobile number to complete your registration.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prompt-name" className="text-[10px] font-bold text-taupe uppercase tracking-wider">
              Full Name *
            </label>
            <input
              id="prompt-name"
              type="text"
              required
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-line bg-[#FAF6EC]/35 px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 focus:border-[#B08D4C] focus:bg-white focus:ring-2 focus:ring-[#B08D4C]/10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="prompt-phone" className="text-[10px] font-bold text-taupe uppercase tracking-wider">
              Mobile Number *
            </label>
            <input
              id="prompt-phone"
              type="tel"
              required
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl border border-line bg-[#FAF6EC]/35 px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 focus:border-[#B08D4C] focus:bg-white focus:ring-2 focus:ring-[#B08D4C]/10"
            />
          </div>

          {error && (
            <p className="text-xs text-danger font-semibold bg-danger/5 p-2.5 rounded-lg text-center border border-danger/10">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-[#D9BE85] to-[#B08D4C] text-[#553C0C] font-bold tracking-widest uppercase text-xs rounded-xl hover:brightness-[1.05] shadow-[0_4px_12px_rgba(176,141,76,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 border-0"
            disabled={loading}
          >
            {loading ? "Saving Details..." : "Save & Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
