"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import menuData from "@/data/menu.json";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  protein?: string;
  surcharge?: number;
  spiceLevel?: string;
  specialInstructions?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** Names of saved items dropped on load because they left the menu. */
  droppedItems: string[];
  dismissDroppedItems: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Saved carts outlive the menu. They sit in localStorage indefinitely — one
 * real order arrived carrying an item added 32 days earlier — so a dish taken
 * off the menu leaves live carts pointing at something that no longer exists.
 * Checkout then refuses the whole order with "Invalid item in cart", naming
 * nothing, and the cart never repairs itself: the customer is stuck until they
 * work out to clear it, which they won't.
 *
 * Chicken Manchurian (menu-64) was removed on 2026-08-18 and did exactly this.
 *
 * So the cart drops what the menu no longer has, on load, and says which.
 */
const KNOWN_MENU_IDS: ReadonlySet<string> = new Set(
  menuData.categories.flatMap((category) => category.items.map((item) => item.id))
);

/** Composite cart ids look like `menu-25-Chicken-Mild-1788…`; the dish is the first two parts. */
function baseMenuId(cartItemId: string): string {
  return cartItemId.split("-").slice(0, 2).join("-");
}

function isStillOnMenu(item: unknown): boolean {
  const id = (item as { id?: unknown } | null)?.id;
  return typeof id === "string" && KNOWN_MENU_IDS.has(baseMenuId(id));
}

const TAX_RATE = 0.07;
const STORAGE_KEY = "aroma-delight-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [droppedItems, setDroppedItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const kept = parsed.filter(isStillOnMenu);
          setItems(kept as CartItem[]);
          if (kept.length !== parsed.length) {
            setDroppedItems(
              parsed
                .filter((item) => !isStillOnMenu(item))
                .map((item) =>
                  typeof item?.name === "string" && item.name ? item.name : "An item"
                )
            );
          }
        }
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const addItem = useCallback(
    (newItem: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setItems((prev) => [
        ...prev,
        { ...newItem, quantity: newItem.quantity || 1 },
      ]);
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const dismissDroppedItems = useCallback(() => setDroppedItems([]), []);
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal,
        tax,
        total,
        itemCount,
        isCartOpen,
        openCart,
        closeCart,
        droppedItems,
        dismissDroppedItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}