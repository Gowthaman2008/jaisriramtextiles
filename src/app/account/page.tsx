"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { useCart } from "@/components/providers/cart-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/home/product-card";
import { formatINR } from "@/lib/utils";
import { jsPDF } from "jspdf";
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
  X
} from "lucide-react";

export default function AccountPage() {
  const supabase = createClient();
  const { wishlist } = useWishlist();

  const shortenId = (id: string) => {
    if (!id || id.length < 12) return id;
    return `${id.substring(0, 8).toUpperCase()}...${id.substring(id.length - 6).toUpperCase()}`;
  };

  // Tab State: "overview" | "orders" | "wallet" | "wishlist" | "addresses" | "contact"
  const [activeTab, setActiveTab] = useState("overview");

  // User States
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const userChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trackedQuery) {
      setTimeout(() => {
        userChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
  const [savedProfileName, setSavedProfileName] = useState("");
  const [savedProfilePhone, setSavedProfilePhone] = useState("");
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

        // Profile lookup and account data (orders/wallet/addresses) don't depend on
        // each other — run them in parallel rather than one after another.
        const [{ data: profile, error: profileErr }] = await Promise.all([
          supabase
            .from("profiles")
            .select("role, full_name, phone, user_id")
            .eq("id", authUser.id)
            .single(),
          fetchAccountData(authUser.id),
        ]);

        if (profileErr) {
          console.error("DEBUG profiles query error:", profileErr);
        }

        if (profile) {
          const loadedName = profile.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || "";
          const loadedPhone = profile.phone || authUser.user_metadata?.phone || "";
          setProfileName(loadedName);
          setProfilePhone(loadedPhone);
          setSavedProfileName(loadedName);
          setSavedProfilePhone(loadedPhone);
          setProfileUserId(profile.user_id ? String(profile.user_id) : "");
        }

        const isUserAdmin = profile && ["admin", "staff"].includes(profile.role);
        setIsAdmin(!!isUserAdmin);
      } catch (err) {
        console.error("Account init failed:", err);
      } finally {
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
          .select("*, order_items(*)")
          .eq("user_id", userId)
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
      alert("You can only upload up to 5 photos for a review.");
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

      alert("Review submitted successfully! Thank you for your feedback.");
      setShowReviewModal(false);
      
      if (user) {
        await fetchAccountData(user.id);
      }
    } catch (err: any) {
      alert(err.message || "Something went wrong. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Handle Add Address
  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!addrRecipient.trim() || !addrLine1.trim() || !addrCity.trim() || !addrDistrict.trim() || !addrState.trim() || !addrPincode.trim() || !addrPhone.trim()) {
      alert("Please fill in all required fields");
      return;
    }
    setAddrIsSubmitting(true);
    try {
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

      // Reset address form
      setAddrLabel("Home");
      setAddrLine1("");
      setAddrLine2("");
      setAddrCity("");
      setAddrState("");
      setAddrPincode("");
      setAddrDistrict("");
      setAddrPhone("");
      setAddrAltPhone("");
      setShowAddressForm(false);
      
      await fetchAccountData(user.id);
      alert("Address saved successfully!");
    } catch (err: any) {
      alert("Failed to save address: " + err.message);
    } finally {
      setAddrIsSubmitting(false);
    }
  }

  // Handle Delete Address
  async function handleDeleteAddress(id: string) {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
      await fetchAccountData(user.id);
      alert("Address deleted successfully!");
    } catch (err: any) {
      alert("Failed to delete address: " + err.message);
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
      alert("Ticket created successfully. You can track it from your ticket history.");
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
      fetchTrackedQuery(trackedQuery.id);
      fetchSupportHistory();
      alert("Reply sent successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
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
      // 1. Update profiles table
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
          phone: profilePhone.trim() || null
        }
      });

      if (authErr) throw authErr;

      // 3. Update local state
      setUser((prev: any) => ({
        ...prev,
        user_metadata: {
          ...prev?.user_metadata,
          full_name: profileName.trim(),
          phone: profilePhone.trim() || null
        }
      }));

      setSavedProfileName(profileName.trim());
      setSavedProfilePhone(profilePhone.trim());
      alert("Personal details updated successfully!");
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile details");
    } finally {
      setProfileSubmitting(false);
    }
  }

  // Download Invoice PDF directly
  function handlePrintInvoice(order: any) {
    const doc = new jsPDF();
    const orderNumber = order.order_number;
    const name = order.shipping_address?.recipient || order.profiles?.full_name || order.profiles?.email || profileName || "Customer";
    const userId = profileUserId || order.profiles?.user_id || "";
    const items = order.order_items || [];
    const shippingAddress = order.shipping_address || {};
    const subtotalPaise = order.subtotal_paise;
    const discountPaise = order.discount_paise;
    const shippingPaise = order.shipping_paise;
    const walletUsedPaise = order.wallet_used_paise;
    const totalPaise = order.total_paise;
    const cashbackEarnedPaise = order.cashback_earned_paise || 0;

    // Color Palette
    const zariGold = [176, 141, 76]; // #B08D4C
    const inkDark = [42, 38, 34]; // #2A2622
    const taupeGray = [110, 101, 90]; // #6E655A
    const lineLight = [229, 223, 210]; // #E5DFD2

    // 1. Header Banner
    doc.setFillColor(inkDark[0], inkDark[1], inkDark[2]);
    doc.rect(0, 0, 210, 40, "F");

    // Title Text
    doc.setTextColor(zariGold[0], zariGold[1], zariGold[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("JAI SRI RAM TEXTILES", 20, 25);

    // Subtitle
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("PREMIUM WEAVERS  |  JAISRIRAMTEXTILES.IN", 20, 32);

    // Invoice label
    doc.setTextColor(zariGold[0], zariGold[1], zariGold[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("INVOICE", 155, 26);

    // 2. Metadata Columns
    doc.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Order Information", 20, 52);
    doc.text("Shipping To", 120, 52);

    doc.setDrawColor(zariGold[0], zariGold[1], zariGold[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 90, 55);
    doc.line(120, 55, 190, 55);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(taupeGray[0], taupeGray[1], taupeGray[2]);

    // Order Info text
    doc.text(`Order Number: ${orderNumber}`, 20, 62);
    doc.text(`Date: ${new Date(order.placed_at || order.created_at || new Date()).toLocaleDateString("en-IN", { dateStyle: "long" })}`, 20, 68);
    doc.text(`Customer: ${name}`, 20, 74);
    if (userId) {
      doc.text(`User ID: ${userId}`, 20, 80);
    }

    // Shipping Address text
    doc.text(shippingAddress.recipient || "", 120, 62);
    doc.text(shippingAddress.line1 || "", 120, 68);
    if (shippingAddress.line2) {
      doc.text(shippingAddress.line2, 120, 74);
      doc.text(`${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}`, 120, 80);
      if (shippingAddress.phone) {
        doc.text(`Phone: ${shippingAddress.phone}`, 120, 86);
      }
    } else {
      doc.text(`${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}`, 120, 74);
      if (shippingAddress.phone) {
        doc.text(`Phone: ${shippingAddress.phone}`, 120, 80);
      }
    }

    // 3. Items Table Header
    let y = 100;
    doc.setFillColor(inkDark[0], inkDark[1], inkDark[2]);
    doc.rect(20, y, 170, 8, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Item Details", 24, y + 5.5);
    doc.text("Qty", 125, y + 5.5);
    doc.text("Total Price", 165, y + 5.5);

    // 4. Table Items List
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(inkDark[0], inkDark[1], inkDark[2]);

    const itemNameMaxWidth = 95; // keeps text inside the Item Details column, clear of Qty/Total

    items.forEach((item: any) => {
      const nameText = `${item.name}${item.variant ? ` (${item.variant})` : ""}`;
      const nameLines: string[] = doc.splitTextToSize(nameText, itemNameMaxWidth);
      const lineHeight = 4.5;
      const nameBlockHeight = nameLines.length * lineHeight;
      const rowHeight = nameBlockHeight + (item.sku ? 4.5 : 0) + 3.5;

      // line border
      doc.setDrawColor(lineLight[0], lineLight[1], lineLight[2]);
      doc.setLineWidth(0.3);
      doc.line(20, y + rowHeight, 190, y + rowHeight);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
      doc.text(nameLines, 24, y + 5);

      if (item.sku) {
        doc.setFontSize(8);
        doc.setTextColor(taupeGray[0], taupeGray[1], taupeGray[2]);
        doc.text(`SKU: ${item.sku}`, 24, y + 5 + nameBlockHeight);
      }

      doc.setFontSize(9.5);
      doc.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
      doc.text(`${item.quantity}`, 127, y + 5);
      doc.text(`INR ${(item.unit_price_paise * item.quantity / 100).toFixed(2)}`, 165, y + 5);

      y += rowHeight;
    });

    // 5. Totals Right Column
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(taupeGray[0], taupeGray[1], taupeGray[2]);

    doc.text("Subtotal:", 125, y);
    doc.text(`INR ${(subtotalPaise / 100).toFixed(2)}`, 165, y);
    y += 6;

    if (discountPaise > 0) {
      doc.text("Discount:", 125, y);
      doc.text(`-INR ${(discountPaise / 100).toFixed(2)}`, 165, y);
      y += 6;
    }

    if (walletUsedPaise > 0) {
      doc.text("Wallet Credits Used:", 125, y);
      doc.text(`-INR ${(walletUsedPaise / 100).toFixed(2)}`, 165, y);
      y += 6;
    }

    doc.text("Shipping:", 125, y);
    doc.text(shippingPaise === 0 ? "FREE" : `INR ${(shippingPaise / 100).toFixed(2)}`, 165, y);
    y += 8;

    // Total Paid
    doc.setDrawColor(zariGold[0], zariGold[1], zariGold[2]);
    doc.setLineWidth(0.5);
    doc.line(120, y - 5, 190, y - 5);

    doc.setTextColor(zariGold[0], zariGold[1], zariGold[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total Paid:", 125, y);
    doc.text(`INR ${(totalPaise / 100).toFixed(2)}`, 165, y);

    if (cashbackEarnedPaise > 0) {
      y += 6;
      doc.setTextColor(75, 122, 82); // Green
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text("Cashback Earned:", 125, y);
      doc.text(`INR ${(cashbackEarnedPaise / 100).toFixed(2)}`, 165, y);
    }

    // 6. Footer Disclaimer
    y = 265;
    doc.setDrawColor(lineLight[0], lineLight[1], lineLight[2]);
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(taupeGray[0], taupeGray[1], taupeGray[2]);
    doc.text("This is an electronically generated invoice document for your purchase.", 20, y + 5);
    doc.text("Thank you for shopping with JAI SRI RAM TEXTILES!", 20, y + 9);

    doc.save(`Invoice-${orderNumber}.pdf`);
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
            className="flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink mb-6 transition-colors inline-flex cursor-pointer"
          >
            <ChevronLeft size={16} /> Back to Home
          </Link>
        ) : (
          <button
            onClick={() => setActiveTab("overview")}
            className="flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink mb-6 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-line rounded-card p-6 shadow-soft mb-8">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-cream text-taupe border border-line">
              <User size={24} />
            </span>
            <div>
              <h1 className="font-display text-2xl text-ink leading-tight">{displayName}</h1>
              <p className="text-xs text-taupe mt-0.5">{user?.email}</p>
              {profileUserId && (
                <div className="mt-1.5 flex items-center">
                  <span className="text-[10px] font-sans font-bold tracking-wider text-zari-deep bg-cream/50 px-2 py-0.5 rounded border border-zari/10 uppercase">
                    User ID: {profileUserId}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchAccountData(user.id)}
              disabled={refreshing}
              className="bg-white hover:bg-cream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={handleSignOut} className="bg-white hover:bg-cream text-danger border-danger/10 hover:bg-danger/5">
              Sign out
            </Button>
          </div>
        </div>

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
            <h2 className="font-display text-xl text-ink">My Order Registry</h2>

            {orders.length === 0 ? (
              <div className="bg-white border border-line rounded-card p-12 text-center shadow-soft">
                <ShoppingBag className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-sm text-taupe italic">No orders placed yet.</p>
                <Link href="/shop" className="mt-4 inline-block text-xs font-bold text-zari hover:underline">
                  Browse Shop Now &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white border border-line rounded-card shadow-soft overflow-hidden">
                    {/* Top bar info */}
                    <div className="bg-cream/25 border-b border-line px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <p className="font-mono text-xs text-taupe">ORDER #: <strong className="text-ink">{o.order_number}</strong></p>
                        <p className="text-[10px] text-taupe mt-0.5">Placed: {new Date(o.placed_at).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          o.status === "delivered" ? "bg-success/15 text-success" :
                          o.status === "rejected" ? "bg-danger/15 text-danger" :
                          o.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-800"
                        }`}>
                          {o.status}
                        </span>
                        <button
                          onClick={() => handlePrintInvoice(o)}
                          className="flex items-center gap-1.5 p-1 px-2.5 border border-line rounded bg-white hover:bg-cream text-[10px] font-bold text-ink transition-colors"
                          title="Print Receipt"
                        >
                          <Printer size={12} /> Invoice
                        </button>
                      </div>
                    </div>

                    {/* Content details split */}
                    <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      {/* Products items checklist */}
                      <div className="md:col-span-7 space-y-3">
                        <p className="text-[10px] font-bold text-taupe uppercase tracking-wider">Ordered Items</p>
                        {o.order_items?.map((item: any) => (
                          <div key={item.id} className="border-b border-line/35 pb-3 mb-2 last:border-0 last:pb-0 last:mb-0">
                            <div className="flex justify-between items-start text-xs">
                              <div>
                                <p className="font-bold text-ink">{item.name}</p>
                                {item.variant && <p className="text-[10px] text-taupe mt-0.5">{item.variant}</p>}
                                <p className="text-taupe mt-0.5">{formatINR(item.unit_price_paise, true)} &times; {item.quantity}</p>
                              </div>
                              <span className="font-semibold text-ink">{formatINR(item.unit_price_paise * item.quantity, true)}</span>
                            </div>

                            {item.product_id && o.status === "delivered" && (
                              <div className="mt-2 flex justify-end">
                                {isReviewed(item.product_id, o.id) ? (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-taupe bg-cream px-2 py-0.5 rounded border border-line/40">Reviewed</span>
                                ) : (
                                  <button
                                    onClick={() => openReviewModal(o.id, item.product_id, item.name)}
                                    className="px-3 py-1 bg-ink text-ivory rounded text-[10px] font-bold uppercase tracking-wider hover:bg-zari transition-colors cursor-pointer border-0"
                                  >
                                    Rate & Review
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Rejection / Return Reason Display */}
                        {(o.status === "rejected" || o.status === "returned") && o.payment_status !== "refunded" && (
                          <div className="mt-6 p-4 bg-danger/5 border border-danger/30 rounded-md text-xs space-y-2.5">
                            <div className="space-y-1">
                              <p className="font-bold text-danger uppercase text-[9px] tracking-wider">
                                {o.status === "rejected" ? "Order Rejected" : "Order Returned"}
                              </p>
                              {o.rejection_reason && <p className="text-ink">{o.rejection_reason}</p>}
                            </div>
                            <div className="border-t border-danger/20 pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-ink">
                              <p className="text-taupe leading-relaxed">
                                Refund will be issued within 24hrs or else contact customer service.
                              </p>
                              <a
                                href={`https://wa.me/918608386872?text=${encodeURIComponent(
                                  `Hi, my order ${o.order_number} has been ${o.status === "rejected" ? "rejected" : "returned"}. Details:\n` +
                                  (o.order_items || []).map((item: any) => `- ${item.name} (Qty: ${item.quantity})`).join("\n") +
                                  `\nTotal Paid: ${formatINR(o.total_paise, true)}.\nI want to inquire about my refund status.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium rounded text-[11px] transition-colors whitespace-nowrap self-start sm:self-auto shadow-sm cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.83.001-2.624-1.013-5.092-2.859-6.937C16.643 1.98 14.184.962 11.56.962 6.119.962 1.694 5.375 1.691 10.793c-.001 1.782.469 3.52 1.358 5.071l-.951 3.474 3.559-.933zM18.23 15.25c-.34-.17-2.01-.99-2.32-1.1-.31-.11-.54-.17-.77.17-.23.34-.89 1.1-.1.17-.23.11-.46.06-.92-.17-1.8-1.6-2.5-2.22-.62-.55-1.03-1.22-1.14-1.42-.11-.2-.01-.31.09-.41.09-.09.2-.23.3-.34.1-.11.14-.19.21-.31.07-.12.03-.23-.02-.34-.05-.12-.46-1.11-.63-1.52-.17-.4-.36-.34-.5-.34-.13 0-.28 0-.43 0-.15 0-.4.06-.61.28-.21.22-.8.78-.8 1.9 0 1.12.82 2.2 1.05 2.5.23.3 1.62 2.48 3.93 3.48.55.24.98.38 1.32.49.56.18 1.07.15 1.47.09.45-.07 1.39-.57 1.59-1.12.2-.55.2-1.02.14-1.12-.06-.1-.23-.2-.57-.37z"/>
                                </svg>
                                Chat now
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Refund Details Display */}
                        {o.payment_status === "refunded" && o.refund_amount_paise && (
                          <div className="mt-6 p-4 bg-success/5 border border-success/30 rounded-md text-xs space-y-2">
                            <p className="font-bold text-success uppercase text-[9px] tracking-wider">Refund Processed</p>
                            <div className="text-ink space-y-1.5">
                              <p>Amount Refunded: <strong>{formatINR(o.refund_amount_paise, true)}</strong></p>
                              {o.refund_transaction_id && <p>Transaction ID: <strong className="font-mono">{o.refund_transaction_id}</strong></p>}
                              {o.refunded_at && <p>Refund Date: <strong>{new Date(o.refunded_at).toLocaleDateString()}</strong></p>}
                              {o.refund_note && <p>Note: <em>{o.refund_note}</em></p>}
                              {o.refund_screenshot_url && (
                                <p className="mt-1">
                                  <a href={o.refund_screenshot_url} target="_blank" rel="noopener noreferrer" className="text-zari hover:underline font-bold inline-flex items-center gap-1 cursor-pointer">
                                    View Refund Proof ↗
                                  </a>
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tracking Details Display */}
                        {(o.tracking_id || o.courier_tracking_url) ? (
                          <div className="mt-6 p-4 bg-zari-tint/20 border border-zari rounded-md text-xs space-y-2">
                            <p className="font-bold text-zari-deep uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                              🚚 Shipping & Carrier Details
                            </p>
                            <div className="text-ink space-y-1.5">
                              {o.tracking_id && (
                                <p className="flex items-center gap-2">
                                  Tracking Number:{" "}
                                  <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-line inline-flex items-center gap-1.5 select-all">
                                    {o.tracking_id}
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(o.tracking_id);
                                        setCopiedId(o.id);
                                        setTimeout(() => setCopiedId(""), 2000);
                                      }}
                                      className="text-taupe hover:text-ink cursor-pointer focus:outline-none transition-colors border-l border-line pl-1.5"
                                      title="Copy Tracking ID"
                                      type="button"
                                    >
                                      {copiedId === o.id ? (
                                        <span className="text-[9px] text-success font-sans font-bold">Copied!</span>
                                      ) : (
                                        <Copy size={11} className="shrink-0 text-taupe/80" />
                                      )}
                                    </button>
                                  </strong>
                                </p>
                              )}
                              {o.courier_tracking_url && (
                                <p className="pt-0.5">
                                  <a href={o.courier_tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-zari-deep font-bold hover:underline">
                                    Track Shipment Live &rarr;
                                  </a>
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-6 p-4 bg-cream/10 border border-line/40 border-dashed rounded-md text-xs text-taupe italic">
                            Awaiting shipment dispatch. Once dispatch starts, courier details and live tracking links will be updated here.
                          </div>
                        )}
                      </div>

                      {/* Pricing list and delivery detail */}
                      <div className="md:col-span-5 bg-cream/15 p-4 rounded-md border border-line text-xs space-y-3">
                        <div>
                          <p className="font-bold text-taupe uppercase text-[9px] tracking-wider">Shipment Destination</p>
                          <p className="text-ink font-semibold mt-1">{o.shipping_address.recipient}</p>
                          <p className="text-taupe mt-0.5">
                            {o.shipping_address.line1}, 
                            {o.shipping_address.line2 ? " " + o.shipping_address.line2 + "," : ""} 
                            {o.shipping_address.city}, 
                            {o.shipping_address.district ? " " + o.shipping_address.district + "," : ""} 
                            {o.shipping_address.state} - {o.shipping_address.pincode}
                          </p>
                          {o.shipping_address.phone && (
                            <p className="text-[10px] text-ink font-semibold mt-1">
                              📞 Mobile: {o.shipping_address.phone} {o.shipping_address.alternate_phone ? `/ ${o.shipping_address.alternate_phone}` : ""}
                            </p>
                          )}
                        </div>
                        
                        <div className="border-t border-line/50 pt-2 space-y-1 text-[11px]">
                          <div className="flex justify-between text-taupe">
                            <span>Subtotal:</span>
                            <span>{formatINR(o.subtotal_paise, true)}</span>
                          </div>
                          {o.discount_paise > 0 && (
                            <div className="flex justify-between text-danger font-semibold">
                              <span>Coupon Discount:</span>
                              <span>-{formatINR(o.discount_paise, true)}</span>
                            </div>
                          )}
                          {o.wallet_used_paise > 0 && (
                            <div className="flex justify-between text-danger font-semibold">
                              <span>Wallet balance used:</span>
                              <span>-{formatINR(o.wallet_used_paise, true)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-taupe">
                            <span>Shipping fee:</span>
                            <span>{o.shipping_paise === 0 ? "FREE" : formatINR(o.shipping_paise, true)}</span>
                          </div>
                          <div className="flex justify-between text-ink font-bold border-t border-line/50 pt-1 text-xs">
                            <span>Total Paid:</span>
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
            <div className="bg-ink text-ivory rounded-card p-6 border border-zari flex justify-between items-center relative overflow-hidden shadow-lift">
              <div className="space-y-1.5 z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zari">Available Balance</span>
                <p className="text-4xl font-display text-zari">{formatINR(walletBalance, true)}</p>
                <p className="text-[10px] text-muted">Cashback credits automatically apply at checkout up to 20% of order totals.</p>
              </div>
              <Wallet className="w-16 h-16 text-zari/15 absolute right-6 top-6 flex-shrink-0" />
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white border border-line rounded-card overflow-hidden shadow-soft">
              <div className="p-4 bg-cream/15 border-b border-line">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-ink">
                  <History className="w-4 h-4 text-zari" /> Wallet Transaction Logs
                </h3>
              </div>
              {walletHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-taupe italic">
                  No cashback transactions logged yet. Credits are earned automatically after order shipments deliver.
                </div>
              ) : (
                <div className="overflow-x-auto text-xs sm:text-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-cream/45 border-b border-line text-taupe font-medium">
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
                              <span className="block text-[10px] text-taupe mt-0.5">
                                {new Date(t.expires_at) < new Date() ? (
                                  <span className="text-danger font-semibold">Expired</span>
                                ) : (
                                  <>Expires: {new Date(t.expires_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center uppercase font-bold text-[10px]">
                            <span className={`px-2 py-0.5 rounded ${
                              t.amount_paise > 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                            }`}>
                              {t.type.replace("_", " ")}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-mono font-bold ${
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
                <Button size="sm" variant="gold" onClick={() => setShowAddressForm(true)} className="whitespace-nowrap shrink-0 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Address
                </Button>
              )}
            </div>

            {/* Address Addition Form */}
            {showAddressForm && (
              <form onSubmit={handleAddAddress} className="bg-white border-2 border-zari p-5 rounded-card shadow-lift space-y-4">
                <h3 className="font-semibold text-sm border-b border-line pb-2">Add New Location</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase">Address Label *</label>
                    <select
                      value={addrLabel}
                      onChange={(e) => setAddrLabel(e.target.value)}
                      className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase">Recipient Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Recipient full name"
                      value={addrRecipient}
                      onChange={(e) => setAddrRecipient(e.target.value)}
                      className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-taupe uppercase">Street Details Line 1 *</label>
                  <input
                    type="text"
                    required
                    placeholder="House/Apt No, street details"
                    value={addrLine1}
                    onChange={(e) => setAddrLine1(e.target.value)}
                    className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-taupe uppercase">Area / Landmark</label>
                  <input
                    type="text"
                    placeholder="Area, apartment block, landmark (optional)"
                    value={addrLine2}
                    onChange={(e) => setAddrLine2(e.target.value)}
                    className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase">City *</label>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={addrCity}
                      onChange={(e) => setAddrCity(e.target.value)}
                      className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase">District *</label>
                    <input
                      type="text"
                      required
                      placeholder="District"
                      value={addrDistrict}
                      onChange={(e) => setAddrDistrict(e.target.value)}
                      className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase">State *</label>
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={addrState}
                      onChange={(e) => setAddrState(e.target.value)}
                      className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase">Pincode *</label>
                    <input
                      type="text"
                      required
                      placeholder="6 digits ZIP"
                      value={addrPincode}
                      onChange={(e) => setAddrPincode(e.target.value)}
                      className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="10 digit mobile"
                      value={addrPhone}
                      onChange={(e) => setAddrPhone(e.target.value)}
                      className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase">Alternate Mobile</label>
                    <input
                      type="tel"
                      placeholder="Alt mobile number"
                      value={addrAltPhone}
                      onChange={(e) => setAddrAltPhone(e.target.value)}
                      className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddressForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gold" size="sm" disabled={addrIsSubmitting}>
                    {addrIsSubmitting ? "Saving..." : "Save Address"}
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
                   <div key={addr.id} className="bg-white border border-line rounded-card p-5 shadow-soft group">
                     <div className="flex justify-between items-center border-b border-line pb-2 mb-2">
                       <div className="flex items-center gap-2">
                         <span className="bg-zari/15 text-zari-deep px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                           {addr.label}
                         </span>
                         {addr.is_default && (
                           <span className="text-[9px] font-semibold text-success uppercase border border-success/35 px-1.5 py-0.2 rounded bg-success/5">
                             Default
                           </span>
                         )}
                       </div>
                       <button
                         onClick={() => handleDeleteAddress(addr.id)}
                         className="text-taupe hover:text-danger p-1 hover:bg-danger/5 rounded transition-colors"
                         title="Delete address"
                       >
                         <Trash2 size={14} />
                       </button>
                     </div>
                     <div className="text-xs text-taupe space-y-0.5">
                       <strong className="text-sm font-bold text-ink">{addr.recipient}</strong>
                       <p>{addr.line1}</p>
                       {addr.line2 && <p>{addr.line2}</p>}
                       <p>
                         {addr.city}, {addr.district ? addr.district + ", " : ""}{addr.state} - <strong>{addr.pincode}</strong>
                       </p>
                       {addr.phone && (
                         <p className="pt-1.5 text-[10px] text-ink font-semibold">
                           📞 Mobile: {addr.phone} {addr.alternate_phone ? `/ ${addr.alternate_phone}` : ""}
                         </p>
                       )}
                     </div>
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
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-xl text-ink">Contact Support Desk</h2>

            <div className="grid gap-6 md:grid-cols-12 items-start">
              {/* Left Form */}
              <form onSubmit={handleSendSupport} className="md:col-span-7 bg-white border border-line rounded-card p-6 shadow-soft space-y-4">
                <h3 className="font-semibold text-sm border-b border-line pb-2">Submit Support Inquiry</h3>

                {supportStatus && (
                  <p className="text-xs text-danger font-semibold bg-danger/5 p-2 rounded">{supportStatus}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase">Sender Name</label>
                    <input
                      type="text"
                      disabled
                      value={displayName}
                      className="rounded border border-line bg-cream/35 px-3 py-1.5 text-xs text-taupe outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-taupe uppercase">Email Address</label>
                    <input
                      type="text"
                      disabled
                      value={user?.email || ""}
                      className="rounded border border-line bg-cream/35 px-3 py-1.5 text-xs text-taupe outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-taupe uppercase">Inquiry Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bulk order pricing query, shipment issue"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-taupe uppercase">Message Details *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type details of your request here..."
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className="rounded border border-line bg-ivory px-3 py-2 text-xs outline-none focus:border-zari resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="gold" size="sm" disabled={supportIsSubmitting}>
                    {supportIsSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5" /> Submit Inquiry
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Right Office Address card */}
              <div className="md:col-span-5 bg-white border border-line rounded-card p-6 shadow-soft space-y-4">
                <h3 className="font-semibold text-ink text-sm uppercase tracking-wider">Office Details</h3>
                
                <div className="space-y-3 text-xs text-taupe leading-relaxed">
                  <div className="flex gap-2">
                    <MapPin className="w-4 h-4 text-zari shrink-0 mt-0.5" />
                    <p>
                      <strong>JAI SRI RAM TEXTILES</strong><br/>
                      136/5, Sasti Nagar, Kallangattuvalasu,<br/>
                      Komarapalayam, Namakkal District,<br/>
                      Tamil Nadu - 638183
                    </p>
                  </div>
                  <div className="flex gap-2 border-t border-line/45 pt-3">
                    <Mail className="w-4 h-4 text-zari shrink-0 mt-0.5" />
                    <p>
                      <strong>Support Email:</strong><br/>
                      jaisriramtextiles@gmail.com
                    </p>
                  </div>
                  <div className="flex gap-2 border-t border-line/45 pt-3">
                    <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <p>
                      <strong>Customer Support hours:</strong><br/>
                      Monday to Saturday (9:00 AM — 6:00 PM IST)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Chat Panel (rendered when a ticket is loaded) */}
            {trackedQuery && (
              <div className="mt-6 animate-fade-in">
                <div className="border border-line rounded-card bg-[#FBF9F4]/40 overflow-hidden shadow-soft font-sans">
                  {/* Chat Header */}
                  <div className="bg-white border-b border-line px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zari-tint/15 flex items-center justify-center text-zari-deep">
                        <MessageSquare className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-base text-ink leading-tight">{trackedQuery.subject}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-taupe font-sans tracking-wide">Ticket ID: {shortenId(trackedQuery.id)}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(trackedQuery.id);
                              alert("Ticket ID copied to clipboard!");
                            }}
                            title="Copy full Ticket ID"
                            className="text-zari-deep hover:text-ink transition-colors cursor-pointer p-0.5 hover:bg-cream/40 rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        trackedQuery.status === "closed"
                          ? "bg-line text-taupe border border-line"
                          : trackedQuery.status === "replied"
                          ? "bg-success/15 text-success border border-success/35"
                          : "bg-zari/15 text-zari-deep border border-zari/45"
                      }`}>
                        {trackedQuery.status}
                      </span>
                      <button
                        onClick={() => setTrackedQuery(null)}
                        className="p-1.5 text-taupe hover:text-ink hover:bg-ivory/80 rounded transition-colors cursor-pointer flex items-center justify-center"
                        title="Close Chat"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Chat Messages Body */}
                  <div className="p-5 space-y-6 max-h-[400px] overflow-y-auto bg-ivory/20">
                       {/* User's Original Message (Right align) */}
                    <div className="flex flex-col items-end space-y-1 w-full animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-taupe uppercase tracking-wide">You</span>
                        <div className="w-5 h-5 rounded-full bg-ink/10 text-[9px] font-bold text-ink flex items-center justify-center font-sans">U</div>
                      </div>
                      <div className="max-w-[80%] sm:max-w-[65%] bg-ink text-ivory rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm text-[13px] whitespace-pre-wrap leading-relaxed tracking-wide font-sans">
                        {trackedQuery.message}
                      </div>
                      <span className="text-[9px] text-taupe/80 pr-1 block">
                        {new Date(trackedQuery.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>

                    {/* Replies conversation list thread */}
                    {trackedQuery.replies && trackedQuery.replies.length > 0 ? (
                      trackedQuery.replies.map((reply: any) => {
                        const isUser = reply.sender_type === "user";
                        return (
                          <div key={reply.id} className={`flex flex-col space-y-1 w-full ${isUser ? "items-end" : "items-start"} animate-fade-in`}>
                            <div className="flex items-center gap-2">
                              {!isUser && <div className="w-5 h-5 rounded-full bg-zari/15 text-[9px] font-bold text-zari-deep flex items-center justify-center font-sans">SR</div>}
                              <span className={`text-[10px] font-bold tracking-wide uppercase ${isUser ? "text-taupe" : "text-zari-deep"}`}>
                                {isUser ? "You" : "Support Desk"}
                              </span>
                              {isUser && <div className="w-5 h-5 rounded-full bg-ink/10 text-[9px] font-bold text-ink flex items-center justify-center font-sans">U</div>}
                            </div>
                            <div className={`max-w-[80%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm text-[13px] whitespace-pre-wrap leading-relaxed tracking-wide font-sans ${
                              isUser
                                ? "bg-ink text-ivory rounded-tr-none"
                                : "bg-white border border-zari/35 text-ink rounded-tl-none font-medium"
                            }`}>
                              {reply.message}
                            </div>
                            <span className="text-[9px] text-taupe/80 px-1 block">
                              {new Date(reply.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      /* Backwards compatibility for single reply layout */
                      trackedQuery.reply_message && (
                        <div className="flex flex-col items-start space-y-1 w-full animate-fade-in font-sans">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-zari/15 text-[9px] font-bold text-zari-deep flex items-center justify-center font-sans">SR</div>
                            <span className="text-[10px] font-bold text-zari-deep uppercase tracking-wide">Support Desk</span>
                          </div>
                          <div className="max-w-[80%] sm:max-w-[65%] bg-white border border-zari/35 text-ink rounded-2xl rounded-tl-none px-4 py-2.5 shadow-xs text-[13px] whitespace-pre-wrap leading-relaxed tracking-wide font-medium">
                            {trackedQuery.reply_message}
                          </div>
                          {trackedQuery.replied_at && (
                            <span className="text-[9px] text-taupe/80 pl-1 block">
                              {new Date(trackedQuery.replied_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          )}
                        </div>
                      )
                    )}

                    {/* Live status indicator if no reply exists yet */}
                    {(!trackedQuery.replies || trackedQuery.replies.length === 0) && !trackedQuery.reply_message && trackedQuery.status !== "closed" && (
                      <div className="flex flex-col items-start space-y-1 w-full animate-pulse font-sans">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-taupe/10 text-[9px] font-bold text-taupe flex items-center justify-center animate-bounce font-sans">...</div>
                          <span className="text-[10px] font-bold text-taupe uppercase tracking-wide">Support Desk</span>
                        </div>
                        <div className="max-w-[80%] sm:max-w-[65%] bg-white/80 border border-line border-dashed rounded-2xl rounded-tl-none px-4 py-3.5 text-[12px] text-taupe italic leading-relaxed">
                          <p>Our support team is reviewing your message. We will reply within 24 hours.</p>
                          <div className="flex items-center gap-1 mt-2">
                            <span className="w-1.5 h-1.5 bg-zari rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                            <span className="w-1.5 h-1.5 bg-zari rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                            <span className="w-1.5 h-1.5 bg-zari rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ticket Closed System Announcement Banner */}
                    {trackedQuery.status === "closed" && (
                      <div className="text-center py-2 animate-fade-in">
                        <span className="inline-block bg-line/30 border border-line text-taupe text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                          🔒 Ticket Closed by Admin
                        </span>
                      </div>
                    )}
                    {/* Auto-scroll anchor */}
                    <div ref={userChatEndRef} />
                  </div>

                  {/* Customer Reply Input Form Footer */}
                  {trackedQuery.status !== "closed" && (
                    <div className="border-t border-line p-4 bg-ivory/15">
                      <form onSubmit={handleSendUserReply} className="flex gap-2 items-end">
                        <textarea
                          rows={2}
                          value={userReplyText}
                          onChange={(e) => setUserReplyText(e.target.value)}
                          placeholder="Type your reply to the support desk..."
                          className="flex-1 rounded-card border border-line bg-white px-4 py-3 text-xs outline-none focus:border-zari focus:ring-1 focus:ring-zari/30 resize-none text-ink placeholder-taupe/60 shadow-inner font-sans tracking-wide"
                        />
                        <button
                          type="submit"
                          disabled={submittingUserReply || !userReplyText.trim()}
                          className="bg-zari hover:bg-zari-deep text-ink font-bold px-5 py-3 rounded-card text-xs transition-all flex items-center justify-center gap-1.5 shadow-soft hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{submittingUserReply ? "Sending..." : "Send"}</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent inquiries history list */}
            {supportHistory.length > 0 && (
              <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-4 mt-6 animate-fade-in">
                <div className="border-b border-line pb-3">
                  <h3 className="font-display text-base text-ink">Your Support History</h3>
                  <p className="text-[10px] text-taupe mt-0.5">Click any query below to load its full tracking details and admin response.</p>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 font-sans">
                  {supportHistory.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setTrackQueryId(h.id);
                        fetchTrackedQuery(h.id);
                      }}
                      className="w-full text-left bg-white hover:bg-cream/20 border border-line hover:border-zari/45 rounded-card p-4 transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer shadow-xs hover:shadow-soft group"
                    >
                      <div className="space-y-1">
                        <span className="inline-block bg-ivory border border-line px-2 py-0.5 rounded text-[9px] text-taupe font-medium">
                          #{shortenId(h.id)}
                        </span>
                        <p className="text-[13px] font-display font-semibold text-ink group-hover:text-zari-deep transition-colors leading-tight mt-1">
                          {h.subject}
                        </p>
                        <p className="text-[10px] text-taupe/90">
                          Submitted: {new Date(h.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          h.status === "closed"
                            ? "bg-line text-taupe border border-line"
                            : h.status === "replied"
                            ? "bg-success/15 text-success border border-success/35"
                            : "bg-zari/15 text-zari-deep border border-zari/45"
                        }`}>
                          {h.status || "new"}
                        </span>
                        <span className="text-xs font-bold text-zari-deep hover:text-ink transition-colors flex items-center gap-1 group-hover:translate-x-0.5 transition-transform duration-200">
                          Track →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: EDIT ACCOUNT DETAILS */}
        {activeTab === "profile" && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-xl text-ink">Account & Personal Details</h2>
            
            <div className="bg-white border border-line rounded-card p-6 shadow-soft max-w-xl">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-taupe uppercase">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari font-sans"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-taupe uppercase">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +919876543210"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="rounded border border-line bg-ivory px-3 py-1.5 text-xs outline-none focus:border-zari font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-taupe uppercase">Email Address (Read-Only)</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="rounded border border-line bg-cream/35 px-3 py-1.5 text-xs text-taupe outline-none font-mono"
                  />
                  <p className="text-[10px] text-taupe font-sans">Sign-in credentials and order receipts are tied to this email address.</p>
                </div>

                {profileError && <p className="text-xs text-danger font-semibold font-sans">{profileError}</p>}
                
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="gold"
                    size="sm"
                    disabled={profileSubmitting || (profileName === savedProfileName && profilePhone === savedProfilePhone)}
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
            <div className="relative w-full max-w-lg rounded-card border border-line bg-white p-6 shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
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
      </Container>
    </div>
  );
}
