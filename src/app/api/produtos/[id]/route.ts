import { NextResponse } from "next/server";
import { deleteProduct, updateProduct } from "@/lib/products";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const produto = await updateProduct(id, {
      name: body.name,
      base_value: body.base_value,
      markup_percentage: body.markup_percentage,
      final_value: body.final_value,
      discount_percentage: body.discount_percentage,
      discounted_value: body.discounted_value,
      notes: body.notes,
    });
    return NextResponse.json({ produto });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar";
    const status = message.includes("não encontrado")
      ? 404
      : message.includes("inválid") ||
          message.includes("obrigatório") ||
          message.includes("Já existe")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir";
    const status = message.includes("não encontrado") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
