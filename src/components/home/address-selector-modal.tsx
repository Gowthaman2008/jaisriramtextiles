"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  X,
  Plus,
  CheckCircle2,
  ExternalLink,
  Home,
  Building2,
  Sparkles,
  Phone,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-modal-provider";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type Address = {
  id: string;
  user_id: string;
  recipient: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};

interface AddressSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelect?: (addr: Address) => void;
}

export function AddressSelectorModal({
  isOpen,
  onClose,
  onAddressSelect,
}: AddressSelectorModalProps) {
  const { user, openAuthModal } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchAddresses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      if (!error && data) {
        setAddresses(data);
        const defaultAddr = data.find((a: Address) => a.is_default) || data[0];
        if (defaultAddr) setSelectedId(defaultAddr.id);
      }
    } catch (err) {
      console.error("Failed to load user addresses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchAddresses();
    }
  }, [isOpen, user]);

  const handleSetDefault = async (addr: Address) => {
    setSelectedId(addr.id);
    if (onAddressSelect) onAddressSelect(addr);

    try {
      const supabase = createClient();
      // Unset previous defaults
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Set new default
      await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addr.id);

      // Update local state
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === addr.id,
        }))
      );
    } catch (err) {
      console.error("Failed to update default address:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink/60 backdrop-blur-sm"
          data-lenis-prevent="true"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
          className="relative w-full max-w-md bg-ivory rounded-3xl border border-zari/40 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
          data-lenis-prevent="true"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-cream via-ivory to-cream border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-zari/20 border border-zari/30 grid place-items-center text-zari-deep shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-ink">
                  Delivery Location
                </h3>
                <p className="text-xs text-taupe">
                  {user
                    ? "Select where you want your orders delivered"
                    : "Sign in to see your saved addresses"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-taupe hover:text-ink hover:bg-black/5 transition cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {!user ? (
              /* Signed Out State */
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-cream border border-zari/30 grid place-items-center text-zari-deep mx-auto shadow-sm">
                  <MapPin size={26} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display text-base font-bold text-ink">
                    Sign In to View Saved Addresses
                  </h4>
                  <p className="text-xs text-taupe max-w-xs mx-auto">
                    Manage your saved home, office, and gifting addresses across all devices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openAuthModal({
                      title: "Sign In for Saved Addresses",
                      subtitle: "Sign in to view or edit your delivery addresses.",
                    });
                  }}
                  className="px-6 py-2.5 rounded-full bg-zari text-ink font-bold text-xs hover:bg-zari-deep hover:text-white transition shadow-md cursor-pointer"
                >
                  Sign In / Create Account
                </button>
              </div>
            ) : loading ? (
              /* Loading State */
              <div className="space-y-3 py-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-24 rounded-2xl bg-cream/60 animate-pulse border border-line"
                  />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              /* Empty Addresses State */
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-cream border border-zari/30 grid place-items-center text-zari-deep mx-auto">
                  <Home size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display text-base font-bold text-ink">
                    No Saved Addresses Yet
                  </h4>
                  <p className="text-xs text-taupe max-w-xs mx-auto">
                    Add a delivery address to enable express checkout and accurate delivery times.
                  </p>
                </div>
                <Link
                  href="/account?tab=addresses"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-zari text-ink font-bold text-xs hover:bg-zari-deep hover:text-white transition shadow-sm cursor-pointer"
                >
                  <Plus size={14} />
                  Add New Address
                </Link>
              </div>
            ) : (
              /* Saved Addresses List */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-taupe px-1 font-medium">
                  <span>Saved Addresses ({addresses.length})</span>
                  <Link
                    href="/account?tab=addresses"
                    onClick={onClose}
                    className="text-zari-deep hover:underline font-bold inline-flex items-center gap-1"
                  >
                    Edit & Manage
                    <ExternalLink size={12} />
                  </Link>
                </div>

                {addresses.map((addr) => {
                  const isSelected = selectedId === addr.id || addr.is_default;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => handleSetDefault(addr)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative",
                        isSelected
                          ? "bg-cream/70 border-zari shadow-sm ring-1 ring-zari/30"
                          : "bg-white border-line hover:border-zari/60 hover:bg-cream/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-ink">
                              {addr.recipient}
                            </span>
                            {addr.is_default && (
                              <span className="px-2 py-0.5 rounded-full bg-zari/20 text-zari-deep text-[9px] font-bold uppercase tracking-wider">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink/80 leading-relaxed truncate">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ""}
                          </p>
                          <p className="text-xs text-taupe font-medium">
                            {addr.city}, {addr.state} -{" "}
                            <strong className="text-ink font-semibold">
                              {addr.pincode}
                            </strong>
                          </p>
                          {addr.phone && (
                            <p className="text-[11px] text-taupe flex items-center gap-1 pt-0.5">
                              <Phone size={11} className="text-zari-deep" />
                              {addr.phone}
                            </p>
                          )}
                        </div>

                        {/* Selection Checkmark */}
                        <div className="shrink-0 pt-0.5">
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-zari-deep fill-zari/20" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-line" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-white border-t border-line flex items-center justify-between gap-3">
            <Link
              href="/account?tab=addresses"
              onClick={onClose}
              className="flex-1 text-center py-2.5 px-4 rounded-full border border-line hover:border-zari text-xs font-bold text-ink hover:bg-cream/40 transition flex items-center justify-center gap-1.5"
            >
              <Plus size={14} className="text-zari-deep" />
              Add / Edit Addresses
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 rounded-full bg-ink text-ivory text-xs font-bold hover:bg-zari-deep transition shadow-sm cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
