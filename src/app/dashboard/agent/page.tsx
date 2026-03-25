"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, ExternalLink, Check, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Icon3D } from "@/components/ui/Icon3D";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ConfirmCard({ data, onConfirm }: { data: any, onConfirm: () => void }) {
  const [applied, setApplied] = useState(false);
  
  return (
    <div className="mt-4 p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4 shadow-2xl relative overflow-hidden group">
      <div className="flex items-center justify-between mb-2">
         <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em]">Propuesta de Ajuste • {data.tool === 'routine' ? 'Gimnasio' : 'Nutrición'}</span>
         <div className="flex gap-2">
            {!applied && (
              <button 
                onClick={() => { setApplied(true); onConfirm(); }}
                className="p-2 rounded-lg bg-white text-black hover:scale-105 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
         </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div className="flex flex-col gap-2 opacity-50">
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest text-center">Estado Actual</span>
            <div className="flex flex-col gap-1">
               {data.before?.length > 0 ? data.before.map((ex: any, i: number) => (
                 <div key={i} className="text-[11px] text-white/60 bg-white/5 p-2 rounded-lg border border-white/5 truncate">
                   {ex.name}
                 </div>
               )) : <div className="text-[11px] text-center text-white/20 py-2 italic font-mono">Vacío</div>}
            </div>
         </div>
         <div className="flex flex-col gap-2">
            <span className="text-[9px] font-mono text-primary uppercase tracking-widest text-center">Propuesta IA</span>
            <div className="flex flex-col gap-1">
               {data.after.map((ex: any, i: number) => (
                 <div key={i} className="text-[11px] text-white bg-primary/10 p-2 rounded-lg border border-primary/20 flex items-center justify-between group-hover:border-primary/40 transition-colors">
                   <span className="truncate">{ex.name}</span>
                   <ArrowRight className="w-3 h-3 text-primary shrink-0 ml-1" />
                 </div>
               ))}
            </div>
         </div>
      </div>

      {applied && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center gap-2 z-10"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
             <Check className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-bold text-white">Sincronizado</span>
        </motion.div>
      )}
    </div>
  );
}

function ChatContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt");
  const [messages, setMessages] = useState<{ role: "agent" | "user", content: string, action?: any, confirm?: any }[]>([]);
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
      
      setMessages(prev => [...prev, { role: "agent", content: "" }]);

      while (true) {
        const { done, value } = await reader?.read() || { done: true, value: undefined };
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
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
            } else if (meta.act_type === "confirmation_request") {
              setMessages(prev => {
                const newMsgs = [...prev];
                const last = newMsgs[newMsgs.length - 1];
                last.confirm = meta;
                return newMsgs;
              });
            }
          } catch (e) { console.error("Metadata parse error", e); }
        } else {
          accumulatedContent += chunk;
        }

        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = accumulatedContent;
          return newMsgs;
        });
      }
    } catch (err) {
      toast("Error de conexión con el agente", "error");
      setMessages(prev => [...prev, { role: "agent", content: "Lo siento, perdí la conexión con el servidor maestro." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleApplyChange = async (confirmData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (confirmData.tool === 'routine') {
      await supabase.from("routines").upsert({
        user_id: user.id,
        day_of_week: confirmData.day_of_week,
        exercises: confirmData.after
      }, { onConflict: 'user_id,day_of_week' });
    } else if (confirmData.tool === 'diet') {
      await supabase.from("diet_plans").upsert({
        user_id: user.id,
        meal_type: confirmData.meal_type,
        foods: confirmData.after
      }, { onConflict: 'user_id,meal_type' });
    }
    toast("Plan actualizado correctamente ⚡", "success");
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
    streamMessage(newMessages.slice(-10));
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
          <p className="text-[10px] text-text-muted mt-1 tracking-widest font-mono uppercase">Interfaz Neural • Master Agent</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
           <span className="text-[10px] text-emerald-500 font-mono font-bold tracking-widest">STREAM ACTIVE</span>
        </div>
      </header>

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
                msg.role === "agent" ? "border-white/10 bg-white/5" : "border-black bg-white"
              }`}>
                {msg.role === "agent" ? <Icon3D icon={Bot} size={24} color="white" /> : <User className="w-5 h-5 text-black" />}
              </div>
              
              <div className={`p-6 rounded-3xl flex flex-col justify-center text-[15px] leading-relaxed relative ${
                msg.role === "agent" ? "bg-white/5 text-white/90 border border-white/5 rounded-tl-none" : "bg-white text-black rounded-tr-none font-bold"
              }`}>
                <div className="whitespace-pre-wrap font-sans tracking-tight">{msg.content}</div>
                
                {msg.confirm && (
                  <ConfirmCard 
                    data={msg.confirm} 
                    onConfirm={() => handleApplyChange(msg.confirm)} 
                  />
                )}

                {msg.action && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-white/5">
                    <Link href={msg.action.href} className="flex items-center gap-3 px-6 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all w-fit shadow-[0_0_30px_rgba(255,255,255,0.1)] group">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-[85%] mr-auto">
             <div className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center border bg-white/5 border-white/10">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} className="h-4 bg-transparent" />
      </div>

      <div className="fixed bottom-[80px] md:bottom-6 left-0 right-0 p-4 md:p-0 z-40 bg-gradient-to-t from-[#050505] to-transparent">
        <form onSubmit={handleSend} className="relative max-w-4xl mx-auto w-full group">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Ej: Ajusta mi rutina de mañana..."
            className="w-full h-16 bg-[#0a0a0a] border border-white/10 focus:border-white/40 focus:bg-white/5 rounded-3xl px-8 pr-16 text-white outline-none transition-all placeholder:text-text-muted disabled:opacity-50 text-sm shadow-2xl"
          />
          <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-black rounded-2xl flex items-center justify-center hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl">
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

