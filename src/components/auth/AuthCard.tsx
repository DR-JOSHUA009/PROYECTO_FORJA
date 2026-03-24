import { ReactNode } from "react";
import Link from "next/link";
import { MoveLeft } from "lucide-react";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  backLink?: string;
}

export default function AuthCard({ title, subtitle, children, backLink }: AuthCardProps) {
  return (
    <div className="w-full max-w-md mx-auto relative z-10">
      {backLink && (
        <Link 
          href={backLink} 
          className="absolute -top-12 left-0 text-text-secondary hover:text-white flex items-center gap-2 text-sm transition-colors"
        >
          <MoveLeft className="w-4 h-4" /> 
          Volver
        </Link>
      )}

      <div className="text-center mb-8">
        <Link href="/" className="inline-block text-3xl font-bold tracking-tighter text-white mb-6">
          FORJA
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-text-secondary text-sm">{subtitle}</p>
      </div>

      <div className="glass p-8 rounded-[16px]">
        {children}
      </div>
    </div>
  );
}
