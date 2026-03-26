import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// ─── Vercel Cron Security ──────────────────────────────────────────────
// This route is designed to be called by Vercel Cron Jobs.
// It uses CRON_SECRET to prevent unauthorized access.
// ────────────────────────────────────────────────────────────────────────

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // ─── Auth: verify cron secret ────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── Init services ──────────────────────────────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proyecto-forja.vercel.app";

    // ─── Date range: last 7 days ────────────────────────────────────
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString().split("T")[0]; // YYYY-MM-DD
    const todayISO = now.toISOString().split("T")[0];

    // ─── Get all users with onboarding completed ────────────────────
    const { data: users, error: usersErr } = await supabase
      .from("users_profile")
      .select("user_id, name")
      .eq("onboarding_completed", true);

    if (usersErr || !users || users.length === 0) {
      return NextResponse.json({ message: "No users to process", error: usersErr?.message });
    }

    // ─── Get user emails from auth.users via admin API ──────────────
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
      return NextResponse.json({ error: "Failed to fetch auth users" }, { status: 500 });
    }

    const emailMap = new Map<string, string>();
    for (const u of authUsers.users) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    // ─── Process each user ──────────────────────────────────────────
    const results: { userId: string; status: string }[] = [];

    for (const user of users) {
      const userId = user.user_id;
      const email = emailMap.get(userId);
      if (!email) {
        results.push({ userId, status: "no_email" });
        continue;
      }

      try {
        // Fetch weekly data in parallel
        const [workoutsRes, foodRes, waterRes, cardioRes, sleepRes, xpRes] = await Promise.all([
          // Workouts completed (gym_logs or routines with today's date)
          supabase
            .from("routines")
            .select("id, day_of_week, is_rest_day")
            .eq("user_id", userId)
            .eq("is_rest_day", false),

          // Food logs this week
          supabase
            .from("food_logs")
            .select("calories, protein_g, carbs_g, fat_g")
            .eq("user_id", userId)
            .gte("date", weekAgoISO)
            .lte("date", todayISO),

          // Water logs this week
          supabase
            .from("water_logs")
            .select("amount_ml")
            .eq("user_id", userId)
            .gte("date", weekAgoISO)
            .lte("date", todayISO),

          // Cardio sessions this week
          supabase
            .from("cardio_sessions")
            .select("duration_min, distance_km")
            .eq("user_id", userId)
            .gte("date", weekAgoISO)
            .lte("date", todayISO),

          // Sleep logs this week
          supabase
            .from("sleep_logs")
            .select("hours_slept")
            .eq("user_id", userId)
            .gte("date", weekAgoISO)
            .lte("date", todayISO),

          // Current XP
          supabase
            .from("user_xp")
            .select("total_xp, level")
            .eq("user_id", userId)
            .single(),
        ]);

        // ─── Aggregate stats ──────────────────────────────────────
        const totalCalories = (foodRes.data || []).reduce((sum, f) => sum + (Number(f.calories) || 0), 0);
        const totalProtein = (foodRes.data || []).reduce((sum, f) => sum + (Number(f.protein_g) || 0), 0);
        const totalCarbs = (foodRes.data || []).reduce((sum, f) => sum + (Number(f.carbs_g) || 0), 0);
        const totalFat = (foodRes.data || []).reduce((sum, f) => sum + (Number(f.fat_g) || 0), 0);
        const totalWaterMl = (waterRes.data || []).reduce((sum, w) => sum + (Number(w.amount_ml) || 0), 0);
        const totalWaterL = (totalWaterMl / 1000).toFixed(1);
        const cardioSessions = cardioRes.data?.length || 0;
        const totalCardioMin = (cardioRes.data || []).reduce((sum, c) => sum + (Number(c.duration_min) || 0), 0);
        const sleepDays = sleepRes.data?.length || 0;
        const avgSleep = sleepDays > 0
          ? ((sleepRes.data || []).reduce((sum, s) => sum + (Number(s.hours_slept) || 0), 0) / sleepDays).toFixed(1)
          : "0";
        const foodDays = new Set((foodRes.data || []).map(() => "day")).size; // simplified
        const workoutDays = workoutsRes.data?.length || 0;
        const currentXP = xpRes.data?.total_xp || 0;
        const currentLevel = xpRes.data?.level || 1;

        // ─── Build premium HTML email ─────────────────────────────
        const subject = "📊 Tu Resumen Semanal — FORJA";
        const html = buildWeeklyEmailHTML({
          name: user.name || "Guerrero",
          appUrl,
          stats: {
            totalCalories: Math.round(totalCalories),
            avgCalories: Math.round(totalCalories / 7),
            totalProtein: Math.round(totalProtein),
            totalCarbs: Math.round(totalCarbs),
            totalFat: Math.round(totalFat),
            totalWaterL,
            cardioSessions,
            totalCardioMin: Math.round(totalCardioMin),
            avgSleep,
            sleepDays,
            workoutDays,
            currentXP,
            currentLevel,
          },
        });

        // ─── Send email ───────────────────────────────────────────
        await resend.emails.send({
          from: `FORJA <${fromEmail}>`,
          to: [email],
          subject,
          html,
        });

        results.push({ userId, status: "sent" });
      } catch (userErr: any) {
        console.error(`Error processing user ${userId}:`, userErr);
        results.push({ userId, status: `error: ${userErr.message}` });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error("Cron weekly-summary error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── Email HTML Builder ──────────────────────────────────────────────────
interface WeeklyEmailData {
  name: string;
  appUrl: string;
  stats: {
    totalCalories: number;
    avgCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalWaterL: string;
    cardioSessions: number;
    totalCardioMin: number;
    avgSleep: string;
    sleepDays: number;
    workoutDays: number;
    currentXP: number;
    currentLevel: number;
  };
}

function buildWeeklyEmailHTML({ name, appUrl, stats }: WeeklyEmailData): string {
  return `
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
            Resumen Semanal
          </p>
        </div>

        <!-- Greeting Card -->
        <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:16px;padding:32px;margin-bottom:16px;">
          <p style="color:#09fad3;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin:0 0 12px 0;font-weight:700;">
            Semana completada
          </p>
          <h2 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px 0;line-height:1.3;">
            ${name}, aquí está tu progreso.
          </h2>
          <p style="color:#666;font-size:14px;margin:0;line-height:1.6;">
            Datos recopilados durante los últimos 7 días de actividad en FORJA.
          </p>
        </div>

        <!-- XP & Level -->
        <div style="background:linear-gradient(135deg,#0a0a0a,#111);border:1px solid #1a1a1a;border-radius:16px;padding:24px 32px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <p style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px 0;">Nivel Actual</p>
            <p style="color:#fff;font-size:36px;font-weight:900;margin:0;">${stats.currentLevel}</p>
          </div>
          <div style="text-align:right;">
            <p style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px 0;">XP Total</p>
            <p style="color:#09fad3;font-size:28px;font-weight:900;margin:0;">${stats.currentXP.toLocaleString()}</p>
          </div>
        </div>

        <!-- Main Stats Grid -->
        <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:16px;padding:32px;margin-bottom:16px;">
          <p style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:3px;margin:0 0 20px 0;font-weight:600;">
            Actividad de la semana
          </p>
          
          <!-- Row 1 -->
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="flex:1;background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:20px 16px;text-align:center;">
              <div style="font-size:14px;margin-bottom:6px;">🏋️</div>
              <div style="color:#fff;font-size:28px;font-weight:900;">${stats.workoutDays}</div>
              <div style="color:#666;font-size:9px;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Entrenamientos</div>
            </div>
            <div style="flex:1;background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:20px 16px;text-align:center;">
              <div style="font-size:14px;margin-bottom:6px;">🔥</div>
              <div style="color:#fff;font-size:28px;font-weight:900;">${stats.avgCalories}</div>
              <div style="color:#666;font-size:9px;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Cal/Día Prom</div>
            </div>
            <div style="flex:1;background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:20px 16px;text-align:center;">
              <div style="font-size:14px;margin-bottom:6px;">💧</div>
              <div style="color:#fff;font-size:28px;font-weight:900;">${stats.totalWaterL}</div>
              <div style="color:#666;font-size:9px;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Litros Total</div>
            </div>
          </div>

          <!-- Row 2 -->
          <div style="display:flex;gap:12px;">
            <div style="flex:1;background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:20px 16px;text-align:center;">
              <div style="font-size:14px;margin-bottom:6px;">🏃</div>
              <div style="color:#fff;font-size:28px;font-weight:900;">${stats.cardioSessions}</div>
              <div style="color:#666;font-size:9px;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Cardio</div>
            </div>
            <div style="flex:1;background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:20px 16px;text-align:center;">
              <div style="font-size:14px;margin-bottom:6px;">😴</div>
              <div style="color:#fff;font-size:28px;font-weight:900;">${stats.avgSleep}h</div>
              <div style="color:#666;font-size:9px;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Sueño Prom</div>
            </div>
            <div style="flex:1;background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:20px 16px;text-align:center;">
              <div style="font-size:14px;margin-bottom:6px;">⏱️</div>
              <div style="color:#fff;font-size:28px;font-weight:900;">${stats.totalCardioMin}</div>
              <div style="color:#666;font-size:9px;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Min Cardio</div>
            </div>
          </div>
        </div>

        <!-- Macros Breakdown -->
        <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:16px;padding:32px;margin-bottom:16px;">
          <p style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:3px;margin:0 0 20px 0;font-weight:600;">
            Macronutrientes totales
          </p>
          
          <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="color:#999;font-size:13px;">Proteína</span>
              <span style="color:#fff;font-size:13px;font-weight:700;">${stats.totalProtein}g</span>
            </div>
            <div style="background:#1a1a1a;border-radius:8px;height:8px;overflow:hidden;">
              <div style="background:#09fad3;height:100%;border-radius:8px;width:${Math.min(100, (stats.totalProtein / (150 * 7)) * 100)}%;"></div>
            </div>
          </div>
          
          <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="color:#999;font-size:13px;">Carbohidratos</span>
              <span style="color:#fff;font-size:13px;font-weight:700;">${stats.totalCarbs}g</span>
            </div>
            <div style="background:#1a1a1a;border-radius:8px;height:8px;overflow:hidden;">
              <div style="background:#3b82f6;height:100%;border-radius:8px;width:${Math.min(100, (stats.totalCarbs / (250 * 7)) * 100)}%;"></div>
            </div>
          </div>
          
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="color:#999;font-size:13px;">Grasa</span>
              <span style="color:#fff;font-size:13px;font-weight:700;">${stats.totalFat}g</span>
            </div>
            <div style="background:#1a1a1a;border-radius:8px;height:8px;overflow:hidden;">
              <div style="background:#f59e0b;height:100%;border-radius:8px;width:${Math.min(100, (stats.totalFat / (70 * 7)) * 100)}%;"></div>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:16px;padding:32px;margin-bottom:24px;text-align:center;">
          <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
            Sigue así. Cada registro te acerca más a tu mejor versión.
          </p>
          <a href="${appUrl}/dashboard/home" style="display:inline-block;background:#ffffff;color:#050505;padding:16px 48px;border-radius:12px;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:2px;">
            Ir a Mi Dashboard →
          </a>
        </div>

        <!-- Footer -->
        <div style="text-align:center;padding:16px 0;">
          <p style="color:#333;font-size:11px;margin:0;">
            Este email fue enviado automáticamente por FORJA cada lunes.
          </p>
          <p style="color:#333;font-size:11px;margin:4px 0 0 0;">
            ${appUrl}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
