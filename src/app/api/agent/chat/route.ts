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
      
      RUTINA ACTUAL (CONTROL DIRECTO):
      ${JSON.stringify(routines || [])}
      
      DIETA ACTUAL (CONTROL DIRECTO):
      ${JSON.stringify(diet || [])}

      REGLAS CRÍTICAS:
      1. Si el usuario pide cambiar su rutina o dieta, USA LAS TOOLS. NO le digas que lo haga él.
      2. Si pregunta por una comida (cuántas calorías tiene, si puede comerla), usa 'analyze_food'.
      3. Sé motivador, técnico y minimalista. Responde como un ingeniero de rendimiento humano.
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
          description: "Sobrescribe los ejercicios de un día de la semana específico. Usa esto si el usuario pide cambiar, añadir o eliminar su rutina de un día.",
          parameters: {
            type: "object",
            properties: {
              day_of_week: { type: "string", description: "El día en minúsculas (ej: lunes, martes, miercoles)" },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    sets: { type: "number" },
                    reps: { type: "number" },
                    description: { type: "string" },
                    muscle_group: { type: "string" }
                  },
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
          description: "Sobrescribe los alimentos de un tiempo de comida específico de la dieta del usuario.",
          parameters: {
            type: "object",
            properties: {
              meal_type: { type: "string", description: "El tiempo de comida (ej: desayuno, almuerzo, merienda, cena)" },
              foods: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    quantity: { type: "number", description: "Cantidad en gramos o porciones" },
                    calories: { type: "number" },
                    protein_g: { type: "number" }
                  },
                  required: ["name", "quantity", "calories"]
                }
              }
            },
            required: ["meal_type", "foods"]
          }
        }
      }
    ];

    // 4. Primera llamada a Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: groqMessages,
      model: "llama-3.1-8b-instant",
      temperature: 0.1, // Baja temperatura para tool calling
      max_tokens: 1000,
      tools: tools,
      tool_choice: "auto",
    });

    const choice = chatCompletion.choices[0];
    const message = choice?.message;

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
          // Modificar DB
          await supabase.from("routines").update({ exercises: args.exercises }).eq("user_id", user.id).eq("day_of_week", args.day_of_week);
          responseText = `✅ Entendido. He actualizado tu rutina del **${args.day_of_week}** en la base de datos con los nuevos ejercicios. El Dashboard (Gym) se ha sincronizado.`;
        } 
        else if (toolCall.function.name === "update_diet_meal") {
          const args = JSON.parse(toolCall.function.arguments);
          // Modificar DB
          await supabase.from("diet_plans").update({ foods: args.foods }).eq("user_id", user.id).eq("meal_type", args.meal_type);
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
