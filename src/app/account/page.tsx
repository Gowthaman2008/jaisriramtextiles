"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { useCart } from "@/components/providers/cart-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/home/product-card";
import { formatINR } from "@/lib/utils";
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
  Copy
} from "lucide-react";

export default function AccountPage() {
  const supabase = createClient();
  const { wishlist } = useWishlist();

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

        // Fetch user profile and check for admin/staff authorization role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authUser.id)
          .single();

        const isUserAdmin = profile && ["admin", "staff"].includes(profile.role);
        setIsAdmin(!!isUserAdmin);

        await fetchAccountData(authUser.id);
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
      // 1. Fetch Orders & items
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", userId)
        .order("placed_at", { ascending: false });
      setOrders(ordersData || []);

      // 2. Fetch Wallet Transactions & Compute balance dynamically
      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      const history = txns || [];
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

      // 4. Fetch Addresses
      const { data: addrs } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false });
      setAddresses(addrs || []);
    } catch (err) {
      console.error("Fetch account data failed:", err);
    } finally {
      setRefreshing(false);
    }
  }

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
      alert("Message sent! Support will reach you via email shortly.");
    } catch (err: any) {
      setSupportStatus(err.message || "Failed to submit message");
    } finally {
      setSupportIsSubmitting(false);
    }
  }

  // Print Invoice Popup (same style as admin)
  function handlePrintInvoice(order: any) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsRows = order.order_items.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC; text-align: center;">${item.variant || "—"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC; text-align: right;">Rs. ${item.unit_price_paise / 100}</td>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC; text-align: right; font-weight: bold;">Rs. ${(item.unit_price_paise * item.quantity) / 100}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${order.order_number}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, sans-serif; color: #2A2622; margin: 0; padding: 40px; line-height: 1.5; background-color: #ffffff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #B08D4C; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #2A2622; letter-spacing: 1px; }
            .brand-subtitle { font-size: 11px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
            .invoice-details { text-align: right; }
            .invoice-details h2 { font-family: Georgia, serif; color: #B08D4C; margin: 0 0 10px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .bill-box { padding: 15px; border: 1px solid #E5DFD2; border-radius: 8px; background-color: #FBF9F4; }
            .bill-box h3 { margin-top: 0; color: #2A2622; border-bottom: 1px solid #E5DFD2; padding-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #2A2622; color: #FBF9F4; padding: 12px; text-align: left; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
            .totals { width: 320px; margin-left: auto; border: 1px solid #E5DFD2; border-radius: 8px; padding: 15px; background-color: #FBF9F4; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
            .totals-row.grand { font-size: 18px; font-weight: bold; color: #B08D4C; border-top: 1px solid #B08D4C; padding-top: 10px; margin-top: 6px; }
            .footer-note { text-align: center; font-size: 12px; color: #9A9084; margin-top: 60px; border-top: 1px solid #E5DFD2; padding-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">JAI SRI RAM TEXTILES</div>
              <div class="brand-subtitle">Premium Handloom Weavers</div>
              <div style="font-size: 12px; color: #6E655A; margin-top: 8px;">
                136/5, Kallangattuvalasu, Komarapalayam,<br/>
                Namakkal, Tamil Nadu - 638183
              </div>
            </div>
            <div class="invoice-details">
              <h2>INVOICE</h2>
              <div>Order No: <strong>${order.order_number}</strong></div>
              <div>Date: ${new Date(order.placed_at).toLocaleDateString("en-IN", { dateStyle: "long" })}</div>
            </div>
          </div>
          <div class="grid">
            <div class="bill-box">
              <h3>Billed / Shipped To</h3>
              <strong>${order.shipping_address.recipient}</strong><br/>
              ${order.shipping_address.line1}<br/>
              ${order.shipping_address.line2 ? order.shipping_address.line2 + "<br/>" : ""}
              ${order.shipping_address.city}, ${order.shipping_address.district ? order.shipping_address.district + ", " : ""}${order.shipping_address.state} - <strong>${order.shipping_address.pincode}</strong><br/>
              ${order.shipping_address.phone ? `Mobile: <strong>${order.shipping_address.phone}</strong>${order.shipping_address.alternate_phone ? " / " + order.shipping_address.alternate_phone : ""}<br/>` : ""}
            </div>
            <div class="bill-box">
              <h3>Payment & Order Details</h3>
              Payment Method: <strong>Prepaid (Razorpay)</strong><br/>
              Transaction ID: ${order.razorpay_payment_id || "PREPAID"}<br/>
              Razorpay Order ID: ${order.razorpay_order_id || "—"}<br/>
              Placed Time: ${new Date(order.placed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}<br/>
              Support: <strong>jaisriramtextiles@gmail.com</strong>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 45%;">Product Details</th>
                <th style="width: 15%; text-align: center;">Variant</th>
                <th style="width: 15%; text-align: right;">Unit Price</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 15%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>Rs. ${order.subtotal_paise / 100}</span>
            </div>
            ${order.discount_paise > 0 ? `<div class="totals-row" style="color: #A24B3E;">
              <span>Discount:</span>
              <span>-Rs. ${order.discount_paise / 100}</span>
            </div>` : ""}
            ${order.wallet_used_paise > 0 ? `<div class="totals-row" style="color: #A24B3E;">
              <span>Wallet Debit:</span>
              <span>-Rs. ${order.wallet_used_paise / 100}</span>
            </div>` : ""}
            <div class="totals-row">
              <span>Shipping Charge:</span>
              <span>${order.shipping_paise === 0 ? "FREE" : `Rs. ${order.shipping_paise / 100}`}</span>
            </div>
            <div class="totals-row grand">
              <span>Total Paid:</span>
              <span>Rs. ${order.total_paise / 100}</span>
            </div>
          </div>
          <div class="footer-note">
            Thank you for shopping with JAI SRI RAM TEXTILES!<br/>
            Computer-generated receipt.
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

        {/* Navigation Breadcrumb back to overview */}
        {activeTab !== "overview" && (
          <button
            onClick={() => setActiveTab("overview")}
            className="flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink mb-6 transition-colors"
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

              {/* Card 2: Cashback Wallet */}
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

              {/* Card 3: Wishlist */}
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

              {/* Card 4: Addresses */}
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

              {/* Card 5: Contact Support */}
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
                          <div key={item.id} className="flex justify-between items-start text-xs border-b border-line/35 pb-2 last:border-0 last:pb-0">
                            <div>
                              <p className="font-bold text-ink">{item.name}</p>
                              {item.variant && <p className="text-[10px] text-taupe mt-0.5">{item.variant}</p>}
                              <p className="text-taupe mt-0.5">{formatINR(item.unit_price_paise, true)} &times; {item.quantity}</p>
                            </div>
                            <span className="font-semibold text-ink">{formatINR(item.unit_price_paise * item.quantity, true)}</span>
                          </div>
                        ))}

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
            <div className="flex justify-between items-center">
              <h2 className="font-display text-xl text-ink">Saved Delivery Addresses</h2>
              {!showAddressForm && (
                <Button size="sm" variant="gold" onClick={() => setShowAddressForm(true)}>
                  <Plus className="w-4 h-4" /> Add Address
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
                  <div key={addr.id} className="bg-white border border-line rounded-card p-5 relative shadow-soft group">
                    <div className="flex justify-between items-start border-b border-line pb-2 mb-2">
                      <span className="bg-zari/15 text-zari-deep px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                        {addr.label}
                      </span>
                      {addr.is_default && (
                        <span className="text-[9px] font-semibold text-success uppercase">Default</span>
                      )}
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
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="absolute top-4 right-4 text-muted hover:text-danger p-1 hover:bg-danger/5 rounded"
                      title="Delete address"
                    >
                      <Trash2 size={14} />
                    </button>
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
                      136/5, Kallangattuvalasu, Komarapalayam,<br/>
                      Namakkal District, Tamil Nadu - 638183
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
          </div>
        )}
      </Container>
    </div>
  );
}
