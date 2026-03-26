import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // ──── LÍMITE DIARIO DE MENSAJES ────────────────────────────────
    const FREE_DAILY_LIMIT = 10;
    const today = new Date().toISOString().split('T')[0];

    const { data: profile } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
    const userPlan = (profile as any)?.plan || "free";

    if (userPlan !== "pro") {
      const { count } = await supabase
        .from("agent_conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "user")
        .gte("created_at", `${today}T00:00:00.000Z`);

      const todayCount = count || 0;

      if (todayCount >= FREE_DAILY_LIMIT) {
        return NextResponse.json({
          error: "daily_limit_reached",
          message: `Has alcanzado el límite de ${FREE_DAILY_LIMIT} mensajes diarios del plan gratuito.`,
          limit: FREE_DAILY_LIMIT,
          used: todayCount,
          remaining: 0,
        }, { status: 429 });
      }
    }

    const { messages } = await req.json();

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_KEY });

    // ─── Cargar memorias de largo plazo ──────────────────────────────
    const { data: memories } = await supabase
      .from("agent_memory")
      .select("category, fact")
      .eq("user_id", user.id)
      .order("relevance", { ascending: false })
      .limit(30);

    let memoryBlock = "";
    if (memories && memories.length > 0) {
      const grouped: Record<string, string[]> = {};
      for (const m of memories) {
        if (!grouped[m.category]) grouped[m.category] = [];
        grouped[m.category].push(m.fact);
      }
      const categoryLabels: Record<string, string> = {
        injury: "🩹 Lesiones",
        preference: "⭐ Preferencias",
        pattern: "📈 Patrones detectados",
        equipment: "🏋️ Equipamiento",
        allergy: "⚠️ Alergias/Intolerancias",
        goal_change: "🎯 Cambios de objetivo",
        general: "📝 Notas generales",
      };
      memoryBlock = "\n\nMEMORIA PERSISTENTE (datos que el usuario te ha compartido en conversaciones pasadas — úsalos sin necesidad de preguntar de nuevo):\n";
      for (const [cat, facts] of Object.entries(grouped)) {
        memoryBlock += `${categoryLabels[cat] || cat}:\n`;
        for (const f of facts) memoryBlock += `  - ${f}\n`;
      }
    }

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
      ${memoryBlock}

      REGLAS:
      1. Al proponer cambios en RUTINA o DIETA, usa las herramientas update_routine_day o update_diet_meal. NUNCA apliques cambios sin confirmación del usuario.
      2. Para registrar sueño, cardio o agua, usa las herramientas log_sleep, log_cardio o log_activity respectivamente. Estos SÍ se aplican directo.
      3. Cuando el usuario pida ver su progreso o estadísticas, usa get_user_stats para leer datos reales antes de responder.
      4. Sé conciso, motivador y personalizado. Usa los datos del perfil y la MEMORIA PERSISTENTE para dar consejos relevantes sin pedir información que ya conoces.
      5. Responde siempre en español.
      6. IMPORTANTE: Cuando el usuario pregunte si puede comer algo específico, si le queda espacio para comer, o pida consejo nutricional sobre qué comer ahora, SIEMPRE usa primero la herramienta check_food_context para consultar los macros ya consumidos hoy y lo que le queda disponible. Usa esos datos reales para dar una respuesta precisa y personalizada.
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
      },
      {
        type: "function",
        function: {
          name: "check_food_context",
          description: "Consulta los macronutrientes ya consumidos hoy y calcula cuánto le queda disponible al usuario según sus objetivos. SIEMPRE usa esta herramienta ANTES de responder preguntas como '¿puedo comer X?', '¿me queda espacio para comer?', '¿qué debería comer?', o cualquier consulta nutricional sobre el día actual.",
          parameters: {
            type: "object",
            properties: {
              food_query: { type: "string", description: "El alimento que el usuario quiere evaluar, ej: 'pizza', '2 tacos', 'un helado'. Dejar vacío si solo quiere ver el resumen de macros disponibles." }
            },
            required: []
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
              // --- TOOL: check_food_context (consulta nutricional en contexto real) ---
              else if (tool.name === "check_food_context") {
                // 1. Obtener todo lo consumido HOY
                const { data: todayFood } = await supabase
                  .from("food_logs")
                  .select("food_name, calories, protein_g, carbs_g, fat_g")
                  .eq("user_id", user.id)
                  .eq("date", today);

                const consumed = {
                  calories: (todayFood || []).reduce((sum, f) => sum + (Number(f.calories) || 0), 0),
                  protein: (todayFood || []).reduce((sum, f) => sum + (Number(f.protein_g) || 0), 0),
                  carbs: (todayFood || []).reduce((sum, f) => sum + (Number(f.carbs_g) || 0), 0),
                  fat: (todayFood || []).reduce((sum, f) => sum + (Number(f.fat_g) || 0), 0),
                };

                // 2. Calcular objetivos basados en el perfil (misma fórmula que el dashboard)
                const weight = Number(profile?.weight_kg) || 70;
                const intensityMult = profile?.intensity === "alta" ? 1.6 : profile?.intensity === "media" ? 1.4 : 1.2;
                let targetCalories = Math.round(weight * 22 * intensityMult);
                if (profile?.goal === "cut") targetCalories -= 500;
                if (profile?.goal === "bulk") targetCalories += 300;

                const targetProtein = Math.round(weight * 2.2);
                const targetFat = Math.round(weight * 0.8);
                const targetCarbs = Math.round((targetCalories - (targetProtein * 4 + targetFat * 9)) / 4);

                // 3. Calcular lo que queda disponible
                const remaining = {
                  calories: Math.max(0, targetCalories - consumed.calories),
                  protein: Math.max(0, targetProtein - consumed.protein),
                  carbs: Math.max(0, targetCarbs - consumed.carbs),
                  fat: Math.max(0, targetFat - consumed.fat),
                };

                // 4. Listar lo que ya comió hoy
                const foodList = (todayFood || []).map(f => f.food_name).join(", ") || "nada aún";

                // 5. Construir contexto interno (NO se muestra al usuario)
                const nutritionContext = `DATOS NUTRICIONALES REALES DEL DÍA DE HOY:
- Alimentos consumidos hoy: ${foodList}
- Calorías consumidas: ${Math.round(consumed.calories)} / ${targetCalories} kcal
- Proteína consumida: ${Math.round(consumed.protein)} / ${targetProtein}g
- Carbohidratos consumidos: ${Math.round(consumed.carbs)} / ${targetCarbs}g
- Grasa consumida: ${Math.round(consumed.fat)} / ${targetFat}g
- Calorías restantes disponibles: ${Math.round(remaining.calories)} kcal
- Proteína restante: ${Math.round(remaining.protein)}g
- Carbohidratos restantes: ${Math.round(remaining.carbs)}g
- Grasa restante: ${Math.round(remaining.fat)}g
- Objetivo del usuario: ${profile?.goal || "mantenimiento"}
- Tipo de dieta: ${profile?.diet_type || "normal"}
${args.food_query ? `- El usuario pregunta si puede comer: ${args.food_query}` : "- El usuario quiere saber su estado nutricional actual"}`;

                // 6. Segunda llamada a Groq con el contexto para generar respuesta natural
                const foodFollowup = await groq.chat.completions.create({
                  messages: [
                    {
                      role: "system" as const,
                      content: `Eres FORJA, agente IA de fitness y nutrición. Responde en español, sé conciso y motivador. 
Usa los datos nutricionales reales proporcionados para dar una respuesta personalizada y conversacional.
Si el usuario pregunta si puede comer algo, responde directamente SÍ o NO basándote en los macros restantes, 
explica brevemente por qué, y si aplica, sugiere una porción adecuada o alternativa.
NO muestres tablas de datos crudos. Responde de forma natural como un coach.
Usa emojis relevantes pero sin exagerar.`
                    },
                    {
                      role: "user" as const,
                      content: nutritionContext
                    }
                  ],
                  model: "llama-3.3-70b-versatile",
                  temperature: 0.3,
                  stream: true,
                });

                // Stream the natural response
                for await (const chunk of foodFollowup) {
                  const content = chunk.choices[0]?.delta?.content;
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(content));
                  }
                }

                // Skip the generic confirmText flow for this tool
                continue;
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

          // ─── Extracción automática de memorias (background, no bloquea) ───
          const lastUserMsg = messages.filter((m: any) => m.role === "user").pop()?.content || "";
          if (lastUserMsg.length > 10) {
            extractAndSaveMemories(groq, supabase, user.id, lastUserMsg, fullResponse).catch(() => {});
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

// ─── Extracción automática de memorias ─────────────────────────────────
async function extractAndSaveMemories(
  groq: any,
  supabase: any,
  userId: string,
  userMessage: string,
  assistantResponse: string
) {
  try {
    const extraction = await groq.chat.completions.create({
      messages: [
        {
          role: "system" as const,
          content: `Eres un sistema de extracción de memoria para un agente de fitness. 
Analiza la conversación y extrae SOLO hechos memorables y relevantes que el usuario haya mencionado.

Categorías válidas:
- "injury": Lesiones actuales o pasadas (ej: "tengo dolor de rodilla derecha", "me lesioné el hombro hace 2 meses")
- "preference": Preferencias de entrenamiento o comida (ej: "no me gusta correr", "prefiero entrenar en las mañanas")
- "equipment": Equipamiento disponible o limitaciones (ej: "solo tengo mancuernas en casa", "voy al gym con polea")
- "allergy": Alergias o intolerancias alimenticias (ej: "soy intolerante a la lactosa", "tengo alergia al maní")
- "pattern": Patrones detectados del usuario (ej: "suele entrenar de noche", "come poco en el desayuno")
- "goal_change": Cambios en objetivo (ej: "quiero cambiar de bulk a cut", "ahora mi prioridad es resistencia")
- "general": Otros datos importantes (ej: "viaja mucho por trabajo", "tiene competencia en 3 meses")

Responde ÚNICAMENTE con un JSON array. Si no hay nada memorable, responde [].
Cada elemento debe tener: { "category": "...", "fact": "...", "relevance": 1-10 }
El fact debe ser una oración corta y concreta en tercera persona.
NO extraigas datos que ya existen en un perfil típico (peso, edad, objetivo genérico). Solo datos EXTRA.`
        },
        {
          role: "user" as const,
          content: `Mensaje del usuario: "${userMessage}"\n\nRespuesta del agente: "${assistantResponse.substring(0, 500)}"`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = extraction.choices[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return; // JSON inválido, ignorar
    }

    // Puede venir como { memories: [...] } o como array directo
    const factsArray = Array.isArray(parsed) ? parsed : (parsed.memories || parsed.facts || []);
    if (!Array.isArray(factsArray) || factsArray.length === 0) return;

    for (const item of factsArray) {
      if (!item.fact || !item.category) continue;

      // Evitar duplicados: buscar si ya existe un hecho similar
      const { data: existing } = await supabase
        .from("agent_memory")
        .select("id, fact")
        .eq("user_id", userId)
        .eq("category", item.category)
        .ilike("fact", `%${item.fact.substring(0, 30)}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        // Actualizar si ya existe (refrescar timestamp y posiblemente el texto)
        await supabase
          .from("agent_memory")
          .update({ fact: item.fact, relevance: item.relevance || 5, updated_at: new Date().toISOString() })
          .eq("id", existing[0].id);
      } else {
        // Insertar nuevo
        await supabase.from("agent_memory").insert({
          user_id: userId,
          category: item.category,
          fact: item.fact,
          relevance: item.relevance || 5,
          source: "agent",
        });
      }
    }
  } catch (err) {
    // Silenciar errores de extracción — no debe afectar la respuesta principal
    console.error("Memory extraction error (non-blocking):", err);
  }
}
