"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { useCart } from "@/components/providers/cart-provider";
import { useNotification } from "@/components/providers/notification-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/home/product-card";
import { formatINR } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { drawInvoicePdf } from "@/lib/invoice-generator";
import {
  User,
  ShoppingBag,
  Heart,
  Wallet,
  MapPin,
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  Printer,
  ChevronLeft,
  Calendar,
  CreditCard,
  History,
  ShieldCheck,
  Send,
  MessageSquare,
  Copy,
  Star,
  X,
  Pencil,
  HelpCircle
} from "lucide-react";

export default function AccountPage() {
  const supabase = createClient();
  const { wishlist } = useWishlist();
  const { notify, confirm } = useNotification();

  const shortenId = (id: string) => {
    if (!id || id.length < 12) return id;
    return `${id.substring(0, 8).toUpperCase()}...${id.substring(id.length - 6).toUpperCase()}`;
  };

  // Tab State: "overview" | "orders" | "wallet" | "wishlist" | "addresses" | "contact"
  const [activeTab, setActiveTab] = useState("overview");

  // Land directly on a specific tab when arriving via a link like /account?tab=orders
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab) setActiveTab(tab);
  }, []);

  // User States
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copiedId, setCopiedId] = useState("");

  // DB Data States
  const [orders, setOrders] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);

  // Review Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState("");
  const [reviewProductId, setReviewProductId] = useState("");
  const [reviewProductName, setReviewProductName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Address Form States
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrRecipient, setAddrRecipient] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPincode, setAddrPincode] = useState("");
  const [addrDistrict, setAddrDistrict] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrAltPhone, setAddrAltPhone] = useState("");
  const [addrIsSubmitting, setAddrIsSubmitting] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Contact Form States
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportStatus, setSupportStatus] = useState("");
  const [supportIsSubmitting, setSupportIsSubmitting] = useState(false);
  const [lastSubmittedQueryId, setLastSubmittedQueryId] = useState<string | null>(null);
  const [trackQueryId, setTrackQueryId] = useState("");
  const [trackedQuery, setTrackedQuery] = useState<any | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [supportHistory, setSupportHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [userReplyText, setUserReplyText] = useState("");
  const [submittingUserReply, setSubmittingUserReply] = useState(false);

  const userChatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trackedQuery) {
      setTimeout(() => {
        userChatContainerRef.current?.scrollTo({
          top: userChatContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }, 80);
    }
  }, [trackedQuery, trackedQuery?.replies]);

  // Poll active support query details and replies every 4 seconds when the chat panel is open
  useEffect(() => {
    if (!trackedQuery?.id) return;
    const interval = setInterval(() => {
      fetchTrackedQuery(trackedQuery.id, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [trackedQuery?.id]);

  // Profile Edit States
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileGstin, setProfileGstin] = useState("");
  const [profileBusinessName, setProfileBusinessName] = useState("");
  const [profileAltPhone, setProfileAltPhone] = useState("");
  const [profileGender, setProfileGender] = useState("");
  const [profileDob, setProfileDob] = useState("");

  const [savedProfileName, setSavedProfileName] = useState("");
  const [savedProfilePhone, setSavedProfilePhone] = useState("");
  const [savedProfileGstin, setSavedProfileGstin] = useState("");
  const [savedProfileBusinessName, setSavedProfileBusinessName] = useState("");
  const [savedProfileAltPhone, setSavedProfileAltPhone] = useState("");
  const [savedProfileGender, setSavedProfileGender] = useState("");
  const [savedProfileDob, setSavedProfileDob] = useState("");

  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileUserId, setProfileUserId] = useState("");

  // Sync state loader
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function initUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          window.location.href = "/sign-in?next=/account";
          return;
        }
        setUser(authUser);
        setAddrRecipient(authUser.user_metadata?.full_name || authUser.user_metadata?.name || "");

        // 1. Fetch user profile first (extremely fast ~100ms)
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("role, full_name, phone, user_id")
          .eq("id", authUser.id)
          .single();

        if (profileErr) {
          console.error("DEBUG profiles query error:", profileErr);
        }

        if (profile) {
          const loadedName = profile.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || "";
          const loadedPhone = profile.phone || authUser.user_metadata?.phone || "";
          const loadedGstin = authUser.user_metadata?.gstin || "";
          const loadedBusinessName = authUser.user_metadata?.business_name || "";
          const loadedAltPhone = authUser.user_metadata?.alt_phone || "";
          const loadedGender = authUser.user_metadata?.gender || "";
          const loadedDob = authUser.user_metadata?.dob || "";

          setProfileName(loadedName);
          setProfilePhone(loadedPhone);
          setSavedProfileName(loadedName);
          setSavedProfilePhone(loadedPhone);

          setProfileGstin(loadedGstin);
          setProfileBusinessName(loadedBusinessName);
          setProfileAltPhone(loadedAltPhone);
          setProfileGender(loadedGender);
          setProfileDob(loadedDob);

          setSavedProfileGstin(loadedGstin);
          setSavedProfileBusinessName(loadedBusinessName);
          setSavedProfileAltPhone(loadedAltPhone);
          setSavedProfileGender(loadedGender);
          setSavedProfileDob(loadedDob);

          setProfileUserId(profile.user_id ? String(profile.user_id) : "");
        }

        const isUserAdmin = profile && ["admin", "staff"].includes(profile.role);
        setIsAdmin(!!isUserAdmin);

        // 2. Hide loading screen immediately so shell renders in < 300ms
        setLoading(false);

        // 3. Fetch independent queries in background
        await fetchAccountData(authUser.id);
        setInitialDataLoaded(true);
      } catch (err) {
        console.error("Account init failed:", err);
        setLoading(false);
      }
    }
    initUser();
  }, []);

  async function fetchAccountData(userId: string) {
    setRefreshing(true);
    try {
      fetchSupportHistory();
      // Run independent queries in parallel instead of one-after-another
      const [ordersRes, walletRes, addrRes, reviewsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*, order_items(*, products(description, slug, pieces_per_pack))")
          .eq("user_id", userId)
          .neq("payment_status", "created")
          .order("placed_at", { ascending: false }),
        supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("addresses")
          .select("*")
          .eq("user_id", userId)
          .order("is_default", { ascending: false }),
        supabase
          .from("reviews")
          .select("product_id, order_id")
          .eq("user_id", userId)
      ]);

      setOrders(ordersRes.data || []);
      setUserReviews(reviewsRes.data || []);

      const history = walletRes.data || [];
      setWalletHistory(history);

      let activeBal = 0;
      const now = new Date();
      history.forEach((t) => {
        if (t.type === "cashback_credit") {
          const exp = t.expires_at ? new Date(t.expires_at) : null;
          if (!exp || exp > now) {
            activeBal += t.amount_paise;
          }
        } else {
          activeBal += t.amount_paise;
        }
      });
      setWalletBalance(Math.max(0, activeBal));

      setAddresses(addrRes.data || []);
    } catch (err) {
      console.error("Fetch account data failed:", err);
    } finally {
      setRefreshing(false);
    }
  }

  const isReviewed = (productId: string, orderId: string) => {
    return userReviews.some(
      (r) => r.product_id === productId && r.order_id === orderId
    );
  };

  const openReviewModal = (orderId: string, productId: string, productName: string) => {
    setReviewOrderId(orderId);
    setReviewProductId(productId);
    setReviewProductName(productName);
    setReviewRating(5);
    setReviewHoverRating(null);
    setReviewTitle("");
    setReviewBody("");
    setReviewPhotos([]);
    setShowReviewModal(true);
  };

  const handleReviewPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArray = Array.from(files);

    if (reviewPhotos.length + fileArray.length > 5) {
      notify("You can only upload up to 5 photos for a review.");
      return;
    }

    setReviewPhotos([...reviewPhotos, ...fileArray]);
  };

  const removeReviewPhoto = (index: number) => {
    setReviewPhotos(reviewPhotos.filter((_, idx) => idx !== index));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrderId || !reviewProductId) return;

    setReviewSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("orderId", reviewOrderId);
      formData.append("productId", reviewProductId);
      formData.append("rating", String(reviewRating));
      formData.append("title", reviewTitle);
      formData.append("body", reviewBody);

      reviewPhotos.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/reviews", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      notify("Review submitted successfully! Thank you for your feedback.");
      setShowReviewModal(false);
      
      if (user) {
        await fetchAccountData(user.id);
      }
    } catch (err: any) {
      notify(err.message || "Something went wrong. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  function resetAddressForm() {
    setEditingAddressId(null);
    setAddrLabel("Home");
    setAddrRecipient(user?.user_metadata?.full_name || user?.user_metadata?.name || "");
    setAddrLine1("");
    setAddrLine2("");
    setAddrCity("");
    setAddrState("");
    setAddrPincode("");
    setAddrDistrict("");
    setAddrPhone("");
    setAddrAltPhone("");
    setShowAddressForm(false);
  }

  function startEditAddress(addr: any) {
    setEditingAddressId(addr.id);
    setAddrLabel(addr.label);
    setAddrRecipient(addr.recipient);
    setAddrLine1(addr.line1);
    setAddrLine2(addr.line2 || "");
    setAddrCity(addr.city);
    setAddrDistrict(addr.district || "");
    setAddrState(addr.state);
    setAddrPincode(addr.pincode);
    setAddrPhone(addr.phone || "");
    setAddrAltPhone(addr.alternate_phone || "");
    setShowAddressForm(true);
  }

  // Handle Add/Edit Address
  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!addrRecipient.trim() || !addrLine1.trim() || !addrCity.trim() || !addrDistrict.trim() || !addrState.trim() || !addrPincode.trim() || !addrPhone.trim()) {
      notify("Please fill in all required fields");
      return;
    }
    setAddrIsSubmitting(true);
    try {
      if (editingAddressId) {
        // Update existing address
        const { error } = await supabase
          .from("addresses")
          .update({
            label: addrLabel,
            recipient: addrRecipient.trim(),
            line1: addrLine1.trim(),
            line2: addrLine2.trim() || null,
            city: addrCity.trim(),
            state: addrState.trim(),
            pincode: addrPincode.trim(),
            district: addrDistrict.trim(),
            phone: addrPhone.trim(),
            alternate_phone: addrAltPhone.trim() || null,
          })
          .eq("id", editingAddressId);

        if (error) throw error;
        notify("Address updated successfully!");
      } else {
        // Insert new address
        const { error } = await supabase.from("addresses").insert({
          user_id: user.id,
          label: addrLabel,
          recipient: addrRecipient.trim(),
          line1: addrLine1.trim(),
          line2: addrLine2.trim() || null,
          city: addrCity.trim(),
          state: addrState.trim(),
          pincode: addrPincode.trim(),
          district: addrDistrict.trim(),
          phone: addrPhone.trim(),
          alternate_phone: addrAltPhone.trim() || null,
          is_default: addresses.length === 0,
        });

        if (error) throw error;
        notify("Address saved successfully!");
      }

      resetAddressForm();
      await fetchAccountData(user.id);
    } catch (err: any) {
      notify("Failed to save address: " + err.message);
    } finally {
      setAddrIsSubmitting(false);
    }
  }

  // Handle Delete Address
  async function handleDeleteAddress(id: string) {
    if (!(await confirm("Are you sure you want to delete this address?", { danger: true }))) return;
    try {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
      await fetchAccountData(user.id);
      notify("Address deleted successfully!");
    } catch (err: any) {
      notify("Failed to delete address: " + err.message);
    }
  }

  // Handle Support Message Submit
  async function handleSendSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) {
      setSupportStatus("Please fill in both subject and message");
      return;
    }
    setSupportIsSubmitting(true);
    setSupportStatus("");
    try {
      const res = await fetch("/api/support/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: user.user_metadata?.full_name || user.email.split("@")[0],
          email: user.email,
          subject: supportSubject.trim(),
          message: supportMessage.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit message");

      setSupportSubject("");
      setSupportMessage("");
      fetchSupportHistory();
      if (data.queryId) {
        setTrackQueryId(data.queryId);
        fetchTrackedQuery(data.queryId);
      }
      notify("Ticket created successfully. You can track it from your ticket history.");
    } catch (err: any) {
      setSupportStatus(err.message || "Failed to submit message");
    } finally {
      setSupportIsSubmitting(false);
    }
  }

  async function fetchTrackedQuery(queryIdToCheck?: string, silent: boolean = false) {
    const id = queryIdToCheck || trackQueryId;
    if (!id || !id.trim()) {
      if (!silent) setTrackError("Please enter a valid Query ID");
      return;
    }
    if (!silent) {
      setTrackLoading(true);
      setTrackError("");
      setTrackedQuery(null);
    }
    try {
      const res = await fetch(`/api/support/track?id=${id.trim()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to find inquiry");
      setTrackedQuery(data);
    } catch (err: any) {
      if (!silent) {
        setTrackError(err.message || "Failed to find inquiry");
      }
    } finally {
      if (!silent) {
        setTrackLoading(false);
      }
    }
  }

  async function fetchSupportHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/support/list");
      if (res.ok) {
        const data = await res.json();
        setSupportHistory(data || []);
      }
    } catch (err) {
      console.error("Failed to load support history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSendUserReply(e: React.FormEvent) {
    e.preventDefault();
    if (!trackedQuery || !userReplyText.trim()) return;

    setSubmittingUserReply(true);
    try {
      const res = await fetch("/api/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: trackedQuery.id,
          message: userReplyText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reply");

      setUserReplyText("");
      // Refresh details and history
      fetchTrackedQuery(trackedQuery.id, true);
      fetchSupportHistory();
    } catch (err: any) {
      notify("Error: " + err.message);
    } finally {
      setSubmittingUserReply(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileName.trim()) {
      setProfileError("Full Name is required");
      return;
    }
    setProfileSubmitting(true);
    setProfileError("");
    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: profileName.trim(),
          phone: profilePhone.trim() || null
        })
        .eq("id", user.id);

      if (profileErr) throw profileErr;

      // 2. Update auth user metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: profileName.trim(),
          phone: profilePhone.trim() || null,
          gstin: profileGstin.trim() || null,
          business_name: profileBusinessName.trim() || null,
          alt_phone: profileAltPhone.trim() || null,
          gender: profileGender || null,
          dob: profileDob || null
        }
      });

      if (authErr) throw authErr;

      // 3. Update local state
      setUser((prev: any) => ({
        ...prev,
        user_metadata: {
          ...prev?.user_metadata,
          full_name: profileName.trim(),
          phone: profilePhone.trim() || null,
          gstin: profileGstin.trim() || null,
          business_name: profileBusinessName.trim() || null,
          alt_phone: profileAltPhone.trim() || null,
          gender: profileGender || null,
          dob: profileDob || null
        }
      }));

      setSavedProfileName(profileName.trim());
      setSavedProfilePhone(profilePhone.trim());
      setSavedProfileGstin(profileGstin.trim());
      setSavedProfileBusinessName(profileBusinessName.trim());
      setSavedProfileAltPhone(profileAltPhone.trim());
      setSavedProfileGender(profileGender);
      setSavedProfileDob(profileDob);
      notify("Personal details updated successfully!");
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile details");
    } finally {
      setProfileSubmitting(false);
    }
  }

  // Download Invoice PDF directly
  function handlePrintInvoice(order: any) {
    const doc = new jsPDF();
    drawInvoicePdf(doc, order, profileUserId);
    doc.save(`Invoice-${order.order_number}.pdf`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-ivory">
        <RefreshCw className="animate-spin text-zari w-10 h-10 mb-3" />
        <p className="font-display text-lg text-ink">Syncing account data...</p>
      </div>
    );
  }

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Customer";

  return (
    <div className="py-12 sm:py-16 bg-ivory min-h-[80vh]">
      <Container className="max-w-[900px]">
        {/* Admin Access Banner */}
        {isAdmin && (
          <div className="mb-8 p-5 border border-zari bg-zari-tint/40 rounded-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-soft">
            <div>
              <p className="font-semibold text-ink text-sm">Administrative Account Authorized</p>
              <p className="text-xs text-taupe mt-0.5">Customise storefront, edit catalog products, manage orders, and view site tracking analytics.</p>
            </div>
            <Button href="/admin" variant="gold" size="sm" className="flex-shrink-0">
              Open Admin Panel
            </Button>
          </div>
        )}

        {/* Navigation Breadcrumb */}
        {activeTab === "overview" ? (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-zari mb-6 transition-colors group cursor-pointer"
          >
            <span className="w-6 h-6 rounded-full bg-cream border border-line flex items-center justify-center group-hover:bg-zari/10 group-hover:border-zari/30 transition-all">
              <ChevronLeft size={14} />
            </span>
            Back to Home
          </Link>
        ) : (
          <button
            onClick={() => setActiveTab("overview")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-zari mb-6 transition-colors group cursor-pointer"
          >
            <span className="w-6 h-6 rounded-full bg-cream border border-line flex items-center justify-center group-hover:bg-zari/10 group-hover:border-zari/30 transition-all">
              <ChevronLeft size={14} />
            </span>
            Back to Dashboard
          </button>
        )}

        {/* Dashboard Header */}
        {activeTab === "overview" && (
          <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#fffdf7] to-[#fdfbf0] border border-zari/20 rounded-2xl p-6 shadow-soft mb-8">
            {/* Decorative top bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-zari to-transparent" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-zari/40 to-zari/15 text-zari-deep border-2 border-zari/50 shadow-md">
                    <User size={26} />
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-white" />
                </div>
                <div>
                  <h1 className="font-display text-2xl text-ink leading-tight">{displayName}</h1>
                  <p className="text-xs text-taupe mt-0.5">{user?.email}</p>
                  {profileUserId && (
                    <div className="mt-2 flex items-center">
                      <span className="text-[10px] font-sans font-bold tracking-wider text-zari-deep bg-white/70 px-2.5 py-1 rounded-full border border-zari/30 uppercase">
                        User ID: {profileUserId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => fetchAccountData(user.id)}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/60 hover:bg-white/90 text-ink text-xs font-semibold border border-zari/30 transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-sm"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-zari-deep ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger text-xs font-semibold border border-danger/20 transition-all duration-200 cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {!initialDataLoaded ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white border border-line rounded-card p-6 h-40 flex flex-col justify-between shadow-soft">
                  <div className="w-10 h-10 rounded-full bg-cream" />
                  <div>
                    <div className="h-4 bg-cream rounded w-1/2 mb-2" />
                    <div className="h-3 bg-cream rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW INDEX GRID */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-fade-up">
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {/* Card 1: Orders */}
              <button
                onClick={() => setActiveTab("orders")}
                className="zari-frame flex flex-col text-left rounded-card bg-white p-6 shadow-soft hover:shadow-lift transition-all duration-300 border border-line group"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-cream text-taupe group-hover:bg-zari-tint group-hover:text-zari-deep transition-colors border border-line mb-4">
                  <ShoppingBag size={18} />
                </span>
                <p className="font-bold text-ink text-base">My Orders</p>
                <p className="text-xs text-taupe mt-1 flex-1">View your order history, statuses, tracking details and invoice slips.</p>
                <span className="text-[10px] font-bold text-zari-deep mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  {orders.length} orders found &rarr;
                </span>
              </button>

              {/* Card 2: Account Details */}
              <button
                onClick={() => setActiveTab("profile")}
                className="zari-frame flex flex-col text-left rounded-card bg-white p-6 shadow-soft hover:shadow-lift transition-all duration-300 border border-line group"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-cream text-taupe group-hover:bg-zari-tint group-hover:text-zari-deep transition-colors border border-line mb-4">
                  <User size={18} />
                </span>
                <p className="font-bold text-ink text-base">Account Details</p>
                <p className="text-xs text-taupe mt-1 flex-1">Update your personal contact details, mobile number, and full name.</p>
                <span className="text-[10px] font-bold text-zari-deep mt-4 group-hover:translate-x-1 transition-transform">
                  Edit profile &rarr;
                </span>
              </button>

              {/* Card 3: Cashback Wallet */}
              <button
                onClick={() => setActiveTab("wallet")}
                className="zari-frame flex flex-col text-left rounded-card bg-white p-6 shadow-soft hover:shadow-lift transition-all duration-300 border border-line group"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-cream text-taupe group-hover:bg-zari-tint group-hover:text-zari-deep transition-colors border border-line mb-4">
                  <Wallet size={18} />
                </span>
                <p className="font-bold text-ink text-base">Cashback Wallet</p>
                <p className="text-xs text-taupe mt-1 flex-1">Inspect your active cashback credits ledger earned on deliveries.</p>
                <span className="text-[10px] font-bold text-zari-deep mt-4 group-hover:translate-x-1 transition-transform">
                  Balance: {formatINR(walletBalance, true)} &rarr;
                </span>
              </button>

              {/* Card 4: Wishlist */}
              <button
                onClick={() => setActiveTab("wishlist")}
                className="zari-frame flex flex-col text-left rounded-card bg-white p-6 shadow-soft hover:shadow-lift transition-all duration-300 border border-line group"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-cream text-taupe group-hover:bg-zari-tint group-hover:text-zari-deep transition-colors border border-line mb-4">
                  <Heart size={18} />
                </span>
                <p className="font-bold text-ink text-base">Wishlist</p>
                <p className="text-xs text-taupe mt-1 flex-1">Saved premium handloom products you are keeping an eye on.</p>
                <span className="text-[10px] font-bold text-zari-deep mt-4 group-hover:translate-x-1 transition-transform">
                  {wishlist.length} saved items &rarr;
                </span>
              </button>

              {/* Card 5: Addresses */}
              <button
                onClick={() => setActiveTab("addresses")}
                className="zari-frame flex flex-col text-left rounded-card bg-white p-6 shadow-soft hover:shadow-lift transition-all duration-300 border border-line group"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-cream text-taupe group-hover:bg-zari-tint group-hover:text-zari-deep transition-colors border border-line mb-4">
                  <MapPin size={18} />
                </span>
                <p className="font-bold text-ink text-base">Addresses</p>
                <p className="text-xs text-taupe mt-1 flex-1">Configure saved delivery recipient and shipping addresses.</p>
                <span className="text-[10px] font-bold text-zari-deep mt-4 group-hover:translate-x-1 transition-transform">
                  {addresses.length} addresses configured &rarr;
                </span>
              </button>

              {/* Card 6: Contact Support */}
              <button
                onClick={() => setActiveTab("contact")}
                className="zari-frame flex flex-col text-left rounded-card bg-white p-6 shadow-soft hover:shadow-lift transition-all duration-300 border border-line group"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-cream text-taupe group-hover:bg-zari-tint group-hover:text-zari-deep transition-colors border border-line mb-4">
                  <MessageSquare size={18} />
                </span>
                <p className="font-bold text-ink text-base">Contact Support</p>
                <p className="text-xs text-taupe mt-1 flex-1">Submit inquiries directly to our weaving support desk.</p>
                <span className="text-[10px] font-bold text-zari-deep mt-4 group-hover:translate-x-1 transition-transform">
                  Send message &rarr;
                </span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MY ORDERS LIST */}
        {activeTab === "orders" && (
          <div className="space-y-6 animate-fade-up">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <h2 className="font-sans text-2xl text-ink">My Order Registry</h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-zari/10 text-zari text-xs rounded-full border border-zari/20">
                {orders.length} {orders.length === 1 ? "order" : "orders"}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("contact")}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-taupe hover:text-zari-deep bg-white border border-line hover:border-zari/50 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Need Help?
              </button>
            </div>
          </div>

            {orders.length === 0 ? (
              <div className="bg-white border border-line rounded-2xl p-14 text-center shadow-soft">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cream/80 flex items-center justify-center border border-line">
                  <ShoppingBag className="w-7 h-7 text-taupe" />
                </div>
                <p className="text-base font-display text-ink">No Orders Yet</p>
                <p className="text-sm text-taupe mt-1">You haven&apos;t placed any orders yet.</p>
                <Link href="/shop" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-ivory text-xs rounded-xl hover:bg-zari transition-colors">
                  Browse Shop &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white border border-line/60 rounded-2xl shadow-soft overflow-hidden hover:shadow-md transition-shadow duration-200">

                    {/* ── ORDER HEADER ── */}
                    <div className="px-4 py-3.5 bg-gradient-to-r from-cream/50 to-transparent border-b border-line/40">
                      {/* Row 1: Order number + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-taupe uppercase tracking-widest font-bold">Order</p>
                          <p className="font-mono text-sm text-ink font-bold italic select-all mt-0.5 hover:text-zari transition-colors">
                            {o.order_number}
                          </p>
                        </div>
                        <span className={`mt-1 shrink-0 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-bold border ${
                          o.status === "delivered" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          o.status === "rejected"  ? "bg-red-50 text-red-600 border-red-200" :
                          o.status === "returned"  ? "bg-amber-50 text-amber-700 border-amber-200" :
                          o.status === "pending"   ? "bg-amber-50 text-amber-800 border-amber-200" :
                          "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {o.status}
                        </span>
                      </div>

                      {/* Row 2: dates + invoice */}
                      <div className="mt-2 flex items-end justify-between gap-2 flex-wrap">
                        <div className="space-y-0.5">
                          <p className="text-[11px] text-taupe flex items-center gap-1 font-semibold">
                            <Calendar size={11} />
                            {new Date(o.placed_at).toLocaleDateString("en-IN", { dateStyle: "long" })}
                          </p>
                          <p className={`text-[11px] flex items-center gap-1 font-bold ${o.status === "out_for_delivery" ? "text-orange-500" : "text-success"}`}>
                            {o.status === "out_for_delivery" ? (
                              <>
                                🛵{" "}
                                <span className="inline-flex items-center gap-1">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                                  </span>
                                  Arriving Today!
                                </span>
                              </>
                            ) : (
                              <>
                                🚚{" "}
                                {o.shipping_address?.delivery_date
                                  ? o.shipping_address.delivery_date
                                  : new Date(new Date(o.placed_at).getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                              </>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePrintInvoice(o)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-ink text-ivory rounded-lg text-[11px] font-bold hover:bg-zari transition-colors shadow-sm cursor-pointer"
                        >
                          <Printer size={12} /> Invoice
                        </button>
                      </div>
                    </div>

                    {/* ── ORDER BODY ── */}
                    <div className="p-4 space-y-4">

                      {/* ORDERED ITEMS */}
                      <div>
                        <p className="text-[10px] text-taupe uppercase tracking-widest flex items-center gap-1.5 font-bold mb-3">
                          <ShoppingBag size={12} /> Ordered Items
                        </p>
                        <div className="space-y-3">
                          {o.order_items?.map((item: any) => {
                            const productSlug = item.products?.slug;
                            const thumb = item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-14 w-14 rounded-xl border border-line object-cover shrink-0 bg-cream"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded-xl border border-line bg-cream flex items-center justify-center shrink-0">
                                <ShoppingBag size={18} className="text-taupe" />
                              </div>
                            );
                            return (
                              <div key={item.id} className="flex items-start gap-3 py-3 border-b border-line/20 last:border-0 last:pb-0">
                                {productSlug ? (
                                  <Link href={`/product/${productSlug}`} className="shrink-0">{thumb}</Link>
                                ) : thumb}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      {productSlug ? (
                                        <Link href={`/product/${productSlug}`} className="text-sm text-ink font-bold leading-snug hover:text-zari-deep hover:underline line-clamp-2">
                                          {item.name.replace(" (Free Gift)", "")}
                                        </Link>
                                      ) : (
                                        <p className="text-sm text-ink font-bold leading-snug line-clamp-2">{item.name.replace(" (Free Gift)", "")}</p>
                                      )}
                                    </div>
                                    <span className="text-sm text-ink font-bold shrink-0 whitespace-nowrap">
                                      {formatINR(item.unit_price_paise * item.quantity, true)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {item.name.toLowerCase().includes("free gift") && (
                                      <span className="inline-flex items-center gap-0.5 bg-[#FAF6EC] border border-[#E9DBB7]/60 text-[#8C6D2D] text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded">
                                        🎁 Free Gift
                                      </span>
                                    )}
                                    {item.variant && (
                                      <span className="text-[10px] text-taupe bg-cream/70 inline-block px-1.5 py-0.5 rounded font-bold border border-line/40">
                                        {item.variant}
                                      </span>
                                    )}
                                    {item.products?.pieces_per_pack && item.products.pieces_per_pack > 1 && !item.name.includes("piece in 1 Pack") && (
                                      <span className="inline-flex items-center gap-0.5 rounded bg-zari/10 border border-zari/25 px-1.5 py-0.5 text-[9px] font-bold text-zari-deep">
                                        📦 {item.products.pieces_per_pack} Pieces in 1 Pack
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-taupe mt-1 font-medium">
                                    {formatINR(item.unit_price_paise, true)} × {item.quantity}
                                  </p>
                                  {o.status === "delivered" && item.product_id && (
                                    <div className="mt-2.5">
                                      {isReviewed(item.product_id, o.id) ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                          ✓ Reviewed
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openReviewModal(o.id, item.product_id, item.name)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white hover:bg-zari text-[11px] font-bold rounded-lg transition-colors cursor-pointer border-0"
                                        >
                                          <Star size={11} className="fill-white" /> Write Review
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* TRACKING */}
                      {(o.tracking_id || o.courier_tracking_url) ? (
                        <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2.5">
                          <p className="text-[10px] text-blue-600 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                            🚚 Shipping &amp; Carrier Details
                          </p>
                          {o.tracking_id && (
                            <div>
                              <p className="text-[10px] text-taupe font-bold mb-1 uppercase tracking-wide">Tracking Number</p>
                              <div className="flex items-center gap-2 bg-white border border-blue-100 rounded-lg px-2.5 py-2">
                                <span className="font-mono text-xs text-ink font-bold flex-1 break-all select-all">
                                  {o.tracking_id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(o.tracking_id);
                                    setCopiedId(o.id);
                                    setTimeout(() => setCopiedId(""), 2000);
                                  }}
                                  className="shrink-0 text-taupe hover:text-ink transition-colors pl-2 border-l border-blue-100"
                                  title="Copy"
                                >
                                  {copiedId === o.id ? (
                                    <span className="text-[9px] text-success font-bold">Copied!</span>
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                          {o.courier_tracking_url && (
                            <a href={o.courier_tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 text-xs font-bold hover:underline">
                              Track Shipment Live →
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="p-3.5 bg-cream/30 border border-dashed border-line/50 rounded-xl text-xs text-taupe italic">
                          Awaiting shipment dispatch. Courier details and live tracking will appear here once dispatched.
                        </div>
                      )}

                      {/* REJECTION / RETURN */}
                      {(o.status === "rejected" || o.status === "returned") && o.payment_status !== "refunded" && (
                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm space-y-3">
                          <p className="text-red-600 uppercase text-[10px] tracking-wide font-bold">
                            {o.status === "rejected" ? "⚠️ Order Rejected" : "⚠️ Order Returned"}
                          </p>
                          {o.rejection_reason && <p className="text-ink text-xs">{o.rejection_reason}</p>}
                          <div className="border-t border-red-200 pt-3 flex flex-col gap-2.5">
                            <p className="text-taupe leading-relaxed text-xs">Refund will be issued within 24hrs. Contact us if needed.</p>
                            <a
                              href={`https://wa.me/918608386872?text=${encodeURIComponent(
                                `Hi, my order ${o.order_number} has been ${o.status === "rejected" ? "rejected" : "returned"}. Details:\n` +
                                (o.order_items || []).map((item: any) => `- ${item.name} (Qty: ${item.quantity})`).join("\n") +
                                `\nTotal Paid: ${formatINR(o.total_paise, true)}.\nI want to inquire about my refund status.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="self-start inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl text-xs transition-all shadow-sm cursor-pointer font-bold"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.83.001-2.624-1.013-5.092-2.859-6.937C16.643 1.98 14.184.962 11.56.962 6.119.962 1.694 5.375 1.691 10.793c-.001 1.782.469 3.52 1.358 5.071l-.951 3.474 3.559-.933zM18.23 15.25c-.34-.17-2.01-.99-2.32-1.1-.31-.11-.54-.17-.77.17-.23.34-.89 1.1-.1.17-.23.11-.46.06-.92-.17-1.8-1.6-2.5-2.22-.62-.55-1.03-1.22-1.14-1.42-.11-.2-.01-.31.09-.41.09-.09.2-.23.3-.34.1-.11.14-.19.21-.31.07-.12.03-.23-.02-.34-.05-.12-.46-1.11-.63-1.52-.17-.4-.36-.34-.5-.34-.13 0-.28 0-.43 0-.15 0-.4.06-.61.28-.21.22-.8.78-.8 1.9 0 1.12.82 2.2 1.05 2.5.23.3 1.62 2.48 3.93 3.48.55.24.98.38 1.32.49.56.18 1.07.15 1.47.09.45-.07 1.39-.57 1.59-1.12.2-.55.2-1.02.14-1.12-.06-.1-.23-.2-.57-.37z"/></svg>
                              Chat on WhatsApp
                            </a>
                          </div>
                        </div>
                      )}

                      {/* REFUND */}
                      {o.payment_status === "refunded" && o.refund_amount_paise && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                          <p className="text-emerald-700 uppercase text-[10px] tracking-wide font-bold">✓ Refund Processed</p>
                          <div className="text-ink space-y-1.5 text-xs">
                            <p>Amount Refunded: <strong className="text-emerald-700 font-bold">{formatINR(o.refund_amount_paise, true)}</strong></p>
                            {o.refund_transaction_id && <p>Transaction ID: <strong className="font-mono italic select-all bg-white px-1.5 py-0.5 rounded border border-emerald-200 cursor-pointer hover:text-emerald-800">{o.refund_transaction_id}</strong></p>}
                            {o.refunded_at && <p>Refund Date: <strong>{new Date(o.refunded_at).toLocaleDateString()}</strong></p>}
                            {o.refund_note && <p>Note: <em className="italic">{o.refund_note}</em></p>}
                            {o.refund_screenshot_url && (
                              <a href={o.refund_screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-bold">
                                View Refund Proof ↗
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SHIPPING ADDRESS + PRICE SUMMARY */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Destination */}
                        <div className="p-3.5 bg-cream/30 rounded-xl border border-line/60 space-y-1">
                          <p className="text-[10px] text-zari-deep uppercase tracking-widest flex items-center gap-1.5 font-bold mb-2">
                            <MapPin size={11} /> Shipment Destination
                          </p>
                          <p className="text-sm text-ink font-bold">{o.shipping_address.recipient}</p>
                          <p className="text-taupe leading-relaxed text-xs">
                            {o.shipping_address.line1},{" "}
                            {o.shipping_address.line2 ? o.shipping_address.line2 + ", " : ""}
                            {o.shipping_address.city},{" "}
                            {o.shipping_address.district ? o.shipping_address.district + ", " : ""}
                            {o.shipping_address.state} &ndash; {o.shipping_address.pincode}
                          </p>
                          {o.shipping_address.phone && (
                            <p className="text-xs text-zari-deep flex items-center gap-1 font-semibold pt-0.5">
                              📞 {o.shipping_address.phone}
                              {o.shipping_address.alternate_phone ? ` / ${o.shipping_address.alternate_phone}` : ""}
                            </p>
                          )}
                        </div>

                        {/* Pricing */}
                        <div className="p-3.5 bg-cream/30 rounded-xl border border-line/60 space-y-2 text-xs">
                          <p className="text-[10px] text-taupe uppercase tracking-widest font-bold mb-2">Order Summary</p>
                          <div className="flex justify-between text-taupe">
                            <span className="font-semibold">Subtotal</span>
                            <span className="text-ink font-bold">{formatINR(o.subtotal_paise, true)}</span>
                          </div>
                          {o.discount_paise > 0 && (
                            <div className="flex justify-between text-danger">
                              <span className="font-semibold">Coupon Discount</span>
                              <span className="font-bold">-{formatINR(o.discount_paise, true)}</span>
                            </div>
                          )}
                          {o.wallet_used_paise > 0 && (
                            <div className="flex justify-between text-danger">
                              <span className="font-semibold">Wallet Used</span>
                              <span className="font-bold">-{formatINR(o.wallet_used_paise, true)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-taupe">
                            <span className="font-semibold">Shipping</span>
                            <span className="text-ink font-bold">{o.shipping_paise === 0 ? "FREE" : formatINR(o.shipping_paise, true)}</span>
                          </div>
                          <div className="flex justify-between border-t border-line/50 pt-2 text-sm font-bold text-ink">
                            <span>Total Paid</span>
                            <span className="text-zari-deep">{formatINR(o.total_paise, true)}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WALLET LEDGERS */}
        {activeTab === "wallet" && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-xl text-ink">Cashback Balance Ledger</h2>

            {/* Total Balance Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#fffdf7] to-[#fdfbf0] border border-zari/20 rounded-2xl p-6 flex justify-between items-center shadow-soft">
              <div className="space-y-1.5 z-10">
                <span className="text-xs font-bold uppercase tracking-wide text-zari-deep">Available Balance</span>
                <p className="text-4xl font-display text-ink">{formatINR(walletBalance, true)}</p>
                <p className="text-xs text-taupe">Cashback credits automatically apply at checkout up to 20% of order totals.</p>
              </div>
              <Wallet className="w-16 h-16 text-zari/30 absolute right-6 top-6 flex-shrink-0" />
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white border border-line rounded-card overflow-hidden shadow-soft">
              <div className="p-4 bg-cream/15 border-b border-line">
                <h3 className="font-bold text-base flex items-center gap-2 text-ink">
                  <History className="w-4 h-4 text-zari" /> Wallet Transaction Logs
                </h3>
              </div>
              {walletHistory.length === 0 ? (
                <div className="p-8 text-center text-sm text-taupe italic">
                  No cashback transactions logged yet. Credits are earned automatically after order shipments deliver.
                </div>
              ) : (
                <div className="overflow-x-auto text-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-cream/45 border-b border-line text-ink font-bold text-xs uppercase tracking-wide">
                        <th className="p-3">Reference / Note</th>
                        <th className="p-3 text-center">Type</th>
                        <th className="p-3 text-right">Credit / Debit</th>
                        <th className="p-3 text-center">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walletHistory.map((t) => (
                        <tr key={t.id} className="border-b border-line hover:bg-cream/10">
                          <td className="p-3 text-ink">
                            <span className="font-semibold">{t.note}</span>
                            {t.type === "cashback_credit" && t.expires_at && (
                              <span className="block text-xs text-taupe mt-0.5">
                                {new Date(t.expires_at) < new Date() ? (
                                  <span className="text-danger font-semibold">Expired</span>
                                ) : (
                                  <>Expires: {new Date(t.expires_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center uppercase font-bold text-xs">
                            <span className={`px-2.5 py-1 rounded-full ${
                              t.amount_paise > 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                            }`}>
                              {t.type.replace("_", " ")}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-bold text-base ${
                            t.amount_paise > 0 ? "text-success" : "text-danger"
                          }`}>
                            {t.amount_paise > 0 ? "+" : ""}{formatINR(t.amount_paise, true)}
                          </td>
                          <td className="p-3 text-center text-taupe text-xs">
                            {new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ADDRESS BOOK */}
        {activeTab === "addresses" && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex justify-between items-center gap-4 border-b border-line/45 pb-3">
              <h2 className="font-display text-base sm:text-xl text-ink">Saved Delivery Addresses</h2>
              {!showAddressForm && (
                <Button 
                  size="sm" 
                  variant="gold" 
                  onClick={() => {
                    resetAddressForm();
                    setShowAddressForm(true);
                  }} 
                  className="whitespace-nowrap shrink-0 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Address
                </Button>
              )}
            </div>

            {/* Address Addition Form */}
            {showAddressForm && (
              <form onSubmit={handleAddAddress} className="bg-white border-t-[3px] border-t-zari border-x border-b border-line shadow-soft p-6 sm:p-8 rounded-card space-y-5 animate-fade-up">
                <h3 className="font-display text-base text-ink pb-3 border-b border-line/45 tracking-wide">
                  {editingAddressId ? "Edit Location" : "Add New Location"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe/90 uppercase tracking-[0.12em] block mb-1">
                      Address Label *
                    </label>
                    <select
                      value={addrLabel}
                      onChange={(e) => setAddrLabel(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 focus:border-zari focus:ring-1 focus:ring-zari/35 cursor-pointer shadow-sm"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe/90 uppercase tracking-[0.12em] block mb-1">
                      Recipient Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Recipient full name"
                      value={addrRecipient}
                      onChange={(e) => setAddrRecipient(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 placeholder:text-muted/60 focus:border-zari focus:ring-1 focus:ring-zari/35 shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-taupe/90 uppercase tracking-[0.12em] block mb-1">
                    Street Details Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="House/Apt No, street details"
                    value={addrLine1}
                    onChange={(e) => setAddrLine1(e.target.value)}
                    className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 placeholder:text-muted/60 focus:border-zari focus:ring-1 focus:ring-zari/35 shadow-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-taupe/90 uppercase tracking-[0.12em] block mb-1">
                    Area / Landmark
                  </label>
                  <input
                    type="text"
                    placeholder="Area, apartment block, landmark (optional)"
                    value={addrLine2}
                    onChange={(e) => setAddrLine2(e.target.value)}
                    className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 placeholder:text-muted/60 focus:border-zari focus:ring-1 focus:ring-zari/35 shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe/90 uppercase tracking-[0.12em] block mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={addrCity}
                      onChange={(e) => setAddrCity(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 placeholder:text-muted/60 focus:border-zari focus:ring-1 focus:ring-zari/35 shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe/90 uppercase tracking-[0.12em] block mb-1">
                      District *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="District"
                      value={addrDistrict}
                      onChange={(e) => setAddrDistrict(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 placeholder:text-muted/60 focus:border-zari focus:ring-1 focus:ring-zari/35 shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe/90 uppercase tracking-[0.12em] block mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={addrState}
                      onChange={(e) => setAddrState(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 placeholder:text-muted/60 focus:border-zari focus:ring-1 focus:ring-zari/35 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe/90 uppercase tracking-[0.12em] block mb-1">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="6 digits PIN"
                      value={addrPincode}
                      onChange={(e) => setAddrPincode(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 placeholder:text-muted/60 focus:border-zari focus:ring-1 focus:ring-zari/35 shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe/90 uppercase tracking-[0.12em] block mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10 digit mobile"
                      value={addrPhone}
                      onChange={(e) => setAddrPhone(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 placeholder:text-muted/60 focus:border-zari focus:ring-1 focus:ring-zari/35 shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe/90 uppercase tracking-[0.12em] block mb-1">
                      Alternate Mobile
                    </label>
                    <input
                      type="tel"
                      placeholder="Alt mobile number"
                      value={addrAltPhone}
                      onChange={(e) => setAddrAltPhone(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-all duration-300 placeholder:text-muted/60 focus:border-zari focus:ring-1 focus:ring-zari/35 shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-line/45">
                  <Button type="button" variant="outline" size="sm" onClick={resetAddressForm}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gold" size="sm" disabled={addrIsSubmitting}>
                    {addrIsSubmitting ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                  </Button>
                </div>
              </form>
            )}

            {/* Address Cards Grid */}
            {addresses.length === 0 ? (
              <div className="bg-white border border-line rounded-card p-12 text-center shadow-soft">
                <MapPin className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-sm text-taupe italic">No addresses saved yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {addresses.map((addr) => (
                   <div key={addr.id} className="bg-white border border-line rounded-card p-5 shadow-soft hover:shadow-lift hover:border-zari/25 transition-all duration-300 ease-silk flex flex-col justify-between group">
                     <div>
                       <div className="flex justify-between items-center border-b border-line/50 pb-2.5 mb-3">
                         <div className="flex items-center gap-2">
                           <span className="bg-zari/10 text-zari-deep px-2.5 py-0.5 rounded-pill font-bold text-[9px] tracking-wider uppercase">
                             {addr.label}
                           </span>
                           {addr.is_default && (
                             <span className="text-[9px] font-bold text-success uppercase border border-success/35 px-2 py-0.5 rounded-pill bg-success/5 tracking-wider">
                               Default
                             </span>
                           )}
                         </div>
                         <div className="flex items-center gap-1">
                           <button
                             onClick={() => startEditAddress(addr)}
                             className="text-taupe hover:text-zari-deep p-1.5 hover:bg-zari/10 rounded-full transition-colors duration-300"
                             title="Edit address"
                           >
                             <Pencil size={13} />
                           </button>
                           <button
                             onClick={() => handleDeleteAddress(addr.id)}
                             className="text-taupe hover:text-danger p-1.5 hover:bg-danger/5 rounded-full transition-colors duration-300"
                             title="Delete address"
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                       </div>
                       <div className="text-xs text-taupe space-y-1">
                         <strong className="text-sm font-bold text-ink block mb-0.5">{addr.recipient}</strong>
                         <p>{addr.line1}</p>
                         {addr.line2 && <p>{addr.line2}</p>}
                         <p>
                           {addr.city}, {addr.district ? addr.district + ", " : ""}{addr.state} - <strong>{addr.pincode}</strong>
                         </p>
                       </div>
                     </div>
                     {addr.phone && (
                       <div className="mt-3 pt-3 border-t border-line/35 text-[10px] text-ink font-semibold flex items-center gap-1">
                         <span>📞</span>
                         <span>Mobile: {addr.phone} {addr.alternate_phone ? `/ ${addr.alternate_phone}` : ""}</span>
                       </div>
                     )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: WISHLIST DISPLAY */}
        {activeTab === "wishlist" && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-xl text-ink">My Wishlist Items</h2>

            {wishlist.length === 0 ? (
              <div className="bg-white border border-line rounded-card p-12 text-center shadow-soft">
                <Heart className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-sm text-taupe italic">Your wishlist is currently empty.</p>
                <Link href="/shop" className="mt-4 inline-block text-xs font-bold text-zari hover:underline">
                  Browse Catalog &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-2 md:grid-cols-3">
                {wishlist.map((p, idx) => (
                  <ProductCard key={p.id} product={p} index={idx} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: CONTACT SUPPORT */}
        {activeTab === "contact" && (
          <div className="space-y-5 animate-fade-up">

            {/* — Hero Header — */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FBF8F0] via-cream to-[#F5EDD8] px-5 py-6 border border-zari/20 shadow-sm">
              {/* decorative circles */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-zari/8 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-zari/6 blur-xl pointer-events-none" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zari/15 flex items-center justify-center border border-zari/25 shrink-0">
                  <MessageSquare className="w-5 h-5 text-zari-deep" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zari-deep/70">Support Desk</p>
                  <h2 className="font-display text-xl text-ink leading-tight">How can we help you?</h2>
                </div>
              </div>
              <p className="relative z-10 mt-3 text-xs text-taupe leading-relaxed">
                Send us your query and our team will respond within <strong className="text-ink">24 hours</strong> on business days.
              </p>
              {/* Quick info pills */}
              <div className="relative z-10 flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1 bg-white/70 border border-zari/20 rounded-full px-2.5 py-1 text-[10px] text-ink font-semibold">
                  <ShieldCheck className="w-2.5 h-2.5 text-zari-deep" /> Mon-Sat, 9AM-6PM IST
                </span>
                <span className="inline-flex items-center gap-1 bg-white/70 border border-zari/20 rounded-full px-2.5 py-1 text-[10px] text-ink font-semibold">
                  <Mail className="w-2.5 h-2.5 text-zari-deep" /> jaisriramtextilekpm@gmail.com
                </span>
              </div>
            </div>

            {/* — Submit Form — */}
            <form onSubmit={handleSendSupport} className="bg-white border border-line/70 rounded-2xl shadow-soft overflow-hidden">
              {/* form header */}
              <div className="px-5 py-4 border-b border-line/50 bg-cream/30 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-zari/10 flex items-center justify-center">
                  <Send className="w-3.5 h-3.5 text-zari-deep" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">Submit a New Inquiry</p>
                  <p className="text-[10px] text-taupe">Fill in the details below and hit send</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {supportStatus && (
                  <div className="flex items-center gap-2 bg-danger/5 border border-danger/20 rounded-xl px-3.5 py-2.5">
                    <span className="text-danger text-base leading-none">⚠️</span>
                    <p className="text-xs text-danger font-semibold">{supportStatus}</p>
                  </div>
                )}

                {/* Read-only sender info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase tracking-widest">Your Name</label>
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-cream/40 px-3.5 py-2.5">
                      <span className="w-5 h-5 rounded-full bg-ink/10 flex items-center justify-center text-[9px] font-bold text-ink shrink-0">
                        {(displayName || "U").charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm text-taupe truncate">{displayName}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase tracking-widest">Email</label>
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-cream/40 px-3.5 py-2.5">
                      <Mail className="w-3.5 h-3.5 text-taupe shrink-0" />
                      <span className="text-sm text-taupe truncate">{user?.email || ""}</span>
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-taupe uppercase tracking-widest">Inquiry Subject <span className="text-zari">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bulk order query, shipment issue, return request…"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    className="rounded-xl border border-line bg-ivory px-3.5 py-2.5 text-sm outline-none focus:border-zari focus:ring-2 focus:ring-zari/15 transition-all placeholder-taupe/40"
                  />
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-taupe uppercase tracking-widest">Message <span className="text-zari">*</span></label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your request in detail…"
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className="rounded-xl border border-line bg-ivory px-3.5 py-2.5 text-sm outline-none focus:border-zari focus:ring-2 focus:ring-zari/15 resize-none transition-all placeholder-taupe/40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={supportIsSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-ink hover:bg-ink/90 disabled:opacity-60 text-ivory font-bold text-sm py-3 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {supportIsSubmitting ? "Sending…" : "Send Inquiry"}
                </button>
              </div>
            </form>

            {/* — Office Info Strips — */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-start gap-3 p-3.5 bg-white border border-line/60 rounded-xl shadow-soft">
                <div className="w-8 h-8 rounded-lg bg-zari/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-zari-deep" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-taupe uppercase tracking-widest mb-0.5">Our Mill</p>
                  <p className="text-xs text-ink font-bold leading-tight">JAI SRI RAM TEXTILES</p>
                  <p className="text-[11px] text-taupe leading-snug mt-0.5">5/136/5, Shasti Smart City, Kallankattuvalasu, Kumarapalayam, Namakkal – 638183</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3.5 bg-white border border-line/60 rounded-xl shadow-soft">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-taupe uppercase tracking-widest mb-0.5">Email</p>
                  <a href="mailto:jaisriramtextilekpm@gmail.com" className="text-xs text-blue-600 font-bold break-all hover:underline">
                    jaisriramtextilekpm@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3.5 bg-white border border-line/60 rounded-xl shadow-soft">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-taupe uppercase tracking-widest mb-0.5">Hours</p>
                  <p className="text-xs text-ink font-bold">Mon - Sat</p>
                  <p className="text-[11px] text-taupe">9:00 AM - 6:00 PM IST</p>
                </div>
              </div>
            </div>

            {/* — Live Chat Panel — */}
            {trackedQuery && (
              <div className="bg-white border border-line/70 rounded-2xl shadow-soft overflow-hidden">
                {/* Chat Header */}
                <div className="px-4 py-3.5 bg-gradient-to-r from-cream/60 to-transparent border-b border-line/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-zari/15 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-zari-deep" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-ink leading-tight truncate">{trackedQuery.subject}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-taupe font-medium">#{shortenId(trackedQuery.id)}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(trackedQuery.id); notify("Ticket ID copied!"); }}
                          className="text-taupe hover:text-zari-deep transition-colors cursor-pointer"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                      trackedQuery.status === "closed"
                        ? "bg-line text-taupe border-line"
                        : trackedQuery.status === "replied"
                        ? "bg-success/15 text-success border-success/35"
                        : "bg-zari/15 text-zari-deep border-zari/45"
                    }`}>
                      {trackedQuery.status}
                    </span>
                    <button
                      onClick={() => setTrackedQuery(null)}
                      className="w-7 h-7 flex items-center justify-center text-taupe hover:text-ink hover:bg-cream rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Chat Messages */}
                <div ref={userChatContainerRef} className="p-4 space-y-5 max-h-[420px] overflow-y-auto bg-[#F9F7F2]/50" data-lenis-prevent>
                  {/* User original message */}
                  <div className="flex flex-col items-end gap-1 w-full">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-taupe uppercase tracking-wide">You</span>
                      <div className="w-5 h-5 rounded-full bg-ink/15 text-[9px] font-bold text-ink flex items-center justify-center">
                        {(displayName || "U").charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="max-w-[82%] bg-ink text-ivory rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed shadow-sm">
                      {trackedQuery.message}
                    </div>
                    <span className="text-[9px] text-taupe/70">
                      {new Date(trackedQuery.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>

                  {/* Replies */}
                  {trackedQuery.replies && trackedQuery.replies.length > 0 ? (
                    trackedQuery.replies.map((reply: any) => {
                      const isUser = reply.sender_type === "user";
                      return (
                        <div key={reply.id} className={`flex flex-col gap-1 w-full ${isUser ? "items-end" : "items-start"}`}>
                          <div className="flex items-center gap-1.5">
                            {!isUser && (
                              <div className="w-5 h-5 rounded-full bg-zari/20 text-[9px] font-bold text-zari-deep flex items-center justify-center">SR</div>
                            )}
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${isUser ? "text-taupe" : "text-zari-deep"}`}>
                              {isUser ? "You" : "Support Desk"}
                            </span>
                            {isUser && (
                              <div className="w-5 h-5 rounded-full bg-ink/15 text-[9px] font-bold text-ink flex items-center justify-center">
                                {(displayName || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed shadow-sm ${
                            isUser
                              ? "bg-ink text-ivory rounded-tr-sm"
                              : "bg-white border border-zari/25 text-ink rounded-tl-sm"
                          }`}>
                            {reply.message}
                          </div>
                          <span className="text-[9px] text-taupe/70 px-0.5">
                            {new Date(reply.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    trackedQuery.reply_message && (
                      <div className="flex flex-col items-start gap-1 w-full">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-zari/20 text-[9px] font-bold text-zari-deep flex items-center justify-center">SR</div>
                          <span className="text-[10px] font-bold text-zari-deep uppercase tracking-wide">Support Desk</span>
                        </div>
                        <div className="max-w-[82%] bg-white border border-zari/25 text-ink rounded-2xl rounded-tl-sm px-4 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed shadow-sm">
                          {trackedQuery.reply_message}
                        </div>
                        {trackedQuery.replied_at && (
                          <span className="text-[9px] text-taupe/70 pl-0.5">
                            {new Date(trackedQuery.replied_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        )}
                      </div>
                    )
                  )}

                  {/* Awaiting reply indicator */}
                  {(!trackedQuery.replies || trackedQuery.replies.length === 0) && !trackedQuery.reply_message && trackedQuery.status !== "closed" && (
                    <div className="flex flex-col items-start gap-1 w-full">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-taupe/15 text-[9px] font-bold text-taupe flex items-center justify-center">SR</div>
                        <span className="text-[10px] font-bold text-taupe uppercase tracking-wide">Support Desk</span>
                      </div>
                      <div className="max-w-[82%] bg-white/80 border border-dashed border-line rounded-2xl rounded-tl-sm px-4 py-3 text-[12px] text-taupe italic leading-relaxed">
                        <p>Our team is reviewing your message. We'll reply within 24 hours.</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="w-1.5 h-1.5 bg-zari rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-zari rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-zari rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Closed banner */}
                  {trackedQuery.status === "closed" && (
                    <div className="text-center py-1">
                      <span className="inline-flex items-center gap-1.5 bg-line/30 border border-line text-taupe text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                        🔒 Ticket Closed
                      </span>
                    </div>
                  )}
                </div>

                {/* Reply Input */}
                {trackedQuery.status !== "closed" && (
                  <div className="border-t border-line/50 p-3 bg-white">
                    <form onSubmit={handleSendUserReply} className="flex gap-2 items-end">
                      <textarea
                        rows={2}
                        value={userReplyText}
                        onChange={(e) => setUserReplyText(e.target.value)}
                        placeholder="Type your reply to the support desk…"
                        className="flex-1 rounded-xl border border-line bg-cream/30 px-3.5 py-2.5 text-xs outline-none focus:border-zari focus:ring-2 focus:ring-zari/15 resize-none text-ink placeholder-taupe/50 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={submittingUserReply || !userReplyText.trim()}
                        className="bg-zari hover:bg-zari-deep disabled:opacity-40 disabled:cursor-not-allowed text-ink font-bold px-4 py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {submittingUserReply ? "…" : "Send"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* ── Support History ── */}
            {supportHistory.length > 0 && (
              <div className="bg-white border border-line/70 rounded-2xl shadow-soft overflow-hidden">
                <div className="px-4 py-3.5 bg-cream/30 border-b border-line/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Your Support History</h3>
                    <p className="text-[10px] text-taupe mt-0.5">Tap any ticket to load its full conversation.</p>
                  </div>
                  <span className="text-[10px] font-bold text-taupe bg-cream border border-line rounded-full px-2.5 py-1">
                    {supportHistory.length} ticket{supportHistory.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="divide-y divide-line/40 max-h-[380px] overflow-y-auto" data-lenis-prevent>
                  {supportHistory.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => { setTrackQueryId(h.id); fetchTrackedQuery(h.id); }}
                      className="w-full text-left px-4 py-3.5 hover:bg-cream/30 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="inline-block bg-cream border border-line/60 px-2 py-0.5 rounded text-[9px] text-taupe font-mono mb-1">
                          #{shortenId(h.id)}
                        </span>
                        <p className="text-sm font-bold text-ink group-hover:text-zari-deep transition-colors leading-tight truncate">
                          {h.subject}
                        </p>
                        <p className="text-[10px] text-taupe mt-0.5">
                          {new Date(h.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${
                          h.status === "closed"
                            ? "bg-line text-taupe border-line"
                            : h.status === "replied"
                            ? "bg-success/15 text-success border-success/35"
                            : "bg-zari/15 text-zari-deep border-zari/45"
                        }`}>
                          {h.status || "new"}
                        </span>
                        <span className="text-[10px] font-bold text-zari-deep group-hover:translate-x-0.5 transition-transform duration-150">
                          →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 7: EDIT ACCOUNT DETAILS */}
        {activeTab === "profile" && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-sans text-2xl font-bold text-ink">Account &amp; Personal Details</h2>

            <div className="bg-white border border-line rounded-2xl p-6 sm:p-7 shadow-soft max-w-2xl">
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-taupe uppercase tracking-wide">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="rounded-lg border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-taupe uppercase tracking-wide">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +919876543210"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="rounded-lg border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-zari"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-taupe uppercase tracking-wide">Business / Shop Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Sri Ram Garments"
                      value={profileBusinessName}
                      onChange={(e) => setProfileBusinessName(e.target.value)}
                      className="rounded-lg border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-taupe uppercase tracking-wide">GSTIN (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 33AAAAA1111A1Z1"
                      value={profileGstin}
                      onChange={(e) => setProfileGstin(e.target.value)}
                      className="rounded-lg border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-zari"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-taupe uppercase tracking-wide">Gender</label>
                    <select
                      value={profileGender}
                      onChange={(e) => setProfileGender(e.target.value)}
                      className="rounded-lg border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-zari"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-taupe uppercase tracking-wide">Date of Birth</label>
                    <input
                      type="date"
                      value={profileDob}
                      onChange={(e) => setProfileDob(e.target.value)}
                      className="rounded-lg border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-taupe uppercase tracking-wide">Alt Mobile (Optional)</label>
                    <input
                      type="text"
                      placeholder="Alternative mobile number"
                      value={profileAltPhone}
                      onChange={(e) => setProfileAltPhone(e.target.value)}
                      className="rounded-lg border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-zari"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-taupe uppercase tracking-wide">Email Address (Read-Only)</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="rounded-lg border border-line bg-cream/35 px-3.5 py-2.5 text-sm text-taupe outline-none"
                  />
                  <p className="text-xs text-taupe">Sign-in credentials and order receipts are tied to this email address.</p>
                </div>

                {profileError && <p className="text-xs text-danger font-semibold">{profileError}</p>}

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="gold"
                    size="sm"
                    disabled={
                      profileSubmitting || (
                        profileName === savedProfileName &&
                        profilePhone === savedProfilePhone &&
                        profileGstin === savedProfileGstin &&
                        profileBusinessName === savedProfileBusinessName &&
                        profileAltPhone === savedProfileAltPhone &&
                        profileGender === savedProfileGender &&
                        profileDob === savedProfileDob
                      )
                    }
                  >
                    {profileSubmitting ? "Saving changes..." : "Save Account Details"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Write Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg rounded-card border border-line bg-white p-6 shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto" data-lenis-prevent>
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="font-display text-lg text-ink">Rate & Review Product</h3>
                  <p className="text-xs text-taupe leading-tight mt-0.5">{reviewProductName}</p>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="rounded-full p-1 text-taupe hover:bg-cream hover:text-ink transition-colors cursor-pointer border-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleReviewSubmit} className="space-y-4 pt-4 text-xs">
                {/* Stars selector */}
                <div className="text-center space-y-1">
                  <p className="font-semibold text-taupe">Your Rating</p>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isHighlighted = (reviewHoverRating !== null ? star <= reviewHoverRating : star <= reviewRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setReviewHoverRating(star)}
                          onMouseLeave={() => setReviewHoverRating(null)}
                          className="text-2xl transition-transform duration-150 hover:scale-110 cursor-pointer bg-transparent border-0"
                        >
                          <Star 
                            className={`w-7 h-7 ${
                              isHighlighted ? "fill-zari text-zari" : "text-taupe fill-none"
                            }`} 
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-taupe">Review Title (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Extremely soft material!" 
                    value={reviewTitle} 
                    onChange={(e) => setReviewTitle(e.target.value)} 
                    className="rounded border border-line bg-white px-3 py-2 text-xs outline-none focus:border-zari"
                  />
                </div>

                {/* Body */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-taupe">Review Message *</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Tell us what you liked or disliked about this product..." 
                    value={reviewBody} 
                    onChange={(e) => setReviewBody(e.target.value)} 
                    className="rounded border border-line bg-white px-3 py-2 text-xs outline-none focus:border-zari resize-none"
                  />
                </div>

                {/* File Uploads */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-taupe">Upload Photos (Max 5)</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 border border-line rounded bg-cream hover:bg-cream/70 text-xs font-semibold text-ink transition-colors">
                      📸 Select Photos
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleReviewPhotoChange} 
                        className="hidden" 
                      />
                    </label>
                    <span className="text-[10px] text-taupe">{reviewPhotos.length} / 5 photos selected</span>
                  </div>

                  {reviewPhotos.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {reviewPhotos.map((file, idx) => (
                        <div key={idx} className="relative aspect-square border border-line rounded overflow-hidden bg-cream group">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt="selected thumbnail" 
                            className="object-cover w-full h-full"
                          />
                          <button 
                            type="button" 
                            onClick={() => removeReviewPhoto(idx)} 
                            className="absolute top-0.5 right-0.5 bg-danger text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-line">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowReviewModal(false)}
                    disabled={reviewSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="gold" 
                    size="sm" 
                    disabled={reviewSubmitting}
                  >
                    {reviewSubmitting ? "Submitting review..." : "Submit Review"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
          </>
        )}
      </Container>
    </div>
  );
}
