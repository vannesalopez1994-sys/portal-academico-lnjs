import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
import { Toast } from './Toast';
import { Footer } from './Footer';
import {
  Home,
  LayoutDashboard,
  Newspaper,
  CalendarCheck2,
  BookOpenCheck,
  ClipboardX,
  UserCog,
  BarChart3,
  FolderOpen,
  DatabaseZap,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CircleUserRound,
  HelpCircle,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  bgClass?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, bgClass }) => {
  const { profile, userRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeHelpTab, setActiveHelpTab] = useState<'parent' | 'admin'>('parent');

  useEffect(() => {
    if (userRole) {
      const roleLower = userRole.toLowerCase();
      if (roleLower.includes('parent')) {
        setActiveHelpTab('parent');
      } else {
        setActiveHelpTab('admin');
      }
    }
  }, [userRole]);

  useEffect(() => {
    const welcomeFlag = localStorage.getItem('showWelcomeToast');
    if (welcomeFlag === 'true') {
      setShowToast(true);
      localStorage.removeItem('showWelcomeToast');
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    {
      name: 'Inicio',
      icon: Home,
      path: '/',
      roles: ['admin', 'secretary', 'parent'],
    },
    {
      name: 'Panel',
      icon: LayoutDashboard,
      path: '/dashboard',
      roles: ['admin'],
    },
    {
      name: 'Noticias',
      icon: Newspaper,
      path: '/news',
      roles: ['admin', 'secretary', 'parent'],
    },
    {
      name: 'Horarios',
      icon: CalendarCheck2,
      path: '/schedules',
      roles: ['admin', 'secretary', 'parent'],
    },
    {
      name: 'Plan de Evaluación',
      icon: BookOpenCheck,
      path: '/evaluation-plans',
      roles: ['admin', 'secretary', 'parent'],
    },
    {
      name: 'Inasistencias',
      icon: ClipboardX,
      path: '/absences',
      roles: ['admin', 'secretary', 'parent'],
    },
    {
      name: 'Usuarios',
      icon: UserCog,
      path: '/users',
      roles: ['admin'],
    },
    {
      name: 'Estadísticas',
      icon: BarChart3,
      path: '/statistics',
      roles: ['admin'],
    },
    {
      name: 'Documentos',
      icon: FolderOpen,
      path: '/documents',
      roles: ['admin', 'secretary', 'parent'],
    },
    {
      name: 'Respaldo',
      icon: DatabaseZap,
      path: '/backup',
      roles: ['admin'],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (!userRole) return false;
    // Allow matching both internal keys and common DB names
    const normalizedUserRole = userRole.toLowerCase();
    return item.roles.some(role =>
      normalizedUserRole.includes(role.toLowerCase()) ||
      role.toLowerCase().includes(normalizedUserRole)
    );
  });

  return (
    <div className={`min-h-screen ${bgClass || 'bg-gray-50'} flex flex-col`}>
      <header className="bg-gradient-to-r from-[#0a1628] via-blue-950 to-[#0d2b5e] text-white shadow-xl sticky top-0 z-50 border-b border-blue-800/40">
        <div className="max-w-[95%] mx-auto">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-5">
              {/* Logo + Brand */}
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo_liceo.jpg.jpeg"
                  alt="Logo"
                  className="w-8 h-8 object-contain rounded-md"
                />
                <div>
                  <div className="font-bold text-sm tracking-wide leading-none">Aplicación Académica</div>
                  <div className="text-[9px] text-blue-300/70 font-medium tracking-widest uppercase leading-none mt-0.5">L.N. Joaquina Sánchez</div>
                </div>
                <span className="hidden sm:block text-[9px] bg-blue-600/50 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold tracking-wide">
                  {userRole === 'admin' ? '⭐ Administrador' : userRole === 'secretary' ? '🗂 Secretaría' : userRole === 'parent' ? '👤 Representante' : userRole}
                </span>
              </div>

              <nav className="hidden lg:flex items-center gap-0.5">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 text-xs font-semibold ${
                        isActive
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                          : 'text-blue-200/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/10 border border-transparent hover:border-blue-600/40 transition-all duration-200"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600/70 border border-blue-400/40 flex items-center justify-center">
                    <CircleUserRound className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold leading-tight">{profile?.nombre_completo}</div>
                    <div className="text-[9px] text-blue-300/70 leading-tight">{profile?.correo}</div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-blue-300" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-xs font-bold text-gray-800">{profile?.nombre_completo}</p>
                        <p className="text-[10px] text-gray-400">{profile?.correo}</p>
                      </div>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-white"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-blue-900 bg-[#0a1628]">
              <nav className="px-4 py-4 space-y-1">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-blue-200/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-blue-900/60 p-4">
                <div className="mb-3 p-3 bg-white/5 border border-blue-800/30 rounded-xl">
                  <p className="text-sm font-bold text-white">{profile?.nombre_completo}</p>
                  <p className="text-xs text-blue-300/60">{profile?.correo}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-700/80 hover:bg-red-600 rounded-xl transition font-semibold text-sm border border-red-600/30"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[95%] mx-auto p-4 flex-grow">
        {children}
      </main>

      <Footer />

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleSignOut}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas cerrar sesión?"
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
        type="warning"
      />

      {showToast && (
        <Toast
          message="Tu cuenta ha sido creada con éxito."
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Botón Flotante Global de Ayuda (?) */}
      <button
        onClick={() => setShowHelpModal(true)}
        title="Manual y Ayuda en Línea"
        className="fixed bottom-6 right-6 z-[999] bg-gradient-to-r from-blue-900 via-blue-950 to-[#0d2b5e] hover:from-[#0d2b5e] hover:to-blue-900 text-white rounded-full p-3.5 shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-blue-700/40 group flex items-center justify-center"
      >
        <HelpCircle className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
      </button>

      {/* Modal de Guía Rápida de Operación */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          {/* Backdrop Click to Close */}
          <div className="absolute inset-0" onClick={() => setShowHelpModal(false)} />

          <div className="bg-slate-900/95 border border-white/10 rounded-[2rem] shadow-2xl w-full max-w-xl relative z-10 overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0a1628] to-blue-950 px-6 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <h3 className="text-white text-base font-bold uppercase tracking-wider">
                  Guía Rápida de Operación
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white transition p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas (Tabs) - Ocultas para Representantes, visibles para Admin / Secretaría */}
            {userRole !== 'parent' && (
              <div className="flex border-b border-white/10 bg-slate-950/40 p-2 gap-2">
                <button
                  onClick={() => setActiveHelpTab('parent')}
                  className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeHelpTab === 'parent'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Representante
                </button>
                <button
                  onClick={() => setActiveHelpTab('admin')}
                  className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeHelpTab === 'admin'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Administrador / Secretaría
                </button>
              </div>
            )}

            {/* Content Area */}
            <div className="p-6 max-h-[60vh] overflow-y-auto text-slate-300 text-sm space-y-4 font-sans">
              {activeHelpTab === 'parent' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-950/35 border border-blue-900/30 rounded-2xl">
                    <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 font-sans">
                      <span>📝</span> ¿Cómo Reportar una Inasistencia?
                    </h4>
                    <p className="text-xs leading-relaxed text-blue-100/80">
                      Sigue estos sencillos pasos para cargar y justificar la falta del estudiante de forma digital:
                    </p>
                  </div>

                  <ul className="space-y-3.5 pl-1">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-900/50 border border-blue-700/30 flex items-center justify-center text-[10px] font-black text-blue-300">1</span>
                      <p className="text-xs">Dirígete a la sección <strong>Inasistencias</strong> en el menú de navegación principal.</p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-900/50 border border-blue-700/30 flex items-center justify-center text-[10px] font-black text-blue-300">2</span>
                      <p className="text-xs">Presiona el botón blanco <strong>Reportar Inasistencia</strong> situado en la esquina superior derecha.</p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-900/50 border border-blue-700/30 flex items-center justify-center text-[10px] font-black text-blue-300">3</span>
                      <p className="text-xs">Completa los campos obligatorios del estudiante: <strong>Nombre Completo</strong>, <strong>Año Escolar</strong>, <strong>Sección</strong> y el <strong>Teléfono del Representante</strong>.</p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-900/50 border border-blue-700/30 flex items-center justify-center text-[10px] font-black text-blue-300">4</span>
                      <p className="text-xs">Ingresa el motivo y las fechas. Luego, presiona <strong>Seleccionar justificativo PDF</strong> para adjuntar la constancia médica o justificativo correspondiente (obligatorio).</p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-900/50 border border-blue-700/30 flex items-center justify-center text-[10px] font-black text-blue-300">5</span>
                      <p className="text-xs">Haz clic en <strong>Enviar Justificativo</strong>. La secretaría revisará y actualizará el estado de la solicitud.</p>
                    </li>
                  </ul>

                  {/* Ejemplos de campos */}
                  <div className="mt-2 border-t border-white/10 pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-blue-300 font-black mb-3 flex items-center gap-1.5">
                      <span>💡</span> Ejemplo de cómo llenar el formulario
                    </p>
                    <div className="space-y-2">
                      {[
                        { campo: 'Nombre del Estudiante', valor: 'María González' },
                        { campo: 'Año Escolar', valor: '3er Año' },
                        { campo: 'Sección', valor: 'Sección C' },
                        { campo: 'Teléfono', valor: '0412-7654321' },
                        { campo: 'Fecha Inicio', valor: '10/03/2025' },
                        { campo: 'Fecha Fin', valor: '12/03/2025' },
                        { campo: 'Motivo', valor: 'Reposo médico por gripe (Dr. Ramírez).' },
                        { campo: 'PDF adjunto', valor: 'reposo_medico_maria.pdf' },
                      ].map(item => (
                        <div key={item.campo} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5">
                          <span className="text-[10px] text-slate-400 font-medium w-36 flex-shrink-0">{item.campo}:</span>
                          <span className="text-[11px] text-white font-mono">{item.valor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-950/35 border border-indigo-900/30 rounded-2xl">
                    <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 font-sans">
                      <span>📊</span> Gestión de Inasistencias y Reportes
                    </h4>
                    <p className="text-xs leading-relaxed text-indigo-100/80">
                      Instrucciones para el personal directivo, administrativo y de secretaría:
                    </p>
                  </div>

                  <ul className="space-y-3.5 pl-1">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-900/50 border border-indigo-700/30 flex items-center justify-center text-[10px] font-black text-indigo-300">1</span>
                      <p className="text-xs"><strong>Revisar Alertas:</strong> En el <strong>Panel (Dashboard)</strong>, observa la tabla de <em>Alumnos con más Justificativos</em> (alertas históricas) y el bloque <em>Más Reposos del Mes</em> (alumnos con más de 4 faltas en el mes actual) para identificar casos críticos.</p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-900/50 border border-indigo-700/30 flex items-center justify-center text-[10px] font-black text-indigo-300">2</span>
                      <p className="text-xs"><strong>Aprobar/Rechazar:</strong> En la sección <strong>Inasistencias</strong>, haz clic en <strong>Ver Justificativo</strong> para auditar el PDF de cualquier alumno. Modifica su estado a "Aprobada" o "Rechazada" (en este caso indicando el motivo obligatoriamente).</p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-900/50 border border-indigo-700/30 flex items-center justify-center text-[10px] font-black text-indigo-300">3</span>
                      <p className="text-xs"><strong>Auditar Expedientes:</strong> Activa la pestaña <strong>Resumen por Alumno</strong> para agrupar todas las inasistencias. Haz clic en <strong>Ver Expediente Completo</strong> para auditar detalladamente el historial de un alumno particular.</p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-900/50 border border-indigo-700/30 flex items-center justify-center text-[10px] font-black text-indigo-300">4</span>
                      <p className="text-xs"><strong>Generar Reporte PDF:</strong> Haz clic en el botón azul <strong>Descargar Reporte PDF</strong> en la sección Inasistencias. El sistema procesará una consulta agrupada y descargará un informe oficial en formato Carta con membrete del plantel, logo y total acumulado por alumno.</p>
                    </li>
                  </ul>

                  {/* Referencia rápida de módulos */}
                  <div className="mt-2 border-t border-white/10 pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-indigo-300 font-black mb-3 flex items-center gap-1.5">
                      <span>📋</span> Referencia rápida de módulos
                    </p>
                    <div className="space-y-2">
                      {[
                        { modulo: '👥 Usuarios', accion: 'Registrar usuario: Nombre, Correo, Contraseña (≥8 car.), Rol.' },
                        { modulo: '📰 Noticias', accion: 'Crear aviso: Título breve + Contenido completo + Imagen opcional (PNG/JPG ≤5MB).' },
                        { modulo: '📅 Horarios', accion: 'Subir horario por sección: selecciona Año, Sección y adjunta PDF (≤10MB).' },
                        { modulo: '📝 Plan Eval.', accion: 'Subir plan de evaluación: selecciona Año, Sección, Materia y adjunta PDF.' },
                        { modulo: '📊 Estadísticas', accion: 'Visualiza inasistencias comparativas por año/mes y distribución de roles.' },
                      ].map(item => (
                        <div key={item.modulo} className="bg-slate-800/50 rounded-xl px-3 py-2">
                          <span className="text-[10px] text-indigo-300 font-black block mb-0.5">{item.modulo}</span>
                          <span className="text-[10px] text-slate-300 leading-relaxed">{item.accion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-950/40 px-6 py-4 flex items-center justify-end border-t border-white/10 gap-3">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
