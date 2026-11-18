import { MongoClient, Db, Collection } from "mongodb";
import type { Product } from "@/lib/types";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _produtosIndexesPromise: Promise<void> | undefined;
}

function getUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI não definida no .env");
  return uri;
}

function getClientPromise() {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(getUri());
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}

async function ensureProductIndexes(col: Collection<Product>) {
  if (!global._produtosIndexesPromise) {
    global._produtosIndexesPromise = (async () => {
      await col.createIndex({ name: 1 });
      await col.createIndex(
        { name_key: 1 },
        { unique: true, name: "produtos_name_key_unique" },
      );
      await col.createIndex(
        { name: "text", notes: "text" },
        {
          name: "produtos_text",
          default_language: "portuguese",
          weights: { name: 10, notes: 3 },
        },
      );
    })().catch((err) => {
      global._produtosIndexesPromise = undefined;
      throw err;
    });
  }
  await global._produtosIndexesPromise;
}

export async function productsCollection(): Promise<Collection<Product>> {
  const db = await getDb();
  const col = db.collection<Product>("produtos");
  await ensureProductIndexes(col);
  return col;
}
