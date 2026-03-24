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
      
      CONTEXTO DEL USUARIO:
      - Objetivo: ${profile?.goal || "Mejorar salud"}
      - Nivel: ${profile?.intensity || "Moderado"}
      - Lesiones: ${profile?.injuries || "Ninguna"}
      
      RUTINA ACTUAL:
      ${JSON.stringify(routines || [])}
      
      DIETA ACTUAL:
      ${JSON.stringify(diet || [])}

      Si el usuario pide que cambies su rutina o dieta, USA LAS HERRAMIENTAS (tools) disponibles para hacer el cambio real en la base de datos.
      NO digas "te sugiero que lo cambies vayas y lo hagas", hazlo tú mismo invocando la herramienta.
      Confírmale al usuario amigablemente qué cambiaste.
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

    // 5. Verificar si Groq decidió usar una herramienta
    if (message?.tool_calls && message.tool_calls.length > 0) {
      let responseText = "He detectado una petición de cambio.";
      
      for (const toolCall of message.tool_calls) {
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
      }
      
      // Devolver lo que hizo la herramienta al cliente
      return NextResponse.json({ reply: responseText, act_type: "tool_called" });
    }

    // 6. Si no llamó a tool, devolver la respuesta de texto
    const responseText = message?.content || "No pude procesar eso. Intenta de nuevo.";
    return NextResponse.json({ reply: responseText });

  } catch (error: any) {
    console.error("Agent Error:", error);
    return NextResponse.json({ error: error.message || "Error interno con la IA." }, { status: 500 });
  }
}
