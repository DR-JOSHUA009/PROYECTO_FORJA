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

    // 1. Obtener contexto completo del usuario
    const { data: profile } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
    const { data: routines } = await supabase.from("routines").select("day_of_week, exercises").eq("user_id", user.id);
    const { data: diet } = await supabase.from("diet_plans").select("meal_type, foods").eq("user_id", user.id);

    // 2. Construir System Prompt Dinámico con toda la info de la web
    const systemPrompt = `
      Eres FORJA, el Agente IA maestro de un SaaS fitness premium. Operas en español latino.
      Tienes el control absoluto de la app del usuario.
      
      CONTEXTO BIOMÉTRICO (100% DISPONIBLE):
      - Nombre/Usuario: ${profile?.full_name || profile?.username || "Usuario"}
      - Peso: ${profile?.weight_kg || 0}kg | Altura: ${profile?.height_cm || 0}cm | Edad: ${profile?.age || 0} años
      - Género: ${profile?.gender || "No especificado"}
      - Objetivo Maestro: ${profile?.goal || "Mejorar salud"}
      - Intensidad: ${profile?.intensity || "Moderado"}
      - Equipo disponible: ${profile?.equipment || "Solo peso corporal"}
      - Lesiones: ${profile?.injuries || "Ninguna"}
      - Enfermedades: ${profile?.diseases || "Ninguna"}
      - Restricciones alimenticias: ${profile?.food_restrictions || "Ninguna"}
      - Nivel de Experiencia: ${profile?.experience_level || "Principiante"}
        
      TIEMPO ACTUAL (CRÍTICO):
      - Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      - Hora: ${new Date().toLocaleTimeString('es-ES')}
      - Día de la semana: ${['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][new Date().getDay()]}
        
      RUTINA ACTUAL (CONTROL DIRECTO):
      ${JSON.stringify(routines || [])}
      
      DIETA ACTUAL (CONTROL DIRECTO):
      ${JSON.stringify(diet || [])}

      REGLAS CRÍTICAS:
      1. Si el usuario pide cambiar su rutina o dieta, USA LAS TOOLS INTERNAS. 
      2. NUNCA escribas manualmente etiquetas como <tool_name> o similares. El sistema se encarga de eso.
      3. Tu respuesta final debe ser texto plano y humano.
      4. Si usas una herramienta, el sistema ejecutará la acción y te dará el resultado.
      5. Al usar 'update_profile', los valores válidos técnicos de 'goal' son: 'bulk', 'cut', 'maintenance'. 
      6. Al usar 'update_profile', los valores de 'experience_level' son: 'principiante', 'intermedio', 'avanzado'.
    `;

    const groqMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m: any) => ({ 
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant", 
        content: m.content 
      }))
    ];

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_KEY });

    // Definir Herramientas
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "update_routine_day",
          description: "Actualiza la rutina de un día. Parámetros: day_of_week, exercises (array con name, sets, reps).",
          parameters: {
            type: "object",
            properties: {
              day_of_week: { type: "string" },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: { name: { type: "string" }, sets: { type: "number" }, reps: { type: "number" } },
                  required: ["name", "sets", "reps"]
                }
              }
            },
            required: ["day_of_week", "exercises"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "update_diet_meal",
          description: "Actualiza una comida. Parámetros: meal_type, foods (array con name, quantity, calories).",
          parameters: {
            type: "object",
            properties: {
              meal_type: { type: "string" },
              foods: {
                type: "array",
                items: {
                  type: "object",
                  properties: { name: { type: "string" }, quantity: { type: "number" }, calories: { type: "number" } },
                  required: ["name", "quantity", "calories"]
                }
              }
            },
            required: ["meal_type", "foods"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "analyze_food",
          description: "Analiza una comida. Parámetro: food_query.",
          parameters: {
            type: "object",
            properties: { food_query: { type: "string" } },
            required: ["food_query"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "update_profile",
          description: "Actualiza perfil. Parámetros: weight_kg, height_cm, goal, experience_level, full_name, username.",
          parameters: {
            type: "object",
            properties: {
              weight_kg: { type: "number" },
              height_cm: { type: "number" },
              goal: { type: "string" },
              experience_level: { type: "string" },
              full_name: { type: "string" },
              username: { type: "string" }
            }
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "suggest_navigation",
          description: "Sugiere ir a una sección. Parámetros: section, label.",
          parameters: {
            type: "object",
            properties: {
              section: { type: "string", enum: ["perfil", "gym", "dieta", "cardio", "sueño", "stats", "logros"] },
              label: { type: "string" }
            },
            required: ["section", "label"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "log_activity",
          description: "Registra actividad diaria. Parámetros: type (water, food, cardio, sleep), value, detail.",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["water", "food", "cardio", "sleep"] },
              value: { type: "number" },
              detail: { type: "string" }
            },
            required: ["type", "value"]
          }
        }
      }
    ];

    // 4. Primera llamada a Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: groqMessages,
      model: "llama3-70b-8192", // Usar un modelo más grande para mejor tool calling
      temperature: 0,
      max_tokens: 1024,
      tools: tools,
      tool_choice: "auto",
    });

    const choice = chatCompletion.choices[0];
    let message = choice?.message;

    // --- MANUAL PARSER (FAIL-SAFE) ---
    // Si el modelo escribió etiquetas en el texto en lugar de usar tool_calls oficial
    if (!message?.tool_calls && message?.content?.includes("<")) {
      const toolMatch = message.content.match(/<(\w+)>([\s\S]*?)<\/\1>/);
      if (toolMatch) {
        const name = toolMatch[1];
        const argsStr = toolMatch[2];
        try {
          // Intentar reconstruir como tool_call oficial para el resto de la lógica
          (message as any).tool_calls = [{
            id: "manual_" + Date.now(),
            type: "function",
            function: {
              name: name,
              arguments: argsStr
            }
          }];
        } catch (e) {}
      }
    }

    // --- PERSISTENCIA: Guardar mensaje del usuario ---
    const userMsg = messages[messages.length - 1]?.content;
    if (userMsg) {
      await supabase.from("agent_conversations").insert({
        user_id: user.id,
        role: "user",
        content: userMsg
      });
    }

    // 5. Verificar si Groq decidió usar una herramienta
    if (message?.tool_calls && message.tool_calls.length > 0) {
      let responseText = "He detectado una petición de cambio.";
      let toolUsed = "";
      
      for (const toolCall of message.tool_calls) {
        toolUsed = toolCall.function.name;
        if (toolCall.function.name === "update_routine_day") {
          const args = JSON.parse(toolCall.function.arguments);
          // Robust Exercises Parsing
          const exercises = args.exercises.map((ex: any) => ({
            ...ex,
            sets: Number(ex.sets) || 0,
            reps: Number(ex.reps) || 0
          }));

          // Upsert en DB
          await supabase.from("routines").upsert({ 
            user_id: user.id, 
            day_of_week: args.day_of_week, 
            exercises: exercises 
          }, { onConflict: 'user_id,day_of_week' });
          responseText = `✅ Entendido. He actualizado tu rutina del **${args.day_of_week}** en la base de datos con los nuevos ejercicios. El Dashboard (Gym) se ha sincronizado.`;
        } 
        else if (toolCall.function.name === "update_diet_meal") {
          const args = JSON.parse(toolCall.function.arguments);
          // Upsert en DB
          await supabase.from("diet_plans").upsert({ 
            user_id: user.id, 
            meal_type: args.meal_type, 
            foods: args.foods 
          }, { onConflict: 'user_id,meal_type' });
          responseText = `✅ Hecho. He modificado tu **${args.meal_type}** con los nuevos alimentos indicados. Revisa la pestaña de Nutrición.`;
        }
        else if (toolCall.function.name === "analyze_food") {
          const args = JSON.parse(toolCall.function.arguments);
          // Llamada interna a Groq para análisis rápido
          const analysisCompletion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "system", content: "Analiza nutricionalmente la comida. Sé breve. Di si es recomendable según el perfil del usuario (Objetivo: " + (profile?.goal || "Salud") + ")."}, { role: "user", content: args.food_query }],
            temperature: 0.1
          });
          responseText = analysisCompletion.choices[0]?.message?.content || "No pude analizar esa comida.";
        }
        else if (toolCall.function.name === "update_profile") {
          const args = JSON.parse(toolCall.function.arguments);
          
          // Mapeo inteligente de Goal
          if (args.goal) {
            const g = args.goal.toLowerCase();
            if (g.includes("salud") || g.includes("mantenimiento") || g.includes("maitenance")) args.goal = "maintenance";
            if (g.includes("grasa") || g.includes("bajar") || g.includes("defin") || g.includes("cut")) args.goal = "cut";
            if (g.includes("musculo") || g.includes("volumen") || g.includes("ganar") || g.includes("bulk")) args.goal = "bulk";
          }
          
          // Mapeo inteligente de Nivel
          if (args.experience_level) {
            const l = args.experience_level.toLowerCase();
            if (l.includes("interm")) args.experience_level = "intermedio";
            if (l.includes("avanz") || l.includes("expert")) args.experience_level = "avanzado";
            if (l.includes("princ") || l.includes("novato")) args.experience_level = "principiante";
          }

          await supabase.from("users_profile").update(args).eq("user_id", user.id);
          responseText = `✅ Perfil actualizado. He ajustado tus parámetros maestros en la base de datos conforme a lo solicitado.`;
        }
        else if (toolCall.function.name === "suggest_navigation") {
          const args = JSON.parse(toolCall.function.arguments);
          const href = args.section === "perfil" ? "/dashboard/profile" : `/dashboard/${args.section}`;
          return NextResponse.json({ 
            reply: `Te he preparado un acceso directo para ir a la sección de **${args.section}**.`, 
            act_type: "navigation", 
            section_href: href,
            btn_label: args.label 
          });
        }
        else if (toolCall.function.name === "log_activity") {
          const args = JSON.parse(toolCall.function.arguments);
          const { type, value, detail } = args;
          const today = new Date().toISOString().split('T')[0];

          if (type === "water") {
            await supabase.from("water_logs").insert({ user_id: user.id, amount_ml: value, date: today });
            responseText = `💧 Registrado. He añadido **${value}ml** de agua a tu seguimiento de hoy.`;
          } else if (type === "food") {
            await supabase.from("food_logs").insert({ user_id: user.id, food_name: detail || "Alimento IA", calories: value, date: today });
            responseText = `🍎 Registrado. He añadido **${detail}** (aprox ${value} kcal) a tu ingesta de hoy.`;
          } else if (type === "cardio") {
            await supabase.from("cardio_sessions").insert({ user_id: user.id, activity: detail || "Cardio IA", duration_min: value });
            responseText = `🏃 Hecho. He guardado tu sesión de cardio de **${value} min** (${detail}).`;
          } else if (type === "sleep") {
            await supabase.from("sleep_logs").insert({ user_id: user.id, hours_slept: value, date: today });
            responseText = `🌙 Recibido. He registrado **${value} horas** de sueño para tu recuperación.`;
          }
        }
      }
      
      // PERSISTENCIA: Guardar respuesta del agente (herramienta)
      await supabase.from("agent_conversations").insert({
        user_id: user.id,
        role: "assistant",
        content: responseText,
        tool_used: toolUsed,
        change_applied: true
      });

      // Devolver lo que hizo la herramienta al cliente
      return NextResponse.json({ reply: responseText, act_type: "tool_called" });
    }

    // 6. Si no llamó a tool, devolver la respuesta de texto
    const responseText = message?.content || "No pude procesar eso. Intenta de nuevo.";
    
    // PERSISTENCIA: Guardar respuesta del agente (texto)
    await supabase.from("agent_conversations").insert({
      user_id: user.id,
      role: "assistant",
      content: responseText
    });

    return NextResponse.json({ reply: responseText });

  } catch (error: any) {
    console.error("Agent Error:", error);
    return NextResponse.json({ error: error.message || "Error interno con la IA." }, { status: 500 });
  }
}
