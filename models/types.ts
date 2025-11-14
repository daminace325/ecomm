export type ID = string;

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country?: string;
}

export interface User {
  _id: ID;
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin" | "vendor";
  addresses?: Address[];
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  attrs: Record<string, string>;
  stock: number;
  price?: number;
}

export interface Product {
  _id: ID;
  title: string;
  slug: string;
  description?: string;
  images: string[];
  price: number; 
  currency: string;
  categories: ID[];
  sku?: string;
  stock: number;
  variants?: ProductVariant[];
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  vendorId?: ID | null;
}

export interface Category {
  _id: ID;
  name: string;
  slug: string;
  parentId?: ID | null;
  createdAt: string;
}

export interface CartItem {
  productId: ID;
  variantId?: string;
  qty: number;
  priceAtAdd: number;
}

export interface Cart {
  _id?: ID;
  userId: ID;
  items: CartItem[];
  updatedAt: string;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  productId: ID;
  variantId?: string;
  qty: number;
  price: number;
  vendorId?: ID;
}

export interface Order {
  _id: ID;
  userId: ID;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  payment?: { provider: string; providerId?: string; status?: string; amount?: number };
  createdAt: string;
  updatedAt?: string;
}
