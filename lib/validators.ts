import { z } from "zod";

// Money fields are integer minor units (paise / cents). See lib/money.ts.
export const CreateProductSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  images: z.array(z.string()).optional().default([]),
  price: z.number().int().nonnegative(),
  currency: z.string().default("INR"),
  categories: z.array(z.string()).optional().default([]),
  stock: z.number().int().nonnegative().default(0),
});

export const UpdateProductSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  price: z.number().int().nonnegative().optional(),
  currency: z.string().optional(),
  categories: z.array(z.string()).optional(),
  stock: z.number().int().nonnegative().optional(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  parentId: z.string().optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  parentId: z.string().optional(),
});

export const AddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().optional(),
});
