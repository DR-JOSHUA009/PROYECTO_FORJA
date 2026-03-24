"use client";

import React from "react";
import { type LucideIcon } from "lucide-react";

interface Icon3DProps {
  icon: LucideIcon;
  color?: string;
  size?: number | string;
  className?: string;
}

export const Icon3D = ({ icon: Icon, color = "white", size = 24, className = "" }: Icon3DProps) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Dynamic Filter for Depth */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="premium-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
            <feOffset in="blur" dx="0" dy="2" result="offsetBlur" />
            <feSpecularLighting in="blur" surfaceScale="5" specularConstant=".75" specularExponent="20" lightingColor="#ffffff" result="specular">
              <fePointLight x="-50" y="-100" z="200" />
            </feSpecularLighting>
            <feComposite in="specular" in2="SourceAlpha" operator="in" result="specular" />
            <feComposite in="SourceGraphic" in2="specular" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
        </defs>
      </svg>
      
      {/* Shadow layer */}
      <Icon 
        className="absolute inset-0 opacity-40 blur-[2px] translate-y-[2px]" 
        size={size} 
        style={{ color: "black" }} 
      />
      
      {/* Highlight layer */}
      <Icon 
        className="absolute inset-0 opacity-20 -translate-x-[0.5px] -translate-y-[0.5px]" 
        size={size} 
        style={{ color: "white" }} 
      />
      
      {/* Main icon with custom filter */}
      <Icon 
        className="absolute inset-0 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]" 
        size={size} 
        style={{ color, filter: "url(#premium-shadow)" }} 
      />
    </div>
  );
};
