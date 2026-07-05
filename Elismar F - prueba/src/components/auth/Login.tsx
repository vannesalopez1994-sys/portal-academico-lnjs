import React, { useState } from 'react';
// Import removed due to no longer being used
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Eye, EyeOff, GraduationCap, AlertCircle } from 'lucide-react';
import { Captcha } from '../Captcha';

interface LoginProps {
  onForgotPassword: () => void;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isRegistering && !captchaValid) {
      setError('Por favor, completa el código de verificación correctamente');
      return;
    }

    setLoading(true);

    try {
      if (isRegistering) {
        await signUp(email, password, fullName, role);
        localStorage.setItem('showWelcomeToast', 'true');
        // Success message removed to allow automatic navigation/transition
        // The AppRoutes will detect the new user session and redirect to '/'
      } else {
        await signIn(email, password);
        // We do not manually navigate('/') here.
        // AppRoutes will automatically redirect to '/' when user state becomes truthy.
      }
    } // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
      setError(err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <GraduationCap className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Sistema Académico</h1>
            <p className="text-gray-600 mt-2">
              {isRegistering ? 'Crear nueva cuenta' : 'Accede a tu cuenta'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                {/* 
  Role selection removed for public registration. 
  By default, all new public signups are 'parent' (Representante).
*/}
                <input type="hidden" value="parent" />
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isRegistering && (
              <>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Verificación
                  </label>
                  <Captcha onValidate={setCaptchaValid} />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || (!isRegistering && !captchaValid)}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
                </>
              )}
            </button>

            <div className="text-center pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setSuccess('');
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {isRegistering ? (
                  <>
                    ¿Ya tienes cuenta?{' '}
                    <span className="text-blue-600 font-medium">Inicia sesión</span>
                  </>
                ) : (
                  <>
                    ¿No tienes cuenta?{' '}
                    <span className="text-blue-600 font-medium">Regístrate aquí</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {isRegistering && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <span className="font-semibold">Importante:</span> El primer usuario registrado debería ser un Administrador para gestionar el sistema.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-white text-sm mt-6 opacity-75">
          Sistema de Gestión Académica 2024
        </p>
      </div>
    </div>
  );
};
