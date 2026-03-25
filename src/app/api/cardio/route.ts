import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { activity, duration_min, distance_km, intensity_level } = await req.json();

    // Obtener perfil para contexto
    const { data: profile } = await supabase.from("users_profile").select("goal").eq("user_id", user.id).single();

    // Generar Feedback de IA
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { 
          role: "system", 
          content: `Eres un experto en cardiología aplicada al deporte. El usuario hizo ${activity} durante ${duration_min} minutos con intensidad ${intensity_level}/10. Su objetivo es ${profile?.goal || "Salud"}. Da un feedback breve de 2 frases y una recomendación para mejorar su rendimiento cardiovascular.` 
        }
      ],
      temperature: 0.7
    });

    const aiFeedback = completion.choices[0]?.message?.content || "Buen entrenamiento cardiovascular. Sigue así.";

    const { data, error } = await supabase.from("cardio_sessions").insert({
      user_id: user.id,
      activity,
      duration_min,
      distance_km,
      intensity_level,
      ai_feedback: aiFeedback,
      date: new Date().toISOString().split('T')[0]
    }).select().single();

    if (error) throw error;

    // Sumar XP por registrar cardio
    const { data: pData } = await supabase.from("users_profile").select("xp, level").eq("user_id", user.id).single();
    const newXp = (pData?.xp || 0) + 200;
    await supabase.from("users_profile").update({ xp: newXp, level: Math.floor(newXp / 1000) + 1 }).eq("user_id", user.id);

    return NextResponse.json({ success: true, log: data, ai_feedback: aiFeedback, xp_earned: 200 });
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
      .from("cardio_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(10);

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json([]);
  }
}
