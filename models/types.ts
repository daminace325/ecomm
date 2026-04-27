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
  /** Integer minor units (paise / cents). See lib/money.ts. */
  price?: number;
}

export interface Product {
  _id: ID;
  title: string;
  slug: string;
  description?: string;
  images: string[];
  /** Integer minor units (paise / cents). See lib/money.ts. */
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
  updatedAt?: string;
}

export interface CartItem {
  productId: ID;
  variantId?: string;
  qty: number;
  /** Integer minor units (paise / cents) snapshot at add-to-cart time. */
  priceAtAdd: number;
}

export interface Cart {
  _id: ID;
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
  /** Integer minor units (paise / cents). */
  price: number;
  vendorId?: ID;
  // Snapshot of product display fields at order time. Captured so the order
  // remains a faithful historical record even if the product is later edited
  // or deleted. Optional for backward compatibility with pre-snapshot orders.
  title?: string;
  image?: string;
  slug?: string;
  currency?: string;
}

export interface Order {
  _id: ID;
  userId: ID;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  /** All monetary fields are integer minor units (paise / cents). */
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  payment?: { provider: string; providerId?: string; status?: string; amount?: number };
  createdAt: string;
  updatedAt?: string;
}
