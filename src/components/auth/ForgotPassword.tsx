import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Validar si el correo existe en la base de datos (tabla usuarios)
      const { data: userExist, error: queryError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('correo', email.trim().toLowerCase())
        .maybeSingle();

      if (queryError) {
        throw new Error('Error al verificar el correo en el sistema');
      }

      if (!userExist) {
        throw new Error('El correo ingresado no coincide con ningún usuario');
      }

      // 2. Si existe, procesar el envío del correo de recuperación
      await resetPassword(email);
      setSuccess(true);
    } // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
      setError(err.message || 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-md">
        
        {/* Tarjeta de Cristal (Glassmorphism) */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl p-8">
          
          {/* Botón Volver */}
          <button
            onClick={onBack}
            className="flex items-center text-blue-200/80 hover:text-white mb-6 transition text-xs font-semibold uppercase tracking-wider gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>

          {/* Sección Superior: Insignia y Mensaje */}
          <div className="text-center mb-0">
            <img 
              src="/logo_liceo.jpg.jpeg" 
              alt="Liceo Nacional Joaquina Sánchez" 
              className="w-24 h-24 mx-auto object-contain mb-4 filter drop-shadow-lg"
            />
            <h2 className="text-white text-base sm:text-lg font-bold uppercase tracking-wider leading-snug">
              Recuperar Acceso al Sistema
            </h2>
            <p className="text-blue-200/80 text-xs mt-1.5">
              Introduce tu correo electrónico registrado para restablecer tu contraseña
            </p>
          </div>

          {/* Alertas de Error */}
          {error && (
            <div className="p-3.5 bg-red-950/50 border border-red-500/30 rounded-xl flex items-start gap-2.5 mb-4 animate-shake mt-4">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-200 leading-normal">{error}</p>
            </div>
          )}

          {/* Alertas de Éxito */}
          {success && (
            <div className="p-4 bg-green-950/50 border border-green-500/30 rounded-xl flex flex-col gap-2 mb-4 mt-4">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-bold text-green-200 uppercase tracking-wider mt-0.5">¡Correo enviado!</p>
              </div>
              <p className="text-xs text-green-100/90 leading-relaxed pl-7">
                Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
              </p>
            </div>
          )}

          {/* Sub-tarjeta Interna de Contraste para el Formulario */}
          <div className="bg-slate-950/35 border border-white/10 rounded-2xl p-6 mt-4">
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="email" className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block pl-1">
                    Correo Electrónico
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4 stroke-[2]" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white text-slate-950 placeholder-slate-400 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                      placeholder="correo@ejemplo.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl transition-all font-bold text-xs tracking-wider uppercase shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] mt-2"
                >
                  {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                </button>
              </form>
            ) : (
              <button
                onClick={onBack}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl transition-all font-bold text-xs tracking-wider uppercase shadow-md transform active:scale-[0.98]"
              >
                Volver al Inicio de Sesión
              </button>
            )}
          </div>
        </div>

        {/* Versión y Crédito al pie */}
        <p className="text-center text-white/35 text-[10px] mt-6 tracking-wide select-none">
          Versión 2.1 | L.N. Joaquina Sánchez
        </p>
      </div>
    </div>
  );
};
