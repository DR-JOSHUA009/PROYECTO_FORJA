import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { type, to, name, data } = await req.json();

    if (!to || !type) {
      return NextResponse.json({ error: "Faltan parámetros: type y to" }, { status: 400 });
    }

    const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proyecto-forja.vercel.app";

    let subject = "";
    let html = "";

    if (type === "welcome") {
      subject = "🔥 Bienvenido a FORJA — Tu plan está listo";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
            
            <!-- Header -->
            <div style="text-align:center;margin-bottom:40px;">
              <h1 style="color:#ffffff;font-size:32px;font-weight:900;font-style:italic;margin:0;letter-spacing:-1px;">
                FORJA
              </h1>
              <p style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:4px;margin-top:8px;">
                Tu cuerpo. Tu IA. Tu ritmo.
              </p>
            </div>

            <!-- Main Card -->
            <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:16px;padding:40px 32px;margin-bottom:24px;">
              <p style="color:#09fad3;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin:0 0 16px 0;font-weight:700;">
                Sistema Activado
              </p>
              <h2 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 16px 0;line-height:1.3;">
                ${name ? `${name}, tu plan personalizado está listo.` : "Tu plan personalizado está listo."}
              </h2>
              <p style="color:#999;font-size:15px;line-height:1.7;margin:0 0 32px 0;">
                Nuestro motor de IA ha analizado tu perfil biométrico, tus objetivos y tu equipamiento disponible para crear un plan de entrenamiento y nutrición 100% personalizado.
              </p>

              <!-- Stats Preview -->
              <div style="display:flex;gap:12px;margin-bottom:32px;">
                <div style="flex:1;background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:16px;text-align:center;">
                  <div style="color:#fff;font-size:24px;font-weight:900;">${data?.trainingDays || 5}</div>
                  <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Días/Semana</div>
                </div>
                <div style="flex:1;background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:16px;text-align:center;">
                  <div style="color:#fff;font-size:24px;font-weight:900;">IA</div>
                  <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Agente Activo</div>
                </div>
                <div style="flex:1;background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:16px;text-align:center;">
                  <div style="color:#fff;font-size:24px;font-weight:900;">7</div>
                  <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Comidas/Día</div>
                </div>
              </div>

              <!-- CTA Button -->
              <a href="${appUrl}/dashboard/home" style="display:block;background:#ffffff;color:#050505;text-align:center;padding:16px 32px;border-radius:12px;font-size:14px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:2px;">
                Ir a Mi Dashboard →
              </a>
            </div>

            <!-- Features -->
            <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:16px;padding:32px;margin-bottom:24px;">
              <p style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin:0 0 20px 0;">
                Lo que puedes hacer ahora
              </p>
              ${[
                { emoji: "🏋️", text: "Ver tu rutina del día y activar el Modo Enfoque" },
                { emoji: "🍎", text: "Registrar alimentos y ver tu tracking de macros" },
                { emoji: "🤖", text: "Hablar con el agente IA para ajustar tu plan" },
                { emoji: "💧", text: "Registrar tu ingesta de agua diaria" },
                { emoji: "📊", text: "Ver tu progreso en estadísticas y logros" },
              ].map(f => `
                <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #111;">
                  <span style="font-size:20px;">${f.emoji}</span>
                  <span style="color:#ccc;font-size:14px;">${f.text}</span>
                </div>
              `).join("")}
            </div>

            <!-- Footer -->
            <div style="text-align:center;padding:24px 0;">
              <p style="color:#333;font-size:11px;margin:0;">
                Este email fue enviado por FORJA.
              </p>
              <p style="color:#333;font-size:11px;margin:4px 0 0 0;">
                ${appUrl}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "weekly_summary") {
      subject = "📊 Tu Resumen Semanal — FORJA";
      html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
            <h1 style="color:#ffffff;font-size:28px;font-weight:900;font-style:italic;text-align:center;margin-bottom:8px;">FORJA</h1>
            <p style="color:#666;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:4px;margin-bottom:40px;">Resumen Semanal</p>
            
            <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:16px;padding:32px;">
              <h2 style="color:#fff;font-size:20px;margin:0 0 24px 0;">${name ? `${name}, aquí está tu resumen:` : "Aquí está tu resumen:"}</h2>
              
              <div style="display:flex;gap:12px;margin-bottom:24px;">
                <div style="flex:1;background:#111;border-radius:12px;padding:16px;text-align:center;">
                  <div style="color:#fff;font-size:28px;font-weight:900;">${data?.workouts || 0}</div>
                  <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;">Entrenamientos</div>
                </div>
                <div style="flex:1;background:#111;border-radius:12px;padding:16px;text-align:center;">
                  <div style="color:#fff;font-size:28px;font-weight:900;">${data?.calories || 0}</div>
                  <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;">Calorías</div>
                </div>
                <div style="flex:1;background:#111;border-radius:12px;padding:16px;text-align:center;">
                  <div style="color:#fff;font-size:28px;font-weight:900;">${data?.xp || 0}</div>
                  <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;">XP Ganado</div>
                </div>
              </div>
              
              <a href="${appUrl}/dashboard/stats" style="display:block;background:#ffffff;color:#050505;text-align:center;padding:14px;border-radius:12px;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:2px;">
                Ver Estadísticas Completas →
              </a>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      return NextResponse.json({ error: "Tipo de email no soportado" }, { status: 400 });
    }

    const result = await resend.emails.send({
      from: `FORJA <${fromEmail}>`,
      to: [to],
      subject,
      html,
    });

    return NextResponse.json({ success: true, id: result.data?.id });
  } catch (error: any) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
