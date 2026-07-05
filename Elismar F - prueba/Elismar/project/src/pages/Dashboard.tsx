import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Stats {
  totalUsers: number;
  totalAbsences: number;
  pendingAbsences: number;
  approvedAbsences: number;
  rejectedAbsences: number;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalAbsences: 0,
    pendingAbsences: 0,
    approvedAbsences: 0,
    rejectedAbsences: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersResult, absencesResult, pendingResult, approvedResult, rejectedResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('absences').select('id', { count: 'exact', head: true }),
        supabase.from('absences').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('absences').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('absences').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalAbsences: absencesResult.count || 0,
        pendingAbsences: pendingResult.count || 0,
        approvedAbsences: approvedResult.count || 0,
        rejectedAbsences: rejectedResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    {
      name: 'Pendientes',
      cantidad: stats.pendingAbsences,
      color: '#f59e0b',
    },
    {
      name: 'Aprobadas',
      cantidad: stats.approvedAbsences,
      color: '#10b981',
    },
    {
      name: 'Rechazadas',
      cantidad: stats.rejectedAbsences,
      color: '#ef4444',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard de Administración</h1>
        <p className="text-gray-600 mt-2">Vista general del sistema académico</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Usuarios</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pendientes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingAbsences}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Aprobadas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.approvedAbsences}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Rechazadas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.rejectedAbsences}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Estado de Inasistencias</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="cantidad" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
