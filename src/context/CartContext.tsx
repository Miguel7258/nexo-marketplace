import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StorageService } from '../data/storage';
import { CartItem, CartSummary, RevalidationResult, CheckoutResult } from '../types';

interface CartContextType {
  cart: CartItem[];
  summary: CartSummary;
  totalQuantity: number;
  addToCart: (offerId: string, quantity?: number) => { success: boolean; error?: string };
  updateQuantity: (offerId: string, quantity: number) => { success: boolean; error?: string };
  removeFromCart: (offerId: string) => void;
  clearCart: () => void;
  revalidate: () => RevalidationResult;
  checkout: () => CheckoutResult;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [summary, setSummary] = useState<CartSummary>(() => StorageService.getCartSummary());
  const [cart, setCart] = useState<CartItem[]>(() => StorageService.getCart());

  const refreshCart = useCallback(() => {
    setCart(StorageService.getCart());
    setSummary(StorageService.getCartSummary());
  }, []);

  useEffect(() => {
    refreshCart();

    const handleUpdate = () => {
      refreshCart();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('nexo-cart-updated', handleUpdate);
      window.addEventListener('storage', handleUpdate);
      return () => {
        window.removeEventListener('nexo-cart-updated', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      };
    }
  }, [refreshCart]);

  const addToCart = useCallback((offerId: string, quantity: number = 1) => {
    const res = StorageService.addToCart(offerId, quantity);
    refreshCart();
    return { success: res.success, error: res.error };
  }, [refreshCart]);

  const updateQuantity = useCallback((offerId: string, quantity: number) => {
    const res = StorageService.updateCartQuantity(offerId, quantity);
    refreshCart();
    return { success: res.success, error: res.error };
  }, [refreshCart]);

  const removeFromCart = useCallback((offerId: string) => {
    StorageService.removeFromCart(offerId);
    refreshCart();
  }, [refreshCart]);

  const clearCart = useCallback(() => {
    StorageService.clearCart();
    refreshCart();
  }, [refreshCart]);

  const revalidate = useCallback(() => {
    const res = StorageService.revalidateCart();
    refreshCart();
    return res;
  }, [refreshCart]);

  const checkout = useCallback(() => {
    const res = StorageService.checkoutDemoOrder();
    if (res.success || (res.changes && res.changes.length > 0)) {
      refreshCart();
    }
    return res;
  }, [refreshCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        summary,
        totalQuantity: summary.totalQuantity,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        revalidate,
        checkout,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser utilizado dentro de um CartProvider.');
  }
  return context;
};
