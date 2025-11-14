import { Db, Collection } from "mongodb";
import { getDb } from "./mongodb";
import { User, Product, Category, Cart, Order } from "../models/types";

let _db: Db | null = null;
async function db(): Promise<Db> {
  if (_db) return _db;
  _db = await getDb();
  return _db;
}

export async function usersCollection(): Promise<Collection<User>> {
  return (await db()).collection<User>("users");
}
export async function productsCollection(): Promise<Collection<Product>> {
  return (await db()).collection<Product>("products");
}
export async function categoriesCollection(): Promise<Collection<Category>> {
  return (await db()).collection<Category>("categories");
}
export async function cartsCollection(): Promise<Collection<Cart>> {
  return (await db()).collection<Cart>("carts");
}
export async function ordersCollection(): Promise<Collection<Order>> {
  return (await db()).collection<Order>("orders");
}
