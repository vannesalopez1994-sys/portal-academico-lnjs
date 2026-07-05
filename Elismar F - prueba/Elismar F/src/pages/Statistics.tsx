import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, BookOpen, Calendar, Newspaper, FileText, Download } from 'lucide-react';

interface Stats {
  totalUsers: number;
  usersByRole: { name: string; value: number }[];
  totalClasses: number;
  classesByGrade: { name: string; value: number }[];
  totalNews: number;
  totalSchedules: number;
  totalAbsences: number;
  absencesByMonth: { month: string; count: number }[];
  recentActivity: { date: string; users: number; news: number; absences: number }[];
}

export const Statistics: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchStatistics();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchStatistics = async () => {
    try {
      const [
        { count: totalUsers },
        { data: users },
        { count: totalClasses },
        { data: classes },
        { count: totalNews },
        { count: totalSchedules },
        { count: totalAbsences },
        { data: absences },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('role'),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('grade_level'),
        supabase.from('news').select('*', { count: 'exact', head: true }),
        supabase.from('schedules').select('*', { count: 'exact', head: true }),
        supabase.from('absences').select('*', { count: 'exact', head: true }),
        supabase.from('absences').select('absence_date, created_at'),
      ]);

      const usersByRole = users?.reduce((acc: any[], user) => {
        const role = user.role;
        const roleName = role === 'admin' ? 'Administradores' : role === 'secretary' ? 'Secretarias' : 'Padres/Madres';
        const existing = acc.find(item => item.name === roleName);
        if (existing) {
          existing.value++;
        } else {
          acc.push({ name: roleName, value: 1 });
        }
        return acc;
      }, []) || [];

      const classesByGrade = classes?.reduce((acc: any[], classItem) => {
        const existing = acc.find(item => item.name === classItem.grade_level);
        if (existing) {
          existing.value++;
        } else {
          acc.push({ name: classItem.grade_level, value: 1 });
        }
        return acc;
      }, []) || [];

      const absencesByMonth = absences?.reduce((acc: any[], absence) => {
        const date = new Date(absence.absence_date);
        const monthName = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        const existing = acc.find(item => item.month === monthName);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ month: monthName, count: 1 });
        }
        return acc;
      }, []) || [];

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const recentActivity = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        users: 0,
        news: 0,
        absences: 0,
      }));

      setStats({
        totalUsers: totalUsers || 0,
        usersByRole,
        totalClasses: totalClasses || 0,
        classesByGrade,
        totalNews: totalNews || 0,
        totalSchedules: totalSchedules || 0,
        totalAbsences: totalAbsences || 0,
        absencesByMonth: absencesByMonth.slice(-6),
        recentActivity,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (profile?.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Acceso Restringido</h3>
            <p className="text-gray-600">Solo los administradores pueden ver las estadísticas</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-3 rounded-xl">
              <TrendingUp className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Estadísticas del Sistema</h1>
              <p className="text-gray-600">Análisis y métricas del plantel</p>
            </div>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition print:hidden"
          >
            <Download className="w-5 h-5" />
            Exportar PDF
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Usuarios</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Clases</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalClasses || 0}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <BookOpen className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Noticias</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalNews || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Newspaper className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Inasistencias</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalAbsences || 0}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Usuarios por Rol</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.usersByRole || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats?.usersByRole.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Clases por Año</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.classesByGrade || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#F59E0B" name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Inasistencias por Mes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats?.absencesByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#EF4444" strokeWidth={2} name="Inasistencias" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen del Sistema</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-gray-900">Horarios</h4>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalSchedules || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Documentos subidos</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-5 h-5 text-orange-600" />
                <h4 className="font-semibold text-gray-900">Clases</h4>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalClasses || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Asignaturas registradas</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Newspaper className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Noticias</h4>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalNews || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Publicaciones totales</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
