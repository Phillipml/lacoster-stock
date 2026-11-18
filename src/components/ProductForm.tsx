"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ProductDTO } from "@/lib/types";
import { calcFinalValue } from "@/lib/types";

type ProductFormData = {
  name: string;
  base_value: number;
  markup_percentage: number;
  final_value: number;
  notes: string;
};

type Props = {
  initial?: ProductDTO | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
};

function toInput(n: number | undefined) {
  if (n === undefined || n === null || Number.isNaN(n)) return "";
  return String(n).replace(".", ",");
}

function parseNum(raw: string) {
  return Number(String(raw).replace(",", "."));
}

export function ProductForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [baseValue, setBaseValue] = useState(toInput(initial?.base_value));
  const [markup, setMarkup] = useState(toInput(initial?.markup_percentage));
  const [finalValue, setFinalValue] = useState(toInput(initial?.final_value));
  const [finalTouched, setFinalTouched] = useState(false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? "");
    setBaseValue(toInput(initial?.base_value));
    setMarkup(toInput(initial?.markup_percentage));
    setFinalValue(toInput(initial?.final_value));
    setFinalTouched(false);
    setNotes(initial?.notes ?? "");
  }, [initial]);

  const suggestedFinal = useMemo(() => {
    const base = parseNum(baseValue);
    const m = parseNum(markup);
    if (!Number.isFinite(base) || !Number.isFinite(m)) return null;
    return calcFinalValue(base, m);
  }, [baseValue, markup]);

  useEffect(() => {
    if (!finalTouched && suggestedFinal !== null) {
      setFinalValue(toInput(suggestedFinal));
    }
  }, [suggestedFinal, finalTouched]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        base_value: parseNum(baseValue),
        markup_percentage: parseNum(markup),
        final_value: parseNum(finalValue),
        notes: notes.trim(),
      });
      if (!initial) {
        setName("");
        setBaseValue("");
        setMarkup("");
        setFinalValue("");
        setFinalTouched(false);
        setNotes("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-brand/30 transition focus:ring-4";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Nome</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ex: abracadeira nylon 200x35"
          className={fieldClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Valor base</span>
          <input
            value={baseValue}
            onChange={(e) => setBaseValue(e.target.value)}
            inputMode="decimal"
            required
            placeholder="0,00"
            className={fieldClass}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Markup %</span>
          <input
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            inputMode="decimal"
            required
            placeholder="0"
            className={fieldClass}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Valor final</span>
          <input
            value={finalValue}
            onChange={(e) => {
              setFinalTouched(true);
              setFinalValue(e.target.value);
            }}
            inputMode="decimal"
            required
            placeholder="0,00"
            className={fieldClass}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Notes / observações</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Dados adicionais..."
          className={`${fieldClass} resize-y`}
        />
      </label>

      {error ? (
        <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-line px-4 py-3 font-medium text-ink transition hover:bg-bg"
          >
            Cancelar
          </button>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
        >
          {loading ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
