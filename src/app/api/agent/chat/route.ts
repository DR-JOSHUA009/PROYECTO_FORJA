import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Formato de mensajes inválido" }, { status: 400 });
    }

    // 1. Obtener contexto del usuario
    const { data: profile } = await supabase
      .from("users_profile")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // 2. Construir System Prompt Dinámico
    const systemPrompt = `
      Eres el "Entrenador IA" de FORJA. Tu tono es directo, profesional, motivador y sin rodeos. 
      Hablas en español latino natural pero sabes mucho de ciencia deportiva y nutrición.
      
      CONTEXTO DEL USUARIO:
      - Edad: ${profile?.age || "Desconocida"}
      - Peso: ${profile?.weight_kg || "Desconocido"} kg
      - Objetivo: ${profile?.goal || "Mejorar salud"}
      - Nivel de Entrenamiento: ${profile?.intensity || "Moderado"}
      - Lesiones: ${profile?.injuries || "Ninguna"}

      Da respuestas concisas. Si el usuario pide cambiar su rutina o dieta, dale sugerencias accionables. 
      No uses formatos Markdown complejos, prefiere listas simples.
    `;

    // 3. Preparar historial para Groq
    const groqMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m: any) => ({ 
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant", 
        content: m.content 
      }))
    ];

    // Initialize Groq inside here to ensure env vars are actively read 
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_KEY });

    // 4. Llamar a Groq con el modelo más actual
    const chatCompletion = await groq.chat.completions.create({
      messages: groqMessages,
      model: "llama-3.1-8b-instant", // Modelo actualizado y rápido
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "No pude procesar eso. Intenta de nuevo.";

    return NextResponse.json({ reply: responseText });

  } catch (error: any) {
    console.error("Agent Error:", error);
    // Include the actual error message in the response trace
    return NextResponse.json({ error: error.message || "Error interno de servidor o de red con la IA." }, { status: 500 });
  }
}
