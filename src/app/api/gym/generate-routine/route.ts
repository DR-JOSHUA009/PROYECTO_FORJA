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

    // 1. Obtener perfil completo
    const { data: profile } = await supabase
      .from("users_profile")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado. Completa el registro primero." }, { status: 400 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // 2. Prompt Maestro para Generación Estructurada
    const masterPrompt = `
      Eres el motor de prescripción de ejercicio de FORJA. Tu tarea es generar una rutina de 5 días (lunes a viernes) de altísimo nivel.
      
      DATOS DEL USUARIO:
      - Peso: ${profile.weight_kg}kg | Altura: ${profile.height_cm}cm | Edad: ${profile.age}
      - Objetivo: ${profile.goal}
      - Equipo disponible: ${profile.equipment}
      - Lesiones: ${profile.injuries || "Ninguna"}
      - Enfermedades: ${profile.diseases || "Ninguna"}
      - Intensidad deseada: ${profile.intensity}
      
      ESTRUCTURA DE DÍAS:
      - lunes, martes, miercoles, jueves, viernes.
      
      REQUISITOS TÉCNICOS:
      - Si tiene equipos limitados (ej: solo mancuernas), adapta los ejercicios.
      - Si tiene lesiones, EVITA ejercicios que comprometan esa zona.
      - Genera 5-7 ejercicios por día.
      - Formato: JSON puro.
      
      FORMATO DE SALIDA (JSON):
      [
        {
          "day_of_week": "lunes",
          "exercises": [
            {"name": "Nombre", "sets": 3, "reps": 12, "description": "Técnica", "muscle_group": "Pecho"}
          ]
        },
        ... (hasta viernes)
      ]
      
      RESPONDE ÚNICAMENTE EL JSON. SIN TEXTO ADICIONAL.
    `;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Eres un experto en biomecánica. Responde solo con JSON válido." },
        { role: "user", content: masterPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) throw new Error("No se pudo generar la rutina.");

    let routineData: any[] = [];
    try {
      const parsed = JSON.parse(responseContent);
      // Groq a veces devuelve el array dentro de una propiedad o directo
      routineData = Array.isArray(parsed) ? parsed : (parsed.routine || parsed.routines || Object.values(parsed)[0]);
    } catch (e) {
      throw new Error("Error al procesar el formato de la rutina IA.");
    }

    // 3. Guardar en DB (Upsert para los 5 días)
    for (const dayData of routineData) {
      await supabase.from("routines").upsert({
        user_id: user.id,
        day_of_week: dayData.day_of_week.toLowerCase(),
        exercises: dayData.exercises,
        is_rest_day: false
      }, { onConflict: 'user_id,day_of_week' });
    }

    return NextResponse.json({ success: true, message: "Rutina maestra generada y aplicada." });

  } catch (error: any) {
    console.error("Master Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
