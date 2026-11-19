export type Product = {
  _id?: { toString(): string };
  name: string;
  /** nome normalizado p/ unicidade (trim + lower) */
  name_key: string;
  base_value: number;
  markup_percentage: number;
  final_value: number;
  discount_percentage: number;
  discounted_value: number;
  notes: string;
  created_at: Date;
  updated_at: Date;
};

export function toNameKey(name: string) {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export type ProductInput = {
  name: string;
  base_value: number;
  markup_percentage: number;
  final_value?: number;
  discount_percentage?: number;
  discounted_value?: number;
  notes?: string;
};

export type ProductDTO = {
  id: string;
  name: string;
  base_value: number;
  markup_percentage: number;
  final_value: number;
  discount_percentage: number;
  discounted_value: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

/** venda = custo * (1 + lucro/100) */
export function calcFinalValue(base: number, markup: number) {
  return Math.round(base * (1 + markup / 100) * 100) / 100;
}

/** lucro% a partir de custo e venda */
export function calcMarkupPercentage(base: number, venda: number) {
  if (!base) return 0;
  return Math.round(((venda / base) - 1) * 10000) / 100;
}

/** final = venda * (1 - desc/100) */
export function calcDiscountedValue(finalValue: number, discount: number) {
  return Math.round(finalValue * (1 - discount / 100) * 100) / 100;
}

/** desc% a partir de venda e final */
export function calcDiscountPercentage(venda: number, discounted: number) {
  if (!venda) return 0;
  return Math.round((1 - discounted / venda) * 10000) / 100;
}

export function toProductDTO(doc: Product): ProductDTO {
  const final_value = doc.final_value ?? 0;
  const discount_percentage = doc.discount_percentage ?? 0;
  const discounted_value =
    doc.discounted_value ??
    calcDiscountedValue(final_value, discount_percentage);

  const created = doc.created_at ? new Date(doc.created_at) : new Date();
  const updated = doc.updated_at ? new Date(doc.updated_at) : new Date();

  return {
    id: String(doc._id),
    name: doc.name ?? "",
    base_value: doc.base_value ?? 0,
    markup_percentage: doc.markup_percentage ?? 0,
    final_value,
    discount_percentage,
    discounted_value,
    notes: doc.notes ?? "",
    created_at: Number.isNaN(created.getTime())
      ? new Date().toISOString()
      : created.toISOString(),
    updated_at: Number.isNaN(updated.getTime())
      ? new Date().toISOString()
      : updated.toISOString(),
  };
}
