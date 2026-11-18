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
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!process.env[k]) process.env[k] = v;
}

function toNameKey(name) {
  return String(name || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const col = client.db().collection("produtos");
const now = new Date();

const docs = await col.find({}).project({ name: 1, name_key: 1 }).toArray();
const seen = new Map();
const ops = [];

for (const doc of docs) {
  let key = toNameKey(doc.name);
  if (!key) key = `sem-nome-${String(doc._id)}`;

  if (seen.has(key)) {
    const n = seen.get(key) + 1;
    seen.set(key, n);
    key = `${key}__${n}`;
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            name: `${doc.name} (${n})`,
            name_key: key,
            updated_at: now,
          },
        },
      },
    });
    continue;
  }

  seen.set(key, 1);
  if (doc.name_key !== key) {
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { name_key: key, updated_at: now } },
      },
    });
  }
}

let modified = 0;
const chunk = 500;
for (let i = 0; i < ops.length; i += chunk) {
  const res = await col.bulkWrite(ops.slice(i, i + chunk), { ordered: false });
  modified += res.modifiedCount;
}

try {
  await col.createIndex(
    { name_key: 1 },
    { unique: true, name: "produtos_name_key_unique" },
  );
  console.log("Índice unique name_key OK");
} catch (err) {
  console.log("Índice:", err.message);
}

const missing = await col.countDocuments({
  $or: [{ name_key: { $exists: false } }, { name_key: null }, { name_key: "" }],
});
console.log({ ops: ops.length, modified, total: docs.length, missing });
await client.close();
