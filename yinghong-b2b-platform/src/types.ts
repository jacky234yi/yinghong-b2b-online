export interface User {
  id: string;
  username: string;
  role: 'super_admin' | 'admin' | 'buyer';
  name: string;
  phone?: string;
  discount_rate?: number;
  notes?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  category_name?: string;
  fabric: string;
  weight: string;
  elasticity: string;
  composition: string;
  price: number;
  tags: string[];
  description: string;
  variants: Variant[];
  images: ProductImage[];
}

export interface Variant {
  id: string;
  product_id: string;
  color: string;
  size: string;
  stock: number;
  weight: number;
  volume: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  type: 'main' | 'detail' | 'size_chart';
}

export interface Order {
  id: string;
  user_id: string;
  user_name?: string;
  user_phone?: string;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  total_amount: number;
  discount_applied: number;
  tracking_number?: string;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  price_at_time: number;
  original_price?: number;
  status: 'normal' | 'cancellation_requested' | 'cancelled';
  cancellation_reason?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface FileRecord {
  id: string;
  sender_id: string;
  sender_name?: string;
  receiver_id: string;
  url: string;
  name: string;
  size: number;
  created_at: string;
}
