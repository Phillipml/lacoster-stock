"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { ProductDTO } from "@/lib/types";
import type { FormPayload } from "@/lib/productDraft";
import {
  ProductInlineEditorCard,
  ProductInlineEditorRow,
} from "@/components/ProductInlineEditor";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const BACKUP_LAST_KEY = "lacoster_backup_last_at";
const BACKUP_REMIND_KEY = "lacoster_backup_remind_at";
const BACKUP_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const PRODUTOS_CACHE_KEY = "lacoster_produtos_cache_v1";

function readProdutosCache(): ProductDTO[] | null {
  try {
    const raw = sessionStorage.getItem(PRODUTOS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { produtos?: ProductDTO[] };
    return Array.isArray(parsed.produtos) ? parsed.produtos : null;
  } catch {
    return null;
  }
}

function writeProdutosCache(produtos: ProductDTO[]) {
  try {
    sessionStorage.setItem(
      PRODUTOS_CACHE_KEY,
      JSON.stringify({ at: Date.now(), produtos }),
    );
  } catch {
    // quota / private mode
  }
}

function markBackupDone() {
  const now = new Date().toISOString();
  localStorage.setItem(BACKUP_LAST_KEY, now);
  localStorage.removeItem(BACKUP_REMIND_KEY);
}

function snoozeBackupReminder() {
  localStorage.setItem(
    BACKUP_REMIND_KEY,
    new Date(Date.now() + BACKUP_DAYS_MS).toISOString(),
  );
}

function shouldPromptBackup(): boolean {
  const now = Date.now();
  const remindRaw = localStorage.getItem(BACKUP_REMIND_KEY);
  if (remindRaw) {
    const remindAt = Date.parse(remindRaw);
    if (!Number.isNaN(remindAt) && now < remindAt) return false;
  }

  const lastRaw = localStorage.getItem(BACKUP_LAST_KEY);
  if (!lastRaw) return true;
  const lastAt = Date.parse(lastRaw);
  if (Number.isNaN(lastAt)) return true;
  return now - lastAt >= BACKUP_DAYS_MS;
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function IconDatabase({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function IconMoney({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12" />
      <path d="M15.5 9.5c0-1.5-1.3-2.5-3.5-2.5S8.5 8 8.5 9.5 9.8 11.5 12 12s3.5 1 3.5 2.5-1.3 2.5-3.5 2.5-3.5-1-3.5-2.5" />
    </svg>
  );
}

function ProductViewModal({
  product,
  onClose,
}: {
  product: ProductDTO;
  onClose: () => void;
}) {
  const [showDiscounted, setShowDiscounted] = useState(false);
  const notes = (product.notes || "").trim();

  return (
    <div className="stock-modal-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-view-title"
        className="stock-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="product-view-title"
          className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug break-words text-ink"
        >
          {product.name}
        </h2>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDiscounted(!showDiscounted)}
            title={
              showDiscounted
                ? "Mostrar valor de venda"
                : "Mostrar valor com desconto"
            }
            aria-label={
              showDiscounted
                ? "Mostrar valor de venda"
                : "Mostrar valor com desconto"
            }
            className={
              showDiscounted
                ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white"
                : "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep"
            }
          >
            <IconMoney className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              {showDiscounted ? "Final com desconto" : "Venda"}
            </p>
            <p className="font-[family-name:var(--font-display)] text-3xl font-semibold text-brand">
              {formatBRL(
                showDiscounted
                  ? product.discounted_value
                  : product.final_value,
              )}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Observação
          </p>
          <div className="mt-1 max-h-48 overflow-y-auto break-words text-sm leading-relaxed text-ink whitespace-pre-wrap">
            {notes ? notes : "—"}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-line bg-white px-4 py-2.5 font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-brand/25 border-t-brand ${className}`}
      aria-hidden
    />
  );
}

function ListLoading({
  variant,
  colSpan = 8,
}: {
  variant: "cards" | "table" | "block";
  colSpan?: number;
}) {
  if (variant === "table") {
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <LoadingSpinner />
            <span className="text-sm text-muted">Carregando estoque…</span>
          </div>
        </td>
      </tr>
    );
  }

  if (variant === "cards") {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando">
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-line bg-bg-elevated px-4 py-10">
          <LoadingSpinner />
          <span className="text-sm text-muted">Carregando estoque…</span>
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-3xl border border-line bg-bg-elevated p-4"
          >
            <div className="h-4 w-2/3 rounded bg-line/80" />
            <div className="mt-3 h-7 w-28 rounded bg-brand-soft" />
            <div className="mt-3 h-3 w-full rounded bg-line/60" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-line bg-bg-elevated px-4 py-12"
      role="status"
      aria-label="Carregando"
    >
      <LoadingSpinner />
      <span className="text-sm text-muted">Carregando estoque…</span>
    </div>
  );
}

const ProductCard = memo(function ProductCard({
  product,
  onEdit,
  onDelete,
  onOpen,
}: {
  product: ProductDTO;
  onEdit: (p: ProductDTO) => void;
  onDelete: (id: string) => void;
  onOpen: (p: ProductDTO) => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(product);
        }
      }}
      className="max-w-full min-w-0 cursor-pointer overflow-hidden rounded-3xl border border-line bg-bg-elevated p-4 shadow-[var(--shadow)]"
    >
      <div className="flex min-w-0 items-start gap-2">
        <h3 className="min-w-0 flex-1 break-words text-base font-semibold leading-snug [overflow-wrap:anywhere]">
          {product.name}
        </h3>
        <div
          className="stock-sensitive flex shrink-0 gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onEdit(product)}
            title="Editar"
            aria-label="Editar"
            className="rounded-xl border border-line p-2 text-ink transition hover:bg-bg"
          >
            <IconPencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(product.id)}
            title="Excluir"
            aria-label="Excluir"
            className="rounded-xl bg-danger-soft p-2 text-danger transition hover:opacity-90"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="stock-sensitive">
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-brand">
          {formatBRL(product.discounted_value)}
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-muted">
          <div className="min-w-0">
            <dt className="text-xs">Custo</dt>
            <dd className="truncate font-medium text-ink">
              {formatBRL(product.base_value)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs">Lucro</dt>
            <dd className="truncate font-medium text-ink">
              {product.markup_percentage}%
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs">Venda</dt>
            <dd className="truncate font-medium text-ink">
              {formatBRL(product.final_value)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs">Desc</dt>
            <dd className="truncate font-medium text-ink">
              {product.discount_percentage}%
            </dd>
          </div>
        </dl>
        {product.notes ? (
          <div className="mt-2 max-h-24 overflow-x-hidden overflow-y-auto text-xs leading-relaxed break-words text-muted whitespace-pre-wrap [overflow-wrap:anywhere]">
            {product.notes}
          </div>
        ) : null}
      </div>
    </article>
  );
});

const ProductTableRow = memo(function ProductTableRow({
  product,
  onEdit,
  onDelete,
  onOpen,
}: {
  product: ProductDTO;
  onEdit: (p: ProductDTO) => void;
  onDelete: (id: string) => void;
  onOpen: (p: ProductDTO) => void;
}) {
  function openModal() {
    onOpen(product);
  }

  return (
    <tr className="cursor-pointer border-t align-top hover:bg-brand-soft/40">
      <td
        className="min-w-[260px] w-[34%] max-w-[480px] border-r px-2.5 py-2 font-medium"
        onClick={openModal}
      >
        <div className="break-words leading-snug whitespace-normal">
          {product.name}
        </div>
      </td>
      <td
        className="border-r px-2.5 py-2 whitespace-nowrap"
        onClick={openModal}
      >
        {formatBRL(product.base_value)}
      </td>
      <td
        className="border-r px-2.5 py-2 whitespace-nowrap"
        onClick={openModal}
      >
        {product.markup_percentage}%
      </td>
      <td
        className="border-r px-2.5 py-2 whitespace-nowrap"
        onClick={openModal}
      >
        {formatBRL(product.final_value)}
      </td>
      <td
        className="border-r px-2.5 py-2 whitespace-nowrap"
        onClick={openModal}
      >
        {product.discount_percentage}%
      </td>
      <td
        className="border-r px-2.5 py-2 whitespace-nowrap font-semibold text-brand"
        onClick={openModal}
      >
        {formatBRL(product.discounted_value)}
      </td>
      <td
        className="min-w-[140px] w-[16%] max-w-[220px] border-r px-2.5 py-2"
        onClick={openModal}
      >
        <div className="max-h-24 overflow-y-auto break-words text-[11px] leading-relaxed text-muted whitespace-pre-wrap">
          {product.notes || "—"}
        </div>
      </td>
      <td className="px-2 py-2">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(product)}
            title="Editar"
            aria-label="Editar"
            className="rounded-lg border border-line p-1.5 text-ink"
          >
            <IconPencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(product.id)}
            title="Excluir"
            aria-label="Excluir"
            className="rounded-lg bg-danger-soft p-1.5 text-danger"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export function StockApp() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<ProductDTO[]>([]);
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [backupPromptOpen, setBackupPromptOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<ProductDTO | null>(null);

  const openView = useCallback((p: ProductDTO) => {
    setViewingProduct(p);
  }, []);

  const closeView = useCallback(() => {
    setViewingProduct(null);
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal, opts?: { soft?: boolean }) => {
      setError("");
      if (!opts?.soft) setLoading(true);
      try {
        const res = await fetch("/api/produtos", { signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar");
        const list = (data.produtos ?? []) as ProductDTO[];
        setProdutos(list);
        writeProdutosCache(list);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Erro ao carregar");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const cached = readProdutosCache();
    const soft = Boolean(cached && cached.length > 0);
    if (soft) {
      setProdutos(cached!);
      setLoading(false);
    }

    const ac = new AbortController();
    void load(ac.signal, { soft });
    return () => ac.abort();
  }, [load]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (loading || produtos.length === 0) return;
    if (shouldPromptBackup()) setBackupPromptOpen(true);
  }, [loading, produtos.length]);

  const filtered = useMemo(() => {
    const term = normalize(deferredQ.trim());
    if (!term) return produtos;
    return produtos.filter((p) => {
      const name = normalize(p.name || "");
      const notes = normalize(p.notes || "");
      return name.includes(term) || notes.includes(term);
    });
  }, [produtos, deferredQ]);

  const editingProduct = useMemo(
    () => produtos.find((p) => p.id === editingId) ?? null,
    [produtos, editingId],
  );

  const startEdit = useCallback((p: ProductDTO) => {
    setCreating(false);
    setEditingId(p.id);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const removeProduct = useCallback(
    async (id: string) => {
      if (!confirm("Excluir este produto?")) return;
      const res = await fetch(`/api/produtos/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Erro ao excluir");
        return;
      }
      if (editingId === id) setEditingId(null);
      setProdutos((prev) => {
        const next = prev.filter((p) => p.id !== id);
        writeProdutosCache(next);
        return next;
      });
    },
    [editingId],
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function saveEdit(data: FormPayload) {
    if (!editingId) return;
    const id = editingId;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/produtos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao atualizar");

      const fromApi = json.produto as ProductDTO | undefined;
      const updated: ProductDTO = {
        id,
        name: fromApi?.name ?? data.name,
        base_value: Number(fromApi?.base_value ?? data.base_value),
        markup_percentage: Number(
          fromApi?.markup_percentage ?? data.markup_percentage,
        ),
        final_value: Number(fromApi?.final_value ?? data.final_value),
        discount_percentage: Number(
          fromApi?.discount_percentage ?? data.discount_percentage,
        ),
        discounted_value: Number(
          fromApi?.discounted_value ?? data.discounted_value,
        ),
        notes: fromApi?.notes ?? data.notes,
        created_at: fromApi?.created_at ?? new Date().toISOString(),
        updated_at: fromApi?.updated_at ?? new Date().toISOString(),
      };

      setProdutos((prev) => {
        const next = prev.map((p) => (p.id === id ? updated : p));
        writeProdutosCache(next);
        return next;
      });

      // se a busca ativa esconderia o item renomeado, limpa o filtro
      const term = normalize(q.trim());
      if (term) {
        const visible =
          normalize(updated.name).includes(term) ||
          normalize(updated.notes || "").includes(term);
        if (!visible) setQ("");
      }

      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function saveCreate(data: FormPayload) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar");
      const created = json.produto as ProductDTO;
      setProdutos((prev) => {
        const next = [...prev, created].sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
        );
        writeProdutosCache(next);
        return next;
      });
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function downloadBackup() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const payload = {
      exported_at: new Date().toISOString(),
      total: produtos.length,
      produtos: produtos.map((p) => ({
        name: p.name,
        base_value: p.base_value,
        markup_percentage: p.markup_percentage,
        final_value: p.final_value,
        discount_percentage: p.discount_percentage,
        discounted_value: p.discounted_value,
        notes: p.notes,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lacoster-stock-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    markBackupDone();
    setBackupPromptOpen(false);
  }

  function dismissBackupPrompt() {
    snoozeBackupReminder();
    setBackupPromptOpen(false);
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8">
      <header className="relative flex min-w-0 flex-col gap-4 border-b border-line pb-5">
        <h1 className="text-center font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-brand sm:absolute sm:inset-x-0 sm:top-1/2 sm:-translate-y-1/2 sm:text-4xl">
          Lacoster Stock
        </h1>

        <div className="relative z-10 flex w-full items-start justify-between gap-3">
          <button
            type="button"
            onClick={downloadBackup}
            disabled={produtos.length === 0}
            className="inline-flex w-fit items-center justify-center gap-1.5 rounded-xl bg-brand-deep px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0a3322] disabled:opacity-50"
          >
            <IconDatabase className="h-3.5 w-3.5 shrink-0" />
            Backup
          </button>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setCreating(true);
              }}
              className="rounded-2xl bg-brand px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep sm:px-4 sm:py-3 sm:text-base"
            >
              Novo produto
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-2xl bg-danger px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#911b12] sm:px-4 sm:py-3 sm:text-base"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mt-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por produto ou observação..."
          className="w-full rounded-2xl border border-line bg-bg-elevated px-4 py-3.5 outline-none ring-brand/30 transition focus:ring-4"
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className={viewingProduct ? "mt-5 stock-names-only" : "mt-5"}>
        {isDesktop === false ? (
          <div className="grid min-w-0 gap-3 overflow-x-hidden">
            {creating ? (
              <ProductInlineEditorCard
                title="Novo produto"
                saving={saving}
                onSave={saveCreate}
                onCancel={() => setCreating(false)}
              />
            ) : null}

            {loading ? (
              <ListLoading variant="cards" />
            ) : filtered.length === 0 && !creating ? (
              <p className="rounded-2xl border border-dashed border-line bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
                Nenhum produto encontrado.
              </p>
            ) : (
              filtered.map((p) =>
                editingId === p.id ? (
                  <ProductInlineEditorCard
                    key={p.id}
                    initial={p}
                    saving={saving}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                  />
                ) : (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onEdit={startEdit}
                    onDelete={removeProduct}
                    onOpen={openView}
                  />
                ),
              )
            )}
          </div>
        ) : null}

        {isDesktop ? (
          <div className="overflow-hidden rounded-3xl border border-line bg-bg-elevated shadow-[var(--shadow)]">
            <div className="max-h-[calc(100vh-240px)] overflow-auto">
              <table className="stock-table min-w-full table-fixed border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-brand-soft text-ink shadow-[0_1px_0_var(--line)]">
                  <tr>
                    <th className="min-w-[260px] w-[34%] border-r border-line px-2.5 py-2.5 font-semibold">
                      Produto
                    </th>
                    <th className="w-[9%] border-r border-line px-2.5 py-2.5 font-semibold">
                      Custo
                    </th>
                    <th className="w-[7%] border-r border-line px-2.5 py-2.5 font-semibold">
                      Lucro
                    </th>
                    <th className="w-[9%] border-r border-line px-2.5 py-2.5 font-semibold">
                      Venda
                    </th>
                    <th className="w-[7%] border-r border-line px-2.5 py-2.5 font-semibold">
                      Desc
                    </th>
                    <th className="w-[9%] border-r border-line px-2.5 py-2.5 font-semibold">
                      Final
                    </th>
                    <th className="min-w-[140px] w-[16%] border-r border-line px-2.5 py-2.5 font-semibold">
                      Observação
                    </th>
                    <th className="w-[9%] px-2 py-2.5 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {creating ? (
                    <ProductInlineEditorRow
                      saving={saving}
                      onSave={saveCreate}
                      onCancel={() => setCreating(false)}
                    />
                  ) : null}

                  {loading ? (
                    <ListLoading variant="table" />
                  ) : filtered.length === 0 && !creating ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-muted">
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) =>
                      editingId === p.id && editingProduct ? (
                        <ProductInlineEditorRow
                          key={p.id}
                          initial={editingProduct}
                          saving={saving}
                          onSave={saveEdit}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <ProductTableRow
                          key={p.id}
                          product={p}
                          onEdit={startEdit}
                          onDelete={removeProduct}
                          onOpen={openView}
                        />
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {isDesktop === null ? <ListLoading variant="block" /> : null}
      </section>

      {viewingProduct ? (
        <ProductViewModal product={viewingProduct} onClose={closeView} />
      ) : null}

      {backupPromptOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="backup-prompt-title"
            className="w-full max-w-md rounded-3xl border border-line bg-bg-elevated p-6 shadow-[var(--shadow)]"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
                <IconDatabase className="h-5 w-5" />
              </span>
              <div>
                <h2
                  id="backup-prompt-title"
                  className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink"
                >
                  Backup pendente
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Já faz mais de 5 dias sem backup neste dispositivo. Quer
                  baixar agora?
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={dismissBackupPrompt}
                className="rounded-2xl border border-line bg-white px-4 py-3 font-medium transition hover:bg-bg"
              >
                Não
              </button>
              <button
                type="button"
                onClick={downloadBackup}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-deep px-4 py-3 font-semibold text-white transition hover:bg-[#0a3322]"
              >
                <IconDatabase className="h-4 w-4 shrink-0" />
                Sim, baixar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
