import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { News } from './pages/News';
import { Schedules } from './pages/Schedules';
import { Classes } from './pages/Classes';
import { Absences } from './pages/Absences';
import { Users } from './pages/Users';
import { Backup } from './pages/Backup';
import { Statistics } from './pages/Statistics';
import { Unauthorized } from './pages/Unauthorized';
import { ResetPassword } from './pages/ResetPassword';

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Home />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/news"
        element={
          <ProtectedRoute allowedRoles={['admin', 'secretary', 'parent']}>
            <News />
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedules"
        element={
          <ProtectedRoute allowedRoles={['admin', 'secretary', 'parent']}>
            <Schedules />
          </ProtectedRoute>
        }
      />

      <Route
        path="/classes"
        element={
          <ProtectedRoute allowedRoles={['admin', 'secretary', 'parent']}>
            <Classes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/absences"
        element={
          <ProtectedRoute allowedRoles={['admin', 'secretary', 'parent']}>
            <Layout>
              <Absences />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/statistics"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Statistics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/backup"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <Backup />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
