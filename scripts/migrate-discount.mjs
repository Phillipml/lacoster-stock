import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv(filePath) {
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv(resolve(root, ".env"));

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI ausente");
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const col = client.db().collection("produtos");
  const now = new Date();

  const before = await col.countDocuments({
    $or: [
      { discount_percentage: { $exists: false } },
      { discounted_value: { $exists: false } },
    ],
  });
  console.log(`Docs sem campos novos: ${before}`);

  // 1) garante discount_percentage = 0 onde faltar
  const r1 = await col.updateMany(
    { discount_percentage: { $exists: false } },
    { $set: { discount_percentage: 0, updated_at: now } },
  );
  console.log(`discount_percentage set: ${r1.modifiedCount}`);

  // 2) calcula discounted_value = final_value * (1 - discount/100)
  const r2 = await col.updateMany(
    {
      $or: [
        { discounted_value: { $exists: false } },
        { discounted_value: null },
      ],
    },
    [
      {
        $set: {
          discounted_value: {
            $round: [
              {
                $multiply: [
                  { $ifNull: ["$final_value", 0] },
                  {
                    $subtract: [
                      1,
                      { $divide: [{ $ifNull: ["$discount_percentage", 0] }, 100] },
                    ],
                  },
                ],
              },
              2,
            ],
          },
          updated_at: now,
        },
      },
    ],
  );
  console.log(`discounted_value set: ${r2.modifiedCount}`);

  const after = await col.countDocuments({
    $or: [
      { discount_percentage: { $exists: false } },
      { discounted_value: { $exists: false } },
    ],
  });
  const total = await col.countDocuments();
  const sample = await col.find({}).sort({ name: 1 }).limit(2).toArray();

  console.log(`Ainda faltando: ${after}`);
  console.log(`Total produtos: ${total}`);
  console.log(
    "Sample:",
    sample.map((d) => ({
      name: d.name,
      final_value: d.final_value,
      discount_percentage: d.discount_percentage,
      discounted_value: d.discounted_value,
    })),
  );
} finally {
  await client.close();
}
