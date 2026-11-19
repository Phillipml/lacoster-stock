import { NextResponse } from "next/server";
import { createProduct, listProducts } from "@/lib/products";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;
    const produtos = await listProducts(q);
    return NextResponse.json(
      { produtos },
      {
        headers: {
          "Cache-Control": q?.trim()
            ? "private, no-store"
            : "private, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao listar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const produto = await createProduct({
      name: body.name,
      base_value: body.base_value,
      markup_percentage: body.markup_percentage,
      final_value: body.final_value,
      discount_percentage: body.discount_percentage,
      discounted_value: body.discounted_value,
      notes: body.notes,
    });
    return NextResponse.json({ produto }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar";
    const status =
      message.includes("obrigatório") ||
      message.includes("inválido") ||
      message.includes("Já existe")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
