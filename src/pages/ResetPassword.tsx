import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password, token });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-md">
        
        {/* Tarjeta de Cristal (Glassmorphism) */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl p-8">
          
          {/* Sección Superior: Insignia y Mensaje */}
          <div className="text-center mb-0">
            <img 
              src="/logo_liceo.jpg.jpeg" 
              alt="Liceo Nacional Joaquina Sánchez" 
              className="w-24 h-24 mx-auto object-contain mb-4 filter drop-shadow-lg"
            />
            <h2 className="text-white text-base sm:text-lg font-bold uppercase tracking-wider leading-snug">
              Establecer Nueva Contraseña
            </h2>
            <p className="text-blue-200/80 text-xs mt-1.5">
              Ingresa y confirma tu nueva contraseña de acceso
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
                <p className="text-xs font-bold text-green-200 uppercase tracking-wider mt-0.5">¡Contraseña restablecida!</p>
              </div>
              <p className="text-xs text-green-100/90 leading-relaxed pl-7">
                Contraseña actualizada exitosamente. Redirigiendo al inicio de sesión...
              </p>
            </div>
          )}

          {/* Sub-tarjeta Interna de Contraste para el Formulario */}
          <div className="bg-slate-950/35 border border-white/10 rounded-2xl p-6 mt-4">
            {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label htmlFor="password" className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block pl-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 stroke-[2]" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-white text-slate-950 placeholder-slate-400 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block pl-1">
                    Confirmar Contraseña
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 stroke-[2]" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-white text-slate-950 placeholder-slate-400 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl transition-all font-bold text-xs tracking-wider uppercase shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] mt-2"
                >
                  {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </form>
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
