import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_KEY });

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado. Inicia sesión primero." }, { status: 401 });
    }

    const payload = await req.json();

    // 0. Asegurar que el usuario existe en public.users
    await supabase.from("users").upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

    // 1. Guardar o actualizar perfil del usuario
    const { error: profileError } = await supabase
      .from("users_profile")
      .upsert({
        user_id: user.id,
        full_name: payload.nombre,
        username: payload.usuario,
        weight_kg: parseFloat(payload.peso),
        height_cm: parseFloat(payload.altura),
        age: parseInt(payload.edad),
        gender: payload.genero,
        goal: payload.objetivo,
        equipment: payload.equipo,
        diet_type: payload.dieta,
        injuries: payload.lesiones.join(", "),
        diseases: payload.enfermedades.join(", "),
        intensity: payload.intensidad,
        experience_level: payload.experiencia,
        training_days: payload.dias,
        food_restrictions: payload.alergias.join(", "),
        onboarding_completed: true
      }, { onConflict: 'user_id' });

    if (profileError) throw new Error("Error al guardar perfil: " + profileError.message);

    // 2. Generar Rutina y Dieta con Groq (Llama 3 70B o superior es ideal, usaremos Mixtral o Llama 3)
    const prompt = `
      Eres un entrenador y nutricionista experto. 
      Actúa como una API que responde estrictamente en JSON. NO devuelvas ningún texto antes ni después del JSON.
      
      Usuario: ${payload.edad} años, ${payload.peso}kg, ${payload.altura}cm, género: ${payload.genero}, 
      Objetivo: ${payload.objetivo}, Equipo: ${payload.equipo}, Días de entreno: ${payload.dias}/semana,
      Dieta: ${payload.dieta}, Alergias: ${payload.alergias.length ? payload.alergias.join(", ") : "Ninguna"}.
      Lesiones: ${payload.lesiones.length ? payload.lesiones.join(", ") : "Ninguna"}.

      Genera:
      1. Una matriz de "routines" que curbra los 7 días de la semana (day_of_week: "Lunes", "Martes", etc). Marca is_rest_day como true si es día de descanso. Si entrenan, incluye 4-5 "exercises" (name, sets, reps).
      2. Una matriz de "diet_plans" con comidas típicas según su dieta ("Desayuno", "Almuerzo", "Cena", "Snack"). Retorna los "foods" que deben comer.
      
      ESTRUCTURA JSON DESEADA EXACTA:
      {
        "routines": [
          { "day_of_week": "Lunes", "is_rest_day": false, "exercises": [ { "name": "Sentadillas", "sets": "4", "reps": "10-12" } ] }
        ],
        "diet_plans": [
          { "meal_type": "Desayuno", "foods": [ { "name": "Avena", "quantity": "50g" }, { "name": "Huevos", "quantity": "3" } ] }
        ]
      }
    `;

    // Try catch para evitar fallos catastróficos si Groq falla (a veces por cuotas o timeout)
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-8b-8192", // Using lightweight fast model for fast onboarding
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const responseContent = chatCompletion.choices[0]?.message?.content || "{}";
      const aiPlan = JSON.parse(responseContent);

      // 3. Insertar Rutinas
      if (aiPlan.routines && Array.isArray(aiPlan.routines)) {
        await supabase.from("routines").delete().eq("user_id", user.id); // limpiar anteriores
        const routinesToInsert = aiPlan.routines.map((r: any) => ({
          user_id: user.id,
          day_of_week: r.day_of_week,
          is_rest_day: r.is_rest_day,
          exercises: r.exercises || []
        }));
        await supabase.from("routines").insert(routinesToInsert);
      }

      // 4. Insertar Planes de Dieta
      if (aiPlan.diet_plans && Array.isArray(aiPlan.diet_plans)) {
        await supabase.from("diet_plans").delete().eq("user_id", user.id); // limpiar anteriores
        const dietsToInsert = aiPlan.diet_plans.map((d: any) => ({
          user_id: user.id,
          meal_type: d.meal_type,
          foods: d.foods || []
        }));
        await supabase.from("diet_plans").insert(dietsToInsert);
      }

    } catch (llmError) {
      console.warn("Fallo el LLM, guardaremos datos por defecto", llmError);
      // Fallback si la IA falla pero el perfil sí guardó
    }

    return NextResponse.json({ success: true, message: "Onboarding completado." });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
