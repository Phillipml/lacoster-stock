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

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

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
  const isNew = !initial;

  return (
    <tr
      className={
        isNew
          ? "stock-sensitive border-t border-line bg-brand-soft align-top"
          : "stock-sensitive border-t border-brand/40 bg-brand-soft/20 align-top"
      }
    >
      <td className="min-w-[260px] w-[34%] border-r border-line px-2 py-2">
        <textarea
          value={draft.name}
          onChange={(e) =>
            patch({ name: e.target.value.replace(/\n/g, " ") })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          className={`${inputClass} max-h-24 resize-none overflow-x-hidden overflow-y-auto break-words [overflow-wrap:anywhere]`}
          placeholder="Produto"
          rows={2}
          autoFocus={isNew}
        />
      </td>
      <td className="w-[9%] border-r border-line px-2 py-2">
        <input
          value={draft.base_value}
          onChange={(e) => patch({ base_value: e.target.value })}
          inputMode="decimal"
          className={inputClass}
        />
      </td>
      <td className="w-[7%] border-r border-line px-2 py-2">
        <input
          value={draft.markup_percentage}
          onChange={(e) => patch({ markup_percentage: e.target.value })}
          inputMode="decimal"
          className={inputClass}
        />
      </td>
      <td className="w-[9%] border-r border-line px-2 py-2">
        <input
          value={draft.final_value}
          onChange={(e) => patch({ final_value: e.target.value })}
          inputMode="decimal"
          className={inputClass}
        />
      </td>
      <td className="w-[7%] border-r border-line px-2 py-2">
        <input
          value={draft.discount_percentage}
          onChange={(e) => patch({ discount_percentage: e.target.value })}
          inputMode="decimal"
          className={inputClass}
        />
      </td>
      <td className="w-[9%] border-r border-line px-2 py-2">
        <input
          value={draft.discounted_value}
          onChange={(e) => patch({ discounted_value: e.target.value })}
          inputMode="decimal"
          className={inputClass}
        />
      </td>
      <td className="min-w-[140px] w-[16%] border-r border-line px-2 py-2">
        <textarea
          value={draft.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Observação"
          rows={3}
          className={`${inputClass} max-h-24 resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}
        />
        {localError ? (
          <p className="mt-1 text-xs text-danger">{localError}</p>
        ) : null}
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          {isNew ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save(onSave)}
                title="Salvar"
                aria-label="Salvar"
                className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand transition hover:bg-white hover:text-brand-deep disabled:opacity-60"
              >
                <IconCheck className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onCancel}
                title="Cancelar"
                aria-label="Cancelar"
                className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg text-danger transition hover:bg-white hover:text-[#911b12]"
              >
                <IconX className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
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
                className="rounded-xl bg-danger px-3 py-1.5 font-semibold text-white transition hover:bg-[#911b12]"
              >
                Cancelar
              </button>
            </>
          )}
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
  const isNew = !initial;

  return (
    <article
      className={
        isNew
          ? "stock-sensitive max-w-full min-w-0 overflow-hidden rounded-3xl border border-line bg-brand-soft p-4 shadow-[var(--shadow)]"
          : "stock-sensitive max-w-full min-w-0 overflow-hidden rounded-3xl border border-brand bg-bg-elevated p-4 shadow-[var(--shadow)]"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        {title ? (
          <p className="text-sm font-semibold text-brand">{title}</p>
        ) : (
          <span />
        )}
        {isNew ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(onSave)}
              title="Salvar"
              aria-label="Salvar"
              className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand transition hover:bg-white hover:text-brand-deep disabled:opacity-60"
            >
              <IconCheck className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={onCancel}
              title="Cancelar"
              aria-label="Cancelar"
              className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-lg text-danger transition hover:bg-white hover:text-[#911b12]"
            >
              <IconX className="h-6 w-6" />
            </button>
          </div>
        ) : null}
      </div>
      <div className="grid gap-2">
        <textarea
          value={draft.name}
          onChange={(e) =>
            patch({ name: e.target.value.replace(/\n/g, " ") })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder="Produto"
          rows={2}
          className={`${inputClass} max-h-24 resize-none overflow-x-hidden overflow-y-auto break-words [overflow-wrap:anywhere]`}
        />
        <div className="grid grid-cols-2 gap-2">
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
            className={`${inputClass} col-span-2`}
          />
        </div>
        <textarea
          value={draft.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Observação"
          rows={3}
          className={`${inputClass} max-h-24 resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}
        />
      </div>
      {localError ? (
        <p className="mt-2 text-sm text-danger">{localError}</p>
      ) : null}
      {!isNew ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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
            className="flex-1 rounded-2xl bg-danger px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#911b12]"
          >
            Cancelar
          </button>
        </div>
      ) : null}
    </article>
  );
}
