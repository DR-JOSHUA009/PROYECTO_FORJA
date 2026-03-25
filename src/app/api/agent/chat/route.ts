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

    // 2. Construir System Prompt
    const systemPrompt = `
      Eres FORJA, el Agente IA maestro de un SaaS fitness premium. Operas en español latino.
      CONTEXTO BIOMÉTRICO:
      - Nombre/Usuario: ${profile?.full_name || profile?.username || "Usuario"}
      - Peso: ${profile?.weight_kg || 0}kg | Altura: ${profile?.height_cm || 0}cm | Edad: ${profile?.age || 0} años
      - Objetivo: ${profile?.goal || "Mejorar salud"}
      - Equipo: ${profile?.equipment || "Solo peso corporal"}
      
      FECHA ACTUAL: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        
      RUTINA ACTUAL: ${JSON.stringify(routines || [])}
      DIETA ACTUAL: ${JSON.stringify(diet || [])}

      REGLAS:
      1. Si el usuario pide cambios, USA LAS TOOLS.
      2. Responde en español, sé motivador pero directo.
      3. No menciones que eres una IA a menos que sea necesario.
    `;

    const groqMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m: any) => ({ 
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant", 
        content: m.content 
      }))
    ];

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_KEY });

    // Definición de Herramientas
    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "update_routine_day",
          description: "Actualiza la rutina de un día.",
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
        type: "function",
        function: {
          name: "update_diet_meal",
          description: "Actualiza una comida.",
          parameters: {
            type: "object",
            properties: {
              meal_type: { type: "string" },
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
          description: "Registra actividad diaria.",
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
      },
      {
        type: "function",
        function: {
          name: "suggest_navigation",
          description: "Sugiere ir a una sección.",
          parameters: {
            type: "object",
            properties: {
              section: { type: "string", enum: ["perfil", "gym", "dieta", "cardio", "sueño", "stats", "logros"] },
              label: { type: "string" }
            },
            required: ["section", "label"]
          }
        }
      }
    ];

    // --- Persistencia mensaje del usuario ---
    const userMsgContent = messages[messages.length - 1]?.content;
    if (userMsgContent) {
      await supabase.from("agent_conversations").insert({
        user_id: user.id,
        role: "user",
        content: userMsgContent
      });
    }

    // 4. Iniciar Completion con Streaming
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
        let metadataToSend: any = null;

        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;

            // Manejar texto
            if (delta?.content) {
              fullResponse += delta.content;
              controller.enqueue(encoder.encode(delta.content));
            }

            // Manejar tool_calls (fragmentados en stream)
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!toolCallsBuffer[tc.index]) {
                  toolCallsBuffer[tc.index] = { name: "", args: "" };
                }
                if (tc.function?.name) toolCallsBuffer[tc.index].name = tc.function.name;
                if (tc.function?.arguments) toolCallsBuffer[tc.index].args += tc.function.arguments;
              }
            }
          }

          // Si hubo Tool Calls, procesarlos
          const activeTools = toolCallsBuffer.filter(t => t.name);
          if (activeTools.length > 0) {
            let toolUsed = "";
            for (const tool of activeTools) {
              toolUsed = tool.name;
              const args = JSON.parse(tool.args || "{}");
              let confirmText = "";

              if (tool.name === "update_routine_day") {
                await supabase.from("routines").upsert({ 
                  user_id: user.id, day_of_week: args.day_of_week, exercises: args.exercises 
                }, { onConflict: 'user_id,day_of_week' });
                confirmText = `\n\n✅ He actualizado tu rutina del **${args.day_of_week}**. Los cambios ya son visibles en tu Dashboard de Gym.`;
              } 
              else if (tool.name === "update_diet_meal") {
                await supabase.from("diet_plans").upsert({ 
                  user_id: user.id, meal_type: args.meal_type, foods: args.foods 
                }, { onConflict: 'user_id,meal_type' });
                confirmText = `\n\n✅ He ajustado tu **${args.meal_type}** con los nuevos parámetros nutricionales.`;
              }
              else if (tool.name === "log_activity") {
                const today = new Date().toISOString().split('T')[0];
                if (args.type === "water") {
                  await supabase.from("water_logs").insert({ user_id: user.id, amount_ml: args.value, date: today });
                  confirmText = `\n\n💧 Registrado: **${args.value}ml** de agua añadidos.`;
                } else if (args.type === "cardio") {
                  await supabase.from("cardio_sessions").insert({ user_id: user.id, activity: args.detail || "Cardio", duration_min: args.value });
                  confirmText = `\n\n🏃 Sesión de cardio (${args.detail}) de **${args.value} min** guardada.`;
                }
              }
              else if (tool.name === "suggest_navigation") {
                metadataToSend = { act_type: "navigation", section: args.section, label: args.label };
                confirmText = `\n\nTe sugiero ir a la sección de **${args.section}**.`;
              }

              if (confirmText) {
                fullResponse += confirmText;
                controller.enqueue(encoder.encode(confirmText));
              }
            }

            // Guardar en DB la respuesta de la herramienta
            await supabase.from("agent_conversations").insert({
              user_id: user.id,
              role: "assistant",
              content: fullResponse,
              tool_used: toolUsed,
              change_applied: true
            });
          } else {
            // Guardar en DB la respuesta normal
            if (fullResponse) {
              await supabase.from("agent_conversations").insert({
                user_id: user.id,
                role: "assistant",
                content: fullResponse
              });
            }
          }

          // Enviar metadatos al final si existen
          if (metadataToSend) {
            controller.enqueue(encoder.encode(`\n__METADATA__${JSON.stringify(metadataToSend)}`));
          }

        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(encoder.encode("\n\n[Error en el flujo del Agente]"));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Agent Error:", error);
    return NextResponse.json({ error: error.message || "Error interno." }, { status: 500 });
  }
}
