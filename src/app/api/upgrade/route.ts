import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { code } = await req.json();

    if (code !== "FORJA3000") {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    const { error } = await supabase
      .from("users_profile")
      .update({ plan: "pro" })
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "¡Bienvenido a FORJA PRO!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar plan" }, { status: 500 });
  }
}
