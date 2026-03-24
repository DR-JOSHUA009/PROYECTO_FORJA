"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export default function PasswordInput({ error, className = "", ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="w-full flex flex-col gap-1.5 focus-within:z-10">
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className={`w-full h-12 bg-[#0e0e0e] text-white border ${
            error ? "border-error focus:border-error" : "border-white/20 focus:border-white"
          } rounded-xl px-4 text-sm outline-none transition-colors pr-12 ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-white transition-colors"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {error && <span className="text-error text-xs ml-1">{error}</span>}
    </div>
  );
}
