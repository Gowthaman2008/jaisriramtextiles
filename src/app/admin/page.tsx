"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Users,
  Database,
  Activity,
  Wrench,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Download,
  Search,
  Eye,
  CheckCircle,
  Truck,
  Printer,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  FolderOpen,
  Image as ImageIcon,
  DollarSign,
  Mail,
  Briefcase,
  Bell,
  Ticket,
  Star,
  X
} from "lucide-react";

// Helper for formatting money — always whole rupees (no paise adjustments)
function formatRupees(paise: number) {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(rupees);
}

const DEFAULT_ANNOUNCEMENTS = [
  "Free shipping on orders above ₹699",
  "Earn cashback on every order — credited after delivery",
  "Bulk & wholesale enquiries welcome"
];

const DEFAULT_SLIDES = [
  {
    id: "default-1",
    eyebrow: "Since a generation of weavers",
    title: "The art of the woven thread",
    subtitle: "JAI SRI RAM TEXTILES crafts dhotis, towels, scarfs and jute bags on traditional looms in Komarapalayam, Tamil Nadu.",
    cta_label: "Our story",
    cta_href: "/about",
    image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/white-dhoti",
    sort_order: 1,
    is_active: true
  },
  {
    id: "default-2",
    eyebrow: "Premium manufacturing",
    title: "Woven with precision, finished by hand",
    subtitle: "Combed cotton, true zari borders and rigorous quality checks on every metre we make.",
    cta_label: "See our craft",
    cta_href: "/manufacturing",
    image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/gold-border-veshti",
    sort_order: 2,
    is_active: true
  },
  {
    id: "default-3",
    eyebrow: "Limited-time offers",
    title: "Festive savings on our finest",
    subtitle: "Selected dhotis and towels now on sale — while stocks last.",
    cta_label: "Shop the offers",
    cta_href: "/shop/sale",
    image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/colour-dhoti",
    sort_order: 3,
    is_active: true
  },
  {
    id: "default-4",
    eyebrow: "New arrivals",
    title: "Fresh off the loom",
    subtitle: "The latest additions to our collection, ready to ship across India.",
    cta_label: "Browse new arrivals",
    cta_href: "/shop?sort=newest",
    image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/scarfs",
    sort_order: 4,
    is_active: true
  },
  {
    id: "default-5",
    eyebrow: "Best sellers",
    title: "Loved across Tamil Nadu",
    subtitle: "The pieces our customers return for, again and again.",
    cta_label: "Shop best sellers",
    cta_href: "/shop?sort=popularity",
    image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/towels",
    sort_order: 5,
    is_active: true
  },
  {
    id: "default-6",
    eyebrow: "Festival collections",
    title: "Dressed for every celebration",
    subtitle: "Traditional whites and rich colour dhotis for temple days and festivities.",
    cta_label: "Explore collections",
    cta_href: "/shop/colour-dhoti",
    image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/white-dhoti",
    sort_order: 6,
    is_active: true
  },
  {
    id: "default-7",
    eyebrow: "Bulk & wholesale",
    title: "Supplying temples, hotels & retailers",
    subtitle: "Custom manufacturing and wholesale pricing for institutions and businesses.",
    cta_label: "Enquire about bulk orders",
    cta_href: "/bulk-orders",
    image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/jute-bags",
    sort_order: 7,
    is_active: true
  },
  {
    id: "default-8",
    eyebrow: "A gift for you",
    title: "10% off your first order",
    subtitle: "New here? Your welcome discount is waiting at checkout.",
    cta_label: "Start shopping",
    cta_href: "/shop",
    image_url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_2000/jai-sri-ram-textiles/placeholders/gold-border-veshti",
    sort_order: 8,
    is_active: true
  }
];

