import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Eye, EyeOff, AlertCircle, Mail, Lock, User } from 'lucide-react';
import { Captcha } from '../Captcha';
import { FieldHelp } from '../FieldHelp';

interface LoginProps {
  onForgotPassword: () => void;
}

// --- Password Strength Helpers ---
const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Al menos una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Al menos un número', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Al menos un carácter especial (!@#$%^&*)', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function getStrengthScore(password: string): number {
  return PASSWORD_RULES.filter(r => r.test(password)).length;
}

export const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const { signIn, signUp } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role] = useState('parent');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);

  const strengthScore = useMemo(() => getStrengthScore(password), [password]);
  const strengthLabels = ['', 'Muy débil', 'Débil', 'Aceptable', 'Fuerte'];
  const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isRegistering && !captchaValid) {
      setError('Captcha incorrecto');
      return;
    }

    // Strong password validation only on registration
    if (isRegistering) {
      const failedRules = PASSWORD_RULES.filter(r => !r.test(password));
      if (failedRules.length > 0) {
        setError(`Contraseña insegura. Falta: ${failedRules.map(r => r.label.toLowerCase()).join(', ')}.`);
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegistering) {
        await signUp(email, password, fullName, role);
        localStorage.setItem('showWelcomeToast', 'true');
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 flex items-center justify-center p-4 font-sans select-none relative overflow-hidden">
      
      {/* Decorative Background: Joaquina Sánchez (left) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-full w-[42%] bg-no-repeat"
        style={{
          backgroundImage: "url('/joaquina_decorative.png')",
          backgroundSize: 'contain',
          backgroundPosition: 'left 20%',
          opacity: 0.45,
        }}
      />

      {/* Decorative Background: Venezuela Flag (right) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-full w-[42%] bg-no-repeat"
        style={{
          backgroundImage: "url('/venezuela_flag.png')",
          backgroundSize: 'contain',
          backgroundPosition: 'right 20%',
          opacity: 0.25,
          filter: 'blur(1px) brightness(0.85)',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Tarjeta de Cristal (Glassmorphism) */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl px-6 py-5">
          
          {/* Sección Superior: Insignia y Mensaje */}
          <div className="text-center mb-0">
            <img 
              src="/logo_liceo.jpg.jpeg" 
              alt="Liceo Nacional Joaquina Sánchez" 
              className="w-[70px] h-[70px] mx-auto object-contain mb-2 filter drop-shadow-lg"
            />
            <h2 className="text-white text-base sm:text-lg font-bold uppercase tracking-wider leading-snug">
              BIENVENIDO A TU PORTAL ACADÉMICO.
            </h2>
            <p className="text-blue-200/80 text-xs italic mt-1.5">
              "Excelencia educativa de la mano de Dios"
            </p>
          </div>

          {/* Alertas de Error */}
          {error && (
            <div className="p-3.5 bg-red-950/50 border border-red-500/30 rounded-xl flex items-start gap-2.5 mb-4 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-200 leading-normal">{error}</p>
            </div>
          )}

          {/* Alertas de Éxito */}
          {success && (
            <div className="p-3.5 bg-green-950/50 border border-green-500/30 rounded-xl flex items-start gap-2.5 mb-4">
              <AlertCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-semibold text-green-200 leading-normal">{success}</p>
            </div>
          )}

          {/* Sub-tarjeta Interna de Contraste para el Formulario */}
          <div className="bg-slate-950/35 border border-white/10 rounded-2xl px-5 py-4 mt-3">

            <form onSubmit={handleSubmit} className="space-y-3">
              {isRegistering && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block pl-1">
                    Nombre Completo
                  </label>
                  <FieldHelp
                    hint="Escribe tu nombre y apellido completo tal como aparece en tu documento de identidad."
                    example="María Andreína Pérez"
                    position="right"
                  >
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4 stroke-[2]" />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white text-slate-950 placeholder-slate-400 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                        placeholder="Ej. María Pérez"
                        required
                      />
                    </div>
                  </FieldHelp>
                  <input type="hidden" value="parent" />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block pl-1">
                  Correo Electrónico
                </label>
                <FieldHelp
                  hint="Ingresa el correo con el que fue registrada tu cuenta. Debe tener el formato usuario@dominio.com."
                  example="representante@gmail.com"
                  position="right"
                >
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4 stroke-[2]" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white text-slate-950 placeholder-slate-400 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                </FieldHelp>
                <p className="text-[10px] text-blue-200/60 mt-1 pl-1 select-none">
                  Formato sugerido: ejemplo@correo.com
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center pl-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                    Contraseña
                  </label>
                  {!isRegistering && (
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="text-[10px] font-semibold text-blue-300 hover:text-white hover:underline transition"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <FieldHelp
                  hint="Ingresa tu contraseña secreta. Si te registraste recientemente, usa la misma que creaste. Distingue mayúsculas y minúsculas."
                  example="MiClave@2025"
                  position="right"
                >
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 stroke-[2]" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-white text-slate-950 placeholder-slate-400 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FieldHelp>
                <p className="text-[10px] text-blue-200/60 mt-1 pl-1 select-none">
                  Recomendación: Mínimo 8 caracteres con mayúsculas y números.
                </p>
                {/* Password Strength Bar — only visible when registering */}
                {isRegistering && password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: i <= strengthScore ? strengthColors[strengthScore] : 'rgba(255,255,255,0.15)'
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-semibold" style={{ color: strengthColors[strengthScore] || '#94a3b8' }}>
                      {password.length > 0 ? strengthLabels[strengthScore] || 'Muy débil' : ''}
                    </p>
                    <ul className="text-[10px] text-slate-400 space-y-0.5 pl-1">
                      {PASSWORD_RULES.map((rule) => (
                        <li key={rule.label} className={`flex items-center gap-1 transition-colors ${rule.test(password) ? 'text-green-400' : 'text-slate-500'}`}>
                          <span>{rule.test(password) ? '✓' : '○'}</span> {rule.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {!isRegistering && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block pl-1">
                    Código de Verificación
                  </label>
                  <FieldHelp
                    hint="Escribe los caracteres que aparecen en la imagen. Este paso confirma que eres una persona real y no un robot."
                    example="Si ves 'A3kP7', escribe exactamente: A3kP7"
                    position="right"
                  >
                    <div className="bg-slate-900/60 border border-white/5 rounded-xl py-2 px-3 shadow-inner">
                      <Captcha onValidate={setCaptchaValid} />
                    </div>
                  </FieldHelp>
                </div>
              )}

              {/* Botón Dominante */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl transition-all font-bold text-xs tracking-wider uppercase shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] mt-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2 stroke-[2.5]" />
                    {isRegistering ? 'Crear Cuenta' : 'Ingresar al Portal'}
                  </>
                )}
              </button>
            </form>

            {/* Alternador de Registro / Iniciar Sesión */}
            <div className="text-center mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setSuccess('');
                }}
                className="text-xs text-blue-200/90 hover:text-white transition font-medium hover:underline"
              >
                {isRegistering ? (
                  '¿Ya tienes cuenta? Inicia sesión'
                ) : (
                  '¿No tienes cuenta? Regístrate aquí'
                )}
              </button>
            </div>
          </div>

          {isRegistering && (
            <div className="p-3 bg-blue-950/40 border border-blue-500/20 rounded-xl mt-4">
              <p className="text-[10px] text-blue-200 leading-relaxed">
                <span className="font-semibold">Importante:</span> Este registro es de uso exclusivo para los Representantes y Apoderados del Liceo Nacional Joaquina Sánchez.
              </p>
            </div>
          )}
        </div>

        {/* Versión y Crédito al pie */}
        <p className="text-center text-white/35 text-[10px] mt-4 tracking-wide select-none">
          Versión 2.1 | L.N. Joaquina Sánchez
        </p>
      </div>

    </div>
  );
};
