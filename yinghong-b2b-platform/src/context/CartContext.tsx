import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Variant } from '../types';

export interface CartItem {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  quantity: number;
  image?: string;
  maxStock: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, variant: Variant, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, variant: Variant, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.variantId === variant.id);
      if (existing) {
        return prev.map(item => 
          item.variantId === variant.id 
            ? { ...item, quantity: Math.min(item.quantity + quantity, variant.stock) }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        sku: product.sku,
        color: variant.color,
        size: variant.size,
        price: product.price,
        quantity: Math.min(quantity, variant.stock),
        image: product.images.find(i => i.type === 'main')?.url,
        maxStock: variant.stock
      }];
    });
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    setCart(prev => prev.map(item => 
      item.variantId === variantId 
        ? { ...item, quantity: Math.min(Math.max(1, quantity), item.maxStock) }
        : item
    ));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
