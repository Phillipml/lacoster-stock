"use client";

import { useState } from "react";
import type { ProductDTO } from "@/lib/types";
import {
  applyDraftPatch,
  draftToPayload,
  inputClass,
  toDraft,
  type FormPayload,
} from "@/lib/productDraft";

type EditorProps = {
  initial?: ProductDTO | null;
  saving?: boolean;
  onSave: (data: FormPayload) => Promise<void> | void;
  onCancel: () => void;
};

function useProductDraft(initial?: ProductDTO | null) {
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [localError, setLocalError] = useState("");

  function patch(p: Partial<ReturnType<typeof toDraft>>) {
    setDraft((prev) => applyDraftPatch(prev, p));
  }

  async function save(onSave: EditorProps["onSave"]) {
    setLocalError("");
    try {
      await onSave(draftToPayload(draft));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Erro ao salvar");
    }
  }

  return { draft, patch, localError, save };
}

export function ProductInlineEditorRow({
  initial,
  saving = false,
  onSave,
  onCancel,
}: EditorProps) {
  const { draft, patch, localError, save } = useProductDraft(initial);

  return (
    <tr className="border-t border-brand/40 bg-brand-soft/20 align-top">
      <td className="px-2 py-2">
        <input
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          className={inputClass}
          placeholder="Produto"
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={draft.base_value}
          onChange={(e) => patch({ base_value: e.target.value })}
          inputMode="decimal"
          className={inputClass}
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={draft.markup_percentage}
          onChange={(e) => patch({ markup_percentage: e.target.value })}
          inputMode="decimal"
          className={inputClass}
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={draft.final_value}
          onChange={(e) => patch({ final_value: e.target.value })}
          inputMode="decimal"
          className={inputClass}
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={draft.discount_percentage}
          onChange={(e) => patch({ discount_percentage: e.target.value })}
          inputMode="decimal"
          className={inputClass}
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={draft.discounted_value}
          onChange={(e) => patch({ discounted_value: e.target.value })}
          inputMode="decimal"
          className={inputClass}
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={draft.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Observação"
          className={inputClass}
        />
        {localError ? (
          <p className="mt-1 text-xs text-danger">{localError}</p>
        ) : null}
      </td>
      <td className="px-2 py-2">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(onSave)}
            className="rounded-xl bg-brand px-3 py-1.5 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-line px-3 py-1.5 font-medium"
          >
            Cancelar
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ProductInlineEditorCard({
  initial,
  saving = false,
  title,
  onSave,
  onCancel,
}: EditorProps & { title?: string }) {
  const { draft, patch, localError, save } = useProductDraft(initial);

  return (
    <article className="rounded-3xl border border-brand bg-bg-elevated p-4 shadow-[var(--shadow)]">
      {title ? (
        <p className="mb-3 text-sm font-semibold text-brand">{title}</p>
      ) : null}
      <div className="grid gap-2">
        <input
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Produto"
          className={inputClass}
        />
        <input
          value={draft.base_value}
          onChange={(e) => patch({ base_value: e.target.value })}
          inputMode="decimal"
          placeholder="Custo"
          className={inputClass}
        />
        <input
          value={draft.markup_percentage}
          onChange={(e) => patch({ markup_percentage: e.target.value })}
          inputMode="decimal"
          placeholder="% lucro"
          className={inputClass}
        />
        <input
          value={draft.final_value}
          onChange={(e) => patch({ final_value: e.target.value })}
          inputMode="decimal"
          placeholder="Venda"
          className={inputClass}
        />
        <input
          value={draft.discount_percentage}
          onChange={(e) => patch({ discount_percentage: e.target.value })}
          inputMode="decimal"
          placeholder="% desc"
          className={inputClass}
        />
        <input
          value={draft.discounted_value}
          onChange={(e) => patch({ discounted_value: e.target.value })}
          inputMode="decimal"
          placeholder="Final"
          className={inputClass}
        />
        <input
          value={draft.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Observação"
          className={inputClass}
        />
      </div>
      {localError ? (
        <p className="mt-2 text-sm text-danger">{localError}</p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(onSave)}
          className="flex-1 rounded-2xl bg-brand px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-2xl border border-line px-3 py-2.5 text-sm font-medium"
        >
          Cancelar
        </button>
      </div>
    </article>
  );
}
