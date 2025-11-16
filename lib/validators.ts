import { z } from "zod";

export const CreateProductSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  images: z.array(z.string()).optional().default([]),
  price: z.number().nonnegative(),
  currency: z.string().default("INR"),
  categories: z.array(z.string()).optional().default([]),
  stock: z.number().int().nonnegative().default(0),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const CreateCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  parentId: z.string().optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();
