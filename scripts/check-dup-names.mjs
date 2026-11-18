import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const col = client.db().collection("produtos");
const dups = await col
  .aggregate([
    { $project: { name: 1, key: { $toLower: { $trim: { input: "$name" } } } } },
    { $group: { _id: "$key", count: { $sum: 1 }, names: { $addToSet: "$name" } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 30 },
  ])
  .toArray();
console.log(JSON.stringify({ groups: dups.length, sample: dups.slice(0, 15) }, null, 2));
await client.close();
