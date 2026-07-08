"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/providers/cart-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { formatINR } from "@/lib/utils";
import { computeShipping } from "@/lib/constants";
import { ShieldCheck, MapPin, Tag, Wallet, AlertTriangle, RefreshCw, CreditCard, ChevronLeft } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart, cartSubtotalPaise } = useCart();
  const supabase = createClient();

  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Address form states
  const [recipient, setRecipient] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [district, setDistrict] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("custom");

  // Edit Address Modal States
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [editRecipient, setEditRecipient] = useState("");
  const [editLine1, setEditLine1] = useState("");
  const [editLine2, setEditLine2] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAlternatePhone, setEditAlternatePhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Wallet states
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  // Checkout process states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // 1. Authenticate user and fetch address/wallet lists
  useEffect(() => {
    async function loadCheckoutData() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.replace("/sign-in?next=/checkout");
          return;
        }
        setUser(authUser);

        // Populate name & email from auth metadata by default
        setRecipient(authUser.user_metadata?.full_name || authUser.user_metadata?.name || "");

        // Fetch user's saved addresses
        const { data: addresses } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", authUser.id)
          .order("is_default", { ascending: false });
        
        if (addresses && addresses.length > 0) {
          setSavedAddresses(addresses);
          // Set fields to the default address if it exists
          const defaultAddr = addresses[0];
          setSelectedAddressId(defaultAddr.id);
          applySavedAddress(defaultAddr);
        }

        // Fetch wallet balance dynamically based on unexpired transactions
        const { data: txns } = await supabase
          .from("wallet_transactions")
          .select("amount_paise, type, expires_at")
          .eq("user_id", authUser.id);

        let calculatedBalance = 0;
        if (txns) {
          const nowTime = new Date();
          txns.forEach((t) => {
            if (t.type === "cashback_credit") {
              const exp = t.expires_at ? new Date(t.expires_at) : null;
              if (!exp || exp > nowTime) {
                calculatedBalance += t.amount_paise;
              }
            } else {
              calculatedBalance += t.amount_paise;
            }
          });
        }
        setWalletBalance(Math.max(0, calculatedBalance));
      } catch (err) {
        console.error("Checkout initialization failed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCheckoutData();
  }, []);

  // Redirect to shop if cart is empty (run only after auth completes)
  useEffect(() => {
    if (!loading && cart.length === 0) {
      router.replace("/shop");
    }
  }, [cart, loading]);

  function applySavedAddress(addr: any) {
    setRecipient(addr.recipient || "");
    setLine1(addr.line1 || "");
    setLine2(addr.line2 || "");
    setCity(addr.city || "");
    setState(addr.state || "");
    setPincode(addr.pincode || "");
    setDistrict(addr.district || "");
    setPhone(addr.phone || "");
    setAlternatePhone(addr.alternate_phone || "");
  }

  function handleAddressSelection(id: string) {
    setSelectedAddressId(id);
    if (id === "custom") {
      setRecipient(user?.user_metadata?.full_name || "");
      setLine1("");
      setLine2("");
      setCity("");
      setState("");
      setPincode("");
      setDistrict("");
      setPhone("");
      setAlternatePhone("");
    } else {
      const match = savedAddresses.find((a) => a.id === id);
      if (match) applySavedAddress(match);
    }
  }

  function startEditAddress(addr: any) {
    setEditingAddress(addr);
    setEditRecipient(addr.recipient || "");
    setEditLine1(addr.line1 || "");
    setEditLine2(addr.line2 || "");
    setEditCity(addr.city || "");
    setEditState(addr.state || "");
    setEditDistrict(addr.district || "");
    setEditPincode(addr.pincode || "");
    setEditPhone(addr.phone || "");
    setEditAlternatePhone(addr.alternate_phone || "");
  }

  async function handleSaveEditedAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAddress) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("addresses")
        .update({
          recipient: editRecipient.trim(),
          line1: editLine1.trim(),
          line2: editLine2.trim() || null,
          city: editCity.trim(),
          state: editState.trim(),
          district: editDistrict.trim(),
          pincode: editPincode.trim(),
          phone: editPhone.trim(),
          alternate_phone: editAlternatePhone.trim() || null,
        })
        .eq("id", editingAddress.id);

      if (error) throw error;

      // Update local state list
      setSavedAddresses(prev => prev.map(a => a.id === editingAddress.id ? {
        ...a,
        recipient: editRecipient.trim(),
        line1: editLine1.trim(),
        line2: editLine2.trim() || null,
        city: editCity.trim(),
        state: editState.trim(),
        district: editDistrict.trim(),
        pincode: editPincode.trim(),
        phone: editPhone.trim(),
        alternate_phone: editAlternatePhone.trim() || null,
      } : a));

      // If this address is currently selected, re-apply it to update checkout fields
      if (selectedAddressId === editingAddress.id) {
        applySavedAddress({
          recipient: editRecipient.trim(),
          line1: editLine1.trim(),
          line2: editLine2.trim() || null,
          city: editCity.trim(),
          state: editState.trim(),
          district: editDistrict.trim(),
          pincode: editPincode.trim(),
          phone: editPhone.trim(),
          alternate_phone: editAlternatePhone.trim() || null,
        });
      }

      setEditingAddress(null);
    } catch (err: any) {
      alert("Error updating address: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  // 2. Validate and apply coupon code
  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponError("");
    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error || !coupon) {
        setCouponError("Invalid or inactive coupon code");
        setAppliedCoupon(null);
        return;
      }

      // Validate dates
      const now = new Date();
      if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        setCouponError("Coupon campaign has not started yet");
        setAppliedCoupon(null);
        return;
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        setCouponError("Coupon code has expired");
        setAppliedCoupon(null);
        return;
      }

      // Check min order
      if (cartSubtotalPaise < coupon.min_order_paise) {
        setCouponError(`Min order requirement for this coupon is ${formatINR(coupon.min_order_paise, true)}`);
        setAppliedCoupon(null);
        return;
      }

      // Check usage limits
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        setCouponError("Coupon usage limit reached");
        setAppliedCoupon(null);
        return;
      }

      // Check first order constraint
      if (coupon.first_order_only) {
        const { count: pastOrders } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (pastOrders && pastOrders > 0) {
          setCouponError("This code is only applicable for new users");
          setAppliedCoupon(null);
          return;
        }
      }

      // Valid coupon!
      setAppliedCoupon(coupon);
      setCouponError("");
    } catch (err: any) {
      setCouponError("Error checking coupon: " + err.message);
    } finally {
      setCheckingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  }

  // 3. Compute final pricing summaries
  let discountPaise = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "flat") {
      discountPaise = Math.min(appliedCoupon.value, cartSubtotalPaise);
    } else {
      let calc = Math.round((cartSubtotalPaise * appliedCoupon.value) / 100);
      if (appliedCoupon.max_discount_paise) {
        calc = Math.min(calc, appliedCoupon.max_discount_paise);
      }
      discountPaise = Math.min(calc, cartSubtotalPaise);
    }
  }

  // Capped at 20% of subtotal order value as per store rules
  const walletCap = Math.floor(cartSubtotalPaise / 5);
  const maxRedeemableWallet = Math.min(walletBalance, walletCap);
  const walletUsedPaise = useWallet ? Math.min(maxRedeemableWallet, cartSubtotalPaise - discountPaise) : 0;

  const { shippingPaise } = computeShipping(cartSubtotalPaise);
  const grandTotalPaise = cartSubtotalPaise - discountPaise - walletUsedPaise + shippingPaise;

  // 4. Place order
  async function handlePlaceOrder() {
    if (!recipient.trim() || !line1.trim() || !city.trim() || !state.trim() || !pincode.trim() || !district.trim() || !phone.trim()) {
      setCheckoutError("Please fill out all required shipping address & mobile number fields");
      return;
    }

    setIsSubmitting(true);
    setCheckoutError("");

    const addressPayload = { 
      recipient, 
      line1, 
      line2, 
      city, 
      state, 
      pincode, 
      district: district.trim(), 
      phone: phone.trim(), 
      alternate_phone: alternatePhone.trim() || null 
    };

    // Dynamically load Razorpay options
    const rzpKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    // Check if we should use Razorpay or fallback to Test Mode
    if (!rzpKeyId) {
      // Complete checkout directly using Sandbox Mock Checkout
      try {
        const res = await fetch("/api/checkout/place-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart,
            shippingAddress: addressPayload,
            couponCode: appliedCoupon?.code || null,
            useWallet: walletUsedPaise > 0,
            isRazorpay: false,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Order placement failed");

        clearCart();
        router.push(`/checkout/success?order_number=${data.orderNumber}`);
      } catch (err: any) {
        setCheckoutError(err.message || "Failed to process test checkout");
        setIsSubmitting(false);
      }
      return;
    }

    // Razorpay Integration
    try {
      // Load Razorpay script dynamically
      const loadScript = () => {
        return new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const resScript = await loadScript();
      if (!resScript) {
        throw new Error("Razorpay SDK failed to load. Are you connected to the internet?");
      }

      // Initialize Razorpay Checkout
      const options = {
        key: rzpKeyId,
        amount: grandTotalPaise,
        currency: "INR",
        name: "JAI SRI RAM TEXTILES",
        description: "Handloom Weavers Storefront Payment",
        image: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/v1/store/logo.png",
        handler: async function (response: any) {
          // Payment succeeded, complete the transaction in database!
          try {
            const apiRes = await fetch("/api/checkout/place-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cart,
                shippingAddress: addressPayload,
                couponCode: appliedCoupon?.code || null,
                useWallet: walletUsedPaise > 0,
                isRazorpay: true,
                razorpayPaymentId: response.razorpay_payment_id,
              }),
            });

            const apiData = await apiRes.json();
            if (!apiRes.ok) throw new Error(apiData.error || "Order post-processing failed");

            clearCart();
            router.push(`/checkout/success?order_number=${apiData.orderNumber}`);
          } catch (apiErr: any) {
            setCheckoutError("Payment recorded, but database update failed: " + apiErr.message);
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: recipient,
          email: user?.email || "",
        },
        theme: {
          color: "#B08D4C", // luxury gold theme
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setCheckoutError(err.message || "Failed to initialize Razorpay checkout");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-ivory">
        <RefreshCw className="animate-spin text-zari w-10 h-10 mb-3" />
        <p className="font-display text-lg text-ink">Preparing Checkout...</p>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16 bg-ivory min-h-[85vh]">
      <Container className="max-w-[1000px]">
        {/* Back Button */}
        <Link
          href="/cart"
          className="flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink mb-6 transition-colors inline-flex cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to Bag
        </Link>
        <h1 className="font-display text-3xl text-ink mb-8">Secure Checkout</h1>

        {checkoutError && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 text-danger rounded-card flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-semibold">{checkoutError}</p>
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-12 items-start">
          {/* Left: Form sections */}
          <div className="lg:col-span-7 space-y-6">
            {/* Address Selection */}
            {savedAddresses.length > 0 && (
              <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-4">
                <h3 className="font-semibold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-zari" /> Delivery Location
                </h3>
                <div className="grid gap-3">
                  {savedAddresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`border rounded-md p-3.5 flex gap-3 items-start cursor-pointer transition-all duration-200 justify-between ${
                        selectedAddressId === addr.id
                          ? "border-zari bg-zari-tint/20"
                          : "border-line bg-cream/10 hover:bg-cream/30"
                      }`}
                    >
                      <div className="flex gap-3 items-start flex-1">
                        <input
                          type="radio"
                          name="delivery_address"
                          checked={selectedAddressId === addr.id}
                          onChange={() => handleAddressSelection(addr.id)}
                          className="mt-1 accent-zari"
                        />
                        <div className="text-xs text-taupe space-y-0.5">
                          <strong className="text-sm font-bold text-ink">{addr.recipient}</strong>
                          <p>{addr.line1}</p>
                          {addr.line2 && <p>{addr.line2}</p>}
                          <p>
                            {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startEditAddress(addr);
                        }}
                        className="text-xs text-zari hover:underline font-semibold focus:outline-none cursor-pointer self-center"
                      >
                        Edit
                      </button>
                    </label>
                  ))}
                  <label
                    className={`border rounded-md p-3.5 flex gap-3 items-center cursor-pointer transition-all duration-200 ${
                      selectedAddressId === "custom"
                        ? "border-zari bg-zari-tint/20"
                        : "border-line bg-cream/10 hover:bg-cream/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery_address"
                      checked={selectedAddressId === "custom"}
                      onChange={() => handleAddressSelection("custom")}
                      className="accent-zari"
                    />
                    <span className="text-sm font-bold text-ink">Deliver to a different address</span>
                  </label>
                </div>
              </div>
            )}

            {/* Address Inputs Form — only shown when entering a new address, not when
                a saved address is selected above (avoids showing the same address twice,
                once nicely formatted and once as a redundant disabled/greyed-out form). */}
            {selectedAddressId === "custom" && (
            <div className="bg-white border border-line rounded-card p-5 sm:p-6 shadow-soft space-y-4">
              <h3 className="font-semibold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-zari" /> Shipping Details
              </h3>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-taupe uppercase">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name of recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-taupe uppercase">Street Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="House/Flat No, Street details"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className="rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-taupe uppercase">Area / Landmark</label>
                  <input
                    type="text"
                    placeholder="Apartment name, area, landmark (optional)"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    className="rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-taupe uppercase">City *</label>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-taupe uppercase">District *</label>
                    <input
                      type="text"
                      required
                      placeholder="District"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-taupe uppercase">State *</label>
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-taupe uppercase">Pincode *</label>
                    <input
                      type="text"
                      required
                      placeholder="6-digit ZIP code"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-taupe uppercase">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-taupe uppercase">Alternate Mobile</label>
                    <input
                      type="tel"
                      placeholder="Alternate number"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      className="rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                    />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Coupons Card */}
            <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-4">
              <h3 className="font-semibold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-zari" /> Promotional Coupons
              </h3>

              {appliedCoupon ? (
                <div className="flex justify-between items-center p-3 bg-success/5 border border-success/20 rounded-md">
                  <div>
                    <span className="font-bold text-success text-xs font-mono bg-success/15 px-2 py-0.5 rounded mr-2 uppercase">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-xs text-taupe">
                      {appliedCoupon.type === "flat"
                        ? `${formatINR(appliedCoupon.value, true)} discount applied`
                        : `${appliedCoupon.value}% discount applied`}
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs text-muted hover:text-danger font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon code (e.g. WELCOME10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 rounded border border-line bg-ivory/50 px-3 py-2 text-sm text-ink outline-none uppercase focus:border-zari"
                  />
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={handleApplyCoupon}
                    disabled={checkingCoupon || !couponCode.trim()}
                  >
                    {checkingCoupon ? "Checking..." : "Apply"}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-xs text-danger font-semibold">{couponError}</p>}
            </div>

            {/* Wallet Cashbacks */}
            {walletBalance > 0 && (
              <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-3">
                <h3 className="font-semibold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-zari" /> Cashback Wallet
                </h3>
                <div className="flex justify-between items-start gap-4">
                  <div className="text-xs text-taupe space-y-0.5">
                    <p>
                      Your wallet balance: <strong className="text-ink">{formatINR(walletBalance, true)}</strong>
                    </p>
                    <p className="text-[10px] text-muted leading-relaxed">
                      Toggle to apply credit. Redemptions are capped at 20% of the subtotal ({formatINR(walletCap, true)}).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-cream peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zari" />
                  </label>
                </div>
                {useWallet && (
                  <p className="text-xs text-success font-semibold">
                    Deducting {formatINR(walletUsedPaise, true)} credit from your wallet
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Summary panel */}
          <div className="lg:col-span-5 bg-white border border-line rounded-card p-6 shadow-soft space-y-6">
            <h3 className="font-display text-xl border-b border-line pb-2">Checkout Summary</h3>

            {/* Items review */}
            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-2 divide-y divide-line/35">
              {cart.map((item) => (
                <div key={item.id + (item.variant?.sku || "")} className="flex justify-between items-start gap-3 text-xs pt-3 first:pt-0">
                  <div className="flex gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 border border-line rounded bg-cream flex-shrink-0 relative overflow-hidden">
                      <img src={item.image} alt="" className="object-cover w-full h-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink line-clamp-2 hover:underline">
                        <Link href={`/product/${item.slug}`}>{item.name}</Link>
                      </p>
                      <p className="text-taupe mt-0.5 text-[10px]">
                        {item.variant ? `${item.variant.size || ""} ${item.variant.color || ""}`.trim() : "Standard"} &times; {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-ink flex-shrink-0 whitespace-nowrap pl-2">{formatINR(item.pricePaise * item.quantity, true)}</span>
                </div>
              ))}
            </div>

            {/* Price list */}
            <div className="space-y-3.5 text-xs text-taupe border-t border-line pt-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-ink font-semibold">{formatINR(cartSubtotalPaise, true)}</span>
              </div>
              
              {discountPaise > 0 && (
                <div className="flex justify-between text-success font-semibold">
                  <span>Coupon Discount ({appliedCoupon?.code}):</span>
                  <span>-{formatINR(discountPaise, true)}</span>
                </div>
              )}

              {walletUsedPaise > 0 && (
                <div className="flex justify-between text-success font-semibold">
                  <span>Wallet Balance Used:</span>
                  <span>-{formatINR(walletUsedPaise, true)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping Charge:</span>
                <span className="text-ink font-semibold">
                  {shippingPaise === 0 ? "FREE" : formatINR(shippingPaise, true)}
                </span>
              </div>

              <div className="flex justify-between font-display text-lg text-ink font-bold border-t border-line pt-3">
                <span>Grand Total:</span>
                <span className="text-zari-deep">{formatINR(grandTotalPaise, true)}</span>
              </div>
            </div>

            {/* Action Checkout Button */}
            <div className="space-y-3 pt-2">
              <Button
                variant="gold"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="w-full justify-center text-sm"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="animate-spin w-4 h-4 mr-2" /> Processing Order...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? "Pay & Place Order" : "Place Order (Sandbox Mode)"}
                  </>
                )}
              </Button>
              <div className="flex items-center justify-center gap-2 text-[10px] text-muted">
                <ShieldCheck size={14} className="text-success" />
                Payments are securely encrypted.
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Edit Address Modal Overlay */}
      {editingAddress && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-line rounded-card shadow-soft overflow-hidden font-sans">
            <div className="border-b border-line p-4 bg-cream/5 flex justify-between items-center">
              <h3 className="font-display font-semibold text-base text-ink flex items-center gap-2">
                <MapPin className="w-4 h-4 text-zari" /> Edit Delivery Address
              </h3>
              <button 
                onClick={() => setEditingAddress(null)} 
                className="text-taupe hover:text-ink text-xs focus:outline-none cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveEditedAddress} className="p-4 space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-taupe uppercase">Recipient Name *</label>
                <input 
                  type="text" 
                  required 
                  value={editRecipient} 
                  onChange={(e) => setEditRecipient(e.target.value)}
                  className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-taupe uppercase">Street Address *</label>
                <input 
                  type="text" 
                  required 
                  value={editLine1} 
                  onChange={(e) => setEditLine1(e.target.value)}
                  className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-taupe uppercase">Area / Landmark</label>
                <input 
                  type="text" 
                  value={editLine2} 
                  onChange={(e) => setEditLine2(e.target.value)}
                  className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-taupe uppercase">City *</label>
                  <input 
                    type="text" 
                    required 
                    value={editCity} 
                    onChange={(e) => setEditCity(e.target.value)}
                    className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-taupe uppercase">District *</label>
                  <input 
                    type="text" 
                    required 
                    value={editDistrict} 
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-taupe uppercase">State *</label>
                  <input 
                    type="text" 
                    required 
                    value={editState} 
                    onChange={(e) => setEditState(e.target.value)}
                    className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-taupe uppercase">Pincode *</label>
                  <input 
                    type="text" 
                    required 
                    value={editPincode} 
                    onChange={(e) => setEditPincode(e.target.value)}
                    className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-taupe uppercase">Mobile Number *</label>
                  <input 
                    type="tel" 
                    required 
                    value={editPhone} 
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-taupe uppercase">Alternate Mobile</label>
                  <input 
                    type="tel" 
                    value={editAlternatePhone} 
                    onChange={(e) => setEditAlternatePhone(e.target.value)}
                    className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-zari"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-line mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingAddress(null)}
                  className="flex-1 cursor-pointer justify-center"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="gold" 
                  size="sm" 
                  disabled={savingEdit}
                  className="flex-1 cursor-pointer justify-center"
                >
                  {savingEdit ? "Saving..." : "Save Address"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
