import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
import { Toast } from './Toast';
import { Footer } from './Footer';
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  Home,
  Download,
  Newspaper,
  Calendar,
  BookOpen,
  ChevronDown,
  TrendingUp,
  FolderOpen,
} from 'lucide-react';
import { getPublicUrl } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, userRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);

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
      name: 'Dashboard',
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
      icon: Calendar,
      path: '/schedules',
      roles: ['admin', 'secretary', 'parent'],
    },
    {
      name: 'Plan de Evaluación',
      icon: BookOpen,
      path: '/evaluation-plans',
      roles: ['admin', 'secretary', 'parent'],
    },
    {
      name: 'Inasistencias',
      icon: FileText,
      path: '/absences',
      roles: ['admin', 'secretary', 'parent'],
    },
    {
      name: 'Usuarios',
      icon: Users,
      path: '/users',
      roles: ['admin'],
    },
    {
      name: 'Estadísticas',
      icon: TrendingUp,
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
      name: 'Backup',
      icon: Download,
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-[95%] mx-auto">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="font-bold text-lg">Joaquina Sánchez</div>
              </div>

              <nav className="hidden lg:flex items-center gap-0.5">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm ${isActive
                        ? 'bg-orange-500 text-white font-bold shadow-md'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white font-medium'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
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
                  className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-blue-700 transition"
                >
                  <div className="text-right">
                    <div className="text-xs font-semibold">{profile?.nombre_completo}</div>
                    <div className="text-[10px] text-blue-200">{profile?.correo}</div>
                  </div>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-20">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
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
            <div className="lg:hidden border-t border-blue-700 bg-blue-900">
              <nav className="px-4 py-4 space-y-2">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                        ? 'bg-orange-500 text-white font-semibold'
                        : 'text-blue-100 hover:bg-blue-700'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-blue-700 p-4">
                <div className="mb-3 p-3 bg-blue-800 rounded-lg">
                  <p className="text-sm font-semibold">{profile?.nombre_completo}</p>
                  <p className="text-xs text-blue-200">{profile?.correo}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition font-medium"
                >
                  <LogOut className="w-5 h-5" />
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
    </div>
  );
};
