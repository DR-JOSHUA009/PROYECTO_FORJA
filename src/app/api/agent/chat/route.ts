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
      Eres FORJA, el Agente IA maestro. 
      REGLA MAESTRA: Al proponer cambios en RUTINA o DIETA, serás específico. 
      Tu objetivo es ayudar al usuario a alcanzar: ${profile?.goal || "Salud"}.
      No apliques cambios de rutina/dieta automáticamente, el usuario debe confirmarlos.
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
          description: "Propone cambios en la rutina.",
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
          description: "Propone cambios en la dieta.",
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
          description: "Registra actividad (agua, cardio).",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["water", "cardio"] },
              value: { type: "number" },
              detail: { type: "string" }
            },
            required: ["type", "value"]
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

              if (tool.name === "update_routine_day") {
                const { data: before } = await supabase.from("routines").select("exercises").eq("user_id", user.id).eq("day_of_week", args.day_of_week).single();
                metadata = { act_type: "confirmation_request", tool: "routine", day_of_week: args.day_of_week, before: before?.exercises || [], after: args.exercises };
                confirmText = `\n\nHe analizado tu progreso y he diseñado un ajuste para tu rutina del **${args.day_of_week}**. ¿Deseas aplicar estos cambios?`;
              } 
              else if (tool.name === "update_diet_meal") {
                const { data: before } = await supabase.from("diet_plans").select("foods").eq("user_id", user.id).eq("meal_type", args.meal_type).single();
                metadata = { act_type: "confirmation_request", tool: "diet", meal_type: args.meal_type, before: before?.foods || [], after: args.foods };
                confirmText = `\n\nHe preparado una propuesta de optimización para tu **${args.meal_type}**. Revisa el desglose a continuación.`;
              }
              else if (tool.name === "log_activity") {
                const today = new Date().toISOString().split('T')[0];
                if (args.type === "water") {
                  await supabase.from("water_logs").insert({ user_id: user.id, amount_ml: args.value, date: today });
                  confirmText = `\n\n💧 ¡Registrado! He añadido **${args.value}ml** a tu ingesta de agua.`;
                }
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
