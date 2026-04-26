import { Db, Collection } from "mongodb";
import { getDb } from "./mongodb";
import { User, Product, Category, Cart, Order } from "../models/types";

let _db: Db | null = null;
async function db(): Promise<Db> {
  if (_db) return _db;
  _db = await getDb();
  return _db;
}

// One-shot index setup. Idempotent (createIndex is a no-op if index already exists).
let _indexesEnsured: Promise<void> | null = null;
async function ensureIndexes(database: Db): Promise<void> {
  if (_indexesEnsured) return _indexesEnsured;
  _indexesEnsured = (async () => {
    const products = database.collection<Product>("products");
    const categories = database.collection<Category>("categories");
    const users = database.collection<User>("users");
    await Promise.all([
      // Full-text search across title, description, tags. Title weighted highest.
      products.createIndex(
        { title: "text", description: "text", tags: "text" },
        { weights: { title: 5, tags: 3, description: 1 }, name: "products_text" }
      ),
      products.createIndex({ slug: 1 }, { unique: true }),
      categories.createIndex({ slug: 1 }, { unique: true }),
      users.createIndex({ email: 1 }, { unique: true }),
    ]);
  })().catch((err) => {
    // Reset so a future call can retry; but log so the operator notices.
    _indexesEnsured = null;
    console.error("Failed to ensure indexes:", err);
  });
  return _indexesEnsured;
}

export async function usersCollection(): Promise<Collection<User>> {
  const database = await db();
  await ensureIndexes(database);
  return database.collection<User>("users");
}
export async function productsCollection(): Promise<Collection<Product>> {
  const database = await db();
  await ensureIndexes(database);
  return database.collection<Product>("products");
}
export async function categoriesCollection(): Promise<Collection<Category>> {
  const database = await db();
  await ensureIndexes(database);
  return database.collection<Category>("categories");
}
export async function cartsCollection(): Promise<Collection<Cart>> {
  return (await db()).collection<Cart>("carts");
}
export async function ordersCollection(): Promise<Collection<Order>> {
  return (await db()).collection<Order>("orders");
}
