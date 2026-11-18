import { ObjectId, type Filter } from "mongodb";
import { productsCollection } from "@/lib/mongo";
import {
  calcDiscountedValue,
  calcFinalValue,
  toNameKey,
  toProductDTO,
  type Product,
  type ProductDTO,
  type ProductInput,
} from "@/lib/types";

function num(value: unknown, label: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} inválido`);
  return n;
}

function cleanInput(input: ProductInput) {
  const name = String(input.name ?? "").trim();
  const notes = String(input.notes ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório");

  const name_key = toNameKey(name);
  if (!name_key) throw new Error("Nome é obrigatório");

  const base_value = num(input.base_value, "Custo");
  const markup_percentage = num(input.markup_percentage, "% lucro");
  const discount_percentage = num(
    input.discount_percentage ?? 0,
    "% desconto",
  );
  if (discount_percentage > 100) throw new Error("% desconto inválido");

  const final_value =
    input.final_value === undefined || input.final_value === null
      ? calcFinalValue(base_value, markup_percentage)
      : num(input.final_value, "Venda");

  const discounted_value =
    input.discounted_value === undefined || input.discounted_value === null
      ? calcDiscountedValue(final_value, discount_percentage)
      : num(input.discounted_value, "Final");

  return {
    name,
    name_key,
    base_value,
    markup_percentage,
    final_value,
    discount_percentage,
    discounted_value,
    notes,
  };
}

function escapeRegex(term: string) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertNameAvailable(name_key: string, excludeId?: string) {
  const col = await productsCollection();
  const filter: Filter<Product> = { name_key };
  if (excludeId) {
    filter._id = { $ne: new ObjectId(excludeId) } as Filter<Product>["_id"];
  }
  const existing = await col.findOne(filter, { projection: { _id: 1 } });
  if (existing) {
    throw new Error("Já existe um produto com esse nome");
  }
}

function isDuplicateKeyError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

export async function listProducts(q?: string): Promise<ProductDTO[]> {
  const col = await productsCollection();
  const term = q?.trim();

  if (!term) {
    const docs = await col.find({}).sort({ name: 1 }).limit(5000).toArray();
    return docs.map(toProductDTO);
  }

  try {
    const textDocs = await col
      .find({ $text: { $search: term } } as Filter<Product>, {
        projection: { score: { $meta: "textScore" } },
      })
      .sort({ score: { $meta: "textScore" }, name: 1 })
      .limit(5000)
      .toArray();

    if (textDocs.length > 0) return textDocs.map(toProductDTO);
  } catch {
    // fallback regex
  }

  const safe = escapeRegex(term);
  const docs = await col
    .find({
      $or: [
        { name: { $regex: safe, $options: "i" } },
        { notes: { $regex: safe, $options: "i" } },
      ],
    })
    .sort({ name: 1 })
    .limit(5000)
    .toArray();

  return docs.map(toProductDTO);
}

export async function createProduct(input: ProductInput): Promise<ProductDTO> {
  const data = cleanInput(input);
  await assertNameAvailable(data.name_key);
  const now = new Date();
  const col = await productsCollection();
  const doc = {
    name: data.name,
    name_key: data.name_key,
    base_value: data.base_value,
    markup_percentage: data.markup_percentage,
    final_value: data.final_value,
    discount_percentage: data.discount_percentage,
    discounted_value: data.discounted_value,
    notes: data.notes,
    created_at: now,
    updated_at: now,
  };

  try {
    const result = await col.insertOne(doc);
    return toProductDTO({ ...doc, _id: result.insertedId });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new Error("Já existe um produto com esse nome");
    }
    throw err;
  }
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ProductDTO> {
  if (!ObjectId.isValid(id)) throw new Error("ID inválido");
  const data = cleanInput(input);
  await assertNameAvailable(data.name_key, id);
  const col = await productsCollection();

  try {
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: data.name,
          name_key: data.name_key,
          base_value: data.base_value,
          markup_percentage: data.markup_percentage,
          final_value: data.final_value,
          discount_percentage: data.discount_percentage,
          discounted_value: data.discounted_value,
          notes: data.notes,
          updated_at: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!result) throw new Error("Produto não encontrado");
    return toProductDTO(result);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new Error("Já existe um produto com esse nome");
    }
    throw err;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) throw new Error("ID inválido");
  const col = await productsCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) throw new Error("Produto não encontrado");
}
