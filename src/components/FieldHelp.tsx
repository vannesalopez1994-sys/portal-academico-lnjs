import React, { useState } from 'react';

interface FieldHelpProps {
  /** El elemento input, select o textarea que se va a envolver */
  children: React.ReactElement;
  /** Texto breve de qué debe escribir el usuario */
  hint: string;
  /** Ejemplo concreto a mostrar */
  example?: string;
  /**
   * Mantenido por compatibilidad con código existente.
   * Ya no afecta el posicionamiento (siempre se muestra inline debajo).
   */
  position?: 'right' | 'bottom';
}

/**
 * FieldHelp – Contenedor que envuelve un input y muestra una ayuda inline
 * animada justo debajo del campo cuando éste recibe el foco.
 *
 * Ventajas respecto al tooltip flotante anterior:
 *  - No tapa campos inferiores (es parte del flujo del documento).
 *  - No se queda "pegado" en móvil (eliminamos el hover que no funciona en touch).
 *  - Desaparece automáticamente cuando el usuario pasa al siguiente campo.
 */
export const FieldHelp: React.FC<FieldHelpProps> = ({ children, hint, example }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className="w-full"
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={() => setIsFocused(false)}
    >
      {/* Campo original (input, select o textarea) */}
      {children}

      {/* Ayuda inline — aparece con animación debajo del campo al hacer foco */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isFocused
            ? 'max-h-32 opacity-100 mt-2 mb-1'
            : 'max-h-0 opacity-0 mt-0 mb-0'
        }`}
      >
        <div className="bg-blue-50/90 border border-blue-100 rounded-xl px-3 py-2.5 shadow-sm">
          <p className="text-xs font-semibold text-slate-700 leading-relaxed">{hint}</p>

          {example && (
            <div className="mt-1.5 bg-white/80 border border-blue-100 rounded-lg px-2.5 py-1.5">
              <span className="text-[9px] uppercase tracking-wider text-blue-500 font-bold block mb-0.5">
                Ejemplo:
              </span>
              <p className="text-xs text-blue-900 font-mono leading-tight">{example}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