const DEFAULT_PRODUCTS = [
  {
    id: "default-p1",
    name: "Classic White Veshti — 2 Metre",
    slug: "classic-white-veshti-2m",
    price_paise: 74900,
    compare_at_paise: 99900,
    cashback_paise: 3000,
    stock: 50,
    is_on_sale: true,
    is_active: true,
    categories: { name: "White Dhoti" },
    product_images: [{ url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/white-dhoti" }],
    product_variants: []
  },
  {
    id: "default-p2",
    name: "Zari-Border Colour Dhoti",
    slug: "zari-border-colour-dhoti",
    price_paise: 129900,
    compare_at_paise: null,
    cashback_paise: 6000,
    stock: 35,
    is_on_sale: true,
    is_active: true,
    categories: { name: "Colour Dhoti" },
    product_images: [{ url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/colour-dhoti" }],
    product_variants: []
  },
  {
    id: "default-p3",
    name: "Handloom Bath Towel",
    slug: "handloom-bath-towel",
    price_paise: 49900,
    compare_at_paise: 64900,
    cashback_paise: 2000,
    stock: 120,
    is_on_sale: false,
    is_active: true,
    categories: { name: "Towels" },
    product_images: [{ url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/towels" }],
    product_variants: []
  },
  {
    id: "default-p4",
    name: "Cotton Everyday Scarf",
    slug: "cotton-everyday-scarf",
    price_paise: 39900,
    compare_at_paise: 54900,
    cashback_paise: 1500,
    stock: 80,
    is_on_sale: true,
    is_active: true,
    categories: { name: "Scarfs" },
    product_images: [{ url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/scarfs" }],
    product_variants: []
  },
  {
    id: "default-p5",
    name: "Reusable Jute Tote",
    slug: "reusable-jute-tote",
    price_paise: 29900,
    compare_at_paise: null,
    cashback_paise: 1000,
    stock: 150,
    is_on_sale: false,
    is_active: true,
    categories: { name: "Jute Bags" },
    product_images: [{ url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/jute-bags" }],
    product_variants: []
  },
  {
    id: "default-p6",
    name: "Premium Gold-Border Veshti",
    slug: "premium-gold-border-veshti",
    price_paise: 159900,
    compare_at_paise: 199900,
    cashback_paise: 8000,
    stock: 25,
    is_on_sale: true,
    is_active: true,
    categories: { name: "White Dhoti" },
    product_images: [{ url: "https://res.cloudinary.com/knpwtpigyevvluehowfq/image/upload/f_auto,q_auto,w_900/jai-sri-ram-textiles/placeholders/gold-border-veshti" }],
    product_variants: []
  }
];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Current logged in admin details
  const [currentUser, setCurrentUser] = useState<any>(null);

  // States for database collections
  const [analytics, setAnalytics] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  // Review moderation form fields
  const [editingReview, setEditingReview] = useState<any>(null);
  const [reviewFormRating, setReviewFormRating] = useState(5);
  const [reviewFormTitle, setReviewFormTitle] = useState("");
  const [reviewFormBody, setReviewFormBody] = useState("");
  const [reviewFormStatus, setReviewFormStatus] = useState("approved");
  const [reviewFormSubmitting, setReviewFormSubmitting] = useState(false);

  // Selection states for Modals/Inspectors
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // Delete-order confirmation modal state
  const [orderPendingDelete, setOrderPendingDelete] = useState<any>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deletingOrder, setDeletingOrder] = useState(false);

  // Emergency order-detail PDF lookup modal state
  const [emergencyLookupOpen, setEmergencyLookupOpen] = useState(false);
  const [emergencyLookupQuery, setEmergencyLookupQuery] = useState("");
  
  // Product Edit/Add State
  const [editingProduct, setEditingProduct] = useState<any>(null); // null means adding a new product, or closed
  const [showProductForm, setShowProductForm] = useState(false);
  
  // Product form fields
  const [prodName, setProdName] = useState("");
  const [prodSlug, setProdSlug] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodCatId, setProdCatId] = useState("");
  const [prodPrice, setProdPrice] = useState<number | "">(""); // in Rupees
  const [prodCompare, setProdCompare] = useState<number | "">(""); // in Rupees
  const [prodCashback, setProdCashback] = useState<number | "">(""); // in Rupees
  const [prodStock, setProdStock] = useState<number | "">("");
  const [prodIsActive, setProdIsActive] = useState(true);
  const [prodIsSale, setProdIsSale] = useState(false);
  const [prodShowSize, setProdShowSize] = useState(false);
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [prodVariants, setProdVariants] = useState<any[]>([]); // {size, color, sku, stock}

  // Variant helper states
  const [newVarSize, setNewVarSize] = useState("");
  const [newVarColor, setNewVarColor] = useState("");
  const [newVarSku, setNewVarSku] = useState("");
  const [newVarStock, setNewVarStock] = useState<number | "">("");

  // Image drag/reorder helper states
  const [draggedImgIndex, setDraggedImgIndex] = useState<number | null>(null);

  // Upload state
  const [uploadingImage, setUploadingImage] = useState(false);

  // Refund state variables
  const [selectedRefundOrder, setSelectedRefundOrder] = useState<any>(null);
  const [refundPaymentStatus, setRefundPaymentStatus] = useState("refunded");
  const [refundAmountRupees, setRefundAmountRupees] = useState("");
  const [refundTransactionId, setRefundTransactionId] = useState("");
  const [refundNoteText, setRefundNoteText] = useState("");
  const [refundScreenshotUrl, setRefundScreenshotUrl] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  // User Inspector state variables
  const [inspectUserId, setInspectUserId] = useState("");
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectedUser, setInspectedUser] = useState<any>(null);
  const [inspectError, setInspectError] = useState("");

  // Wallet Adjust state variables
  const [walletAdjustOpen, setWalletAdjustOpen] = useState(false);
  const [walletAdjustAmount, setWalletAdjustAmount] = useState("");
  const [walletAdjustType, setWalletAdjustType] = useState("add");
  const [walletAdjustNote, setWalletAdjustNote] = useState("");
  const [walletAdjustLoading, setWalletAdjustLoading] = useState(false);
  const [walletAdjustError, setWalletAdjustError] = useState("");

  // Order update states
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [commSubTab, setCommSubTab] = useState("support");
  const [orderStatus, setOrderStatus] = useState("");
  const [orderTrackingId, setOrderTrackingId] = useState("");
  const [orderTrackingUrl, setOrderTrackingUrl] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [orderRejectionReason, setOrderRejectionReason] = useState("");
  const [orderAddress, setOrderAddress] = useState<any>({});
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [bulkInquiries, setBulkInquiries] = useState<any[]>([]);
  const [newsletterSubs, setNewsletterSubs] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<"percent" | "flat">("percent");
  const [newCouponValue, setNewCouponValue] = useState(0);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState(0);
  const [newCouponMaxDiscount, setNewCouponMaxDiscount] = useState(0);
  const [newCouponFirstOrder, setNewCouponFirstOrder] = useState(false);
  const [newCouponLimit, setNewCouponLimit] = useState(0);
  const [newCouponExpiry, setNewCouponExpiry] = useState("");
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);

  // CMS configuration states
  const [cmsSlides, setCmsSlides] = useState<any[]>([]);
  const [cmsBanners, setCmsBanners] = useState<any[]>([]);
  
  // CMS Slider Form
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState<any>(null);
  const [slideEyebrow, setSlideEyebrow] = useState("");
  const [slideTitle, setSlideTitle] = useState("");
  const [slideSubtitle, setSlideSubtitle] = useState("");
  const [slideCtaLabel, setSlideCtaLabel] = useState("");
  const [slideCtaHref, setSlideCtaHref] = useState("");
  const [slideImageUrl, setSlideImageUrl] = useState("");
  const [slideSortOrder, setSlideSortOrder] = useState(0);
  const [slideIsActive, setSlideIsActive] = useState(true);
  const [uploadingSlideImage, setUploadingSlideImage] = useState(false);

  // CMS Announcement messages state
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [announcementList, setAnnouncementList] = useState<string[]>([]);
  const [announcementBannerId, setAnnouncementBannerId] = useState<string | null>(null);

  // General Search states
  const [productSearch, setProductSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function initAdmin() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = "/sign-in?next=/admin";
          return;
        }
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!profile || !["admin", "staff"].includes(profile.role)) {
          window.location.href = "/";
          return;
        }

        setCurrentUser(profile);
        await loadAllData();
      } catch (err: any) {
        console.error("Admin init error:", err);
        setError(err.message || "Failed to initialize admin dashboard");
        setLoading(false);
      }
    }
    initAdmin();
  }, []);

  async function loadAllData() {
    setRefreshing(true);

    // Fire every request in parallel instead of one-after-another — a dashboard
    // pulling ~10 independent resources was previously taking the *sum* of all
    // their latencies instead of just the slowest one. Each result is still
    // awaited and processed individually below, so one endpoint failing can't
    // silently block the others from updating their own state.
    const analyticsPromise = fetch("/api/admin/analytics");
    const productsPromise = fetch("/api/admin/products");
    const ordersPromise = fetch("/api/admin/orders");
    const cmsPromise = fetch("/api/admin/cms");
    const usersPromise = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const categoriesPromise = supabase.from("categories").select("*").order("sort_order", { ascending: true });
    const supportPromise = supabase.from("support_messages").select("*").order("created_at", { ascending: false });
    const bulkPromise = supabase.from("bulk_inquiries").select("*").order("created_at", { ascending: false });
    const subsPromise = supabase.from("newsletter_subscriptions").select("*").order("created_at", { ascending: false });
    const couponsPromise = fetch("/api/admin/coupons");
    const reviewsPromise = fetch("/api/admin/reviews");

    let hadError = false;

    try {
      const analyticsRes = await analyticsPromise;
      if (!analyticsRes.ok) throw new Error("Failed to load analytics");
      setAnalytics(await analyticsRes.json());
    } catch (err) {
      hadError = true;
      console.error("Load analytics failed:", err);
    }

    try {
      const productsRes = await productsPromise;
      if (!productsRes.ok) throw new Error("Failed to load products");
      const productsData = await productsRes.json();
      setProducts(productsData && productsData.length > 0 ? productsData : DEFAULT_PRODUCTS);
    } catch (err) {
      hadError = true;
      console.error("Load products failed:", err);
    }

    try {
      const ordersRes = await ordersPromise;
      if (!ordersRes.ok) throw new Error("Failed to load orders");
      setOrders(await ordersRes.json());
    } catch (err) {
      hadError = true;
      console.error("Load orders failed:", err);
    }

    try {
      const cmsRes = await cmsPromise;
      if (!cmsRes.ok) throw new Error("Failed to load CMS data");
      const cmsData = await cmsRes.json();
      setCmsSlides(cmsData.slides && cmsData.slides.length > 0 ? cmsData.slides : DEFAULT_SLIDES);
      setCmsBanners(cmsData.banners || []);

      const annBanner = (cmsData.banners || []).find((b: any) => b.placement === "announcement");
      if (annBanner) {
        setAnnouncementBannerId(annBanner.id);
        setAnnouncementList(annBanner.content?.messages || []);
      } else {
        setAnnouncementBannerId(null);
        setAnnouncementList(DEFAULT_ANNOUNCEMENTS);
      }
    } catch (err) {
      hadError = true;
      console.error("Load CMS data failed:", err);
    }

    try {
      const { data: profilesList, error: profilesError } = await usersPromise;
      if (profilesError) throw profilesError;
      setUsers(profilesList || []);
    } catch (err) {
      hadError = true;
      console.error("Load users failed:", err);
    }

    try {
      const { data: categoriesList, error: catError } = await categoriesPromise;
      if (catError) throw catError;
      setCategories(categoriesList || []);
    } catch (err) {
      hadError = true;
      console.error("Load categories failed:", err);
    }

    try {
      const { data: supportList } = await supportPromise;
      setSupportMessages(supportList || []);
    } catch (err) {
      hadError = true;
      console.error("Load support messages failed:", err);
    }

    try {
      const { data: bulkList } = await bulkPromise;
      setBulkInquiries(bulkList || []);
    } catch (err) {
      hadError = true;
      console.error("Load bulk inquiries failed:", err);
    }

    try {
      const { data: subsList } = await subsPromise;
      setNewsletterSubs(subsList || []);
    } catch (err) {
      hadError = true;
      console.error("Load newsletter subscriptions failed:", err);
    }

    try {
      const couponsRes = await couponsPromise;
      if (!couponsRes.ok) throw new Error("Failed to load promo codes");
      setCoupons((await couponsRes.json()) || []);
    } catch (err) {
      hadError = true;
      console.error("Load coupons failed:", err);
    }

    try {
      const reviewsRes = await reviewsPromise;
      if (!reviewsRes.ok) throw new Error("Failed to load reviews");
      setReviews((await reviewsRes.json()) || []);
    } catch (err) {
      hadError = true;
      console.error("Load reviews failed:", err);
    }

    setError(hadError ? "Some dashboard data failed to load — check the browser console for details." : "");
    setLoading(false);
    setRefreshing(false);
  }

  async function refreshProducts() {
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Failed to load products");
      const productsData = await res.json();
      setProducts(productsData && productsData.length > 0 ? productsData : DEFAULT_PRODUCTS);
    } catch (err) {
      console.error("Refresh products failed:", err);
    }
  }

  async function refreshOrders() {
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed to load orders");
      setOrders(await res.json());
    } catch (err) {
      console.error("Refresh orders failed:", err);
    }
  }

  async function refreshCms() {
    try {
      const res = await fetch("/api/admin/cms");
      if (!res.ok) throw new Error("Failed to load CMS data");
      const cmsData = await res.json();
      setCmsSlides(cmsData.slides && cmsData.slides.length > 0 ? cmsData.slides : DEFAULT_SLIDES);
      setCmsBanners(cmsData.banners || []);

      const annBanner = (cmsData.banners || []).find((b: any) => b.placement === "announcement");
      if (annBanner) {
        setAnnouncementBannerId(annBanner.id);
        setAnnouncementList(annBanner.content?.messages || []);
      } else {
        setAnnouncementBannerId(null);
        setAnnouncementList(DEFAULT_ANNOUNCEMENTS);
      }
    } catch (err) {
      console.error("Refresh CMS data failed:", err);
    }
  }

  async function refreshCoupons() {
    try {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) throw new Error("Failed to load promo codes");
      setCoupons((await res.json()) || []);
    } catch (err) {
      console.error("Refresh coupons failed:", err);
    }
  }

  // --- CMS Handling ---
  async function handleSaveAnnouncement() {
    try {
      const payload: any = {
        type: "banner",
        id: announcementBannerId,
        placement: "announcement",
        content: { messages: announcementList },
        is_active: true
      };

      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save announcement bar");
      alert("Announcement Bar updated successfully!");
      await refreshCms();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  function addAnnouncementMsg() {
    if (!announcementMsg.trim()) return;
    setAnnouncementList([...announcementList, announcementMsg.trim()]);
    setAnnouncementMsg("");
  }

  function removeAnnouncementMsg(index: number) {
    setAnnouncementList(announcementList.filter((_, idx) => idx !== index));
  }

  async function handleSaveSlide(e: React.FormEvent) {
    e.preventDefault();
    if (!slideTitle || !slideImageUrl) {
      alert("Title and Image URL are required");
      return;
    }

    try {
      const payload: any = {
        type: "slide",
        eyebrow: slideEyebrow,
        title: slideTitle,
        subtitle: slideSubtitle,
        cta_label: slideCtaLabel || "Shop Now",
        cta_href: slideCtaHref || "/shop",
        image_url: slideImageUrl,
        sort_order: Number(slideSortOrder),
        is_active: slideIsActive
      };

      if (editingSlide && !editingSlide.id.startsWith("default-")) {
        payload.id = editingSlide.id;
      }

      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save Hero slide");
      
      setShowSlideForm(false);
      setEditingSlide(null);
      resetSlideFormFields();
      alert("Hero slide saved successfully!");
      await refreshCms();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleDeleteSlide(id: string) {
    if (id.startsWith("default-")) {
      alert("Default templates cannot be deleted from the database. Save your edits to create custom database slides that override these defaults.");
      return;
    }
    if (!confirm("Are you sure you want to delete this slide?")) return;
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "slide", action: "delete", id })
      });
      if (!res.ok) throw new Error("Failed to delete Hero slide");
      alert("Hero slide deleted successfully!");
      await refreshCms();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  function startEditSlide(slide: any) {
    setEditingSlide(slide);
    setSlideEyebrow(slide.eyebrow || "");
    setSlideTitle(slide.title);
    setSlideSubtitle(slide.subtitle || "");
    setSlideCtaLabel(slide.cta_label || "");
    setSlideCtaHref(slide.cta_href || "");
    setSlideImageUrl(slide.image_url || "");
    setSlideSortOrder(slide.sort_order || 0);
    setSlideIsActive(slide.is_active);
    setShowSlideForm(true);
  }

  function resetSlideFormFields() {
    setSlideEyebrow("");
    setSlideTitle("");
    setSlideSubtitle("");
    setSlideCtaLabel("");
    setSlideCtaHref("");
    setSlideImageUrl("");
    setSlideSortOrder(0);
    setSlideIsActive(true);
  }

  async function handleSlideImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSlideImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await res.json();
      setSlideImageUrl(data.url);
    } catch (err: any) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploadingSlideImage(false);
    }
  }

  async function refreshReviews() {
    try {
      const res = await fetch("/api/admin/reviews");
      if (res.ok) {
        setReviews(await res.json());
      }
    } catch (err) {
      console.error("Refresh reviews error:", err);
    }
  }

  const handleEditReviewClick = (r: any) => {
    setEditingReview(r);
    setReviewFormRating(r.rating);
    setReviewFormTitle(r.title || "");
    setReviewFormBody(r.body || "");
    setReviewFormStatus(r.status);
  };

  const handleUpdateReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    setReviewFormSubmitting(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingReview.id,
          rating: reviewFormRating,
          title: reviewFormTitle,
          body: reviewFormBody,
          status: reviewFormStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update review");
      }

      alert("Review updated successfully!");
      setEditingReview(null);
      await refreshReviews();
    } catch (err: any) {
      alert(err.message || "Failed to update review");
    } finally {
      setReviewFormSubmitting(false);
    }
  };

  const handleDeleteReviewClick = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer review? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete review");
      }

      alert("Review deleted successfully!");
      await refreshReviews();
    } catch (err: any) {
      alert(err.message || "Failed to delete review");
    }
  };

  // --- Product Editing/Adding ---
  function openAddProduct() {
    setEditingProduct(null);
    setProdName("");
    setProdSlug("");
    setProdDesc("");
    setProdCatId(categories[0]?.id || "");
    setProdPrice("");
    setProdCompare("");
    setProdCashback("");
    setProdStock("");
    setProdIsActive(true);
    setProdIsSale(false);
    setProdShowSize(false);
    setProdImages([]);
    setProdVariants([]);
    setShowProductForm(true);
  }

  function openEditProduct(p: any) {
    setEditingProduct(p);
    setProdName(p.name);
    setProdSlug(p.slug);
    setProdDesc(p.description || "");
    setProdCatId(p.category_id || "");
    setProdPrice(p.price_paise / 100);
    setProdCompare(p.compare_at_paise ? p.compare_at_paise / 100 : "");
    setProdCashback(p.cashback_paise ? p.cashback_paise / 100 : "");
    setProdStock(p.stock);
    setProdIsActive(p.is_active);
    setProdIsSale(p.is_on_sale);
    setProdShowSize(p.show_size || false);
    setProdImages((p.product_images || []).map((img: any) => img.url));
    setProdVariants(p.product_variants || []);
    setShowProductForm(true);
  }

  const isProductModified = () => {
    if (!editingProduct) return true; // always editable when creating a new product
    
    if (prodName !== editingProduct.name) return true;
    if (prodSlug !== editingProduct.slug) return true;
    if (prodDesc !== (editingProduct.description || "")) return true;
    if (prodCatId !== (editingProduct.category_id || "")) return true;
    if (prodPrice !== (editingProduct.price_paise / 100)) return true;
    
    const originalCompare = editingProduct.compare_at_paise ? editingProduct.compare_at_paise / 100 : "";
    if (prodCompare !== originalCompare) return true;
    
    const originalCashback = editingProduct.cashback_paise ? editingProduct.cashback_paise / 100 : "";
    if (prodCashback !== originalCashback) return true;
    
    if (prodStock !== editingProduct.stock) return true;
    if (prodIsActive !== editingProduct.is_active) return true;
    if (prodIsSale !== editingProduct.is_on_sale) return true;
    if (prodShowSize !== (editingProduct.show_size || false)) return true;
    
    const originalImages = (editingProduct.product_images || []).map((img: any) => img.url);
    if (JSON.stringify(prodImages) !== JSON.stringify(originalImages)) return true;
    
    const originalVariants = editingProduct.product_variants || [];
    if (JSON.stringify(prodVariants) !== JSON.stringify(originalVariants)) return true;
    
    return false;
  };

  async function handleProductImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    const currentCount = prodImages.length;
    const incomingCount = filesArray.length;

    if (currentCount >= 10) {
      alert("You have already uploaded the maximum limit of 10 images.");
      return;
    }

    let filesToUpload = filesArray;
    if (currentCount + incomingCount > 10) {
      const allowedCount = 10 - currentCount;
      alert(`You can only upload up to 10 images. Only the first ${allowedCount} selected files will be uploaded.`);
      filesToUpload = filesArray.slice(0, allowedCount);
    }

    setUploadingImage(true);
    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/products/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Upload failed for ${file.name}`);
        }

        const data = await res.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setProdImages([...prodImages, ...uploadedUrls]);
    } catch (err: any) {
      alert("Image upload failed: " + err.message);
    } finally {
      e.target.value = "";
      setUploadingImage(false);
    }
  }

  const moveProductImage = (index: number, direction: "left" | "right") => {
    const newIndex = direction === "left" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= prodImages.length) return;

    const reorderedImages = [...prodImages];
    const temp = reorderedImages[index];
    reorderedImages[index] = reorderedImages[newIndex];
    reorderedImages[newIndex] = temp;
    setProdImages(reorderedImages);
  };

  const handleImgDragStart = (index: number) => {
    setDraggedImgIndex(index);
  };

  const handleImgDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleImgDrop = (index: number) => {
    if (draggedImgIndex === null) return;
    const reorderedImages = [...prodImages];
    const [draggedItem] = reorderedImages.splice(draggedImgIndex, 1);
    reorderedImages.splice(index, 0, draggedItem);
    setProdImages(reorderedImages);
    setDraggedImgIndex(null);
  };

  function addProductVariant() {
    if (!newVarSize.trim() && !newVarColor.trim()) {
      alert("Please specify at least a size or color for the variant");
      return;
    }
    const sku = newVarSku.trim() || `VAR-${prodSlug.toUpperCase() || "SKU"}-${newVarSize || "X"}-${newVarColor || "Y"}-${Date.now().toString().slice(-4)}`;
    setProdVariants([
      ...prodVariants,
      {
        size: newVarSize.trim() || null,
        color: newVarColor.trim() || null,
        sku,
        stock: newVarStock
      }
    ]);
    setNewVarSize("");
    setNewVarColor("");
    setNewVarSku("");
    setNewVarStock("");
  }

  function removeProductVariant(index: number) {
    setProdVariants(prodVariants.filter((_, idx) => idx !== index));
  }

  function updateVariantField(index: number, field: string, value: any) {
    const updatedVariants = [...prodVariants];
    updatedVariants[index] = {
      ...updatedVariants[index],
      [field]: value
    };
    setProdVariants(updatedVariants);
  }

  function removeProductImage(index: number) {
    setProdImages(prodImages.filter((_, idx) => idx !== index));
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!prodName.trim() || !prodSlug.trim()) {
      alert("Product Name and Slug are required");
      return;
    }

    try {
      const payload = {
        id: editingProduct && !editingProduct.id.startsWith("default-p") ? editingProduct.id : undefined,
        name: prodName.trim(),
        slug: prodSlug.trim(),
        description: prodDesc.trim(),
        category_id: prodCatId,
        price_paise: Math.round(Number(prodPrice || 0) * 100),
        compare_at_paise: prodCompare && Number(prodCompare) > 0 ? Math.round(Number(prodCompare) * 100) : null,
        cashback_paise: Math.round(Number(prodCashback || 0) * 100),
        stock: Number(prodStock || 0),
        is_active: prodIsActive,
        is_on_sale: prodIsSale,
        show_size: prodShowSize,
        images: prodImages,
        variants: prodVariants
      };

      const method = editingProduct && !editingProduct.id.startsWith("default-p") ? "PUT" : "POST";
      const res = await fetch("/api/admin/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save product");
      }

      alert("Product saved successfully!");
      setShowProductForm(false);
      setEditingProduct(null);
      await refreshProducts();
    } catch (err: any) {
      alert("Error saving product: " + err.message);
    }
  }

  async function handleDeleteProduct(p: any) {
    if (!confirm(`Are you sure you want to delete the product "${p.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products?id=${p.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete product");
      }

      await refreshProducts();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  }

  async function toggleProductActive(product: any) {
    if (product.id.startsWith("default-p")) {
      alert("Default product templates cannot be toggled. Save the product to customize it first.");
      return;
    }
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, name: product.name, slug: product.slug, is_active: !product.is_active })
      });
      if (!res.ok) throw new Error("Failed to toggle product status");
      await refreshProducts();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // --- Order Details / Edit ---
  function inspectOrder(order: any) {
    setSelectedOrder(order);
    setOrderStatus(order.status);
    setOrderTrackingId(order.tracking_id || "");
    setOrderTrackingUrl(order.courier_tracking_url || "");
    setOrderAddress({ ...order.shipping_address });
    setOrderNote("");
    setOrderRejectionReason(order.rejection_reason || "");
  }

  async function handleUpdateOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrder) return;

    if (orderStatus === "rejected" && !orderRejectionReason.trim()) {
      alert("Please enter a reason for rejecting this order.");
      return;
    }

    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedOrder.id,
          status: orderStatus,
          tracking_id: orderTrackingId,
          courier_tracking_url: orderTrackingUrl,
          shipping_address: orderAddress,
          rejection_reason: orderStatus === "rejected" ? orderRejectionReason.trim() : null,
          note: orderNote.trim() || undefined
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update order");
      }
      alert("Order updated successfully!");
      setSelectedOrder(null);
      await refreshOrders();
    } catch (err: any) {
      alert("Error updating order: " + err.message);
    }
  }

  // --- Users management ---
  async function updateUserRole(userId: string, role: string) {
    const previousUsers = users;
    // Update immediately so the dropdown reflects the change without depending
    // on the full loadAllData() chain (which can throw early on an unrelated
    // section and never reach the users refetch).
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));

    try {
      const res = await fetch("/api/admin/users/export", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role })
      });
      if (!res.ok) throw new Error("Failed to update user role");
    } catch (err: any) {
      setUsers(previousUsers);
      alert("Error: " + err.message);
    }
  }

  // Sync / Export excel sheet
  function handleExportUsers() {
    const a = document.createElement("a");
    a.href = "/api/admin/users/export";
    a.download = "users.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Print / Save-as-PDF of all users
  function printUsersPDF() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = users.map((u: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: bold; letter-spacing: 0.5px; color: #B08D4C;">${u.user_id || "—"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC;">${u.full_name || "—"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC;">${u.email}</td>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC;">${u.phone || "—"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC; text-transform: capitalize;">${u.role}</td>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC; text-transform: capitalize;">${u.provider}</td>
        <td style="padding: 10px; border-bottom: 1px solid #EFE9DC;">${new Date(u.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>User Directory - JAI SRI RAM TEXTILES</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, sans-serif; color: #2A2622; margin: 0; padding: 40px; line-height: 1.5; background-color: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #B08D4C; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #2A2622; letter-spacing: 1px; }
            .brand-subtitle { font-size: 11px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
            .meta { font-size: 12px; color: #6E655A; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #2A2622; color: #FBF9F4; padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .footer-note { text-align: center; font-size: 12px; color: #9A9084; margin-top: 40px; border-top: 1px solid #E5DFD2; padding-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">JAI SRI RAM TEXTILES</div>
              <div class="brand-subtitle">User Directory</div>
            </div>
            <div class="meta">
              Generated: ${new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}<br/>
              Total Users: <strong>${users.length}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Sign-up Provider</th>
                <th>Joined Date</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="footer-note">
            Confidential — for internal administrative use only.
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function(){ window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // --- Coupons / Promo Codes Management ---
  async function handleSaveCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!newCouponCode.trim() || newCouponValue <= 0) {
      alert("Promo Code and Value are required");
      return;
    }

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCouponCode.trim(),
          type: newCouponType,
          value: newCouponType === "percent" ? newCouponValue : Math.round(newCouponValue * 100),
          min_order_paise: Math.round(newCouponMinOrder * 100),
          max_discount_paise: newCouponType === "percent" && newCouponMaxDiscount > 0 ? Math.round(newCouponMaxDiscount * 100) : null,
          first_order_only: newCouponFirstOrder,
          usage_limit: newCouponLimit > 0 ? newCouponLimit : null,
          expires_at: newCouponExpiry || null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create promo code");
      }

      alert("Promo Code created successfully!");
      setNewCouponCode("");
      setNewCouponValue(0);
      setNewCouponMinOrder(0);
      setNewCouponMaxDiscount(0);
      setNewCouponFirstOrder(false);
      setNewCouponLimit(0);
      setNewCouponExpiry("");
      setShowCouponForm(false);
      await refreshCoupons();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleToggleCoupon(id: string, active: boolean) {
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: active })
      });
      if (!res.ok) throw new Error("Failed to toggle promo code status");
      await refreshCoupons();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  function promptDeleteOrder(order: any) {
    setOrderPendingDelete(order);
    setDeleteConfirmInput("");
  }

  async function handleDeleteOrder(id: string) {
    setDeletingOrder(true);
    try {
      const res = await fetch(`/api/admin/orders?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete order");
      if (selectedOrder?.id === id) setSelectedOrder(null);
      setOrderPendingDelete(null);
      setDeleteConfirmInput("");
      await refreshOrders();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDeletingOrder(false);
    }
  }

  function handleEditCoupon(c: any) {
    setEditingCoupon(c);
    setNewCouponCode(c.code);
    setNewCouponType(c.type);
    // value stored as paise for flat, raw number for percent
    setNewCouponValue(c.type === "flat" ? c.value / 100 : c.value);
    setNewCouponMinOrder(c.min_order_paise ? c.min_order_paise / 100 : 0);
    setNewCouponMaxDiscount(c.max_discount_paise ? c.max_discount_paise / 100 : 0);
    setNewCouponFirstOrder(c.first_order_only || false);
    setNewCouponLimit(c.usage_limit || 0);
    // format for datetime-local input
    setNewCouponExpiry(c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : "");
    setShowCouponForm(true);
  }

  async function handleUpdateCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCoupon || !newCouponCode.trim() || newCouponValue <= 0) {
      alert("Promo Code and Value are required");
      return;
    }
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCoupon.id,
          code: newCouponCode.trim(),
          type: newCouponType,
          value: newCouponType === "percent" ? newCouponValue : Math.round(newCouponValue * 100),
          min_order_paise: Math.round(newCouponMinOrder * 100),
          max_discount_paise: newCouponType === "percent" && newCouponMaxDiscount > 0 ? Math.round(newCouponMaxDiscount * 100) : null,
          first_order_only: newCouponFirstOrder,
          usage_limit: newCouponLimit > 0 ? newCouponLimit : null,
          expires_at: newCouponExpiry || null
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update promo code");
      }
      alert("Promo Code updated successfully!");
      setEditingCoupon(null);
      setNewCouponCode(""); setNewCouponValue(0); setNewCouponMinOrder(0);
      setNewCouponMaxDiscount(0); setNewCouponFirstOrder(false); setNewCouponLimit(0); setNewCouponExpiry("");
      setShowCouponForm(false);
      await refreshCoupons();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleDeleteCoupon(id: string) {
    if (!confirm("Are you sure you want to delete this promo code?")) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete promo code");
      await refreshCoupons();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // --- Invoice & Packing Slip Printer ---
  async function printInvoice(order: any) {
    // Dynamic import to avoid SSR issues
    const { jsPDF } = await import("jspdf");
    
    const doc = new jsPDF();
    const orderNumber = order.order_number;
    const name = order.shipping_address?.recipient || order.profiles?.full_name || order.profiles?.email || "Customer";
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
    if (order.profiles?.user_id) {
      doc.setFont("helvetica", "bold");
      doc.text(`User ID: ${order.profiles.user_id}`, 20, 80);
      doc.setFont("helvetica", "normal");
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

    items.forEach((item: any) => {
      // line border
      doc.setDrawColor(lineLight[0], lineLight[1], lineLight[2]);
      doc.setLineWidth(0.3);
      doc.line(20, y + 8, 190, y + 8);

      doc.text(`${item.name}${item.variant ? ` (${item.variant})` : ""}`, 24, y + 5);
      doc.text(`${item.quantity}`, 127, y + 5);
      doc.text(`INR ${(item.unit_price_paise * item.quantity / 100).toFixed(2)}`, 165, y + 5);

      y += 8;
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

  function printPackingSlip(order: any) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsSummary = order.order_items.map((item: any) => `
      <div style="padding: 6px 0; border-bottom: 1px dashed #E5DFD2; font-size: 14px;">
        <strong>${item.quantity} x</strong> ${item.name} ${item.variant ? `(${item.variant})` : ""}
      </div>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Packing Sticker - ${order.order_number}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, sans-serif; color: #2A2622; margin: 0; padding: 20px; }
            .box {
              border: 3px dashed #B08D4C;
              border-radius: 12px;
              padding: 25px;
              max-width: 550px;
              margin: 0 auto;
              background-color: #FBF9F4;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2A2622;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .title { font-family: Georgia, serif; font-size: 20px; font-weight: bold; letter-spacing: 1px; }
            .order-bar {
              display: flex;
              justify-content: space-between;
              background-color: #2A2622;
              color: #FBF9F4;
              padding: 8px 15px;
              font-weight: bold;
              font-size: 15px;
              border-radius: 4px;
              margin-bottom: 20px;
            }
            .address-section { margin-bottom: 25px; }
            .address-label {
              font-size: 11px;
              color: #6E655A;
              text-transform: uppercase;
              letter-spacing: 2px;
              font-weight: bold;
              margin-bottom: 6px;
            }
            .address-content {
              font-size: 18px;
              line-height: 1.5;
              padding-left: 10px;
              border-left: 3px solid #B08D4C;
            }
            .items-summary {
              background-color: #F5F1E8;
              border: 1px solid #E5DFD2;
              border-radius: 6px;
              padding: 15px;
              margin-bottom: 20px;
            }
            .sender {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #6E655A;
              border-top: 1px solid #E5DFD2;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="header">
              <div class="title">JAI SRI RAM TEXTILES</div>
              <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #6E655A; margin-top: 4px;">PACKING SLIP & BOX LABEL</div>
            </div>

            <div class="order-bar">
              <span>ORDER: ${order.order_number}</span>
              <span>ITEMS: ${order.order_items.reduce((sum: number, it: any) => sum + it.quantity, 0)}</span>
            </div>

            <div class="address-section">
              <div class="address-label">DELIVER TO (SHIPPING ADDRESS)</div>
              <div class="address-content">
                <strong>${order.shipping_address.recipient}</strong><br/>
                ${order.shipping_address.line1}<br/>
                ${order.shipping_address.line2 ? order.shipping_address.line2 + "<br/>" : ""}
                ${order.shipping_address.city}, ${order.shipping_address.district ? order.shipping_address.district + ", " : ""}${order.shipping_address.state} - <span style="font-size: 22px; font-weight: bold; text-decoration: underline; background-color: #EFEFEF; padding: 0 4px;">${order.shipping_address.pincode}</span><br/>
                ${order.shipping_address.phone ? `<span style="font-size: 18px; font-weight: bold; display: inline-block; margin-top: 5px;">Mobile: ${order.shipping_address.phone}${order.shipping_address.alternate_phone ? " / " + order.shipping_address.alternate_phone : ""}</span><br/>` : ""}
              </div>
            </div>

            <div class="items-summary">
              <div class="address-label" style="margin-bottom: 10px;">Package Checklist</div>
              ${itemsSummary}
            </div>

            <div class="sender">
              <div>
                <strong>SENDER DETAILS:</strong><br/>
                JAI SRI RAM TEXTILES<br/>
                Komarapalayam, Tamil Nadu - 638183
              </div>
              <div style="text-align: right;">
                Razorpay ID: ${order.razorpay_payment_id || "PREPAID"}<br/>
                Carrier Code: ${order.tracking_id || "STD-SURFACE"}
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function(){ window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // --- Emergency single-page order lookup (by Order Number or Order ID) ---
  function confirmEmergencyOrderLookup() {
    const trimmed = emergencyLookupQuery.trim().toLowerCase();
    if (!trimmed) return;
    const order = orders.find((o: any) =>
      o.order_number?.toLowerCase() === trimmed || o.id?.toLowerCase() === trimmed
    );
    if (!order) {
      alert(`No order found matching "${emergencyLookupQuery}". Check the Order Number and try again.`);
      return;
    }
    setEmergencyLookupOpen(false);
    // Called synchronously within this click handler (no native prompt() in between)
    // so window.open() below still counts as a direct user gesture and isn't popup-blocked.
    printOrderEmergencySheet(order);
  }

  function printOrderEmergencySheet(order: any) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const addr = order.shipping_address || {};
    const items = order.order_items || [];
    const events = [...(order.order_events || [])].sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const itemsRows = items.map((item: any) => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px solid #EFE9DC;">${item.name}</td>
        <td style="padding: 6px; border-bottom: 1px solid #EFE9DC; text-align: center;">${item.variant || "—"}</td>
        <td style="padding: 6px; border-bottom: 1px solid #EFE9DC; text-align: right;">${formatRupees(item.unit_price_paise)}</td>
        <td style="padding: 6px; border-bottom: 1px solid #EFE9DC; text-align: center;">${item.quantity}</td>
        <td style="padding: 6px; border-bottom: 1px solid #EFE9DC; text-align: right;">${formatRupees(item.unit_price_paise * item.quantity)}</td>
        <td style="padding: 6px; border-bottom: 1px solid #EFE9DC; text-align: right;">${formatRupees(item.cashback_paise || 0)}</td>
      </tr>
    `).join("");

    const eventsRows = events.length > 0 ? events.map((ev: any) => `
      <tr>
        <td style="padding: 5px; border-bottom: 1px solid #EFE9DC; text-transform: capitalize;">${ev.status}</td>
        <td style="padding: 5px; border-bottom: 1px solid #EFE9DC;">${ev.note || "—"}</td>
        <td style="padding: 5px; border-bottom: 1px solid #EFE9DC;">${new Date(ev.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
      </tr>
    `).join("") : `<tr><td colspan="3" style="padding: 5px; color: #9A9084;">No status history logged.</td></tr>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Emergency Order Sheet - ${order.order_number}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, sans-serif; color: #2A2622; margin: 0; padding: 28px; line-height: 1.4; font-size: 12px; background-color: #ffffff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #B08D4C; padding-bottom: 14px; margin-bottom: 18px; }
            .brand { font-family: Georgia, serif; font-size: 20px; font-weight: bold; }
            .brand-subtitle { font-size: 10px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin-top: 2px; }
            .flag { text-align: right; }
            .flag h2 { font-family: Georgia, serif; color: #B08D4C; margin: 0 0 4px 0; font-size: 16px; }
            .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 16px; }
            .box { padding: 10px 12px; border: 1px solid #E5DFD2; border-radius: 6px; background-color: #FBF9F4; }
            .box h3 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #E5DFD2; padding-bottom: 5px; }
            .box p { margin: 3px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
            th { background-color: #2A2622; color: #FBF9F4; padding: 6px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .rejected-box { padding: 10px 12px; border: 1px solid #A24B3E; background-color: #A24B3E10; border-radius: 6px; margin-bottom: 16px; }
            .rejected-box h3 { color: #A24B3E; margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; }
            .totals { width: 260px; margin-left: auto; border: 1px solid #E5DFD2; border-radius: 6px; padding: 10px 12px; background-color: #FBF9F4; }
            .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
            .totals-row.grand { font-weight: bold; color: #B08D4C; border-top: 1px solid #B08D4C; padding-top: 6px; margin-top: 4px; font-size: 14px; }
            .footer-note { text-align: center; font-size: 10px; color: #9A9084; margin-top: 20px; border-top: 1px solid #E5DFD2; padding-top: 10px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">JAI SRI RAM TEXTILES</div>
              <div class="brand-subtitle">Emergency Order Reference Sheet</div>
            </div>
            <div class="flag">
              <h2>Order: ${order.order_number}</h2>
              <div>Order ID: <span style="font-family: monospace;">${order.id}</span></div>
              <div>Generated: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
            </div>
          </div>

          ${order.status === "rejected" && order.rejection_reason ? `
          <div class="rejected-box">
            <h3>⚠ Order Rejected</h3>
            <p>${order.rejection_reason}</p>
          </div>` : ""}

          <div class="grid2">
            <div class="box">
              <h3>Order Status</h3>
              <p>Status: <strong style="text-transform: uppercase;">${order.status}</strong></p>
              <p>Payment Status: <strong style="text-transform: uppercase;">${order.payment_status}</strong></p>
              <p>Placed: ${new Date(order.placed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
              <p>Delivered: ${order.delivered_at ? new Date(order.delivered_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</p>
              <p>Tracking ID: ${order.tracking_id || "—"}</p>
              <p>Courier URL: ${order.courier_tracking_url || "—"}</p>
            </div>
            <div class="box">
              <p>Name: <strong>${order.profiles?.full_name || "Guest Checkout"}</strong></p>
              <p>Email: ${order.profiles?.email || "—"}</p>
              <p>Phone: ${order.profiles?.phone || "—"}</p>
              <p>User ID: <strong style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.5px; color: #B08D4C;">${order.profiles?.user_id || "—"}</strong></p>
              <p>Razorpay Order ID: ${order.razorpay_order_id || "—"}</p>
              <p>Razorpay Payment ID: ${order.razorpay_payment_id || "—"}</p>
            </div>
          </div>

          <div class="box" style="margin-bottom: 16px;">
            <h3>Shipping Address</h3>
            <p><strong>${addr.recipient || "—"}</strong></p>
            <p>${addr.line1 || ""} ${addr.line2 || ""}</p>
            <p>${addr.city || ""}${addr.district ? ", " + addr.district : ""}, ${addr.state || ""} - ${addr.pincode || ""}</p>
            <p>Phone: ${addr.phone || "—"}${addr.alternate_phone ? " / " + addr.alternate_phone : ""}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 32%;">Product</th>
                <th style="width: 13%; text-align: center;">Variant</th>
                <th style="width: 15%; text-align: right;">Unit Price</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 15%; text-align: right;">Total</th>
                <th style="width: 15%; text-align: right;">Cashback</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span>Subtotal:</span><span>${formatRupees(order.subtotal_paise)}</span></div>
            ${order.coupon_id ? `<div class="totals-row"><span>Coupon Applied:</span><span>${order.coupons?.code || order.coupon_id}</span></div>` : ""}
            ${order.discount_paise > 0 ? `<div class="totals-row"><span>Coupon Discount:</span><span>-${formatRupees(order.discount_paise)}</span></div>` : ""}
            ${order.wallet_used_paise > 0 ? `<div class="totals-row"><span>Wallet Used:</span><span>-${formatRupees(order.wallet_used_paise)}</span></div>` : ""}
            <div class="totals-row"><span>Shipping:</span><span>${order.shipping_paise === 0 ? "FREE" : formatRupees(order.shipping_paise)}</span></div>
            ${order.tax_paise > 0 ? `<div class="totals-row"><span>Tax:</span><span>${formatRupees(order.tax_paise)}</span></div>` : ""}
            <div class="totals-row grand"><span>Total Paid:</span><span>${formatRupees(order.total_paise)}</span></div>
            <div class="totals-row"><span>Cashback Earned:</span><span>${formatRupees(order.cashback_earned_paise)}</span></div>
          </div>

          <table style="margin-top: 16px;">
            <thead>
              <tr>
                <th style="width: 20%;">Status</th>
                <th style="width: 55%;">Note</th>
                <th style="width: 25%;">Timestamp</th>
              </tr>
            </thead>
            <tbody>${eventsRows}</tbody>
          </table>

          <div class="footer-note">
            Confidential — internal admin use only. Generated for emergency/offline reference.
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function(){ window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // --- Filtering computations ---
  const filteredProducts = products.filter(p => {
    if (!productSearch) return true;
    const term = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term) || (p.categories?.name || "").toLowerCase().includes(term);
  });

  const filteredOrders = orders.filter(o => {
    // 1. Filter by status selection
    if (orderStatusFilter !== "all") {
      if (orderStatusFilter === "pending" && o.status !== "pending") return false;
      if (orderStatusFilter === "confirmed" && !["confirmed", "packed"].includes(o.status)) return false;
      if (orderStatusFilter === "shipped" && !["shipped", "out_for_delivery"].includes(o.status)) return false;
      if (orderStatusFilter === "delivered" && o.status !== "delivered") return false;
      if (orderStatusFilter === "returned" && o.status !== "returned") return false;
      if (orderStatusFilter === "rejected" && o.status !== "rejected") return false;
    }

    // 2. Filter by search text
    if (!orderSearch) return true;
    const term = orderSearch.toLowerCase();
    return o.order_number.toLowerCase().includes(term) || (o.profiles?.full_name || "").toLowerCase().includes(term) || (o.profiles?.email || "").toLowerCase().includes(term) || o.status.toLowerCase().includes(term) || String(o.profiles?.user_id || "").toLowerCase().includes(term);
  });

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || u.role.toLowerCase().includes(term) || (u.phone || "").toLowerCase().includes(term) || String(u.user_id || "").toLowerCase().includes(term);
  });


  // Render loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-ivory flex flex-col items-center justify-center py-20">
        <RefreshCw className="animate-spin text-zari w-12 h-12 mb-4" />
        <p className="font-display text-xl text-ink">Loading Admin Panel...</p>
        <p className="text-sm text-taupe mt-1">Authenticating and retrieving database records</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory font-sans text-ink">
      {/* Top Banner details */}
      <div className="bg-ink text-ivory py-4 border-b border-zari-deep">
        <Container className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-wide">Admin Portal</h1>
            <p className="text-xs text-muted mt-0.5">Welcome, <span className="text-zari-soft font-semibold">{currentUser?.full_name || currentUser?.email}</span> ({currentUser?.role})</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" className="border-muted text-ivory hover:text-ink hover:bg-ivory" onClick={loadAllData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Sync Live Data
            </Button>
            <Button size="sm" variant="gold" href="/">
              Exit Admin Area
            </Button>
          </div>
        </Container>
      </div>

      <Container className="py-8">
        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 text-danger rounded-card flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Module Navigation Tabs */}
          <div className="lg:col-span-3 space-y-2">
            <div className="bg-white border border-line rounded-card p-3 sm:p-4 shadow-soft">
              <p className="hidden lg:block text-xs font-semibold text-taupe uppercase tracking-wider mb-3 px-3">Store Administration</p>
              <nav className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 pb-1 lg:pb-0 lg:space-y-1 w-full whitespace-nowrap scrollbar-none">
                <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<LayoutDashboard className="w-4 h-4" />} label="Overview & KPI" />
                <TabButton active={activeTab === "orders"} onClick={() => setActiveTab("orders")} icon={<ShoppingCart className="w-4 h-4" />} label="Order Registry" badge={orders.length} />
                <TabButton active={activeTab === "products"} onClick={() => setActiveTab("products")} icon={<ShoppingBag className="w-4 h-4" />} label="Product Catalog" badge={products.length} />
                <TabButton active={activeTab === "cms"} onClick={() => setActiveTab("cms")} icon={<Wrench className="w-4 h-4" />} label="Storefront CMS" />
                <TabButton active={activeTab === "refunds"} onClick={() => setActiveTab("refunds")} icon={<RefreshCw className="w-4 h-4" />} label="Issue Refund" badge={orders.filter(o => (o.status === "returned" || o.status === "rejected") && o.payment_status !== "refunded").length} />
                <TabButton active={activeTab === "coupons"} onClick={() => setActiveTab("coupons")} icon={<Ticket className="w-4 h-4" />} label="Promo Codes" badge={coupons.length} />
                <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")} icon={<Users className="w-4 h-4" />} label="User Management" badge={users.length} />
                <TabButton active={activeTab === "user-inspector"} onClick={() => setActiveTab("user-inspector")} icon={<Search className="w-4 h-4" />} label="User Inspector" />
                <TabButton active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")} icon={<Star className="w-4 h-4" />} label="Customer Reviews" badge={reviews.length} />
                <TabButton active={activeTab === "visitor-history"} onClick={() => setActiveTab("visitor-history")} icon={<Activity className="w-4 h-4" />} label="Visitor Sessions" badge={analytics?.sessionHistory?.length} />
                <TabButton active={activeTab === "communications"} onClick={() => setActiveTab("communications")} icon={<Mail className="w-4 h-4" />} label="Communications" badge={supportMessages.length + bulkInquiries.length + newsletterSubs.length} />
                <TabButton active={activeTab === "storage"} onClick={() => setActiveTab("storage")} icon={<Database className="w-4 h-4" />} label="System & Storage" />
              </nav>
            </div>
          </div>

          {/* Module Display Content */}
          <div className="lg:col-span-9">
            
            {/* Overview / Dashboard Tab */}
            {activeTab === "overview" && (
              <div className="space-y-8 animate-fade-up">
                {/* Stats Widget Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <StatCard icon={<DollarSign className="text-success" />} label="Gross Paid Revenues" value={formatRupees(analytics?.metrics?.totalSalesPaise || 0)} subtitle="Cleared Razorpay transactions" />
                  <StatCard icon={<ShoppingCart className="text-zari" />} label="Delivered Orders" value={analytics?.metrics?.completedOrdersCount || 0} subtitle={`Avg ticket: ${formatRupees(analytics?.metrics?.avgOrderValPaise || 0)}`} />
                  <StatCard icon={<Users className="text-ink" />} label="Active Sessions" value={analytics?.dbStats?.sessions || 0} subtitle={`Total page views: ${analytics?.dbStats?.pageViews || 0}`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent Orders Overview */}
                  <div className="bg-white border border-line rounded-card p-6 shadow-soft">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-display text-lg">Recent Orders</h3>
                      <button onClick={() => setActiveTab("orders")} className="text-xs font-semibold text-zari hover:underline flex items-center">
                        All orders <ChevronRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-line text-taupe font-medium">
                            <th className="py-2">Order #</th>
                            <th className="py-2">Customer</th>
                            <th className="py-2 text-right">Amount</th>
                            <th className="py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 5).map((o: any) => (
                            <tr key={o.id} className="border-b border-line hover:bg-ivory/50">
                              <td className="py-3 font-semibold text-ink">{o.order_number}</td>
                              <td className="py-3 text-taupe">{o.profiles?.full_name || "Guest"}</td>
                              <td className="py-3 text-right font-medium">{formatRupees(o.total_paise)}</td>
                              <td className="py-3 text-center">
                                <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                                  o.status === "delivered" ? "bg-success/15 text-success" :
                                  o.status === "rejected" ? "bg-danger/15 text-danger" :
                                  o.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-800"
                                }`}>
                                  {o.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Hot Products Overview */}
                  <div className="bg-white border border-line rounded-card p-6 shadow-soft">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-display text-lg">Inventory Levels</h3>
                      <button onClick={() => setActiveTab("products")} className="text-xs font-semibold text-zari hover:underline flex items-center">
                        Manage stock <ChevronRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {products.slice(0, 5).map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded border overflow-hidden flex-shrink-0 bg-cream">
                              {p.product_images?.[0] ? (
                                <Image src={p.product_images[0].url} alt="" fill className="object-cover" />
                              ) : (
                                <ShoppingCart className="w-4 h-4 m-2 text-muted" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold truncate max-w-[160px]">{p.name}</p>
                              <p className="text-xs text-taupe">{p.categories?.name || "Uncategorized"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              p.stock === 0 ? "bg-danger/10 text-danger" : 
                              p.stock < 5 ? "bg-amber-100 text-amber-800" : "bg-success/10 text-success"
                            }`}>
                              {p.stock} in stock
                            </span>
                            <p className="text-xs text-taupe mt-0.5">{formatRupees(p.price_paise)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Products catalog management tab */}
            {activeTab === "products" && (
              <div className="space-y-6 animate-fade-up">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted" />
                    <input
                      type="text"
                      placeholder="Search products by title, slug, or category..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full rounded-pill border border-line bg-white pl-9 pr-4 py-2 text-sm text-ink outline-none focus:border-zari"
                    />
                  </div>
                  <Button size="sm" variant="gold" onClick={openAddProduct} className="flex-shrink-0">
                    <Plus className="w-4 h-4" /> Add Product
                  </Button>
                </div>

                {/* Product Creation / Update Form Component overlay */}
                {showProductForm && (
                  <div className="bg-white border-2 border-zari rounded-card p-6 shadow-lift relative">
                    <h3 className="font-display text-xl border-b border-line pb-3 mb-5">
                      {editingProduct ? `Edit Product: ${editingProduct.name}` : "Create New Product"}
                    </h3>
                    <form onSubmit={handleSaveProduct} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold">Product Name *</label>
                          <input type="text" required value={prodName} onChange={(e) => {
                            setProdName(e.target.value);
                            if (!editingProduct) {
                              setProdSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                            }
                          }} className="rounded-md border border-line bg-ivory px-3 py-2 text-sm text-ink outline-none focus:border-zari" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold">URL Slug *</label>
                          <input type="text" required value={prodSlug} onChange={(e) => setProdSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))} className="rounded-md border border-line bg-ivory px-3 py-2 text-sm text-ink outline-none focus:border-zari" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold">Description</label>
                        <textarea value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} rows={3} className="rounded-md border border-line bg-ivory px-3 py-2 text-sm text-ink outline-none focus:border-zari" />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold">Category</label>
                          <select value={prodCatId} onChange={(e) => setProdCatId(e.target.value)} className="rounded-md border border-line bg-ivory px-3 py-2 text-sm text-ink outline-none focus:border-zari h-[38px]">
                            {categories.map((c: any) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold">Price (₹) *</label>
                          <input type="number" required min="0" step="1" value={prodPrice} onChange={(e) => setProdPrice(e.target.value === "" ? "" : Number(e.target.value))} className="rounded-md border border-line bg-ivory px-3 py-2 text-sm text-ink outline-none focus:border-zari" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold">Compare At (₹)</label>
                          <input type="number" min="0" step="1" value={prodCompare} onChange={(e) => setProdCompare(e.target.value === "" ? "" : Number(e.target.value))} className="rounded-md border border-line bg-ivory px-3 py-2 text-sm text-ink outline-none focus:border-zari" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold">Cashback (₹)</label>
                          <input type="number" min="0" step="1" value={prodCashback} onChange={(e) => setProdCashback(e.target.value === "" ? "" : Number(e.target.value))} className="rounded-md border border-line bg-ivory px-3 py-2 text-sm text-ink outline-none focus:border-zari" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 items-center border-t border-line pt-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold">Stock Level *</label>
                          <input type="number" required min="0" value={prodStock} onChange={(e) => setProdStock(e.target.value === "" ? "" : Number(e.target.value))} className="rounded-md border border-line bg-ivory px-3 py-2 text-sm text-ink outline-none focus:border-zari" />
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <input type="checkbox" id="isActive" checked={prodIsActive} onChange={(e) => setProdIsActive(e.target.checked)} className="w-4 h-4 accent-zari" />
                          <label htmlFor="isActive" className="text-sm font-semibold cursor-pointer">Visible in Store (Active)</label>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <input type="checkbox" id="isSale" checked={prodIsSale} onChange={(e) => setProdIsSale(e.target.checked)} className="w-4 h-4 accent-zari" />
                          <label htmlFor="isSale" className="text-sm font-semibold cursor-pointer">Show "Live On Sale" badge</label>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <input type="checkbox" id="showSize" checked={prodShowSize} onChange={(e) => setProdShowSize(e.target.checked)} className="w-4 h-4 accent-zari" />
                          <label htmlFor="showSize" className="text-sm font-semibold cursor-pointer">Show sizes on product card</label>
                        </div>
                      </div>

                      {/* Product Images uploads (Cloudinary integrated) */}
                      <div className="border-t border-line pt-4 space-y-4">
                        <h4 className="font-semibold text-sm">Product Images (Cloudinary)</h4>
                        
                        <div className="flex items-center gap-4">
                          <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-line rounded-md text-sm font-medium hover:bg-cream transition-colors ${uploadingImage ? "opacity-50 pointer-events-none" : ""}`}>
                            <ImageIcon className="w-4 h-4 text-zari" />
                            {uploadingImage ? "Uploading images..." : "Upload Images (Max 10)"}
                            <input type="file" accept="image/*" multiple onChange={handleProductImageUpload} className="hidden" />
                          </label>
                        </div>

                        {prodImages.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[10px] text-taupe">Drag and drop images (or use the arrow buttons) to rearrange their display order. The first image is the primary thumbnail.</p>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                              {prodImages.map((url, index) => (
                                <div 
                                  key={index} 
                                  draggable
                                  onDragStart={() => handleImgDragStart(index)}
                                  onDragOver={handleImgDragOver}
                                  onDrop={() => handleImgDrop(index)}
                                  className={`relative aspect-square border rounded-md overflow-hidden bg-cream group cursor-grab active:cursor-grabbing transition-all duration-200 ${
                                    draggedImgIndex === index ? "border-zari ring-2 ring-zari opacity-50" : "border-line"
                                  }`}
                                >
                                  <Image src={url} alt="Product" fill className="object-cover pointer-events-none" />
                                  <button 
                                    type="button" 
                                    onClick={() => removeProductImage(index)} 
                                    className="absolute top-1 right-1 bg-danger text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>

                                  {/* Left/Right swap buttons */}
                                  <div className="absolute inset-x-0 bottom-1 flex justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity max-md:opacity-100 z-10">
                                    {index > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => moveProductImage(index, "left")}
                                        className="bg-ink/80 hover:bg-ink text-white p-0.5 rounded cursor-pointer"
                                      >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <div />
                                    )}
                                    {index < prodImages.length - 1 ? (
                                      <button
                                        type="button"
                                        onClick={() => moveProductImage(index, "right")}
                                        className="bg-ink/80 hover:bg-ink text-white p-0.5 rounded cursor-pointer"
                                      >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <div />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-taupe italic">No images uploaded yet. The first image will be the primary storefront listing image.</p>
                        )}
                      </div>

                      {/* Product Sizing & Coloring Variants Management */}
                      <div className="border-t border-line pt-4 space-y-4">
                        <h4 className="font-semibold text-sm">Product Variants (Size / Color)</h4>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end bg-cream/50 p-4 rounded-md border border-line">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-taupe">Size (e.g. M, L, 2 Metre)</label>
                            <input type="text" placeholder="e.g. 2m" value={newVarSize} onChange={(e) => setNewVarSize(e.target.value)} className="rounded border border-line bg-white px-2 py-1 text-xs outline-none" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-taupe">Color (e.g. White, Red)</label>
                            <input type="text" placeholder="e.g. Gold Border" value={newVarColor} onChange={(e) => setNewVarColor(e.target.value)} className="rounded border border-line bg-white px-2 py-1 text-xs outline-none" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-taupe">SKU Code (Auto if empty)</label>
                            <input type="text" placeholder="Custom SKU" value={newVarSku} onChange={(e) => setNewVarSku(e.target.value)} className="rounded border border-line bg-white px-2 py-1 text-xs outline-none" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-taupe">Variant Stock</label>
                            <input type="number" min="0" value={newVarStock} onChange={(e) => setNewVarStock(e.target.value === "" ? "" : Number(e.target.value))} className="rounded border border-line bg-white px-2 py-1 text-xs outline-none h-[26px]" />
                          </div>
                          <button type="button" onClick={addProductVariant} className="bg-ink text-ivory px-3 py-1.5 rounded text-xs font-bold hover:bg-zari transition-colors h-[26px] flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Variant
                          </button>
                        </div>

                        {prodVariants.length > 0 ? (
                          <div className="border border-line rounded-md overflow-hidden bg-white text-xs">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-cream border-b border-line text-taupe font-medium">
                                  <th className="p-2">Size</th>
                                  <th className="p-2">Color</th>
                                  <th className="p-2">SKU Code</th>
                                  <th className="p-2 text-center w-24">Stock</th>
                                  <th className="p-2 text-center w-12">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {prodVariants.map((v, index) => (
                                  <tr key={index} className="border-b border-line hover:bg-ivory/35">
                                    <td className="p-2">
                                      <input 
                                        type="text" 
                                        placeholder="Size" 
                                        value={v.size || ""} 
                                        onChange={(e) => updateVariantField(index, "size", e.target.value || null)} 
                                        className="w-full rounded border border-line bg-white px-2 py-1 outline-none text-ink text-xs focus:border-zari"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input 
                                        type="text" 
                                        placeholder="Color" 
                                        value={v.color || ""} 
                                        onChange={(e) => updateVariantField(index, "color", e.target.value || null)} 
                                        className="w-full rounded border border-line bg-white px-2 py-1 outline-none text-ink text-xs focus:border-zari"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input 
                                        type="text" 
                                        placeholder="SKU Code" 
                                        value={v.sku || ""} 
                                        onChange={(e) => updateVariantField(index, "sku", e.target.value || null)} 
                                        className="w-full rounded border border-line bg-white px-2 py-1 outline-none text-ink text-xs font-mono focus:border-zari"
                                      />
                                    </td>
                                    <td className="p-2 text-center">
                                      <input 
                                        type="number" 
                                        min="0" 
                                        value={v.stock === "" ? "" : v.stock} 
                                        onChange={(e) => updateVariantField(index, "stock", e.target.value === "" ? "" : Number(e.target.value))} 
                                        className="w-20 mx-auto rounded border border-line bg-white px-2 py-1 outline-none text-ink text-center text-xs font-bold focus:border-zari"
                                      />
                                    </td>
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeProductVariant(index)} className="text-danger hover:text-danger/80 cursor-pointer">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-taupe italic">No specific size/color variants defined. The global product stock will be sold.</p>
                        )}
                      </div>

                      <div className="flex justify-end gap-3 border-t border-line pt-4">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowProductForm(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="gold" size="sm" disabled={!isProductModified()}>
                          Save Product Details
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {products.some((p: any) => p.id.startsWith("default-p")) && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-card text-xs leading-relaxed">
                    ⚠️ <strong>Showing default product templates</strong>. The database catalog is currently empty. Click the edit icon (pencil) next to any product template and save it to write that product as a custom entry in your database.
                  </div>
                )}

                {/* Catalog Table */}
                <div className="bg-white border border-line rounded-card overflow-hidden shadow-soft">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-cream border-b border-line text-taupe font-medium">
                          <th className="p-4">Product details</th>
                          <th className="p-4">Category</th>
                          <th className="p-4 text-right">Price</th>
                          <th className="p-4 text-center">Stock</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-center w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p: any) => (
                          <tr key={p.id} className="border-b border-line hover:bg-ivory/50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 rounded border overflow-hidden flex-shrink-0 bg-cream">
                                  {p.product_images?.[0] ? (
                                    <Image src={p.product_images[0].url} alt="" fill className="object-cover" />
                                  ) : (
                                    <ShoppingCart className="w-6 h-6 m-3 text-muted" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-ink leading-tight">{p.name}</p>
                                  <p className="text-xs text-taupe font-mono mt-0.5">slug: {p.slug}</p>
                                  {p.is_on_sale && <span className="inline-block bg-danger/10 text-danger text-[10px] font-bold px-1.5 py-0.2 rounded mt-1 uppercase">Sale</span>}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-taupe">
                              {p.categories?.name || <span className="italic text-muted">Uncategorized</span>}
                            </td>
                            <td className="p-4 text-right font-medium">
                              <div>{formatRupees(p.price_paise)}</div>
                              {p.compare_at_paise && <div className="text-xs text-muted line-through mt-0.5">{formatRupees(p.compare_at_paise)}</div>}
                            </td>
                            <td className="p-4 text-center font-semibold">
                              <div className={`${p.stock === 0 ? "text-danger" : p.stock < 5 ? "text-amber-800" : "text-ink"}`}>{p.stock} units</div>
                              <span className="text-[10px] text-taupe font-normal">{p.product_variants?.length || 0} variants</span>
                            </td>
                            <td className="p-4 text-center">
                              <button onClick={() => toggleProductActive(p)} className={`inline-block px-2.5 py-0.5 text-xs rounded-full font-medium cursor-pointer transition-colors ${
                                p.is_active ? "bg-success/10 text-success hover:bg-danger/10 hover:text-danger" : "bg-danger/10 text-danger hover:bg-success/10 hover:text-success"
                              }`}>
                                {p.is_active ? "Active" : "Disabled"}
                              </button>
                            </td>
                            <td className="p-4 text-center">
                               <div className="flex justify-center items-center gap-1.5">
                                 <button onClick={() => openEditProduct(p)} className="p-2 border border-line rounded bg-cream/35 hover:bg-cream text-ink cursor-pointer hover:border-zari inline-flex items-center" title="Edit Product">
                                   <Edit2 className="w-4 h-4" />
                                 </button>
                                 {!p.id.startsWith("default-p") && (
                                   <button onClick={() => handleDeleteProduct(p)} className="p-2 border border-line rounded bg-danger/10 hover:bg-danger text-danger hover:text-white cursor-pointer hover:border-danger inline-flex items-center" title="Delete Product">
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 )}
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Orders registry list tab */}
            {activeTab === "orders" && (
              <div className="space-y-6 animate-fade-up">
                {selectedOrder ? (
                  /* Dedicated Full-Screen Order Details & Editing Section */
                  <div className="bg-white border-2 border-zari rounded-card p-6 shadow-lift space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-line pb-3">
                      <div>
                        <h3 className="font-display text-lg sm:text-xl text-ink">Manage Order: {selectedOrder.order_number}</h3>
                        <p className="text-xs text-taupe mt-0.5">Placed on: {new Date(selectedOrder.placed_at).toLocaleString("en-IN")}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => printInvoice({ ...selectedOrder, shipping_address: orderAddress, tracking_id: orderTrackingId, courier_tracking_url: orderTrackingUrl })} className="flex-1 sm:flex-none p-2 border border-line rounded bg-cream hover:bg-beige text-ink flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer" title="Print Invoice">
                          <Printer className="w-4 h-4" /> Invoice
                        </button>
                        <button onClick={() => printPackingSlip({ ...selectedOrder, shipping_address: orderAddress, tracking_id: orderTrackingId, courier_tracking_url: orderTrackingUrl })} className="flex-1 sm:flex-none p-2 border border-line rounded bg-cream hover:bg-beige text-ink flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer" title="Print Packing Slip">
                          <Printer className="w-4 h-4" /> Packing Slip
                        </button>
                        <button onClick={() => setSelectedOrder(null)} className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-xs font-semibold text-taupe hover:text-ink px-2.5 py-2 border border-line rounded bg-white transition-colors cursor-pointer">
                          <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleUpdateOrder} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Left: order status update */}
                      <div className="space-y-4 bg-cream/35 p-4 rounded-md border border-line">
                        <h4 className="font-semibold text-sm text-zari-deep border-b border-line pb-2">Logistics Control</h4>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-taupe">Order Status</label>
                          <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none">
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="packed">Packed</option>
                            <option value="shipped">Shipped</option>
                            <option value="out_for_delivery">Out For Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="returned">Returned</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>

                        {orderStatus === "rejected" && (
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-danger">Reason for Rejection (shown to customer)</label>
                            <textarea
                              required
                              placeholder="e.g. Out of stock, unable to verify address, payment issue..."
                              value={orderRejectionReason}
                              onChange={(e) => setOrderRejectionReason(e.target.value)}
                              rows={3}
                              className="rounded border border-danger/40 bg-danger/5 px-3 py-1.5 text-xs outline-none focus:border-danger"
                            />
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-taupe">Courier Tracking ID</label>
                          <input type="text" placeholder="Tracking ID" value={orderTrackingId} onChange={(e) => setOrderTrackingId(e.target.value)} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-taupe">Tracking URL</label>
                          <input type="url" placeholder="https://..." value={orderTrackingUrl} onChange={(e) => setOrderTrackingUrl(e.target.value)} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-taupe">Internal Audit Note</label>
                          <textarea placeholder="Reason for change..." value={orderNote} onChange={(e) => setOrderNote(e.target.value)} rows={2} className="rounded border border-line bg-white px-3 py-1.5 text-xs outline-none" />
                        </div>

                        <Button type="submit" variant="gold" size="sm" className="w-full">
                          Save Order Settings
                        </Button>
                      </div>

                      {/* Middle: shipping address edit */}
                      <div className="space-y-4 bg-cream/35 p-4 rounded-md border border-line">
                        <h4 className="font-semibold text-sm text-zari-deep border-b border-line pb-2">Edit Shipping Address</h4>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-taupe">Recipient Name</label>
                          <input type="text" required value={orderAddress.recipient || ""} onChange={(e) => setOrderAddress({...orderAddress, recipient: e.target.value})} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-taupe">Line 1 (Street)</label>
                          <input type="text" required value={orderAddress.line1 || ""} onChange={(e) => setOrderAddress({...orderAddress, line1: e.target.value})} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-taupe">Line 2 (Area/Apt)</label>
                          <input type="text" value={orderAddress.line2 || ""} onChange={(e) => setOrderAddress({...orderAddress, line2: e.target.value})} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none" />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-taupe">City</label>
                            <input type="text" required value={orderAddress.city || ""} onChange={(e) => setOrderAddress({...orderAddress, city: e.target.value})} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-taupe">District</label>
                            <input type="text" required value={orderAddress.district || ""} onChange={(e) => setOrderAddress({...orderAddress, district: e.target.value})} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-taupe">State</label>
                            <input type="text" required value={orderAddress.state || ""} onChange={(e) => setOrderAddress({...orderAddress, state: e.target.value})} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-taupe">Pincode</label>
                            <input type="text" required value={orderAddress.pincode || ""} onChange={(e) => setOrderAddress({...orderAddress, pincode: e.target.value})} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-taupe">Mobile</label>
                            <input type="tel" required value={orderAddress.phone || ""} onChange={(e) => setOrderAddress({...orderAddress, phone: e.target.value})} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-taupe">Alt Mobile</label>
                            <input type="tel" value={orderAddress.alternate_phone || ""} onChange={(e) => setOrderAddress({...orderAddress, alternate_phone: e.target.value})} className="rounded border border-line bg-white px-3 py-1.5 text-sm outline-none" />
                          </div>
                        </div>
                      </div>

                      {/* Right: order details summary */}
                      <div className="space-y-4 text-sm">
                        <h4 className="font-semibold text-sm text-ink border-b border-line pb-2">Invoice Summary</h4>
                        
                        <div className="space-y-2">
                          {selectedOrder.order_items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-start text-xs border-b border-line pb-1.5">
                              <div>
                                <p className="font-semibold text-ink">{item.name}</p>
                                <p className="text-taupe mt-0.5">{item.variant || "Standard variant"} &times; {item.quantity}</p>
                              </div>
                              <span className="font-medium">{formatRupees(item.unit_price_paise * item.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1.5 text-xs text-taupe border-t border-line pt-2">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>{formatRupees(selectedOrder.subtotal_paise)}</span>
                          </div>
                          {selectedOrder.discount_paise > 0 && (
                            <div className="flex justify-between text-danger">
                              <span>Coupon Discount:</span>
                              <span>-{formatRupees(selectedOrder.discount_paise)}</span>
                            </div>
                          )}
                          {selectedOrder.wallet_used_paise > 0 && (
                            <div className="flex justify-between text-danger">
                              <span>Wallet Used:</span>
                              <span>-{formatRupees(selectedOrder.wallet_used_paise)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Shipping Charge:</span>
                            <span>{selectedOrder.shipping_paise === 0 ? "FREE" : formatRupees(selectedOrder.shipping_paise)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-ink text-sm border-t border-line pt-1.5">
                            <span>Paid Total:</span>
                            <span>{formatRupees(selectedOrder.total_paise)}</span>
                          </div>
                        </div>

                        <div className="border border-line rounded p-3 bg-ivory text-xs text-taupe space-y-1">
                          <p><strong>Razorpay Order:</strong> {selectedOrder.razorpay_order_id || "—"}</p>
                          <p><strong>Razorpay Payment:</strong> {selectedOrder.razorpay_payment_id || "—"}</p>
                          <p><strong>Customer User ID:</strong> <span className="font-sans font-bold tracking-wider text-zari-deep bg-cream/50 px-1.5 py-0.5 rounded border border-zari/10">{selectedOrder.profiles?.user_id || "—"}</span></p>
                          <p><strong>Customer Profile Email:</strong> {selectedOrder.profiles?.email || "—"}</p>
                        </div>
                      </div>
                    </form>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <p className="text-xs text-taupe">Look up any single order by its Order Number or Order ID and download a full one-page detail sheet — handy for emergency/offline reference.</p>
                      <Button size="sm" variant="outline" onClick={() => { setEmergencyLookupQuery(""); setEmergencyLookupOpen(true); }} className="flex-shrink-0">
                        <Download className="w-4 h-4" /> Download Order Detail (PDF)
                      </Button>
                    </div>

                    <div className="relative w-full">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-muted" />
                      <input
                        type="text"
                        placeholder="Search orders by number, customer name, email, or courier status..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="w-full rounded-pill border border-line bg-white pl-9 pr-4 py-2 text-sm text-ink outline-none focus:border-zari"
                      />
                    </div>

                    {/* Order Status Filters */}
                    <div className="flex flex-wrap gap-2 py-1">
                      <StatusFilterButton active={orderStatusFilter === "all"} onClick={() => setOrderStatusFilter("all")} label="All Orders" count={orders.length} />
                      <StatusFilterButton active={orderStatusFilter === "pending"} onClick={() => setOrderStatusFilter("pending")} label="Pending" count={orders.filter(o => o.status === "pending").length} />
                      <StatusFilterButton active={orderStatusFilter === "confirmed"} onClick={() => setOrderStatusFilter("confirmed")} label="Confirmed / Packed" count={orders.filter(o => ["confirmed", "packed"].includes(o.status)).length} />
                      <StatusFilterButton active={orderStatusFilter === "shipped"} onClick={() => setOrderStatusFilter("shipped")} label="Shipped" count={orders.filter(o => ["shipped", "out_for_delivery"].includes(o.status)).length} />
                      <StatusFilterButton active={orderStatusFilter === "delivered"} onClick={() => setOrderStatusFilter("delivered")} label="Delivered" count={orders.filter(o => o.status === "delivered").length} />
                      <StatusFilterButton active={orderStatusFilter === "returned"} onClick={() => setOrderStatusFilter("returned")} label="Returned" count={orders.filter(o => o.status === "returned").length} />
                      <StatusFilterButton active={orderStatusFilter === "rejected"} onClick={() => setOrderStatusFilter("rejected")} label="Rejected" count={orders.filter(o => o.status === "rejected").length} />
                    </div>

                    {/* Orders Registry Table */}
                    <div className="bg-white border border-line rounded-card overflow-hidden shadow-soft">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="bg-cream border-b border-line text-taupe font-medium">
                              <th className="p-4">Order Number</th>
                              <th className="p-4">Customer</th>
                              <th className="p-4 text-center">Status</th>
                              <th className="p-4 text-center">Payment Status</th>
                              <th className="p-4 text-right">Paid Total</th>
                              <th className="p-4 text-center">Date Placed</th>
                              <th className="p-4 text-center w-16">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrders.map((o: any) => (
                              <tr key={o.id} className="border-b border-line hover:bg-ivory/50">
                                <td className="p-4 font-semibold text-ink">{o.order_number}</td>
                                <td className="p-4">
                                  <p className="font-medium">{o.profiles?.full_name || "Guest Checkout"}</p>
                                  <p className="text-xs text-taupe flex flex-wrap items-center gap-1.5">
                                    <span>{o.profiles?.email || "—"}</span>
                                    {o.profiles?.user_id && <span className="text-[10px] bg-cream text-zari-deep px-1.5 py-0.5 rounded font-sans font-bold tracking-wider border border-zari/10">ID: {o.profiles.user_id}</span>}
                                  </p>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`inline-block px-2.5 py-0.5 text-xs rounded-full font-medium uppercase ${
                                    o.status === "delivered" ? "bg-success/15 text-success" :
                                    o.status === "rejected" ? "bg-danger/15 text-danger" :
                                    o.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-800"
                                  }`}>
                                    {o.status}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`inline-block px-2 py-0.5 text-xs rounded font-bold uppercase ${
                                    o.payment_status === "paid" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                                  }`}>
                                    {o.payment_status}
                                  </span>
                                </td>
                                <td className="p-4 text-right font-semibold">{formatRupees(o.total_paise)}</td>
                                <td className="p-4 text-center text-taupe text-xs">
                                  {new Date(o.placed_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => inspectOrder(o)} className="p-1 border border-line rounded bg-cream hover:bg-beige text-ink cursor-pointer" title="Inspect / Manage Order">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => promptDeleteOrder(o)} className="p-1 border border-line rounded bg-white hover:bg-danger/10 text-danger cursor-pointer" title="Delete Order">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Refunds Management Module */}
            {activeTab === "refunds" && (
              <div className="space-y-6 animate-fade-up font-sans text-xs">
                <div>
                  <h2 className="font-display text-2xl text-ink">Refund Management</h2>
                  <p className="text-xs text-taupe mt-1">Manage refunds for returned or rejected orders. Upload payment screenshots and transaction details.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left list of returned/rejected orders */}
                  <div className="xl:col-span-2 space-y-4">
                    <div className="bg-white border border-line rounded-card shadow-soft p-4">
                      <h3 className="font-semibold text-sm mb-3">Returned & Rejected Orders</h3>
                      
                      {orders.filter(o => o.status === "returned" || o.status === "rejected").length === 0 ? (
                        <div className="py-8 text-center text-xs text-taupe">
                          No returned or rejected orders found in the registry.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {orders
                            .filter(o => o.status === "returned" || o.status === "rejected")
                            .map((order) => {
                              const isRefunded = order.payment_status === "refunded";
                              return (
                                <div 
                                  key={order.id} 
                                  className={`p-4 border rounded-lg transition-all ${
                                    selectedRefundOrder?.id === order.id 
                                      ? "border-zari bg-cream/10" 
                                      : "border-line/60 bg-ivory/5 hover:border-line"
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                      <p className="font-mono text-xs font-bold text-ink">{order.order_number}</p>
                                      <p className="text-[11px] text-taupe">
                                        Placed: {new Date(order.placed_at).toLocaleDateString()} | Customer: {order.profiles?.full_name || order.profiles?.email || "Guest"}
                                      </p>
                                      <p className="text-xs font-semibold text-ink">
                                        Amount: {formatRupees(order.total_paise)}
                                      </p>
                                      {order.rejection_reason && (
                                        <p className="text-[11px] bg-danger/5 text-danger px-2 py-1 rounded inline-block">
                                          Reason: {order.rejection_reason}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        order.status === "returned" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"
                                      }`}>
                                        {order.status}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        isRefunded ? "bg-success/10 text-success" : "bg-muted text-taupe"
                                      }`}>
                                        {order.payment_status}
                                      </span>
                                      
                                      <button
                                        onClick={() => {
                                          setSelectedRefundOrder(order);
                                          setRefundPaymentStatus(order.payment_status);
                                          setRefundAmountRupees(String(order.refund_amount_paise ? order.refund_amount_paise / 100 : order.total_paise / 100));
                                          setRefundTransactionId(order.refund_transaction_id || "");
                                          setRefundNoteText(order.refund_note || "");
                                          setRefundScreenshotUrl(order.refund_screenshot_url || "");
                                        }}
                                        className="mt-2 text-xs text-zari hover:underline font-semibold flex items-center gap-1 cursor-pointer focus:outline-none"
                                      >
                                        {isRefunded ? <Edit2 className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                        {isRefunded ? "Edit Refund Info" : "Process Refund"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right refund form pane */}
                  <div className="xl:col-span-1">
                    {selectedRefundOrder ? (
                      <div className="bg-white border border-line rounded-card shadow-soft p-4 space-y-4 sticky top-6">
                        <div className="flex justify-between items-center pb-2 border-b border-line">
                          <h3 className="font-semibold text-sm text-ink">
                            Process Refund: {selectedRefundOrder.order_number}
                          </h3>
                          <button 
                            onClick={() => setSelectedRefundOrder(null)} 
                            className="text-taupe hover:text-ink text-xs cursor-pointer focus:outline-none"
                          >
                            Close
                          </button>
                        </div>

                        <form 
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!selectedRefundOrder) return;
                            
                            const amtPaise = Math.round(Number(refundAmountRupees) * 100);
                            if (isNaN(amtPaise) || amtPaise < 0) {
                              alert("Please enter a valid refund amount.");
                              return;
                            }

                            try {
                              const res = await fetch("/api/admin/orders", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  id: selectedRefundOrder.id,
                                  payment_status: refundPaymentStatus,
                                  refund_amount_paise: amtPaise,
                                  refund_transaction_id: refundTransactionId.trim() || null,
                                  refund_screenshot_url: refundScreenshotUrl.trim() || null,
                                  refund_note: refundNoteText.trim() || null,
                                  note: `Refund updated: status set to '${refundPaymentStatus}', amount: ${formatRupees(amtPaise)}`
                                })
                              });

                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                throw new Error(data.error || "Failed to update refund");
                              }
                              alert("Refund details saved successfully!");
                              setSelectedRefundOrder(null);
                              await refreshOrders();
                            } catch (err: any) {
                              alert("Error updating refund: " + err.message);
                            }
                          }} 
                          className="space-y-4 text-xs"
                        >
                          <div className="flex flex-col gap-1">
                            <label className="font-semibold text-ink">Payment Status</label>
                            <select 
                              value={refundPaymentStatus} 
                              onChange={(e) => setRefundPaymentStatus(e.target.value)}
                              className="rounded border border-line bg-white px-3 py-2 outline-none cursor-pointer"
                            >
                              <option value="paid">Paid (Not Refunded)</option>
                              <option value="refunded">Refunded (Processed)</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="font-semibold text-ink">Refund Amount (₹)</label>
                            <input 
                              type="number" 
                              required
                              value={refundAmountRupees} 
                              onChange={(e) => setRefundAmountRupees(e.target.value)}
                              className="rounded border border-line bg-white px-3 py-2 outline-none"
                              placeholder="e.g. 498"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="font-semibold text-ink">Transaction ID / Reference</label>
                            <input 
                              type="text" 
                              value={refundTransactionId} 
                              onChange={(e) => setRefundTransactionId(e.target.value)}
                              className="rounded border border-line bg-white px-3 py-2 outline-none"
                              placeholder="e.g. TXN18283921"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="font-semibold text-ink">Internal Notes</label>
                            <textarea 
                              value={refundNoteText} 
                              onChange={(e) => setRefundNoteText(e.target.value)}
                              rows={3}
                              className="rounded border border-line bg-white px-3 py-2 outline-none resize-none"
                              placeholder="Refund notes..."
                            />
                          </div>

                          {/* Screenshot Proof Uploader (Cloudinary) */}
                          <div className="border-t border-line/60 pt-3 flex flex-col gap-2">
                            <label className="font-semibold text-ink">Refund Receipt / Screenshot</label>
                            
                            {refundScreenshotUrl ? (
                              <div className="relative aspect-[4/3] border border-line rounded bg-cream overflow-hidden group">
                                <Image src={refundScreenshotUrl} alt="Refund Screenshot" fill className="object-contain" />
                                <button 
                                  type="button" 
                                  onClick={() => setRefundScreenshotUrl("")} 
                                  className="absolute top-1.5 right-1.5 bg-danger text-white rounded-full p-1 shadow hover:bg-danger-hover cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <label className={`cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-line rounded bg-cream/10 text-[11px] font-medium hover:bg-cream transition-colors text-taupe ${uploadingScreenshot ? "opacity-50 pointer-events-none" : ""}`}>
                                  <ImageIcon className="w-4 h-4 text-zari" />
                                  {uploadingScreenshot ? "Uploading screenshot..." : "Upload Screenshot Proof"}
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;

                                      setUploadingScreenshot(true);
                                      try {
                                        const formData = new FormData();
                                        formData.append("file", file);

                                        const res = await fetch("/api/admin/products/upload-image", {
                                          method: "POST",
                                          body: formData
                                        });

                                        if (!res.ok) {
                                          const errorData = await res.json().catch(() => ({}));
                                          throw new Error(errorData.error || "Upload failed");
                                        }

                                        const data = await res.json();
                                        setRefundScreenshotUrl(data.url);
                                      } catch (err: any) {
                                        alert("Screenshot upload failed: " + err.message);
                                      } finally {
                                        setUploadingScreenshot(false);
                                      }
                                    }} 
                                    className="hidden" 
                                  />
                                </label>
                              </div>
                            )}
                          </div>

                          <Button 
                            type="submit" 
                            variant="gold" 
                            size="md" 
                            className="w-full mt-2"
                            disabled={uploadingScreenshot}
                          >
                            Save Refund Details
                          </Button>
                        </form>
                      </div>
                    ) : (
                      <div className="bg-cream/15 border border-dashed border-line rounded-card p-6 text-center text-xs text-taupe">
                        Select an order from the list to process and issue its refund.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* User Inspector Module */}
            {activeTab === "user-inspector" && (
              <div className="space-y-6 animate-fade-up font-sans text-xs">
                <div>
                  <h2 className="font-display text-2xl text-ink font-bold">User Inspector</h2>
                  <p className="text-xs text-taupe mt-1">Search a user by User ID to view their complete account profile, saved addresses, wallet/cashback balance, transactions, and order history.</p>
                </div>

                {/* Email Search Card */}
                <div className="bg-white border border-line rounded-card shadow-soft p-5 max-w-xl">
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setInspectError("");
                      setInspectedUser(null);
                      if (!inspectUserId.trim()) return;

                      setInspectLoading(true);
                      try {
                        const res = await fetch(`/api/admin/users/inspect?userId=${encodeURIComponent(inspectUserId.trim().toUpperCase())}`);
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error || "User search failed");
                        }
                        const data = await res.json();
                        setInspectedUser(data);
                      } catch (err: any) {
                        setInspectError(err.message);
                      } finally {
                        setInspectLoading(false);
                      }
                    }} 
                    className="flex gap-3 items-end"
                  >
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="font-semibold text-ink">Search User ID</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 48201538" 
                        value={inspectUserId}
                        onChange={(e) => setInspectUserId(e.target.value)}
                        className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-zari w-full font-sans font-bold tracking-wider uppercase"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      variant="gold" 
                      size="md" 
                      disabled={inspectLoading}
                      className="cursor-pointer"
                    >
                      {inspectLoading ? "Searching..." : "Inspect User"}
                    </Button>
                  </form>
                  {inspectError && (
                    <div className="mt-3 p-3 bg-danger/5 border border-danger/25 text-danger rounded text-xs">
                      {inspectError}
                    </div>
                  )}
                </div>

                {/* Inspected User Panel */}
                {inspectedUser && (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* User Summary Widget Strip */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Name Card */}
                      <div className="bg-white border border-line rounded-card p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zari-tint/20 flex items-center justify-center text-zari font-bold text-lg uppercase">
                          {inspectedUser.profile.full_name?.[0] || inspectedUser.profile.email?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-ink">{inspectedUser.profile.full_name || "Name not set"}</p>
                          <p className="text-[10px] text-taupe">{inspectedUser.profile.email}</p>
                        </div>
                      </div>

                      {/* Wallet Card */}
                      <div className="bg-white border border-line rounded-card p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-taupe uppercase tracking-wider font-semibold">Wallet Cashback Balance</p>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <p className="font-display text-lg text-success font-bold">
                              {formatRupees(inspectedUser.wallet.balance_paise)}
                            </p>
                            <button
                              onClick={() => {
                                setWalletAdjustOpen(true);
                                setWalletAdjustAmount("");
                                setWalletAdjustNote("");
                                setWalletAdjustError("");
                              }}
                              className="text-[10px] text-zari hover:underline font-bold uppercase tracking-wider cursor-pointer"
                            >
                              Adjust
                            </button>
                          </div>
                        </div>
                        <div className="px-2.5 py-1 bg-success/10 text-success rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Active
                        </div>
                      </div>

                      {/* Info Summary Card */}
                      <div className="bg-white border border-line rounded-card p-4">
                        <h4 className="font-semibold text-xs text-zari-deep uppercase tracking-wider mb-2">Account Meta</h4>
                        <div className="space-y-1.5 font-medium">
                          <p className="text-[10px] text-taupe"><strong>User ID:</strong> <span className="font-sans font-bold tracking-wider text-zari-deep bg-cream/50 px-1.5 py-0.5 rounded border border-zari/10">{inspectedUser.profile.user_id || "—"}</span></p>
                          <p className="text-[10px] text-taupe"><strong>Member Since:</strong> {new Date(inspectedUser.profile.created_at).toLocaleDateString()}</p>
                          <p className="text-[10px] text-taupe"><strong>Phone Number:</strong> {inspectedUser.profile.phone || "None"}</p>
                          <p className="text-[10px] text-taupe"><strong>Auth Method:</strong> <span className="capitalize">{inspectedUser.profile.provider}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Website Usage */}
                    <div className="bg-white border border-line rounded-card p-4 shadow-soft">
                      <h3 className="font-semibold text-sm text-ink pb-2 border-b border-line mb-3">Website Usage</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[10px] text-taupe uppercase tracking-wider font-semibold">Visits (Sessions)</p>
                          <p className="font-display text-lg text-ink font-bold mt-0.5">{inspectedUser.usage.totalSessions}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-taupe uppercase tracking-wider font-semibold">Time Spent</p>
                          <p className="font-display text-lg text-ink font-bold mt-0.5">{formatDuration(inspectedUser.usage.totalSecondsSpent)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-taupe uppercase tracking-wider font-semibold">Pages Viewed</p>
                          <p className="font-display text-lg text-ink font-bold mt-0.5">{inspectedUser.usage.totalPageViews}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-taupe uppercase tracking-wider font-semibold">Last Visit</p>
                          <p className="font-display text-lg text-ink font-bold mt-0.5">
                            {inspectedUser.usage.lastVisitAt ? new Date(inspectedUser.usage.lastVisitAt).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Lifetime Stats */}
                    <div className="bg-white border border-line rounded-card p-4 shadow-soft">
                      <h3 className="font-semibold text-sm text-ink pb-2 border-b border-line mb-3">Lifetime Stats</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        <div>
                          <p className="text-[10px] text-taupe uppercase tracking-wider font-semibold">Lifetime Orders</p>
                          <p className="font-display text-lg text-ink font-bold mt-0.5">{inspectedUser.lifetime.orders}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-taupe uppercase tracking-wider font-semibold">Lifetime Spent</p>
                          <p className="font-display text-lg text-ink font-bold mt-0.5">{formatRupees(inspectedUser.lifetime.spentPaise)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-taupe uppercase tracking-wider font-semibold">Cashback Earned</p>
                          <p className="font-display text-lg text-success font-bold mt-0.5">{formatRupees(inspectedUser.lifetime.cashbackEarnedPaise)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-taupe uppercase tracking-wider font-semibold">Lifetime Returns</p>
                          <p className="font-display text-lg text-zari-deep font-bold mt-0.5">{inspectedUser.lifetime.returns}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-taupe uppercase tracking-wider font-semibold">Lifetime Rejected</p>
                          <p className="font-display text-lg text-danger font-bold mt-0.5">{inspectedUser.lifetime.rejected}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                      
                      {/* Left: Saved Addresses (1/3) */}
                      <div className="xl:col-span-1 space-y-4">
                        <div className="bg-white border border-line rounded-card p-4 shadow-soft">
                          <h3 className="font-semibold text-sm text-ink pb-2 border-b border-line mb-3">
                            Saved Addresses ({inspectedUser.addresses.length})
                          </h3>
                          {inspectedUser.addresses.length === 0 ? (
                            <p className="text-taupe py-4 text-center">No saved addresses found.</p>
                          ) : (
                            <div className="space-y-3">
                              {inspectedUser.addresses.map((addr: any) => (
                                <div key={addr.id} className="p-3 border border-line/60 bg-ivory/5 rounded-md text-xs relative">
                                  {addr.is_default && (
                                    <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-zari/10 text-zari text-[9px] font-bold rounded uppercase">
                                      Default
                                    </span>
                                  )}
                                  <p className="font-bold text-ink">{addr.recipient}</p>
                                  <p className="text-taupe mt-1">{addr.line1}</p>
                                  {addr.line2 && <p className="text-taupe">{addr.line2}</p>}
                                  <p className="text-taupe">{addr.city}, {addr.state} - <strong>{addr.pincode}</strong></p>
                                  {addr.phone && <p className="text-taupe mt-1.5">📞 {addr.phone}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        </div>

                      {/* Right: Orders and Transaction Ledger (2/3) */}
                      <div className="xl:col-span-2 space-y-6">
                        
                        {/* Order History */}
                        <div className="bg-white border border-line rounded-card p-4 shadow-soft">
                          <h3 className="font-semibold text-sm text-ink pb-2 border-b border-line mb-3">
                            Order Registry ({inspectedUser.orders.length})
                          </h3>
                          {inspectedUser.orders.length === 0 ? (
                            <p className="text-taupe py-4 text-center">No orders placed by this user yet.</p>
                          ) : (
                            <div className="space-y-4">
                              {inspectedUser.orders.map((order: any) => (
                                <div key={order.id} className="border border-line rounded-lg p-4 bg-ivory/5 space-y-3">
                                  <div className="flex justify-between items-start gap-4 pb-2 border-b border-line/40">
                                    <div>
                                      <p className="font-mono font-bold text-ink text-sm">{order.order_number}</p>
                                      <p className="text-[10px] text-taupe mt-0.5">Placed: {new Date(order.placed_at).toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        order.status === "delivered" ? "bg-success/10 text-success" : 
                                        order.status === "rejected" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                                      }`}>
                                        {order.status}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        order.payment_status === "paid" ? "bg-success/10 text-success" : 
                                        order.payment_status === "refunded" ? "bg-info/10 text-info" : "bg-muted text-taupe"
                                      }`}>
                                        {order.payment_status}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Itemized list */}
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-line text-taupe text-[10px]">
                                        <th className="py-1 text-left">Item Name</th>
                                        <th className="py-1 text-center">Qty</th>
                                        <th className="py-1 text-right">Total Price</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {order.order_items?.map((item: any) => (
                                        <tr key={item.id} className="border-b border-line/30 text-ink">
                                          <td className="py-1.5">{item.name} {item.variant && <span className="text-[10px] text-taupe">({item.variant})</span>}</td>
                                          <td className="py-1.5 text-center">{item.quantity}</td>
                                          <td className="py-1.5 text-right">{formatRupees(item.unit_price_paise * item.quantity)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>

                                  {/* Order Totals Summary */}
                                  <div className="flex flex-wrap justify-between items-center text-[11px] pt-1 text-taupe gap-3">
                                    <p>Subtotal: <strong>{formatRupees(order.subtotal_paise)}</strong></p>
                                    {order.discount_paise > 0 && <p>Discount: <strong className="text-danger">-{formatRupees(order.discount_paise)}</strong></p>}
                                    {order.wallet_used_paise > 0 && <p>Wallet Deducted: <strong className="text-danger">-{formatRupees(order.wallet_used_paise)}</strong></p>}
                                    <p>Total Paid: <strong className="text-ink text-xs">{formatRupees(order.total_paise)}</strong></p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Cashback transaction history ledger */}
                        <div className="bg-white border border-line rounded-card p-4 shadow-soft">
                          <h3 className="font-semibold text-sm text-ink pb-2 border-b border-line mb-3">
                            Wallet Cashback Transactions ({inspectedUser.walletTransactions.length})
                          </h3>
                          {inspectedUser.walletTransactions.length === 0 ? (
                            <p className="text-taupe py-4 text-center">No transaction records found for this user.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-line text-taupe text-[10px] uppercase">
                                    <th className="py-1.5 text-left">Date</th>
                                    <th className="py-1.5 text-left">Type</th>
                                    <th className="py-1.5 text-right">Amount</th>
                                    <th className="py-1.5 text-left pl-4">Note / Order</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inspectedUser.walletTransactions.map((txn: any) => {
                                    const isCredit = txn.amount_paise > 0;
                                    return (
                                      <tr key={txn.id} className="border-b border-line/40 hover:bg-cream/10">
                                        <td className="py-2 text-taupe">{new Date(txn.created_at).toLocaleDateString()}</td>
                                        <td className="py-2">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                            txn.type === "cashback_credit" ? "bg-success/10 text-success" : 
                                            txn.type === "redeem" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                                          }`}>
                                            {txn.type.replace("_", " ")}
                                          </span>
                                        </td>
                                        <td className={`py-2 text-right font-bold ${isCredit ? "text-success" : "text-danger"}`}>
                                          {isCredit ? "+" : ""}{formatRupees(txn.amount_paise)}
                                        </td>
                                        <td className="py-2 pl-4 text-taupe">
                                          {txn.note || "Adjustment"} {txn.orders?.order_number && <span className="font-mono font-bold text-ink">({txn.orders.order_number})</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Users lists and signups management */}
            {activeTab === "users" && (
              <div className="space-y-6 animate-fade-up">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted" />
                    <input
                      type="text"
                      placeholder="Search users by name, email, or role..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full rounded-pill border border-line bg-white pl-9 pr-4 py-2 text-sm text-ink outline-none focus:border-zari"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <Button size="sm" variant="gold" onClick={handleExportUsers}>
                      <Download className="w-4 h-4" /> Download Users Excel (CSV)
                    </Button>
                    <Button size="sm" variant="outline" onClick={printUsersPDF}>
                      <Printer className="w-4 h-4" /> Download Users PDF
                    </Button>
                  </div>
                </div>

                <div className="bg-white border border-line rounded-card overflow-hidden shadow-soft">
                  <div className="p-4 border-b border-line bg-cream/25">
                    <p className="text-xs text-taupe font-semibold">"Download Users Excel" generates a fresh CSV export; "Download Users PDF" opens a print-ready summary you can save as a PDF, directly from the live database profiles.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-cream border-b border-line text-taupe font-medium">
                          <th className="p-4">User ID</th>
                          <th className="p-4">Customer Name</th>
                          <th className="p-4">Email Address</th>
                          <th className="p-4">Mobile Number</th>
                          <th className="p-4 text-center">Sign-up Provider</th>
                          <th className="p-4 text-center">Account Role</th>
                          <th className="p-4 text-center">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u: any) => (
                          <tr key={u.id} className="border-b border-line hover:bg-ivory/50">
                            <td className="p-4"><span className="px-2 py-0.5 text-xs rounded bg-cream/50 text-zari-deep border border-zari/10 font-sans font-bold tracking-wider">{u.user_id || "—"}</span></td>
                            <td className="p-4 font-semibold text-ink">{u.full_name || "—"}</td>
                            <td className="p-4 text-taupe">{u.email}</td>
                            <td className="p-4 text-ink font-mono">{u.phone || "—"}</td>
                            <td className="p-4 text-center">
                              <span className={`inline-block px-2 py-0.5 text-xs rounded font-medium ${
                                u.provider === "google" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-800"
                              }`}>
                                {u.provider}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {currentUser?.role === "admin" ? (
                                <select value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)} className="rounded border border-line bg-white px-2 py-1 text-xs outline-none font-semibold cursor-pointer">
                                  <option value="customer">customer</option>
                                  <option value="staff">staff</option>
                                  <option value="admin">admin</option>
                                </select>
                              ) : (
                                <span className="font-semibold text-taupe text-xs capitalize">{u.role}</span>
                              )}
                            </td>
                            <td className="p-4 text-center text-taupe text-xs">
                              {new Date(u.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Coupons / Promo Codes Management Tab */}
            {activeTab === "coupons" && (
              <div className="space-y-6 animate-fade-up">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-display text-lg text-ink">Promo Codes & Coupons</h3>
                    <p className="text-xs text-taupe mt-0.5">Manage promotional discount campaigns and checkout coupon codes</p>
                  </div>
                  <Button size="sm" variant="gold" onClick={() => {
                    if (showCouponForm && editingCoupon) {
                      setEditingCoupon(null);
                      setNewCouponCode(""); setNewCouponValue(0); setNewCouponMinOrder(0);
                      setNewCouponMaxDiscount(0); setNewCouponFirstOrder(false); setNewCouponLimit(0); setNewCouponExpiry("");
                      setShowCouponForm(false);
                    } else {
                      setEditingCoupon(null);
                      setShowCouponForm(!showCouponForm);
                    }
                  }} className="cursor-pointer">
                    <Plus className="w-4 h-4 mr-1" /> {showCouponForm && !editingCoupon ? "Hide Form" : showCouponForm && editingCoupon ? "Cancel Edit" : "Create Promo Code"}
                  </Button>
                </div>

                {showCouponForm && (
                  <form onSubmit={editingCoupon ? handleUpdateCoupon : handleSaveCoupon} className="bg-white border border-line rounded-card p-6 shadow-soft space-y-6">
                    <h4 className="font-semibold text-sm text-zari-deep border-b border-line pb-2">
                      {editingCoupon ? `✏️ Editing: ${editingCoupon.code}` : "New Coupon details"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-taupe uppercase">Promo Code *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. FESTIVE20"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                          className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-zari"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-taupe uppercase">Discount Type</label>
                        <select
                          value={newCouponType}
                          onChange={(e) => setNewCouponType(e.target.value as "percent" | "flat")}
                          className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-zari h-[38px]"
                        >
                          <option value="percent">Percentage (%)</option>
                          <option value="flat">Flat Amount (₹)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-taupe uppercase">
                          Discount Value * {newCouponType === "percent" ? "(%)" : "(₹)"}
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          step="any"
                          value={newCouponValue || ""}
                          onChange={(e) => setNewCouponValue(Number(e.target.value))}
                          className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-zari"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-taupe uppercase">Min Order Amount (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={newCouponMinOrder || ""}
                          onChange={(e) => setNewCouponMinOrder(Number(e.target.value))}
                          className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-zari"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-taupe uppercase">Max Discount Cap (₹) {newCouponType === "flat" && "(Ignored for Flat)"}</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={newCouponType === "flat"}
                          value={newCouponMaxDiscount || ""}
                          onChange={(e) => setNewCouponMaxDiscount(Number(e.target.value))}
                          className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-zari disabled:opacity-50"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-taupe uppercase">Usage Limit (0 or empty = unlimited)</label>
                        <input
                          type="number"
                          min="0"
                          value={newCouponLimit || ""}
                          onChange={(e) => setNewCouponLimit(Number(e.target.value))}
                          className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-zari"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-taupe uppercase">Expiry Date & Time</label>
                        <input
                          type="datetime-local"
                          value={newCouponExpiry}
                          onChange={(e) => setNewCouponExpiry(e.target.value)}
                          className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-zari"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-6">
                        <input
                          type="checkbox"
                          id="firstOrderOnly"
                          checked={newCouponFirstOrder}
                          onChange={(e) => setNewCouponFirstOrder(e.target.checked)}
                          className="w-4 h-4 accent-zari"
                        />
                        <label htmlFor="firstOrderOnly" className="text-sm font-semibold cursor-pointer select-none">
                          First Order Only (e.g. WELCOME10 welcome campaign)
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-line pt-4">
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        setEditingCoupon(null);
                        setNewCouponCode(""); setNewCouponValue(0); setNewCouponMinOrder(0);
                        setNewCouponMaxDiscount(0); setNewCouponFirstOrder(false); setNewCouponLimit(0); setNewCouponExpiry("");
                        setShowCouponForm(false);
                      }}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="gold" size="sm">
                        {editingCoupon ? "Save Changes" : "Create Promo Code"}
                      </Button>
                    </div>
                  </form>
                )}

                <div className="bg-white border border-line rounded-card overflow-hidden shadow-soft">
                  {coupons.length === 0 ? (
                    <div className="p-12 text-center text-sm text-taupe italic">
                      No promo codes configured in the database yet. Click "Create Promo Code" to get started.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm text-left">
                        <thead>
                          <tr className="bg-cream border-b border-line text-taupe font-medium">
                            <th className="p-3">Coupon Code</th>
                            <th className="p-3">Discount Type</th>
                            <th className="p-3 text-right">Value</th>
                            <th className="p-3 text-right">Min Order</th>
                            <th className="p-3 text-right">Max Cap</th>
                            <th className="p-3 text-center">First Order Only</th>
                            <th className="p-3 text-center">Limit</th>
                            <th className="p-3 text-center">Used Count</th>
                            <th className="p-3 text-center">Expiry</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center w-16">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coupons.map((c: any) => (
                            <tr key={c.id} className="border-b border-line hover:bg-ivory/50">
                              <td className="p-3 font-bold font-mono text-ink text-sm tracking-wide uppercase">{c.code}</td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 text-xs rounded font-semibold uppercase ${
                                  c.type === "percent" ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-800"
                                }`}>
                                  {c.type === "percent" ? "Percent" : "Flat"}
                                </span>
                              </td>
                              <td className="p-3 text-right font-semibold text-ink">
                                {c.type === "percent" ? `${c.value}%` : formatRupees(c.value)}
                              </td>
                              <td className="p-3 text-right text-taupe">
                                {c.min_order_paise > 0 ? formatRupees(c.min_order_paise) : "₹0"}
                              </td>
                              <td className="p-3 text-right text-taupe">
                                {c.type === "percent" && c.max_discount_paise ? formatRupees(c.max_discount_paise) : "—"}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                  c.first_order_only ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
                                }`}>
                                  {c.first_order_only ? "Yes" : "No"}
                                </span>
                              </td>
                              <td className="p-3 text-center text-taupe">
                                {c.usage_limit !== null ? c.usage_limit : "Unlimited"}
                              </td>
                              <td className="p-3 text-center font-bold text-ink">
                                {c.used_count}
                              </td>
                              <td className="p-3 text-center text-xs text-taupe">
                                {c.expires_at ? new Date(c.expires_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "Never"}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleToggleCoupon(c.id, !c.is_active)}
                                  className={`inline-block px-2.5 py-0.5 text-xs rounded-full font-medium cursor-pointer transition-colors ${
                                    c.is_active ? "bg-success/15 text-success hover:bg-danger/10 hover:text-danger" : "bg-danger/10 text-danger hover:bg-success/10 hover:text-success"
                                  }`}
                                >
                                  {c.is_active ? "Active" : "Disabled"}
                                </button>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleEditCoupon(c)}
                                    className="p-1 border border-line rounded bg-cream hover:bg-zari/10 hover:text-zari-deep text-ink cursor-pointer"
                                    title="Edit Promo Code"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCoupon(c.id)}
                                    className="p-1 border border-line rounded bg-cream hover:bg-danger/10 hover:text-danger text-ink cursor-pointer"
                                    title="Delete Promo Code"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
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

            {/* Live customisation tab (Hero Carousel and Announcement message edits) */}
            {activeTab === "cms" && (
              <div className="space-y-8 animate-fade-up">
                {/* Section 1: Hero Carousel management */}
                <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-6">
                  <div className="flex justify-between items-center border-b border-line pb-3">
                    <h3 className="font-display text-lg">Homepage Hero Slides</h3>
                    <Button size="sm" variant="gold" onClick={() => { setEditingSlide(null); resetSlideFormFields(); setShowSlideForm(true); }}>
                      <Plus className="w-4 h-4" /> Add Slide
                    </Button>
                  </div>

                  {showSlideForm && (
                    <form onSubmit={handleSaveSlide} className="bg-cream/35 border border-line p-5 rounded-md space-y-4">
                      <h4 className="font-semibold text-sm border-b border-line pb-2">
                        {editingSlide ? "Edit Carousel Slide" : "Create Carousel Slide"}
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-taupe">Eyebrow Text</label>
                          <input type="text" placeholder="e.g. Festival arrivals" value={slideEyebrow} onChange={(e) => setSlideEyebrow(e.target.value)} className="rounded border border-line bg-white px-3 py-1.5 text-xs outline-none" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-taupe">Slide Title *</label>
                          <input type="text" required placeholder="e.g. Pure white veshtis" value={slideTitle} onChange={(e) => setSlideTitle(e.target.value)} className="rounded border border-line bg-white px-3 py-1.5 text-xs outline-none" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-taupe">Subtitle / Paragraph Description</label>
                        <input type="text" placeholder="e.g. Crafted on traditional dhotis looms..." value={slideSubtitle} onChange={(e) => setSlideSubtitle(e.target.value)} className="rounded border border-line bg-white px-3 py-1.5 text-xs outline-none" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-taupe">CTA Button Label</label>
                          <input type="text" placeholder="e.g. Shop the collection" value={slideCtaLabel} onChange={(e) => setSlideCtaLabel(e.target.value)} className="rounded border border-line bg-white px-3 py-1.5 text-xs outline-none" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-taupe">CTA Target Link</label>
                          <input type="text" placeholder="e.g. /shop/white-dhoti" value={slideCtaHref} onChange={(e) => setSlideCtaHref(e.target.value)} className="rounded border border-line bg-white px-3 py-1.5 text-xs outline-none" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-taupe">Slide Image *</label>
                          <label className={`relative flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed transition-colors cursor-pointer ${uploadingSlideImage ? "border-zari bg-zari/5" : "border-line hover:border-zari bg-cream/30 hover:bg-zari/5"}`}>
                            {slideImageUrl ? (
                              <div className="relative w-full h-32 rounded overflow-hidden">
                                <img src={slideImageUrl} alt="Slide preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                  <span className="text-white text-xs font-bold">Click to replace</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 py-6 text-taupe">
                                <ImageIcon className="w-7 h-7 text-line" />
                                {uploadingSlideImage
                                  ? <span className="text-xs font-semibold text-zari animate-pulse">Uploading to Cloudinary…</span>
                                  : <><span className="text-xs font-semibold">Click to upload image</span><span className="text-[10px]">PNG, JPG, WEBP — recommended 2000×1200px</span></>
                                }
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSlideImageUpload}
                              className="hidden"
                              disabled={uploadingSlideImage}
                            />
                          </label>
                          {uploadingSlideImage && <p className="text-[10px] text-zari font-semibold animate-pulse mt-0.5">Uploading to Cloudinary…</p>}
                          {slideImageUrl && !uploadingSlideImage && <p className="text-[10px] text-success font-semibold mt-0.5">✓ Image uploaded successfully</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 items-center pt-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-taupe">Sort Order Number</label>
                          <input type="number" value={slideSortOrder} onChange={(e) => setSlideSortOrder(Number(e.target.value))} className="rounded border border-line bg-white px-3 py-1.5 text-xs outline-none" />
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <input type="checkbox" id="slideActive" checked={slideIsActive} onChange={(e) => setSlideIsActive(e.target.checked)} className="w-4 h-4 accent-zari" />
                          <label htmlFor="slideActive" className="text-xs font-semibold cursor-pointer">Slide is Active</label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => { setShowSlideForm(false); setEditingSlide(null); }}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="gold" size="sm">
                          Save Slide
                        </Button>
                      </div>
                    </form>
                  )}

                  {cmsSlides.some((s: any) => s.id.startsWith("default-")) && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded text-xs leading-relaxed">
                      ⚠️ <strong>Showing default slide templates</strong>. Click the edit icon (pencil) on any slide and save it to create custom entries in your database that override these defaults.
                    </div>
                  )}

                  {cmsSlides.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cmsSlides.map((slide) => (
                        <div key={slide.id} className="border border-line rounded-md p-4 bg-cream/15 flex gap-4 items-start relative group shadow-soft">
                          <div className="relative w-20 h-20 border border-line rounded overflow-hidden flex-shrink-0 bg-cream">
                            {slide.image_url ? (
                              <Image src={slide.image_url} alt="" fill className="object-cover" />
                            ) : (
                              <ImageIcon className="w-6 h-6 m-7 text-muted" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1 min-w-0">
                            <p className="text-xs font-bold uppercase text-zari tracking-wide">{slide.eyebrow || "Hero highlight"}</p>
                            <p className="text-sm font-bold text-ink truncate">{slide.title}</p>
                            <p className="text-xs text-taupe line-clamp-2">{slide.subtitle}</p>
                            <div className="pt-1.5 flex gap-3 text-[11px] font-semibold">
                              <span className="text-ink">Sort: #{slide.sort_order}</span>
                              <span className={slide.is_active ? "text-success" : "text-danger"}>{slide.is_active ? "Active" : "Disabled"}</span>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditSlide(slide)} className="p-1 border border-line rounded bg-white hover:bg-cream text-ink" title="Edit Slide">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteSlide(slide.id)} className="p-1 border border-line rounded bg-white hover:bg-danger/10 text-danger" title="Delete Slide">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-taupe italic">No customized hero slides in database. Storefront is displaying the hardcoded default slides.</p>
                  )}
                </div>

                {/* Section 2: Announcement Bar config */}
                <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-6">
                  <h3 className="font-display text-lg border-b border-line pb-3">Announcement Bar Banner Messages</h3>
                  
                  {!announcementBannerId && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded text-xs leading-relaxed">
                      ⚠️ <strong>Showing default banner message templates</strong>. Click "Save Announcement Messages" below to store these configurations as custom overrides in your database.
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add banner text message (e.g. Free shipping above ₹1000)"
                        value={announcementMsg}
                        onChange={(e) => setAnnouncementMsg(e.target.value)}
                        className="flex-1 rounded border border-line px-3 py-2 text-sm outline-none focus:border-zari"
                      />
                      <Button size="sm" variant="gold" onClick={addAnnouncementMsg}>
                        Add message
                      </Button>
                    </div>

                    {announcementList.length > 0 ? (
                      <div className="space-y-2">
                        {announcementList.map((msg, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-cream/40 rounded border border-line text-sm">
                            <span className="font-medium text-ink">{msg}</span>
                            <button onClick={() => removeAnnouncementMsg(idx)} className="text-danger hover:text-danger/80">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-taupe italic">No banner messages added. Default fallback announcements will be shown.</p>
                    )}

                    <div className="flex justify-end pt-3">
                      <Button size="sm" variant="gold" onClick={handleSaveAnnouncement}>
                        Save Announcement Messages
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visitor History Tab */}
            {activeTab === "visitor-history" && (
              <div className="space-y-6 animate-fade-up">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-lg">Active & Historic Sessions</h3>
                  <span className="text-xs text-taupe font-medium">Refreshes dynamically with store synchronization</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left: sessions list */}
                  <div className="md:col-span-7 bg-white border border-line rounded-card overflow-hidden shadow-soft">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-cream border-b border-line text-taupe font-medium">
                            <th className="p-3">Visitor OS/Device</th>
                            <th className="p-3">Referrer</th>
                            <th className="p-3 text-center">Country</th>
                            <th className="p-3 text-center">Views</th>
                            <th className="p-3 text-center">Duration</th>
                            <th className="p-3 text-center w-12">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(analytics?.sessionHistory || []).map((session: any) => {
                            const started = new Date(session.started_at).getTime();
                            const lastSeen = new Date(session.last_seen_at).getTime();
                            const durationSec = Math.max(0, Math.round((lastSeen - started) / 1000));
                            const durationMin = Math.floor(durationSec / 60);
                            const durationRemainderSec = durationSec % 60;
                            const durationStr = durationMin > 0 ? `${durationMin}m ${durationRemainderSec}s` : `${durationRemainderSec}s`;

                            return (
                              <tr key={session.id} className={`border-b border-line hover:bg-ivory/50 ${selectedSession?.id === session.id ? "bg-zari/5" : ""}`}>
                                <td className="p-3">
                                  <p className="font-semibold text-ink">{session.os} ({session.device})</p>
                                  <p className="text-taupe mt-0.5">{session.browser}</p>
                                  {session.profiles?.email && <p className="text-[10px] text-zari-deep font-semibold mt-0.5">{session.profiles.full_name || session.profiles.email}</p>}
                                </td>
                                <td className="p-3 text-taupe truncate max-w-[120px]" title={session.referrer}>{session.referrer}</td>
                                <td className="p-3 text-center font-medium">{session.country}</td>
                                <td className="p-3 text-center font-semibold text-ink">{session.page_views}</td>
                                <td className="p-3 text-center font-mono">{durationStr}</td>
                                <td className="p-3 text-center">
                                  <button onClick={() => setSelectedSession(session)} className="p-1 border border-line rounded bg-cream hover:bg-beige text-ink" title="View paths">
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right: selected session pages history */}
                  <div className="md:col-span-5 bg-white border border-line rounded-card p-5 shadow-soft space-y-4 self-start">
                    <h4 className="font-display text-base border-b border-line pb-2 text-ink">Session Page Views Path</h4>
                    
                    {selectedSession ? (
                      <div className="space-y-4">
                        <div className="text-xs text-taupe space-y-1">
                          <p><strong>Visitor UUID:</strong> <span className="font-mono">{selectedSession.visitor_id.slice(0, 18)}...</span></p>
                          <p><strong>Device details:</strong> {selectedSession.os} - {selectedSession.browser} ({selectedSession.device})</p>
                          <p><strong>Started At:</strong> {new Date(selectedSession.started_at).toLocaleString("en-IN")}</p>
                        </div>

                        <div className="border-l-2 border-zari pl-4 space-y-3.5">
                          {selectedSession.page_views_list?.map((view: any, index: number) => (
                            <div key={view.id || index} className="relative text-xs">
                              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-zari rounded-full border border-white" />
                              <p className="font-semibold text-ink break-all">{view.path}</p>
                              <p className="text-[10px] text-taupe mt-0.5">{new Date(view.created_at).toLocaleTimeString("en-IN")}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-taupe italic">
                        Select a session from the list on the left to inspect the detailed visitor page-view sequence.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Storage and Database Analytics tab */}
            {activeTab === "storage" && (
              <div className="space-y-6 animate-fade-up">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Database row counts card */}
                  <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-4">
                    <h3 className="font-display text-lg border-b border-line pb-2 flex items-center gap-2">
                      <Database className="w-5 h-5 text-zari" />
                      Supabase DB Table Sizes
                    </h3>
                    <div className="space-y-3.5">
                      <RowDetail label="profiles (Registered Users)" count={analytics?.dbStats?.users} />
                      <RowDetail label="products (Items catalog)" count={analytics?.dbStats?.products} />
                      <RowDetail label="orders (Placed checkouts)" count={analytics?.dbStats?.orders} />
                      <RowDetail label="sessions (Visitor sessions)" count={analytics?.dbStats?.sessions} />
                      <RowDetail label="page_views (Individual views)" count={analytics?.dbStats?.pageViews} />
                    </div>
                  </div>

                  {/* Supabase Storage details card */}
                  <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-4">
                    <h3 className="font-display text-lg border-b border-line pb-2 flex items-center gap-2">
                      <Database className="w-5 h-5 text-zari" />
                      Supabase Storage & DB
                    </h3>

                    {analytics?.supabaseStorageStats ? (
                      analytics.supabaseStorageStats.error ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded text-xs space-y-2 font-sans">
                          <p className="font-bold">⚠️ RPC Setup Required:</p>
                          <p className="leading-relaxed">To view real-time Supabase Database and Buckets usage sizes, run the setup SQL script in your Supabase SQL Editor.</p>
                          <details className="mt-2 bg-white border border-amber-200 rounded p-2">
                            <summary className="cursor-pointer font-semibold text-[10px] text-amber-900">Show SQL Script</summary>
                            <pre className="mt-1 text-[9px] font-mono whitespace-pre-wrap select-all bg-cream/35 p-1 rounded leading-normal max-h-36 overflow-y-auto">
{`CREATE OR REPLACE FUNCTION get_supabase_storage_stats()
RETURNS json security definer as $$
declare
  db_size bigint;
  storage_size bigint;
begin
  db_size := pg_database_size(current_database());
  begin
    select coalesce(sum(size), 0) into storage_size from storage.objects;
  exception when others then
    begin
      select coalesce(sum((metadata->>'size')::bigint), 0) into storage_size from storage.objects;
    exception when others then
      storage_size := 0;
    end;
  end;
  return json_build_object('db_size_bytes', db_size, 'storage_size_bytes', storage_size);
end;
$$ language plpgsql;`}
                            </pre>
                          </details>
                        </div>
                      ) : (
                        <div className="space-y-4 text-sm font-sans">
                          <p className="text-xs text-taupe">
                            Plan tier: <strong className="text-ink uppercase font-semibold">Supabase Free Tier</strong>
                          </p>

                          {/* Database Storage metric (500 MB Limit) */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Database Storage ({formatBytes(analytics.supabaseStorageStats.db_size_bytes)})</span>
                              <span>{(() => {
                                const used = analytics.supabaseStorageStats.db_size_bytes || 0;
                                const limit = 500 * 1024 * 1024; // 500 MB
                                return `${Math.min(100, Math.round((used / limit) * 100))}%`;
                              })()}</span>
                            </div>
                            <div className="w-full bg-cream h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-zari h-full"
                                style={{
                                  width: `${Math.min(100, Math.round(((analytics.supabaseStorageStats.db_size_bytes || 0) / (500 * 1024 * 1024)) * 100))}%`
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-taupe text-right">Limit: 500 MB</p>
                          </div>

                          {/* File Buckets Storage metric (1 GB Limit) */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>File Buckets Storage ({formatBytes(analytics.supabaseStorageStats.storage_size_bytes)})</span>
                              <span>{(() => {
                                const used = analytics.supabaseStorageStats.storage_size_bytes || 0;
                                const limit = 1024 * 1024 * 1024; // 1 GB
                                return `${Math.min(100, Math.round((used / limit) * 100))}%`;
                              })()}</span>
                            </div>
                            <div className="w-full bg-cream h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-zari h-full"
                                style={{
                                  width: `${Math.min(100, Math.round(((analytics.supabaseStorageStats.storage_size_bytes || 0) / (1024 * 1024 * 1024)) * 100))}%`
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-taupe text-right">Limit: 1 GB</p>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="py-8 text-center text-xs text-taupe italic font-sans">
                        Querying Supabase metrics...
                      </div>
                    )}
                  </div>

                  {/* Cloudinary usage stats card */}
                  <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-4">
                    <h3 className="font-display text-lg border-b border-line pb-2 flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-zari" />
                      Cloudinary Asset Storage
                    </h3>
                    
                    {analytics?.cloudinaryStats ? (
                      analytics.cloudinaryStats.error ? (
                        <div className="p-4 bg-danger/5 border border-danger/10 text-danger rounded text-xs space-y-1">
                          <p className="font-bold">⚠️ Connection Issue:</p>
                          <p className="font-mono leading-relaxed">{analytics.cloudinaryStats.error}</p>
                          <p className="text-[10px] text-taupe pt-1">Verify that your Cloudinary credentials in <span className="font-mono text-ink">.env.local</span> are correct and that the dev server has been restarted.</p>
                        </div>
                      ) : (
                        <div className="space-y-4 text-sm">
                          <p className="text-xs text-taupe">
                            Plan tier: <strong className="text-ink uppercase">{analytics.cloudinaryStats.plan}</strong> 
                            {analytics.cloudinaryStats.lastUpdated && ` (Last updated: ${new Date(analytics.cloudinaryStats.lastUpdated).toLocaleDateString()})`}
                          </p>
                          
                          {/* Credit Quota Progress Bar (Newer Plans) */}
                          {analytics.cloudinaryStats.credits && (
                            <div className="space-y-2 bg-cream/35 p-3 rounded border border-line/60">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>Monthly Credits Used ({analytics.cloudinaryStats.credits.used} / {analytics.cloudinaryStats.credits.limit})</span>
                                <span>{analytics.cloudinaryStats.credits.percent}%</span>
                              </div>
                              <div className="w-full bg-cream h-2 rounded-full overflow-hidden">
                                <div className="bg-zari h-full" style={{ width: `${analytics.cloudinaryStats.credits.percent}%` }} />
                              </div>
                              <p className="text-[10px] text-taupe">Cloudinary allocates quota using credits (1 credit = 1 GB storage or 1 GB bandwidth).</p>
                            </div>
                          )}

                          {/* Storage metric */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Storage Used ({(() => {
                                const b = analytics.cloudinaryStats.storage.used;
                                if (!b) return "0 MB";
                                if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
                                if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
                                return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                              })()})</span>
                              {analytics.cloudinaryStats.storage.limit > 0 && <span>{analytics.cloudinaryStats.storage.percent}%</span>}
                            </div>
                            {analytics.cloudinaryStats.storage.limit > 0 && (
                              <>
                                <div className="w-full bg-cream h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-zari h-full" style={{ width: `${analytics.cloudinaryStats.storage.percent}%` }} />
                                </div>
                                <p className="text-[10px] text-taupe text-right">Limit: {((l) => {
                                  if (l < 1024 * 1024 * 1024) return `${(l / (1024 * 1024)).toFixed(1)} MB`;
                                  return `${(l / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                                })(analytics.cloudinaryStats.storage.limit)}</p>
                              </>
                            )}
                          </div>

                          {/* Bandwidth metric */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Bandwidth Consumed ({(() => {
                                const b = analytics.cloudinaryStats.bandwidth.used;
                                if (!b) return "0 MB";
                                if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
                                if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
                                return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                              })()})</span>
                              {analytics.cloudinaryStats.bandwidth.limit > 0 && <span>{analytics.cloudinaryStats.bandwidth.percent}%</span>}
                            </div>
                            {analytics.cloudinaryStats.bandwidth.limit > 0 && (
                              <>
                                <div className="w-full bg-cream h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-zari h-full" style={{ width: `${analytics.cloudinaryStats.bandwidth.percent}%` }} />
                                </div>
                                <p className="text-[10px] text-taupe text-right">Limit: {((l) => {
                                  if (l < 1024 * 1024 * 1024) return `${(l / (1024 * 1024)).toFixed(1)} MB`;
                                  return `${(l / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                                })(analytics.cloudinaryStats.bandwidth.limit)}</p>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="py-8 text-center text-xs text-taupe italic">
                        Cloudinary API credentials missing or quota endpoint failed. Image uploading utilizes direct browser payloads.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Customer Reviews Management Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-6 animate-fade-up">
                <div className="flex justify-between items-center border-b border-line pb-3">
                  <div>
                    <h3 className="font-display text-lg text-ink">Customer Reviews Registry</h3>
                    <p className="text-xs text-taupe mt-0.5">Approve, edit, or delete customer-submitted reviews</p>
                  </div>
                  <span className="text-xs text-taupe font-medium font-mono">{reviews.length} reviews total</span>
                </div>

                {/* Review metrics summary widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-line rounded-card p-4 shadow-soft flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-zari/10 flex items-center justify-center text-zari font-bold text-lg font-mono">
                      {reviews.length}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink uppercase tracking-wider">Total Reviews</p>
                      <p className="text-[10px] text-taupe">Submitted by customers</p>
                    </div>
                  </div>
                  <div className="bg-white border border-line rounded-card p-4 shadow-soft flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-success/10 flex items-center justify-center text-success font-bold text-lg font-mono">
                      {reviews.filter(r => r.status === "approved").length}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink uppercase tracking-wider">Approved Reviews</p>
                      <p className="text-[10px] text-taupe">Visible on product pages</p>
                    </div>
                  </div>
                  <div className="bg-white border border-line rounded-card p-4 shadow-soft flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold text-lg font-mono">
                      {reviews.filter(r => r.status === "pending").length}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink uppercase tracking-wider">Pending Reviews</p>
                      <p className="text-[10px] text-taupe">Awaiting moderation</p>
                    </div>
                  </div>
                </div>

                {/* Reviews table */}
                <div className="bg-white border border-line rounded-card shadow-soft overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-cream/25 border-b border-line text-taupe uppercase tracking-wider font-bold text-[10px]">
                          <th className="p-4">Product</th>
                          <th className="p-4">Customer Details</th>
                          <th className="p-4 text-center">Rating</th>
                          <th className="p-4">Review Message</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {reviews.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-taupe italic">
                              No customer reviews found in the database.
                            </td>
                          </tr>
                        ) : (
                          reviews.map((r) => (
                            <tr key={r.id} className="hover:bg-cream/10 transition-colors">
                              {/* Product Info */}
                              <td className="p-4">
                                <p className="font-bold text-ink">{r.products?.name || "Unknown Product"}</p>
                                <span className="font-mono text-[9px] text-taupe block mt-0.5">SLUG: {r.products?.slug}</span>
                              </td>
                              {/* Customer Profile Details */}
                              <td className="p-4 space-y-1">
                                <p className="font-bold text-ink">{r.profiles?.full_name || "Guest Customer"}</p>
                                <div className="space-y-0.5 text-[10px] text-taupe">
                                  <p className="font-mono">ID: {r.profiles?.user_id || "N/A"}</p>
                                  <p>{r.profiles?.email}</p>
                                  {r.profiles?.phone && <p>{r.profiles.phone}</p>}
                                </div>
                              </td>
                              {/* Star Rating */}
                              <td className="p-4 text-center">
                                <div className="flex justify-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3.5 h-3.5 ${
                                        star <= r.rating ? "fill-zari text-zari" : "text-line fill-none"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-[10px] text-taupe block mt-1 font-mono">ORDER: {r.orders?.order_number || "N/A"}</span>
                              </td>
                              {/* Review Content & Photos */}
                              <td className="p-4 max-w-sm">
                                {r.title && <p className="font-bold text-ink mb-1">{r.title}</p>}
                                <p className="text-taupe leading-relaxed whitespace-pre-wrap">{r.body || <em className="text-[10px]">No text comment left</em>}</p>
                                
                                {r.review_photos && r.review_photos.length > 0 && (
                                  <div className="flex gap-2 mt-2 flex-wrap">
                                    {r.review_photos.map((photo: any) => (
                                      <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" className="relative w-10 h-10 rounded border border-line overflow-hidden bg-cream cursor-zoom-in hover:opacity-80 transition-opacity">
                                        <img src={photo.url} alt="Review attachment" className="object-cover w-full h-full" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </td>
                              {/* Moderation Status */}
                              <td className="p-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  r.status === "approved" ? "bg-success/15 text-success" :
                                  r.status === "rejected" ? "bg-danger/15 text-danger" :
                                  "bg-amber-100 text-amber-800"
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                              {/* Action buttons */}
                              <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleEditReviewClick(r)}
                                  className="p-1.5 border border-line rounded bg-white hover:bg-cream text-ink transition-colors cursor-pointer inline-flex items-center"
                                  title="Edit Review"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteReviewClick(r.id)}
                                  className="p-1.5 border border-danger/30 rounded bg-white hover:bg-danger/5 text-danger transition-colors cursor-pointer inline-flex items-center"
                                  title="Delete Review"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Review Edit Overlay Modal */}
                {editingReview && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm animate-fade-in text-left">
                    <div className="relative w-full max-w-md rounded-card border border-line bg-white p-6 shadow-xl animate-slide-up">
                      <div className="flex items-center justify-between border-b border-line pb-3">
                        <h3 className="font-display text-base text-ink">Moderate Review</h3>
                        <button
                          onClick={() => setEditingReview(null)}
                          className="rounded-full p-1 text-taupe hover:bg-cream hover:text-ink transition-colors cursor-pointer border-0"
                        >
                          <X className="w-4 h-4 fill-none" />
                        </button>
                      </div>

                      <form onSubmit={handleUpdateReviewSubmit} className="space-y-4 pt-4 text-xs">
                        {/* Rating */}
                        <div className="flex flex-col gap-1">
                          <label className="font-semibold text-taupe">Rating Stars</label>
                          <select
                            value={reviewFormRating}
                            onChange={(e) => setReviewFormRating(Number(e.target.value))}
                            className="rounded border border-line bg-white px-3 py-2 text-xs outline-none focus:border-zari"
                          >
                            <option value={5}>5 Stars</option>
                            <option value={4}>4 Stars</option>
                            <option value={3}>3 Stars</option>
                            <option value={2}>2 Stars</option>
                            <option value={1}>1 Star</option>
                          </select>
                        </div>

                        {/* Title */}
                        <div className="flex flex-col gap-1">
                          <label className="font-semibold text-taupe">Review Title</label>
                          <input
                            type="text"
                            value={reviewFormTitle}
                            onChange={(e) => setReviewFormTitle(e.target.value)}
                            className="rounded border border-line bg-white px-3 py-2 text-xs outline-none focus:border-zari"
                          />
                        </div>

                        {/* Body */}
                        <div className="flex flex-col gap-1">
                          <label className="font-semibold text-taupe">Review Content</label>
                          <textarea
                            rows={3}
                            value={reviewFormBody}
                            onChange={(e) => setReviewFormBody(e.target.value)}
                            className="rounded border border-line bg-white px-3 py-2 text-xs outline-none focus:border-zari resize-none"
                          />
                        </div>

                        {/* Status */}
                        <div className="flex flex-col gap-1">
                          <label className="font-semibold text-taupe">Status</label>
                          <select
                            value={reviewFormStatus}
                            onChange={(e) => setReviewFormStatus(e.target.value)}
                            className="rounded border border-line bg-white px-3 py-2 text-xs outline-none focus:border-zari"
                          >
                            <option value="approved">Approved</option>
                            <option value="pending">Pending</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-line">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingReview(null)}
                            disabled={reviewFormSubmitting}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            variant="gold"
                            size="sm"
                            disabled={reviewFormSubmitting}
                          >
                            {reviewFormSubmitting ? "Saving changes..." : "Save Review"}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Combined Communications tab */}
            {activeTab === "communications" && (
              <div className="space-y-6 animate-fade-up">
                <div className="flex justify-between items-center border-b border-line pb-3">
                  <h3 className="font-display text-lg">Communications Desk</h3>
                  <span className="text-xs text-taupe font-medium">Manage support mail, wholesale inquiries, and newsletters</span>
                </div>

                {/* Sub-tabs pills */}
                <div className="flex flex-wrap gap-2 py-1">
                  <button
                    type="button"
                    onClick={() => setCommSubTab("support")}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                      commSubTab === "support"
                        ? "bg-ink text-ivory border-ink shadow-sm"
                        : "bg-white text-taupe border-line hover:border-zari hover:text-ink"
                    }`}
                  >
                    <span>Support Mail</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${commSubTab === "support" ? "bg-zari text-ink" : "bg-cream text-taupe"}`}>
                      {supportMessages.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommSubTab("bulk")}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                      commSubTab === "bulk"
                        ? "bg-ink text-ivory border-ink shadow-sm"
                        : "bg-white text-taupe border-line hover:border-zari hover:text-ink"
                    }`}
                  >
                    <span>Bulk Enquiries</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${commSubTab === "bulk" ? "bg-zari text-ink" : "bg-cream text-taupe"}`}>
                      {bulkInquiries.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommSubTab("newsletter")}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                      commSubTab === "newsletter"
                        ? "bg-ink text-ivory border-ink shadow-sm"
                        : "bg-white text-taupe border-line hover:border-zari hover:text-ink"
                    }`}
                  >
                    <span>Newsletter Subs</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${commSubTab === "newsletter" ? "bg-zari text-ink" : "bg-cream text-taupe"}`}>
                      {newsletterSubs.length}
                    </span>
                  </button>
                </div>

                {/* Sub-tab Content Area */}
                {commSubTab === "support" && (
                  <div className="bg-white border border-line rounded-card overflow-hidden shadow-soft animate-fade-in">
                    {supportMessages.length === 0 ? (
                      <div className="p-12 text-center text-sm text-taupe italic">
                        No support inquiries received yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm text-left">
                          <thead>
                            <tr className="bg-cream border-b border-line text-taupe font-medium">
                              <th className="p-3">Sender</th>
                              <th className="p-3">Subject</th>
                              <th className="p-3">Message</th>
                              <th className="p-3 text-center">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {supportMessages.map((msg) => (
                              <tr key={msg.id} className="border-b border-line hover:bg-ivory/50">
                                <td className="p-3">
                                  <p className="font-semibold text-ink">{msg.name}</p>
                                  <p className="text-[10px] text-taupe mt-0.5">{msg.email}</p>
                                </td>
                                <td className="p-3 font-medium text-ink">{msg.subject}</td>
                                <td className="p-3 text-taupe whitespace-pre-wrap">{msg.message}</td>
                                <td className="p-3 text-center text-[10px] text-taupe whitespace-nowrap">
                                  {new Date(msg.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {commSubTab === "bulk" && (
                  <div className="bg-white border border-line rounded-card overflow-hidden shadow-soft animate-fade-in">
                    {bulkInquiries.length === 0 ? (
                      <div className="p-12 text-center text-sm text-taupe italic">
                        No bulk order enquiries received yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm text-left">
                          <thead>
                            <tr className="bg-cream border-b border-line text-taupe font-medium">
                              <th className="p-3">Sender / Org</th>
                              <th className="p-3">Category</th>
                              <th className="p-3 text-center">Quantity</th>
                              <th className="p-3">Message</th>
                              <th className="p-3 text-center">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkInquiries.map((inq) => (
                              <tr key={inq.id} className="border-b border-line hover:bg-ivory/50">
                                <td className="p-3">
                                  <p className="font-semibold text-ink">{inq.name}</p>
                                  <p className="text-[10px] text-taupe mt-0.5">{inq.email}</p>
                                  {inq.organisation && <p className="text-[10px] text-zari-deep font-semibold mt-0.5">{inq.organisation}</p>}
                                </td>
                                <td className="p-3 text-ink font-semibold">{inq.category || "—"}</td>
                                <td className="p-3 text-center font-mono font-medium">{inq.quantity || "—"}</td>
                                <td className="p-3 text-taupe whitespace-pre-wrap">{inq.message || "—"}</td>
                                <td className="p-3 text-center text-[10px] text-taupe whitespace-nowrap">
                                  {new Date(inq.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {commSubTab === "newsletter" && (
                  <div className="bg-white border border-line rounded-card overflow-hidden shadow-soft max-w-lg animate-fade-in">
                    {newsletterSubs.length === 0 ? (
                      <div className="p-12 text-center text-sm text-taupe italic">
                        No newsletter subscribers yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm text-left">
                          <thead>
                            <tr className="bg-cream border-b border-line text-taupe font-medium">
                              <th className="p-3">Subscribed Email Address</th>
                              <th className="p-3 text-center">Subscribed Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {newsletterSubs.map((sub) => (
                              <tr key={sub.id} className="border-b border-line hover:bg-ivory/50">
                                <td className="p-3 font-semibold text-ink font-mono">{sub.email}</td>
                                <td className="p-3 text-center text-[10px] text-taupe">
                                  {new Date(sub.created_at).toLocaleString("en-IN", { dateStyle: "long" })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Container>

      {orderPendingDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-card border border-line shadow-lift w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-danger/10 text-danger shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg text-ink">Delete order permanently?</h3>
                <p className="text-xs text-taupe mt-1">
                  This will permanently remove order <strong className="text-ink">{orderPendingDelete.order_number}</strong> from
                  the database — it will disappear from this admin panel and from the customer&apos;s own order history. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-taupe">
                Type <span className="text-danger">delete order</span> to confirm
              </label>
              <input
                type="text"
                autoFocus
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="delete order"
                className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-danger"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setOrderPendingDelete(null); setDeleteConfirmInput(""); }}
                className="px-4 py-2 text-xs font-semibold text-taupe hover:text-ink border border-line rounded bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmInput.trim().toLowerCase() !== "delete order" || deletingOrder}
                onClick={() => handleDeleteOrder(orderPendingDelete.id)}
                className="px-4 py-2 text-xs font-semibold text-white bg-danger rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {deletingOrder ? "Deleting…" : "Delete Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {emergencyLookupOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-card border border-line shadow-lift w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="font-display text-lg text-ink">Download order detail sheet</h3>
              <p className="text-xs text-taupe mt-1">
                Enter the Order Number (e.g. JSRT-2026-785305) or Order ID to generate a full one-page PDF reference for that order.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-taupe">Order Number or Order ID</label>
              <input
                type="text"
                autoFocus
                value={emergencyLookupQuery}
                onChange={(e) => setEmergencyLookupQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmEmergencyOrderLookup(); }}
                placeholder="JSRT-2026-785305"
                className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-zari"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEmergencyLookupOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-taupe hover:text-ink border border-line rounded bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!emergencyLookupQuery.trim()}
                onClick={confirmEmergencyOrderLookup}
                className="px-4 py-2 text-xs font-semibold text-white bg-zari rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Balance Adjust Modal */}
      {walletAdjustOpen && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-card max-w-md w-full p-6 space-y-4 shadow-xl animate-fade-in text-xs font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-line">
              <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">Adjust User Wallet Balance</h3>
              <button 
                onClick={() => setWalletAdjustOpen(false)}
                className="text-taupe hover:text-ink font-bold text-base cursor-pointer"
              >
                &times;
              </button>
            </div>

            {walletAdjustError && (
              <div className="p-3 bg-danger/5 border border-danger/25 text-danger rounded text-xs">
                {walletAdjustError}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[11px] text-taupe">
                User: <strong>{inspectedUser.profile.full_name || inspectedUser.profile.email}</strong> ({inspectedUser.profile.email})
              </p>
              <p className="text-[11px] text-taupe">
                Current Balance: <strong className="text-success">{formatRupees(inspectedUser.wallet.balance_paise)}</strong>
              </p>

              {/* Adjustment Type Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-ink">Adjustment Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      name="adjustType" 
                      value="add" 
                      checked={walletAdjustType === "add"}
                      onChange={() => setWalletAdjustType("add")}
                    />
                    Add Money (+)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      name="adjustType" 
                      value="deduct" 
                      checked={walletAdjustType === "deduct"}
                      onChange={() => setWalletAdjustType("deduct")}
                    />
                    Deduct Money (-)
                  </label>
                </div>
              </div>

              {/* Amount Input */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-ink">Amount (in Rupees)</label>
                <input 
                  type="number" 
                  step="1"
                  min="1"
                  required
                  placeholder="e.g. 150"
                  value={walletAdjustAmount}
                  onChange={(e) => setWalletAdjustAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  className="rounded border border-line bg-white px-3 py-2 text-sm outline-none w-full"
                />
                <p className="text-[10px] text-taupe">Whole rupees only — no paisa adjustments allowed</p>
              </div>

              {/* Note Input */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-ink">Adjustment Note / Reason</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Correction / Refund / Gift"
                  value={walletAdjustNote}
                  onChange={(e) => setWalletAdjustNote(e.target.value)}
                  className="rounded border border-line bg-white px-3 py-2 text-sm outline-none w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-line">
              <Button 
                variant="outline" 
                size="md" 
                onClick={() => setWalletAdjustOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                variant="gold" 
                size="md"
                disabled={walletAdjustLoading}
                className="cursor-pointer"
                onClick={async () => {
                  const parsedAmount = parseInt(walletAdjustAmount, 10);
                  if (!walletAdjustAmount || isNaN(parsedAmount) || parsedAmount < 1) {
                    setWalletAdjustError("Please enter a valid whole rupee amount (minimum ₹1)");
                    return;
                  }
                  if (!walletAdjustNote.trim()) {
                    setWalletAdjustError("Please provide an adjustment reason/note");
                    return;
                  }

                  setWalletAdjustLoading(true);
                  setWalletAdjustError("");
                  try {
                    const res = await fetch("/api/admin/users/wallet-adjust", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: inspectedUser.profile.id,
                        amountRupees: parseInt(walletAdjustAmount, 10),
                        actionType: walletAdjustType,
                        note: walletAdjustNote.trim(),
                      }),
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to adjust balance");

                    // Success! Reload inspected user data!
                    const inspectRes = await fetch(`/api/admin/users/inspect?email=${encodeURIComponent(inspectedUser.profile.email)}`);
                    if (inspectRes.ok) {
                      const nextUserData = await inspectRes.json();
                      setInspectedUser(nextUserData);
                    }
                    setWalletAdjustOpen(false);
                  } catch (err: any) {
                    setWalletAdjustError(err.message);
                  } finally {
                    setWalletAdjustLoading(false);
                  }
                }}
              >
                {walletAdjustLoading ? "Saving..." : "Confirm Adjustment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Sub components
function TabButton({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center justify-between gap-3 px-3 py-2 lg:py-2.5 rounded-md text-sm font-medium transition-all duration-200 w-auto lg:w-full ${
        active ? "bg-ink text-ivory shadow-soft" : "text-taupe hover:bg-cream hover:text-ink"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={active ? "text-zari" : "text-taupe"}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-zari text-ink" : "bg-cream text-taupe"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ icon, label, value, subtitle }: { icon: React.ReactNode; label: string; value: any; subtitle?: string }) {
  return (
    <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-2 relative overflow-hidden">
      <div className="absolute right-4 top-4 bg-cream/55 p-2 rounded-full border border-line">
        {icon}
      </div>
      <p className="text-xs font-semibold text-taupe uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-display text-ink">{value}</p>
      {subtitle && <p className="text-xs text-taupe">{subtitle}</p>}
    </div>
  );
}

function RowDetail({ label, count }: { label: string; count: any }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-line pb-2">
      <span className="font-semibold text-taupe">{label}</span>
      <span className="font-mono font-bold text-ink bg-cream px-2 py-0.5 rounded">{count !== undefined ? count : 0} rows</span>
    </div>
  );
}

function StatusFilterButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
        active
          ? "bg-ink text-ivory border-ink shadow-sm"
          : "bg-white text-taupe border-line hover:border-zari hover:text-ink"
      }`}
    >
      <span>{label}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        active ? "bg-zari text-ink animate-fade-in" : "bg-cream text-taupe"
      }`}>
        {count}
      </span>
    </button>
  );
}

function formatBytes(b: number) {
  if (!b) return "0.0 MB";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(totalSeconds: number) {
  if (!totalSeconds) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${Math.round(totalSeconds)}s`;
}
