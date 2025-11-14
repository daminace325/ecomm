import { MongoClient, Db } from "mongodb";

declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoDb: Db | undefined;
}

export async function getDb(): Promise<Db> {
  if (global._mongoDb) return global._mongoDb;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri, { ignoreUndefined: true });
    await global._mongoClient.connect();
  }

  global._mongoDb = global._mongoClient.db();
  return global._mongoDb;
}
