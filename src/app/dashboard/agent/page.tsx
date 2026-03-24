"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Icon3D } from "@/components/ui/Icon3D";
import Link from "next/link";

import { useSearchParams } from "next/navigation";

function TypewriterText({ text, onComplete }: { text: string, onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, 15);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, onComplete]);

  return <>{displayedText}</>;
}

import { Suspense } from "react";

function ChatContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt");
  const [messages, setMessages] = useState<{ role: "agent" | "user", content: string, action?: any }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("agent_conversations")
        .select("role, content, tool_used")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setMessages(data.map(m => ({
          role: m.role === "assistant" ? "agent" : "user",
          content: m.content
        })));
      } else {
        setMessages([
          { role: "agent", content: "¡Hola! Soy FORJA. Estoy sincronizado con tu perfil y metas. ¿En qué puedo ayudarte hoy?" }
        ]);
      }
      setLoadingHistory(false);
    }
    loadHistory();
  }, [supabase]);

  const processedRef = useRef(false);

  // Separate effect for initial prompt to ensure it can trigger even with history
  useEffect(() => {
    if (initialPrompt && !loadingHistory && !processedRef.current) {
      processedRef.current = true;
      const timer = setTimeout(() => {
        executePrompt(initialPrompt);
        // Clear prompt from URL to avoid re-triggering
        const url = new URL(window.location.href);
        url.searchParams.delete("prompt");
        window.history.replaceState({}, '', url.pathname);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt, loadingHistory]);

  const executePrompt = async (text: string) => {
    const userMsg = { role: "user" as const, content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [userMsg] })
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { 
          role: "agent", 
          content: data.reply,
          action: data.act_type === "navigation" ? { href: data.section_href, label: data.btn_label } : null
        }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user" as const, content: input }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { 
          role: "agent", 
          content: data.reply,
          action: data.act_type === "navigation" ? { href: data.section_href, label: data.btn_label } : null
        }]);
        if (data.act_type === "tool_called") {
          toast("FORJA ha modificado tu plan en tiempo real ⚡", "success");
        }
      } else {
        toast("Error al procesar la orden", "error");
        setMessages(prev => [...prev, { role: "agent", content: "Error: " + (data.error || "No pude procesar la orden.") }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "agent", content: "Error de conexión con el agente." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen md:h-full p-6 md:p-10 w-full max-w-4xl mx-auto">
      <header className="mb-6 flex justify-between items-center bg-[#050505] p-4 rounded-2xl border border-white/5 shadow-2xl z-10 sticky top-0 md:static">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Entrenador IA 
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full uppercase tracking-widest font-mono border border-primary/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" /> Activo
            </span>
          </h1>
          <p className="text-xs text-text-secondary mt-1 tracking-widest font-mono uppercase">Master Agent v1.0</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse" />
           <span className="text-[10px] text-emerald-500/80 font-mono font-bold tracking-[0.1em]">LIVE</span>
        </div>
      </header>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-6 scrollbar-hide pb-32 md:pb-6">
        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
          >
            <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center border shadow-xl overflow-hidden glass ${
              msg.role === "agent" 
                ? "border-white/20 bg-white/5" 
                : "border-white/20 bg-white"
            }`}>
              {msg.role === "agent" ? <Icon3D icon={Bot} size={24} color="white" /> : <User className="w-5 h-5 text-background" />}
            </div>
            
            <div className={`p-5 rounded-2xl flex flex-col justify-center text-[15px] leading-relaxed tracking-wide ${
              msg.role === "agent" 
                ? "bg-white/5 text-white/90 border border-white/10 rounded-tl-none shadow-[0_10px_40px_rgba(0,0,0,0.6)]" 
                : "bg-white text-background rounded-tr-none shadow-[0_10px_40px_rgba(255,255,255,0.05)] font-medium"
            }`}>
              <div className="whitespace-pre-wrap">
                {msg.role === "agent" && i === messages.length - 1 && !loadingHistory ? (
                  <TypewriterText text={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
              
              {msg.action && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <Link 
                    href={msg.action.href}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-background rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all w-fit shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {msg.action.label}
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex gap-4 max-w-[85%] mr-auto"
          >
             <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center border bg-white text-background border-white">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none flex gap-2 items-center">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} className="h-1 bg-transparent" />
      </div>

      {/* INPUT AREA */}
      <div className="fixed bottom-[80px] md:bottom-auto left-0 md:left-auto w-full md:relative bg-[#050505] md:bg-transparent p-4 md:p-0 md:mt-4 border-t border-white/5 md:border-none z-40">
        <form onSubmit={handleSend} className="relative max-w-4xl mx-auto w-full">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Ej: Dame acceso al gym..."
            className="w-full h-14 bg-[#0a0a0a] border border-white/10 focus:border-white focus:bg-white/5 rounded-2xl px-6 pr-16 text-white outline-none transition-all placeholder:text-text-muted disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-background rounded-xl flex items-center justify-center hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AgentChat() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-white/50">Cargando Forja IA...</div>}>
      <ChatContent />
    </Suspense>
  );
}

