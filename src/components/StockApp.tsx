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

const ProductCard = memo(function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: ProductDTO;
  onEdit: (p: ProductDTO) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="rounded-3xl border border-line bg-bg-elevated p-4 shadow-[var(--shadow)]">
      <h3 className="text-base font-semibold leading-snug">{product.name}</h3>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-brand">
        {formatBRL(product.discounted_value)}
      </p>
      <p className="mt-1 text-sm text-muted">
        Custo {formatBRL(product.base_value)} · Lucro {product.markup_percentage}%
        · Venda {formatBRL(product.final_value)} · Desc {product.discount_percentage}%
      </p>
      {product.notes ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
          {product.notes}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="flex-1 rounded-2xl border border-line px-3 py-2.5 text-sm font-medium"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(product.id)}
          className="flex-1 rounded-2xl bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger"
        >
          Excluir
        </button>
      </div>
    </article>
  );
});

const ProductTableRow = memo(function ProductTableRow({
  product,
  onEdit,
  onDelete,
}: {
  product: ProductDTO;
  onEdit: (p: ProductDTO) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <tr className="border-t border-line align-top">
      <td className="px-3 py-3 font-medium">{product.name}</td>
      <td className="px-3 py-3 whitespace-nowrap">
        {formatBRL(product.base_value)}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">{product.markup_percentage}%</td>
      <td className="px-3 py-3 whitespace-nowrap">
        {formatBRL(product.final_value)}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        {product.discount_percentage}%
      </td>
      <td className="px-3 py-3 whitespace-nowrap font-semibold text-brand">
        {formatBRL(product.discounted_value)}
      </td>
      <td className="max-w-[220px] px-3 py-3 whitespace-pre-wrap text-muted">
        {product.notes || "—"}
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(product)}
            className="rounded-xl border border-line px-3 py-1.5 font-medium"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete(product.id)}
            className="rounded-xl bg-danger-soft px-3 py-1.5 font-medium text-danger"
          >
            Excluir
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/produtos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar");
      setProdutos(data.produtos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const filtered = useMemo(() => {
    const term = normalize(deferredQ.trim());
    if (!term) return produtos;
    return produtos.filter((p) => {
      const name = normalize(p.name || "");
      const notes = normalize(p.notes || "");
      return name.includes(term) || notes.includes(term);
    });
  }, [produtos, deferredQ]);

  const total = useMemo(
    () =>
      filtered.reduce((acc, p) => acc + (Number(p.discounted_value) || 0), 0),
    [filtered],
  );

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
      await load();
    },
    [editingId, load],
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function saveEdit(data: FormPayload) {
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/produtos/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao atualizar");
      setEditingId(null);
      await load();
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
      setCreating(false);
      await load();
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
  }

  const countLabel =
    deferredQ.trim() && filtered.length !== produtos.length
      ? `${filtered.length} de ${produtos.length} produto(s)`
      : `${produtos.length} produto(s)`;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Lacoster Stock
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            Estoque
          </h1>
          <p className="mt-1 text-sm text-muted">
            {countLabel} · soma final {formatBRL(total)}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={downloadBackup}
            disabled={produtos.length === 0}
            className="rounded-2xl border border-line bg-bg-elevated px-4 py-3 font-medium transition hover:bg-white disabled:opacity-50"
          >
            Backup
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setCreating(true);
            }}
            className="rounded-2xl bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-deep"
          >
            Novo produto
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-2xl border border-line bg-bg-elevated px-4 py-3 font-medium transition hover:bg-white"
          >
            Sair
          </button>
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

      <section className="mt-5">
        {isDesktop === false ? (
          <div className="grid gap-3">
            {creating ? (
              <ProductInlineEditorCard
                title="Novo produto"
                saving={saving}
                onSave={saveCreate}
                onCancel={() => setCreating(false)}
              />
            ) : null}

            {loading ? (
              <p className="rounded-2xl border border-line bg-bg-elevated px-4 py-6 text-sm text-muted">
                Carregando...
              </p>
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
                  />
                ),
              )
            )}
          </div>
        ) : null}

        {isDesktop ? (
          <div className="overflow-hidden rounded-3xl border border-line bg-bg-elevated shadow-[var(--shadow)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-brand-soft/60 text-ink">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Produto</th>
                    <th className="px-3 py-3 font-semibold">Custo</th>
                    <th className="px-3 py-3 font-semibold">Lucro</th>
                    <th className="px-3 py-3 font-semibold">Venda</th>
                    <th className="px-3 py-3 font-semibold">Desc</th>
                    <th className="px-3 py-3 font-semibold">Final</th>
                    <th className="px-3 py-3 font-semibold">Observação</th>
                    <th className="px-3 py-3 font-semibold">Ações</th>
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
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-muted">
                        Carregando...
                      </td>
                    </tr>
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
                        />
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {isDesktop === null ? (
          <p className="rounded-2xl border border-line bg-bg-elevated px-4 py-6 text-sm text-muted">
            Carregando...
          </p>
        ) : null}
      </section>
    </div>
  );
}
