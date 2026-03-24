import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#050505] border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-2xl font-bold tracking-tighter text-white">
            FORJA
          </Link>
          <span className="text-xs text-text-muted uppercase tracking-widest font-mono">
            Optimización Estructural Humana
          </span>
        </div>
        
        <div className="flex items-center gap-8 text-sm font-medium text-text-secondary">
          <Link href="#" className="hover:text-white transition-colors">Términos del Sistema</Link>
          <Link href="#" className="hover:text-white transition-colors">Privacidad de Datos</Link>
          <Link href="#" className="hover:text-white transition-colors">Contacto Técnico</Link>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex justify-between items-center text-xs text-[#333]">
        <p>© {new Date().getFullYear()} FORJA Inc. Todos los derechos monitoreados.</p>
        <p>Powered by LLM-70B & supabase.</p>
      </div>
    </footer>
  );
}
