"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        textAlign: "center",
        background: "#000",
      }}
    >
      {/* Pulsing icon */}
      <div
        style={{
          marginBottom: "2rem",
          animation: "pulse-glow 3s ease-in-out infinite",
        }}
      >
        <WifiOff
          size={72}
          strokeWidth={1.2}
          style={{ color: "rgba(255, 255, 255, 0.3)" }}
        />
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#fff",
          margin: "0 0 1rem 0",
          fontFamily: "var(--font-geist-sans), sans-serif",
        }}
      >
        Conexión interrumpida
      </h1>

      {/* Decorative line */}
      <div
        style={{
          width: "48px",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
          marginBottom: "1.5rem",
        }}
      />

      {/* Message */}
      <p
        style={{
          fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
          lineHeight: 1.7,
          color: "rgba(255, 255, 255, 0.5)",
          maxWidth: "360px",
          margin: "0 0 2.5rem 0",
          fontFamily: "var(--font-geist-sans), sans-serif",
        }}
      >
        El monolito sigue en pie, pero necesitamos señal para sincronizar tu
        progreso. Forja tu disciplina mientras vuelves.
      </p>

      {/* Retry button */}
      <button
        onClick={() => window.location.reload()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 2rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#000",
          background: "#fff",
          border: "none",
          borderRadius: "0",
          cursor: "pointer",
          fontFamily: "var(--font-geist-sans), sans-serif",
          transition: "opacity 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        <RefreshCw size={16} strokeWidth={2} />
        Reintentar
      </button>

      {/* CSS animation */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }
      `}</style>
    </div>
  );
}
