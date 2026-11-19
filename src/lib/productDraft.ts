import {
  calcDiscountPercentage,
  calcDiscountedValue,
  calcFinalValue,
  calcMarkupPercentage,
} from "@/lib/types";
import type { ProductDTO } from "@/lib/types";

export type Draft = {
  name: string;
  base_value: string;
  markup_percentage: string;
  final_value: string;
  discount_percentage: string;
  discounted_value: string;
  notes: string;
};

export type FormPayload = {
  name: string;
  base_value: number;
  markup_percentage: number;
  final_value: number;
  discount_percentage: number;
  discounted_value: number;
  notes: string;
};

function fmt(n: number) {
  if (!Number.isFinite(n)) return "";
  return String(n).replace(".", ",");
}

export function toDraft(p?: ProductDTO | null): Draft {
  return {
    name: p?.name ?? "",
    base_value: p != null ? fmt(p.base_value) : "",
    markup_percentage: p != null ? fmt(p.markup_percentage) : "",
    final_value: p != null ? fmt(p.final_value) : "",
    discount_percentage: p != null ? fmt(p.discount_percentage ?? 0) : "0",
    discounted_value:
      p != null ? fmt(p.discounted_value ?? p.final_value) : "",
    notes: p?.notes ?? "",
  };
}

export function parseNum(raw: string) {
  if (raw.trim() === "") return NaN;
  return Number(String(raw).replace(",", "."));
}

/**
 * Mantém a cadeia dinâmica:
 * custo/% lucro <-> venda
 * venda/% desc <-> final
 */
export function applyDraftPatch(prev: Draft, patch: Partial<Draft>): Draft {
  const next = { ...prev, ...patch };

  const changed = (key: keyof Draft) => patch[key] !== undefined;

  // custo ou lucro → atualiza venda → atualiza final
  if (changed("base_value") || changed("markup_percentage")) {
    const base = parseNum(next.base_value);
    const markup = parseNum(next.markup_percentage);
    if (Number.isFinite(base) && Number.isFinite(markup)) {
      next.final_value = fmt(calcFinalValue(base, markup));
      const desc = parseNum(next.discount_percentage || "0");
      if (Number.isFinite(desc)) {
        next.discounted_value = fmt(
          calcDiscountedValue(parseNum(next.final_value), desc),
        );
      }
    }
    return next;
  }

  // venda → atualiza lucro (se houver custo) e final
  if (changed("final_value")) {
    const base = parseNum(next.base_value);
    const venda = parseNum(next.final_value);
    if (Number.isFinite(base) && base > 0 && Number.isFinite(venda)) {
      next.markup_percentage = fmt(calcMarkupPercentage(base, venda));
    }
    const desc = parseNum(next.discount_percentage || "0");
    if (Number.isFinite(venda) && Number.isFinite(desc)) {
      next.discounted_value = fmt(calcDiscountedValue(venda, desc));
    }
    return next;
  }

  // % desc → atualiza final
  if (changed("discount_percentage")) {
    const venda = parseNum(next.final_value);
    const desc = parseNum(next.discount_percentage || "0");
    if (Number.isFinite(venda) && Number.isFinite(desc)) {
      next.discounted_value = fmt(calcDiscountedValue(venda, desc));
    }
    return next;
  }

  // final → atualiza % desc
  if (changed("discounted_value")) {
    const venda = parseNum(next.final_value);
    const discounted = parseNum(next.discounted_value);
    if (Number.isFinite(venda) && venda > 0 && Number.isFinite(discounted)) {
      next.discount_percentage = fmt(
        calcDiscountPercentage(venda, discounted),
      );
    }
    return next;
  }

  return next;
}

export function draftToPayload(d: Draft): FormPayload {
  return {
    name: d.name.trim(),
    base_value: parseNum(d.base_value),
    markup_percentage: parseNum(d.markup_percentage),
    final_value: parseNum(d.final_value),
    discount_percentage: parseNum(d.discount_percentage || "0"),
    discounted_value: parseNum(d.discounted_value),
    notes: d.notes.trim(),
  };
}

export const inputClass =
  "w-full min-w-0 rounded-xl border border-line bg-white px-2 py-1.5 text-xs outline-none ring-brand/30 focus:ring-2";
