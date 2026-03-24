import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { hours_slept, sleep_time, wake_time } = await req.json();

    // Obtener perfil para contexto
    const { data: profile } = await supabase.from("users_profile").select("goal").eq("user_id", user.id).single();

    // Generar Feedback de IA
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { 
          role: "system", 
          content: `Eres un experto en sueño. El usuario durmió ${hours_slept} horas (de ${sleep_time} a ${wake_time}). Su objetivo es ${profile?.goal || "Salud"}. Da un feedback breve (máx 2 frases) y una recomendación.` 
        }
      ],
      temperature: 0.7
    });

    const aiFeedback = completion.choices[0]?.message?.content || "Buen descanso. Sigue así.";

    const { data, error } = await supabase.from("sleep_logs").insert({
      user_id: user.id,
      hours_slept,
      sleep_time,
      wake_time,
      ai_feedback: aiFeedback,
      date: new Date().toISOString().split('T')[0]
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, log: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json([], { status: 401 });

    const { data } = await supabase
      .from("sleep_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(7);

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json([]);
  }
}
