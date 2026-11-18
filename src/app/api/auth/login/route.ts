import { NextResponse } from "next/server";
import { createSession, validateCredentials } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = String(body.user ?? "");
    const password = String(body.password ?? "");

    if (!validateCredentials(user, password)) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos" },
        { status: 401 },
      );
    }

    await createSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro no login";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
