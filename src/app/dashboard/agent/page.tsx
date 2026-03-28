"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, ExternalLink, Check, X, ArrowRight, Lock, Crown, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Icon3D } from "@/components/ui/Icon3D";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Simple markdown renderer for agent messages
function RenderMarkdown({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableLines: string[] = [];
  let inTable = false;

  const processInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Bold-italic
      const boldItalicMatch = remaining.match(/\*\*\*(.*?)\*\*\*/);
      // Bold
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      // Italic  
      const italicMatch = remaining.match(/\*(.*?)\*/);
      // Inline code
      const codeMatch = remaining.match(/`([^`]+)`/);
      // Emoji shorthand already renders as-is

      let firstMatch: { index: number; length: number; node: React.ReactNode } | null = null;
      const updateMatch = (candidate: { index: number; length: number; node: React.ReactNode }) => {
        if (!firstMatch || candidate.index < firstMatch.index) firstMatch = candidate;
      };

      if (boldItalicMatch && boldItalicMatch.index !== undefined) {
        updateMatch({ index: boldItalicMatch.index, length: boldItalicMatch[0].length, node: <strong key={`bi-${keyIdx++}`} className="font-black italic text-white">{boldItalicMatch[1]}</strong> });
      }
      if (boldMatch && boldMatch.index !== undefined) {
        updateMatch({ index: boldMatch.index, length: boldMatch[0].length, node: <strong key={`b-${keyIdx++}`} className="font-bold text-white">{boldMatch[1]}</strong> });
      }
      if (italicMatch && italicMatch.index !== undefined && (!boldMatch || italicMatch.index !== boldMatch.index)) {
        updateMatch({ index: italicMatch.index, length: italicMatch[0].length, node: <em key={`i-${keyIdx++}`} className="italic text-white/80">{italicMatch[1]}</em> });
      }
      if (codeMatch && codeMatch.index !== undefined) {
        updateMatch({ index: codeMatch.index, length: codeMatch[0].length, node: <code key={`c-${keyIdx++}`} className="px-1.5 py-0.5 bg-white/10 rounded text-primary text-xs font-mono">{codeMatch[1]}</code> });
      }

      const match = firstMatch as { index: number; length: number; node: React.ReactNode } | null;
      if (match) {
        if (match.index > 0) {
          parts.push(remaining.substring(0, match.index));
        }
        parts.push(match.node);
        remaining = remaining.substring(match.index + match.length);
      } else {
        parts.push(remaining);
        break;
      }
    }
    return parts;
  };

  const flushTable = () => {
    if (tableLines.length < 2) return;
    const headers = tableLines[0].split('|').filter(c => c.trim());
    const rows = tableLines.slice(2).map(r => r.split('|').filter(c => c.trim())); // skip separator line
    
    elements.push(
      <div key={`table-${elements.length}`} className="overflow-x-auto my-3">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              {headers.map((h, i) => (
                <th key={i} className="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-text-muted font-mono">{processInline(h.trim())}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-white/80">{processInline(cell.trim())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table detection
    if (trimmed.includes('|') && trimmed.startsWith('|')) {
      inTable = true;
      tableLines.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable();
      inTable = false;
    }

    // Empty line
    if (!trimmed) {
      elements.push(<div key={`s-${i}`} className="h-2" />);
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-sm font-black text-white mt-4 mb-2 uppercase tracking-wider">{processInline(trimmed.slice(4))}</h4>);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-base font-black text-white mt-4 mb-2">{processInline(trimmed.slice(3))}</h3>);
      continue;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={i} className="border-white/10 my-3" />);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <div key={i} className="border-l-2 border-primary/40 pl-4 py-1 my-2 bg-primary/5 rounded-r-lg">
          <span className="text-sm text-white/90">{processInline(trimmed.slice(2))}</span>
        </div>
      );
      continue;
    }

    // List items
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2);
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2 my-0.5">
          <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-sm text-white/90">{processInline(content)}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    const numberedMatch = trimmed.match(/^(\d+)\)\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2 my-1">
          <span className="text-xs font-mono text-primary font-bold mt-0.5 shrink-0">{numberedMatch[1]}.</span>
          <span className="text-sm text-white/90">{processInline(numberedMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(<p key={i} className="text-sm text-white/90 leading-relaxed">{processInline(trimmed)}</p>);
  }

  // flush any remaining table
  if (inTable) flushTable();

  return <div className="flex flex-col gap-0.5">{elements}</div>;
}

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
  const [limitReached, setLimitReached] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [userPlan, setUserPlan] = useState<string>("free");
  const FREE_LIMIT = 10;
  
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

    // Cargar conteo diario de mensajes
    async function loadDailyCount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pData } = await supabase.from("users_profile").select("plan").eq("user_id", user.id).single();
      if (pData?.plan) setUserPlan(pData.plan);

      const todayStr = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from("agent_conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "user")
        .gte("created_at", `${todayStr}T00:00:00.000Z`);
        
      const currentCount = count || 0;
      setDailyCount(currentCount);

      if (currentCount >= FREE_LIMIT && pData?.plan !== 'pro') {
        setLimitReached(true);
      }
    }
    loadDailyCount();
  }, [supabase]);

  const streamMessage = async (msgs: any[]) => {
    setIsTyping(true);
    
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs })
      });

      if (response.status === 429) {
        const errorData = await response.json();
        setLimitReached(true);
        setDailyCount(errorData.used || FREE_LIMIT);
        return;
      }

      if (!response.ok) {
        let errStr = "Error en la conexión";
        try {
           const errJson = await response.json();
           if (errJson.error) errStr = errJson.error;
        } catch(e) {}
        throw new Error(errStr);
      }

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
    } catch (err: any) {
      toast("Fallo del servidor", "error");
      setMessages(prev => {
        const msgs = [...prev];
        if (msgs.length > 0 && msgs[msgs.length - 1].role === "agent" && !msgs[msgs.length - 1].content) {
             msgs[msgs.length - 1].content = `🛑 ALERTA (Dile al técnico): ${err.message}`;
        } else {
             msgs.push({ role: "agent", content: `🛑 ALERTA (Dile al técnico): ${err.message}` });
        }
        return msgs;
      });
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
    setDailyCount(prev => prev + 1);
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
        <div className="flex items-center gap-3">
          {userPlan === 'pro' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
              <span className="text-yellow-400 font-bold text-[10px] tracking-widest uppercase">💎 Ilimitado</span>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-full border shadow-sm ${dailyCount >= FREE_LIMIT ? 'border-red-500/30 text-red-400' : 'border-white/10 text-text-secondary'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${dailyCount >= FREE_LIMIT ? 'bg-red-500 animate-pulse' : 'bg-primary'}`} />
              <span className="text-[10px] font-mono tracking-widest font-bold">
                MSG <span className={dailyCount >= FREE_LIMIT ? 'text-red-400' : 'text-white'}>{Math.max(0, FREE_LIMIT - dailyCount)}</span>/{FREE_LIMIT}
              </span>
            </div>
          )}
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
                {msg.role === "agent" ? (
                  <RenderMarkdown content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap font-sans tracking-tight">{msg.content}</div>
                )}
                
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

      {/* INPUT AREA OR LIMIT BLOCK */}
      {limitReached ? (
        <div className="fixed bottom-[80px] md:bottom-6 left-0 right-0 p-4 md:p-0 z-40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto w-full"
          >
            <div className="glass rounded-3xl border border-yellow-500/20 p-8 text-center relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-yellow-500/5 rounded-full blur-[80px]" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/5 rounded-full blur-[60px]" />
              
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block mb-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
                  <Crown className="w-8 h-8 text-yellow-400" />
                </div>
              </motion.div>
              
              <h3 className="text-xl font-black text-white mb-2">Límite Diario Alcanzado</h3>
              <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
                Has usado tus <span className="text-white font-bold">{FREE_LIMIT} mensajes</span> gratuitos de hoy.
                Actualiza a <span className="text-yellow-400 font-bold">FORJA PRO</span> para conversaciones ilimitadas.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
                {[
                  { icon: Zap, text: "Mensajes ilimitados" },
                  { icon: Sparkles, text: "Modelos IA avanzados" },
                  { icon: Lock, text: "Stats Pro exclusivos" },
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-text-secondary bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                    <feat.icon className="w-3 h-3 text-yellow-400" />
                    {feat.text}
                  </div>
                ))}
              </div>

              <button className="h-14 px-10 rounded-2xl bg-linear-to-r from-yellow-500 to-orange-500 text-background font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:scale-105 active:scale-95 transition-all">
                Activar FORJA PRO
              </button>
              
              <p className="text-[10px] text-text-muted mt-4 font-mono uppercase tracking-widest">
                Tus mensajes se restauran a medianoche
              </p>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="fixed bottom-[80px] md:bottom-6 left-0 right-0 p-4 md:p-0 z-40 bg-linear-to-t from-[#050505] to-transparent">
          <form onSubmit={handleSend} className="relative max-w-4xl mx-auto w-full group">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              placeholder="Ej: Ajusta mi rutina de mañana..."
              className="w-full h-16 bg-background border border-white/10 focus:border-white/40 focus:bg-white/5 rounded-3xl px-8 pr-16 text-white outline-none transition-all placeholder:text-text-muted disabled:opacity-50 text-sm shadow-2xl"
            />
            <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-black rounded-2xl flex items-center justify-center hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl">
              <Send className="w-4 h-4" />
            </button>
          </form>
          {userPlan !== 'pro' && (
            <p className="text-center text-[10px] text-white/30 font-mono tracking-widest mt-3">
              MODO BÁSICO: <span className="text-yellow-500/50">EDICIÓN DE RUTINAS DESACTIVADA</span>
            </p>
          )}
        </div>
      )}
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

