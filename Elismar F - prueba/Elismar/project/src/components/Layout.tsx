import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
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
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
      name: 'Clases',
      icon: BookOpen,
      path: '/classes',
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
      name: 'Backup',
      icon: Download,
      path: '/backup',
      roles: ['admin'],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(profile?.role || '')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="font-bold text-xl">Sistema Académico</div>
                <span className="hidden sm:block text-xs bg-blue-700 px-2 py-1 rounded-full">
                  {profile?.role === 'admin' ? 'Admin' : profile?.role === 'secretary' ? 'Secretaria' : 'Padre/Madre'}
                </span>
              </div>

              <nav className="hidden lg:flex items-center gap-1">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-orange-500 text-white font-semibold shadow-lg'
                          : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <div className="text-right">
                    <div className="text-sm font-semibold">{profile?.full_name}</div>
                    <div className="text-xs text-blue-200">{profile?.email}</div>
                  </div>
                  <ChevronDown className="w-4 h-4" />
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
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
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
                  <p className="text-sm font-semibold">{profile?.full_name}</p>
                  <p className="text-xs text-blue-200">{profile?.email}</p>
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

      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>

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
    </div>
  );
};
