import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { food } = await req.json();

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Eres un experto en nutrición. Analiza la comida proporcionada y devuelve ÚNICAMENTE un objeto JSON con: food_name, calories, protein, carbs, fats. Si no es una comida, devuelve valores en 0. Responde solo el JSON."
        },
        { role: "user", content: food }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Food Analysis Error:", error);
    return NextResponse.json({ error: "Failed to analyze food" }, { status: 500 });
  }
}
