import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, FileText, BookOpen, Calendar, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { userRole } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    absences: 0,
    plans: 0,
    schedules: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersReq, absencesReq, plansReq, schedulesReq] = await Promise.all([
          supabase.from('usuarios').select('id', { count: 'exact', head: true }),
          supabase.from('ausencias').select('id', { count: 'exact', head: true }),
          supabase.from('planes_evaluacion').select('id', { count: 'exact', head: true }),
          supabase.from('horarios').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          users: usersReq.count || 0,
          absences: absencesReq.count || 0,
          plans: plansReq.count || 0,
          schedules: schedulesReq.count || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userRole === 'admin') {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  if (userRole !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-lg">No tienes permisos para ver el dashboard.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
        <p className="text-gray-600 mt-2">Visión general del sistema académico</p>
      </div>

      {loading ? (
        <div className="flex justify-center h-64 items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-lg">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{stats.users}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
            <div className="bg-orange-100 p-4 rounded-lg">
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Inasistencias</p>
              <p className="text-2xl font-bold text-gray-900">{stats.absences}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
            <div className="bg-green-100 p-4 rounded-lg">
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Planes Eval.</p>
              <p className="text-2xl font-bold text-gray-900">{stats.plans}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
            <div className="bg-purple-100 p-4 rounded-lg">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Horarios</p>
              <p className="text-2xl font-bold text-gray-900">{stats.schedules}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="text-blue-500" /> Accesos Rápidos
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/users" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center font-medium text-gray-700">
              Gestionar Usuarios
            </Link>
            <Link to="/statistics" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center font-medium text-gray-700">
              Ver Estadísticas
            </Link>
            <Link to="/news" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center font-medium text-gray-700">
              Publicar Noticia
            </Link>
            <Link to="/documents" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center font-medium text-gray-700">
              Documentos Institucionales
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};
