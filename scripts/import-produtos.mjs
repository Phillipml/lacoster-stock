import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

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
  console.error("MONGODB_URI ausente no .env");
  process.exit(1);
}

const xlsxPath = resolve(root, "..", "..", "Produto.xlsx");
const workbook = XLSX.readFile(xlsxPath);
const sheet = workbook.Sheets["Produtos"] || workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseMarkup(obs) {
  if (!obs) return 0;
  const text = String(obs);
  // "201%" / "65,8%" / "141%"
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return 0;
  return Number(m[1].replace(",", "."));
}

function deriveBase(finalValue, markup) {
  if (!Number.isFinite(finalValue)) return 0;
  if (!markup || markup <= 0) return finalValue;
  const divisor = 1 + markup / 100;
  if (divisor <= 0) return finalValue;
  return Math.round((finalValue / divisor) * 100) / 100;
}

const now = new Date();
const docs = [];
const seen = new Set();

for (const row of rows) {
  const name = String(row.Descricao ?? row.descricao ?? "").trim();
  if (!name) continue;

  const key = name.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);

  const final_value = toNumber(row.Preco_Obs ?? row.preco ?? 0) ?? 0;
  const notes = String(row.Obs_raw ?? row.observacao ?? "").trim();
  const markup_percentage = parseMarkup(notes);
  const base_value = deriveBase(final_value, markup_percentage);

  docs.push({
    name,
    base_value,
    markup_percentage,
    final_value,
    notes,
    created_at: now,
    updated_at: now,
  });
}

console.log(`Linhas no Excel: ${rows.length}`);
console.log(`Produtos únicos a inserir: ${docs.length}`);
console.log("Amostra:", docs.slice(0, 3));

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db();
  const col = db.collection("produtos");

  const existing = await col.countDocuments();
  console.log(`Documentos atuais em produtos: ${existing}`);

  if (existing > 0) {
    const del = await col.deleteMany({});
    console.log(`Removidos (reset da collection): ${del.deletedCount}`);
  }

  if (docs.length === 0) {
    console.error("Nada para inserir.");
    process.exit(1);
  }

  const result = await col.insertMany(docs, { ordered: false });
  console.log(`Inseridos: ${result.insertedCount}`);

  await col.createIndex({ name: 1 });
  await col.createIndex({ updated_at: -1 });

  const total = await col.countDocuments();
  const sample = await col.find({}).limit(2).toArray();
  console.log(`Total final: ${total}`);
  console.log(
    "Sample Mongo:",
    sample.map((d) => ({
      name: d.name,
      base_value: d.base_value,
      markup_percentage: d.markup_percentage,
      final_value: d.final_value,
      notes: (d.notes || "").slice(0, 40),
      created_at: d.created_at,
    })),
  );
} finally {
  await client.close();
}
