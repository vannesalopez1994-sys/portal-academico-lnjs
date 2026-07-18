import React, { useState } from 'react';

interface FieldHelpProps {
  /** El elemento input, select o textarea que se va a envolver */
  children: React.ReactElement;
  /** Texto breve de qué debe escribir el usuario */
  hint: string;
  /** Ejemplo concreto a mostrar */
  example?: string;
  /** Posición preferida en escritorio: 'right' (lado derecho) o 'bottom' (abajo) */
  position?: 'right' | 'bottom';
}

/**
 * FieldHelp – Contenedor (wrapper) que envuelve un input y muestra un globo
 * de ayuda tipo burbuja emergente cuando el campo recibe focus o hover.
 * Cuenta con un diseño adaptativo que en móviles siempre se muestra abajo.
 */
export const FieldHelp: React.FC<FieldHelpProps> = ({ children, hint, example, position = 'right' }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const show = isFocused || isHovered;

  return (
    <div 
      className="relative w-full"
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={() => setIsFocused(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {show && (
        <div 
          className={`
            absolute z-[99] w-64 pointer-events-none
            bg-[#eef2ff] border border-blue-200 rounded-2xl p-3.5 shadow-xl
            text-slate-800 text-xs font-sans leading-relaxed
            animate-in fade-in slide-in-from-top-1 duration-200
            ${position === 'bottom' 
              ? 'top-full left-0 mt-2.5' 
              : 'md:left-full md:top-1/2 md:-translate-y-1/2 md:ml-3.5 md:right-auto md:bottom-auto top-full left-0 mt-2.5'
            }
          `}
        >
          {/* Triángulo/Flecha apuntadora */}
          <div 
            className={`
              absolute w-2.5 h-2.5 bg-[#eef2ff] border-blue-200 rotate-45
              ${position === 'bottom' 
                ? '-top-[6px] left-6 border-t border-l' 
                : 'md:-left-[6px] md:top-1/2 md:-translate-y-1/2 md:border-b md:border-l md:border-t-0 md:border-r-0 -top-[6px] left-6 border-t border-l'
              }
            `}
          />
          
          {/* Contenido */}
          <p className="font-semibold text-slate-700">{hint}</p>
          
          {example && (
            <div className="mt-2 bg-white/70 border border-blue-100 rounded-xl px-2.5 py-1.5 shadow-sm">
              <span className="text-[9px] uppercase tracking-wider text-blue-600 font-bold block mb-0.5">
                Ejemplo:
              </span>
              <p className="text-xs text-blue-900 font-mono leading-tight">
                {example}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
