import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { messages } = await req.json();
    const { data: profile } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_KEY });

    const systemPrompt = `
      Eres FORJA, el Agente IA maestro de fitness y nutrición.
      
      PERFIL DEL USUARIO:
      - Nombre: ${profile?.full_name || "Atleta"}
      - Peso: ${profile?.weight_kg || "?"}kg | Altura: ${profile?.height_cm || "?"}cm | Edad: ${profile?.age || "?"}
      - Género: ${profile?.gender || "?"}
      - Objetivo: ${profile?.goal || "Salud general"}
      - Intensidad: ${profile?.intensity || "media"}
      - Días de entreno: ${profile?.training_days || 3}/semana
      - Equipo: ${profile?.equipment || "gym"}
      - Dieta: ${profile?.diet_type || "normal"} | Restricciones: ${profile?.food_restrictions || "Ninguna"}
      - Lesiones: ${profile?.injuries || "Ninguna"} | Enfermedades: ${profile?.diseases || "Ninguna"}
      - Nivel XP: ${profile?.xp || 0} | Nivel: ${profile?.level || 1}

      REGLAS:
      1. Al proponer cambios en RUTINA o DIETA, usa las herramientas update_routine_day o update_diet_meal. NUNCA apliques cambios sin confirmación del usuario.
      2. Para registrar sueño, cardio o agua, usa las herramientas log_sleep, log_cardio o log_activity respectivamente. Estos SÍ se aplican directo.
      3. Cuando el usuario pida ver su progreso o estadísticas, usa get_user_stats para leer datos reales antes de responder.
      4. Sé conciso, motivador y personalizado. Usa los datos del perfil para dar consejos relevantes.
      5. Responde siempre en español.
    `;

    const groqMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m: any) => ({ 
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant", 
        content: m.content 
      }))
    ];

    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "update_routine_day",
          description: "Propone cambios en la rutina de un día específico. Requiere confirmación del usuario.",
          parameters: {
            type: "object",
            properties: {
              day_of_week: { type: "string", description: "Día de la semana (Lunes, Martes, etc.)" },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: { name: { type: "string" }, sets: { type: "number" }, reps: { type: "string" } },
                  required: ["name", "sets", "reps"]
                }
              }
            },
            required: ["day_of_week", "exercises"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_diet_meal",
          description: "Propone cambios en una comida del plan de dieta. Requiere confirmación del usuario.",
          parameters: {
            type: "object",
            properties: {
              meal_type: { type: "string", description: "Tipo de comida: Desayuno, Almuerzo, Merienda o Cena" },
              foods: {
                type: "array",
                items: {
                  type: "object",
                  properties: { name: { type: "string" }, quantity: { type: "string" }, calories: { type: "number" } },
                  required: ["name", "quantity", "calories"]
                }
              }
            },
            required: ["meal_type", "foods"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "log_activity",
          description: "Registra ingesta de agua en mililitros. Se aplica directamente.",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["water"] },
              value: { type: "number", description: "Cantidad en ml" }
            },
            required: ["type", "value"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "log_sleep",
          description: "Registra las horas de sueño del usuario. Se aplica directamente. Usa esta herramienta cuando el usuario mencione a qué hora se acostó o se despertó.",
          parameters: {
            type: "object",
            properties: {
              sleep_time: { type: "string", description: "Hora de acostarse en formato HH:MM (ej: 23:00)" },
              wake_time: { type: "string", description: "Hora de despertarse en formato HH:MM (ej: 07:00)" },
              hours_slept: { type: "number", description: "Total de horas dormidas calculadas" }
            },
            required: ["sleep_time", "wake_time", "hours_slept"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "log_cardio",
          description: "Registra una sesión de cardio del usuario. Se aplica directamente. Usa esta herramienta cuando el usuario diga que corrió, nadó, caminó, anduvo en bici, etc.",
          parameters: {
            type: "object",
            properties: {
              activity: { type: "string", description: "Tipo de actividad: correr, nadar, ciclismo, caminar, saltar cuerda, etc." },
              duration_min: { type: "number", description: "Duración en minutos" },
              distance_km: { type: "number", description: "Distancia en km (0 si no aplica)" },
              intensity_level: { type: "number", description: "Nivel de intensidad del 1 al 10" }
            },
            required: ["activity", "duration_min", "intensity_level"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_user_stats",
          description: "Lee las estadísticas actuales del usuario: últimas sesiones de cardio, registros de sueño, consumo de agua y alimentos recientes. Usa esta herramienta ANTES de dar feedback sobre progreso.",
          parameters: {
            type: "object",
            properties: {
              period: { type: "string", enum: ["today", "week", "month"], description: "Periodo de tiempo a consultar" }
            },
            required: ["period"]
          }
        }
      }
    ];

    const completion = await groq.chat.completions.create({
      messages: groqMessages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      stream: true,
      tools: tools,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        let toolCallsBuffer: any[] = [];
        let metadata = null;

        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              fullResponse += delta.content;
              controller.enqueue(encoder.encode(delta.content));
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!toolCallsBuffer[tc.index]) toolCallsBuffer[tc.index] = { name: "", args: "" };
                if (tc.function?.name) toolCallsBuffer[tc.index].name = tc.function.name;
                if (tc.function?.arguments) toolCallsBuffer[tc.index].args += tc.function.arguments;
              }
            }
          }

          const activeTools = toolCallsBuffer.filter(t => t.name);
          if (activeTools.length > 0) {
            for (const tool of activeTools) {
              const args = JSON.parse(tool.args || "{}");
              let confirmText = "";
              const today = new Date().toISOString().split('T')[0];

              // --- TOOL: update_routine_day (requiere confirmación) ---
              if (tool.name === "update_routine_day") {
                const { data: before } = await supabase.from("routines").select("exercises").eq("user_id", user.id).eq("day_of_week", args.day_of_week).single();
                metadata = { act_type: "confirmation_request", tool: "routine", day_of_week: args.day_of_week, before: before?.exercises || [], after: args.exercises };
                confirmText = `\n\n⚡ He diseñado un ajuste para tu rutina del **${args.day_of_week}**. Revisa la propuesta abajo y confirma si deseas aplicarla.`;
              } 
              // --- TOOL: update_diet_meal (requiere confirmación) ---
              else if (tool.name === "update_diet_meal") {
                const { data: before } = await supabase.from("diet_plans").select("foods").eq("user_id", user.id).eq("meal_type", args.meal_type).single();
                metadata = { act_type: "confirmation_request", tool: "diet", meal_type: args.meal_type, before: before?.foods || [], after: args.foods };
                confirmText = `\n\n🍎 He preparado una optimización para tu **${args.meal_type}**. Revisa el desglose a continuación.`;
              }
              // --- TOOL: log_activity (agua - directo) ---
              else if (tool.name === "log_activity") {
                if (args.type === "water") {
                  await supabase.from("water_logs").insert({ user_id: user.id, amount_ml: args.value, date: today });
                  confirmText = `\n\n💧 ¡Registrado! He añadido **${args.value}ml** a tu ingesta de agua de hoy.`;
                }
              }
              // --- TOOL: log_sleep (directo) ---
              else if (tool.name === "log_sleep") {
                const hoursSlept = args.hours_slept;
                const optimalHours = 8;
                
                await supabase.from("sleep_logs").insert({
                  user_id: user.id,
                  sleep_time: args.sleep_time,
                  wake_time: args.wake_time,
                  hours_slept: hoursSlept,
                  date: today
                });

                // Generar feedback basado en las horas
                let sleepEmoji = "😴";
                let sleepVerdict = "";
                if (hoursSlept >= 7.5) {
                  sleepEmoji = "🟢";
                  sleepVerdict = "Excelente recuperación. Estás dentro del rango óptimo.";
                } else if (hoursSlept >= 6) {
                  sleepEmoji = "🟡";
                  sleepVerdict = "Aceptable, pero intenta llegar a 7.5-8h para maximizar la recuperación muscular.";
                } else {
                  sleepEmoji = "🔴";
                  sleepVerdict = "Déficit de sueño detectado. Esto puede afectar tu rendimiento y recuperación. Prioriza descansar más.";
                }

                const diff = hoursSlept - optimalHours;
                const diffText = diff >= 0 ? `+${diff.toFixed(1)}h sobre la meta` : `${diff.toFixed(1)}h bajo la meta`;

                confirmText = `\n\n${sleepEmoji} **Sueño registrado:** ${args.sleep_time} → ${args.wake_time} (${hoursSlept}h)\n📊 Meta óptima: ${optimalHours}h | Tu resultado: **${diffText}**\n💬 ${sleepVerdict}`;

                // +50 XP por registrar sueño
                const { data: pData } = await supabase.from("users_profile").select("xp, level").eq("user_id", user.id).single();
                const newXp = (pData?.xp || 0) + 50;
                await supabase.from("users_profile").update({ xp: newXp, level: Math.floor(newXp / 1000) + 1 }).eq("user_id", user.id);
                confirmText += `\n\n✨ +50 XP por registrar tu sueño.`;
              }
              // --- TOOL: log_cardio (directo) ---
              else if (tool.name === "log_cardio") {
                await supabase.from("cardio_sessions").insert({
                  user_id: user.id,
                  activity: args.activity,
                  duration_min: args.duration_min,
                  distance_km: args.distance_km || 0,
                  intensity_level: args.intensity_level,
                  date: today
                });

                // Generar feedback personalizado
                let cardioFeedback = "";
                if (args.intensity_level >= 8) {
                  cardioFeedback = "Sesión de alta intensidad. Asegúrate de hidratarte bien y comer suficiente proteína para recuperar.";
                } else if (args.intensity_level >= 5) {
                  cardioFeedback = "Buen esfuerzo moderado. Esto ayuda a tu resistencia cardiovascular sin sobrecargar el sistema.";
                } else {
                  cardioFeedback = "Sesión ligera registrada. Ideal para días de recuperación activa.";
                }

                confirmText = `\n\n🏃 **Cardio registrado:**\n• Actividad: ${args.activity}\n• Duración: ${args.duration_min} min\n• Intensidad: ${args.intensity_level}/10${args.distance_km ? `\n• Distancia: ${args.distance_km} km` : ""}\n\n💬 ${cardioFeedback}`;

                // +100 XP por registrar cardio
                const { data: pData } = await supabase.from("users_profile").select("xp, level").eq("user_id", user.id).single();
                const newXp = (pData?.xp || 0) + 100;
                await supabase.from("users_profile").update({ xp: newXp, level: Math.floor(newXp / 1000) + 1 }).eq("user_id", user.id);
                confirmText += `\n\n✨ +100 XP por tu sesión de cardio.`;
              }
              // --- TOOL: get_user_stats (lectura) ---
              else if (tool.name === "get_user_stats") {
                const period = args.period;
                let dateFilter = today;

                if (period === "week") {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  dateFilter = weekAgo.toISOString().split('T')[0];
                } else if (period === "month") {
                  const monthAgo = new Date();
                  monthAgo.setDate(monthAgo.getDate() - 30);
                  dateFilter = monthAgo.toISOString().split('T')[0];
                }

                const { data: cardioData } = await supabase.from("cardio_sessions").select("*").eq("user_id", user.id).gte("date", dateFilter).order("date", { ascending: false });
                const { data: sleepData } = await supabase.from("sleep_logs").select("*").eq("user_id", user.id).gte("date", dateFilter).order("date", { ascending: false });
                const { data: waterData } = await supabase.from("water_logs").select("*").eq("user_id", user.id).gte("date", dateFilter);
                const { data: foodData } = await supabase.from("food_logs").select("*").eq("user_id", user.id).gte("date", dateFilter);

                const totalWater = waterData?.reduce((acc, w) => acc + (w.amount_ml || 0), 0) || 0;
                const totalCals = foodData?.reduce((acc, f) => acc + (f.calories || 0), 0) || 0;
                const avgSleep = sleepData?.length ? (sleepData.reduce((acc, s) => acc + (s.hours_slept || 0), 0) / sleepData.length).toFixed(1) : "0";
                const totalCardioMin = cardioData?.reduce((acc, c) => acc + (c.duration_min || 0), 0) || 0;
                const totalKm = cardioData?.reduce((acc, c) => acc + (c.distance_km || 0), 0) || 0;

                const periodLabel = period === "today" ? "hoy" : period === "week" ? "esta semana" : "este mes";

                confirmText = `\n\n📊 **Resumen de ${periodLabel}:**\n• 💧 Agua: ${totalWater}ml\n• 🔥 Calorías consumidas: ${Math.round(totalCals)} kcal\n• 😴 Sueño promedio: ${avgSleep}h (${sleepData?.length || 0} registros)\n• 🏃 Cardio: ${totalCardioMin} min totales | ${totalKm.toFixed(1)} km\n• 🎯 Sesiones de cardio: ${cardioData?.length || 0}\n• ⭐ XP actual: ${profile?.xp || 0} | Nivel: ${profile?.level || 1}`;
              }

              if (confirmText) {
                fullResponse += confirmText;
                controller.enqueue(encoder.encode(confirmText));
              }
            }
          }

          if (fullResponse) {
             await supabase.from("agent_conversations").insert({ user_id: user.id, role: "assistant", content: fullResponse });
          }
          if (metadata) {
            controller.enqueue(encoder.encode(`\n__METADATA__${JSON.stringify(metadata)}`));
          }
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
