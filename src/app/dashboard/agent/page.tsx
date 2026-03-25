"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Icon3D } from "@/components/ui/Icon3D";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
        .select("role, content")
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

  useEffect(() => {
    if (initialPrompt && !loadingHistory && !processedRef.current) {
      processedRef.current = true;
      const timer = setTimeout(() => {
        executePrompt(initialPrompt);
        const url = new URL(window.location.href);
        url.searchParams.delete("prompt");
        window.history.replaceState({}, '', url.pathname);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt, loadingHistory]);

  const streamMessage = async (msgs: any[]) => {
    setIsTyping(true);
    
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs })
      });

      if (!response.ok) throw new Error("Error en la conexión");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      
      // Añadir mensaje vacío del agente para ir llenándolo
      setMessages(prev => [...prev, { role: "agent", content: "" }]);

      while (true) {
        const { done, value } = await reader?.read() || { done: true, value: undefined };
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Detectar Metadatos (al final del stream)
        if (chunk.includes("__METADATA__")) {
          const parts = chunk.split("__METADATA__");
          accumulatedContent += parts[0];
          
          try {
            const meta = JSON.parse(parts[1]);
            if (meta.act_type === "navigation") {
              setMessages(prev => {
                const newMsgs = [...prev];
                const last = newMsgs[newMsgs.length - 1];
                last.action = { href: meta.section === "perfil" ? "/dashboard/profile" : `/dashboard/${meta.section}`, label: meta.label };
                return newMsgs;
              });
            }
          } catch (e) { console.error("Metadata parse error", e); }
        } else {
          accumulatedContent += chunk;
        }

        // Actualizar el último mensaje con el contenido acumulado
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = accumulatedContent;
          return newMsgs;
        });

        // Feedback visual de cambios aplicados
        if (accumulatedContent.includes("✅") && !accumulatedContent.includes("Cargando")) {
           // Podríamos disparar un sonido o efecto pequeño aquí
        }
      }
    } catch (err) {
      toast("Error de conexión con el agente", "error");
      setMessages(prev => [...prev, { role: "agent", content: "Lo siento, perdí la conexión con el servidor maestro. Inténtalo de nuevo." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const executePrompt = (text: string) => {
    const userMsg = { role: "user" as const, content: text };
    setMessages(prev => [...prev, userMsg]);
    streamMessage([userMsg]);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = { role: "user" as const, content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    
    // Solo enviamos los últimos 10 mensajes para contexto (opcional ahorro de tokens)
    const contextMessages = newMessages.slice(-10);
    streamMessage(contextMessages);
  };

  return (
    <div className="flex flex-col h-screen md:h-full p-4 md:p-10 w-full max-w-4xl mx-auto">
      <header className="mb-6 flex justify-between items-center bg-[#050505]/80 backdrop-blur-xl p-4 rounded-3xl border border-white/5 shadow-2xl z-10 sticky top-0 md:static">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2 italic">
            FORJA <span className="text-primary italic">CORE</span>
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full uppercase tracking-tighter font-mono border border-primary/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" /> SYNC
            </span>
          </h1>
          <p className="text-[10px] text-text-muted mt-1 tracking-widest font-mono uppercase">Interfaz de Red Neural v1.02</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
           <span className="text-[10px] text-emerald-500 font-mono font-bold tracking-widest">STREAM ACTIVE</span>
        </div>
      </header>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-8 scrollbar-hide pb-32 md:pb-6">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={i} 
              className={`flex gap-4 max-w-[90%] md:max-w-[80%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center border shadow-2xl glass ${
                msg.role === "agent" 
                  ? "border-white/10 bg-white/5" 
                  : "border-black bg-white"
              }`}>
                {msg.role === "agent" ? <Icon3D icon={Bot} size={24} color="white" /> : <User className="w-5 h-5 text-black" />}
              </div>
              
              <div className={`p-6 rounded-3xl flex flex-col justify-center text-[15px] leading-relaxed relative ${
                msg.role === "agent" 
                  ? "bg-white/5 text-white/90 border border-white/5 rounded-tl-none" 
                  : "bg-white text-black rounded-tr-none font-bold"
              }`}>
                <div className="whitespace-pre-wrap font-sans tracking-tight">
                  {msg.content}
                </div>
                
                {msg.action && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 pt-6 border-t border-white/5"
                  >
                    <Link 
                      href={msg.action.href}
                      className="flex items-center gap-3 px-6 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all w-fit shadow-[0_0_30px_rgba(255,255,255,0.1)] group"
                    >
                      {msg.action.label}
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && messages[messages.length - 1]?.role === "user" && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex gap-4 max-w-[85%] mr-auto"
          >
             <div className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center border bg-white/5 border-white/10">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
            <div className="bg-white/5 border border-white/5 p-4 rounded-3xl rounded-tl-none flex gap-2 items-center">
               <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest animate-pulse">Sincronizando...</span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} className="h-4 bg-transparent" />
      </div>

      {/* INPUT AREA */}
      <div className="fixed bottom-[80px] md:bottom-6 left-0 right-0 p-4 md:p-0 z-40 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
        <form 
          onSubmit={handleSend} 
          className="relative max-w-4xl mx-auto w-full group"
        >
          <div className="absolute inset-0 bg-white/5 blur-2xl rounded-3xl -z-10 opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Ej: Ajusta mi rutina de mañana..."
            className="w-full h-16 bg-[#0a0a0a] border border-white/10 focus:border-white/40 focus:bg-white/5 rounded-3xl px-8 pr-16 text-white outline-none transition-all placeholder:text-text-muted disabled:opacity-50 text-sm shadow-2xl"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-black rounded-2xl flex items-center justify-center hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-90"
          >
            <Send className="w-4 h-4" />
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

