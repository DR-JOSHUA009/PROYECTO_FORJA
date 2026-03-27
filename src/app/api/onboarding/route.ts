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
        target_weight: parseFloat(payload.peso_objetivo),
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
      
      Usuario: ${payload.edad} años, ${payload.peso}kg, Objetivo Final Físico: ${payload.peso_objetivo}kg, Altura: ${payload.altura}cm, Género: ${payload.genero}, 
      Intención: ${payload.objetivo}, Equipo: ${payload.equipo}, Días de entreno: ${payload.dias}/semana,
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
      console.warn("Fallo el LLM, aplicando Plan Base Estándar", llmError);

      // ──── PLAN BASE ESTÁNDAR (Fallback) ────────────────────────────
      const trainingDays = payload.dias || 3;
      const isGym = payload.equipo !== "casa";

      const gymExercises: Record<string, { name: string; sets: string; reps: string }[]> = {
        "Push": [
          { name: "Press Banca", sets: "4", reps: "8-10" },
          { name: "Press Inclinado Mancuernas", sets: "3", reps: "10-12" },
          { name: "Aperturas", sets: "3", reps: "12-15" },
          { name: "Press Militar", sets: "3", reps: "10-12" },
          { name: "Elevaciones Laterales", sets: "3", reps: "15" },
        ],
        "Pull": [
          { name: "Jalón al Pecho", sets: "4", reps: "8-10" },
          { name: "Remo con Barra", sets: "3", reps: "10-12" },
          { name: "Remo en Polea", sets: "3", reps: "12" },
          { name: "Curl Bíceps Barra", sets: "3", reps: "10-12" },
          { name: "Face Pulls", sets: "3", reps: "15" },
        ],
        "Legs": [
          { name: "Sentadillas", sets: "4", reps: "8-10" },
          { name: "Prensa de Piernas", sets: "3", reps: "10-12" },
          { name: "Peso Muerto Rumano", sets: "3", reps: "10-12" },
          { name: "Extensiones de Cuádriceps", sets: "3", reps: "12-15" },
          { name: "Curl Femoral", sets: "3", reps: "12-15" },
        ],
        "FullBody": [
          { name: "Sentadillas", sets: "3", reps: "10" },
          { name: "Press Banca", sets: "3", reps: "10" },
          { name: "Remo con Barra", sets: "3", reps: "10" },
          { name: "Press Militar", sets: "3", reps: "10" },
          { name: "Curl Bíceps", sets: "2", reps: "12" },
        ],
      };

      const homeExercises: Record<string, { name: string; sets: string; reps: string }[]> = {
        "Push": [
          { name: "Flexiones", sets: "4", reps: "15-20" },
          { name: "Flexiones Diamante", sets: "3", reps: "10-12" },
          { name: "Dips en Silla", sets: "3", reps: "12-15" },
          { name: "Pike Push-ups", sets: "3", reps: "10-12" },
          { name: "Plancha", sets: "3", reps: "30-45seg" },
        ],
        "Pull": [
          { name: "Dominadas (o Australianas)", sets: "4", reps: "8-10" },
          { name: "Remo Invertido", sets: "3", reps: "10-12" },
          { name: "Superman Hold", sets: "3", reps: "12-15" },
          { name: "Curl Bíceps (Banda/Mancuerna)", sets: "3", reps: "12" },
          { name: "Face Pulls con Banda", sets: "3", reps: "15" },
        ],
        "Legs": [
          { name: "Sentadillas Búlgaras", sets: "4", reps: "10 c/lado" },
          { name: "Sentadillas Jump", sets: "3", reps: "12" },
          { name: "Lunges", sets: "3", reps: "12 c/lado" },
          { name: "Puente de Glúteos", sets: "3", reps: "15" },
          { name: "Elevaciones de Pantorrilla", sets: "3", reps: "20" },
        ],
        "FullBody": [
          { name: "Burpees", sets: "3", reps: "10" },
          { name: "Flexiones", sets: "3", reps: "15" },
          { name: "Sentadillas", sets: "3", reps: "15" },
          { name: "Plancha", sets: "3", reps: "45seg" },
          { name: "Mountain Climbers", sets: "3", reps: "20" },
        ],
      };

      const exerciseBank = isGym ? gymExercises : homeExercises;
      const allDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

      // Build training schedule based on number of days
      let schedule: { day: string; type: string }[];
      if (trainingDays >= 6) {
        schedule = [
          { day: "Lunes", type: "Push" }, { day: "Martes", type: "Pull" }, { day: "Miércoles", type: "Legs" },
          { day: "Jueves", type: "Push" }, { day: "Viernes", type: "Pull" }, { day: "Sábado", type: "Legs" },
        ];
      } else if (trainingDays >= 5) {
        schedule = [
          { day: "Lunes", type: "Push" }, { day: "Martes", type: "Pull" }, { day: "Miércoles", type: "Legs" },
          { day: "Jueves", type: "Push" }, { day: "Viernes", type: "Pull" },
        ];
      } else if (trainingDays >= 4) {
        schedule = [
          { day: "Lunes", type: "Push" }, { day: "Martes", type: "Pull" },
          { day: "Jueves", type: "Legs" }, { day: "Viernes", type: "FullBody" },
        ];
      } else {
        schedule = [
          { day: "Lunes", type: "FullBody" }, { day: "Miércoles", type: "FullBody" }, { day: "Viernes", type: "FullBody" },
        ];
      }

      const trainingDayNames = schedule.map(s => s.day);
      const fallbackRoutines = allDays.map(day => {
        const found = schedule.find(s => s.day === day);
        if (found) {
          return { user_id: user.id, day_of_week: day, is_rest_day: false, exercises: exerciseBank[found.type] || exerciseBank["FullBody"] };
        }
        return { user_id: user.id, day_of_week: day, is_rest_day: true, exercises: [] };
      });

      const fallbackDiet = [
        { user_id: user.id, meal_type: "Desayuno", foods: [
          { name: "Avena", quantity: "60g" }, { name: "Huevos revueltos", quantity: "3" }, { name: "Plátano", quantity: "1" }
        ]},
        { user_id: user.id, meal_type: "Almuerzo", foods: [
          { name: "Arroz integral", quantity: "150g" }, { name: "Pechuga de pollo", quantity: "200g" }, { name: "Ensalada mixta", quantity: "1 plato" }
        ]},
        { user_id: user.id, meal_type: "Cena", foods: [
          { name: "Pasta integral", quantity: "100g" }, { name: "Atún", quantity: "1 lata" }, { name: "Verduras salteadas", quantity: "1 porción" }
        ]},
        { user_id: user.id, meal_type: "Snack", foods: [
          { name: "Yogur griego", quantity: "200g" }, { name: "Almendras", quantity: "30g" }, { name: "Manzana", quantity: "1" }
        ]},
      ];

      await supabase.from("routines").delete().eq("user_id", user.id);
      await supabase.from("routines").insert(fallbackRoutines);
      await supabase.from("diet_plans").delete().eq("user_id", user.id);
      await supabase.from("diet_plans").insert(fallbackDiet);
    }

    // 5. Enviar email de bienvenida (no bloquea la respuesta si falla)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await fetch(`${appUrl}/api/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "welcome",
          to: user.email,
          name: payload.nombre || "Atleta",
          data: { trainingDays: payload.dias || 5 }
        })
      });
    } catch (emailErr) {
      console.warn("Email de bienvenida no enviado:", emailErr);
    }

    return NextResponse.json({ success: true, message: "Onboarding completado." });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
