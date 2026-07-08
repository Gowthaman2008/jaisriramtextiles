"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  pricePaise: number;
  cashbackPaise: number;
  image: string;
  quantity: number;
  variant: {
    id: string;
    size: string | null;
    color: string | null;
    sku: string | null;
    stock: number;
  } | null;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (product: any, quantity: number, variant: any) => void;
  removeFromCart: (productId: string, variantSku: string | null) => void;
  updateQuantity: (productId: string, variantSku: string | null, quantity: number) => void;
  clearCart: () => void;
  cartSubtotalPaise: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    productName: string;
    productImage: string;
  }>({ show: false, productName: "", productImage: "" });

  // Auto-dismiss toast timer
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("jsr_cart");
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load cart from localStorage:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("jsr_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Failed to save cart to localStorage:", e);
    }
  }, [cart, isLoaded]);

  const addToCart = (product: any, quantity: number, variant: any) => {
    // Trigger toast notification
    const imgUrl = product.image || (product.product_images?.[0]?.url) || "";
    setToast({
      show: true,
      productName: product.name,
      productImage: imgUrl,
    });

    setCart((prev) => {
      // Find if item with same ID and same variant SKU already exists
      const existingIdx = prev.findIndex(
        (item) => item.id === product.id && 
                  ((!item.variant && !variant) || (item.variant?.sku === variant?.sku))
      );

      if (existingIdx > -1) {
        const next = [...prev];
        const currentQty = next[existingIdx].quantity;
        // Limit quantity to stock level if variant is selected
        const maxStock = variant ? variant.stock : product.stock;
        next[existingIdx].quantity = Math.min(currentQty + quantity, maxStock || 99);
        return next;
      } else {
        return [
          ...prev,
          {
            id: product.id,
            slug: product.slug,
            name: product.name,
            pricePaise: product.pricePaise || product.price_paise,
            cashbackPaise: product.cashbackPaise || product.cashback_paise || 0,
            image: product.image || (product.product_images?.[0]?.url) || "",
            quantity,
            variant: variant || null,
          },
        ];
      }
    });
  };

  const removeFromCart = (productId: string, variantSku: string | null) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.id === productId && ((!item.variant && !variantSku) || item.variant?.sku === variantSku))
      )
    );
  };

  const updateQuantity = (productId: string, variantSku: string | null, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantSku);
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex(
        (item) => item.id === productId && ((!item.variant && !variantSku) || item.variant?.sku === variantSku)
      );
      if (idx === -1) return prev;

      const next = [...prev];
      const maxStock = next[idx].variant ? next[idx].variant!.stock : 99; // fallback high number if not specified
      next[idx].quantity = Math.min(quantity, maxStock);
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartSubtotalPaise = cart.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartSubtotalPaise,
      }}
    >
      {children}

      {/* Premium Toast Popup Notification */}
      {toast.show && (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-fade-in sm:left-auto sm:right-6 sm:max-w-sm w-auto bg-white border border-line rounded-2xl shadow-lift p-4 flex items-start gap-3">
          {toast.productImage ? (
            <div className="relative h-14 w-14 rounded-lg bg-cream overflow-hidden border border-line flex-shrink-0">
              <img
                src={toast.productImage}
                alt={toast.productName}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-lg bg-cream flex items-center justify-center border border-line flex-shrink-0 text-xl">
              🛍️
            </div>
          )}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-xs font-bold text-success uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Added to Cart
            </p>
            <p className="text-sm font-bold text-ink truncate mt-1">{toast.productName}</p>
            <a
              href="/cart"
              className="inline-flex items-center mt-2.5 px-3.5 py-1.5 rounded-full bg-ink text-ivory text-xs font-bold hover:bg-zari transition-colors"
            >
              View Cart
            </a>
          </div>
          <button
            onClick={() => setToast((prev) => ({ ...prev, show: false }))}
            className="shrink-0 -mt-1 -mr-1 p-1.5 rounded-full text-taupe hover:text-ink hover:bg-cream transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
