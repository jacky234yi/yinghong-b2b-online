export type Role = 'super_admin' | 'supplier_admin' | 'buyer';

export interface User {
  id: number;
  username: string;
  role: Role;
  discount: number;
  notes?: string;
  created_at: string;
}

export interface Partition {
  id: number;
  name: string;
}

export interface SKU {
  id: number;
  product_id: number;
  size: string;
  stock: number;
  restock_date?: string;
  restock_quantity?: number;
}

export interface Product {
  id: number;
  partition_id: number;
  partition_name?: string;
  sku: string;
  fabric: string;
  weight: number;
  elasticity: string;
  composition: string;
  color: string;
  price: number;
  main_images: string[];
  detail_images: string[];
  size_chart: string;
  notes: string;
  skus: SKU[];
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: string;
  product_id: number;
  sku_id: number;
  size: string;
  quantity: number;
  price: number;
  status: 'active' | 'cancelled' | 'cancel_pending';
  cancel_reason?: string;
  sku?: string; // Product SKU code
  color?: string;
}

export interface Order {
  id: string;
  user_id: number;
  buyer_name?: string;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  total_amount: number;
  tracking_number?: string;
  items: OrderItem[];
  created_at: string;
}

export interface FileItem {
  id: number;
  sender_id: number;
  sender_name?: string;
  receiver_id: number;
  filename: string;
  original_name: string;
  size: number;
  created_at: string;
}

export interface DailyReport {
  date: string;
  total_sales: number;
  order_count: number;
  total_items: number;
}

export interface Notification {
  id: number;
  type: 'low_stock' | 'system';
  message: string;
  is_read: number;
  created_at: string;
}
