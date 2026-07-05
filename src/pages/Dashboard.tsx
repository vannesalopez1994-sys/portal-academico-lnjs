import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Users,
  ClipboardList,
  FileBadge2,
  CalendarClock,
  UserCog,
  BarChart3,
  Megaphone,
  Scroll,
  LayoutDashboard,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { userRole } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    absences: 0,
    plans: 0,
    schedules: 0,
  });
  const [topStudents, setTopStudents] = useState<Array<{ name: string; count: number; ano: string; seccion: string }>>([]);
  const [topStudentsMonthly, setTopStudentsMonthly] = useState<Array<{ name: string; count: number; ano: string; seccion: string }>>([]);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersReq, absencesReq, plansReq, schedulesReq, absencesListReq] = await Promise.all([
          supabase.from('usuarios').select('id', { count: 'exact', head: true }),
          supabase.from('ausencias').select('id', { count: 'exact', head: true }),
          supabase.from('planes_evaluacion').select('id', { count: 'exact', head: true }),
          supabase.from('horarios').select('id', { count: 'exact', head: true }),
          supabase.from('ausencias').select('nombre_alumno_descripcion, ano_escolar, seccion, created_at, fecha_desde, fecha_hasta'),
        ]);

        setStats({
          users: usersReq.count || 0,
          absences: absencesReq.count || 0,
          plans: plansReq.count || 0,
          schedules: schedulesReq.count || 0,
        });

        if (absencesListReq.data) {
          const counts: Record<string, { count: number; ano: string; seccion: string }> = {};
          const countsMonthly: Record<string, { count: number; ano: string; seccion: string }> = {};
          let totalMonthlyCount = 0;

          const currentDate = new Date();
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();

          absencesListReq.data.forEach((abs: any) => {
            const name = abs.nombre_alumno_descripcion?.trim();
            if (name) {
              // Conteo histórico (para la tabla izquierda)
              if (!counts[name]) {
                counts[name] = { count: 0, ano: abs.ano_escolar || 'N/A', seccion: abs.seccion || 'N/A' };
              }
              counts[name].count += 1;

              // Conteo mensual: todas las ausencias en el mes actual
              if (abs.created_at) {
                const absDate = new Date(abs.created_at);
                if (absDate.getFullYear() === currentYear && absDate.getMonth() === currentMonth) {
                  totalMonthlyCount += 1;
                  if (!countsMonthly[name]) {
                    countsMonthly[name] = { count: 0, ano: abs.ano_escolar || 'N/A', seccion: abs.seccion || 'N/A' };
                  }
                  countsMonthly[name].count += 1;
                }
              }
            }
          });

          const sorted = Object.entries(counts)
            .map(([name, val]) => ({ name, ...val }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
          setTopStudents(sorted);

          // Filtrar para mostrar solo alumnos que pasen de 4 reposos acumulados en el mes
          const sortedMonthly = Object.entries(countsMonthly)
            .map(([name, val]) => ({ name, ...val }))
            .filter(student => student.count > 4)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
          setTopStudentsMonthly(sortedMonthly);
          setTotalMonthly(totalMonthlyCount);
        }
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
      {/* ── Encabezado ── */}
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-blue-600 p-2.5 rounded-xl shadow-md">
          <LayoutDashboard className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Panel de Control</h1>
          <p className="text-gray-500 text-sm mt-0.5">Visión general del sistema académico</p>
        </div>
      </div>

      {/* ── Tarjetas de Métricas ── */}
      {loading ? (
        <div className="flex justify-center h-64 items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

          {/* Total Usuarios */}
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-md border border-blue-100 p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -translate-y-8 translate-x-8 opacity-60" />
            <div className="flex items-center justify-between">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3.5 rounded-xl shadow-md">
                <Users className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                Usuarios
              </span>
            </div>
            <div>
              <p className="text-4xl font-black text-gray-900">{stats.users}</p>
              <p className="text-sm text-gray-500 font-medium mt-1">Total Usuarios Activos</p>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mt-1" />
          </div>

          {/* Inasistencias */}
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-md border border-red-100 p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -translate-y-8 translate-x-8 opacity-60" />
            <div className="flex items-center justify-between">
              <div className="bg-gradient-to-br from-red-500 to-rose-600 p-3.5 rounded-xl shadow-md">
                <ClipboardList className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                Registro
              </span>
            </div>
            <div>
              <p className="text-4xl font-black text-gray-900">{stats.absences}</p>
              <p className="text-sm text-gray-500 font-medium mt-1">Inasistencias Registradas</p>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-red-400 to-rose-600 rounded-full mt-1" />
          </div>

          {/* Planes de Evaluación */}
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-md border border-emerald-100 p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -translate-y-8 translate-x-8 opacity-60" />
            <div className="flex items-center justify-between">
              <div className="bg-gradient-to-br from-emerald-500 to-green-700 p-3.5 rounded-xl shadow-md">
                <FileBadge2 className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Planes
              </span>
            </div>
            <div>
              <p className="text-4xl font-black text-gray-900">{stats.plans}</p>
              <p className="text-sm text-gray-500 font-medium mt-1">Planes de Evaluación</p>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full mt-1" />
          </div>

          {/* Horarios */}
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-md border border-purple-100 p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -translate-y-8 translate-x-8 opacity-60" />
            <div className="flex items-center justify-between">
              <div className="bg-gradient-to-br from-purple-500 to-violet-700 p-3.5 rounded-xl shadow-md">
                <CalendarClock className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                Horarios
              </span>
            </div>
            <div>
              <p className="text-4xl font-black text-gray-900">{stats.schedules}</p>
              <p className="text-sm text-gray-500 font-medium mt-1">Horarios Publicados</p>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-purple-400 to-violet-600 rounded-full mt-1" />
          </div>

        </div>
      )}

      {/* ── Accesos Rápidos ── */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-blue-600 rounded-full inline-block" />
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Gestionar Usuarios */}
          <Link
            to="/users"
            className="group flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200/60 hover:border-blue-300 hover:shadow-md transition-all duration-200"
          >
            <div className="bg-blue-600 p-2.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
              <UserCog className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">Gestionar Usuarios</p>
              <p className="text-xs text-gray-500 mt-0.5">Administrar cuentas del sistema</p>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
          </Link>

          {/* Ver Estadísticas */}
          <Link
            to="/statistics"
            className="group flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-xl hover:from-indigo-100 hover:to-indigo-200/60 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
          >
            <div className="bg-indigo-600 p-2.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">Ver Estadísticas</p>
              <p className="text-xs text-gray-500 mt-0.5">Análisis del rendimiento académico</p>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-200" />
          </Link>

          {/* Publicar Noticia */}
          <Link
            to="/news"
            className="group flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-100 rounded-xl hover:from-amber-100 hover:to-amber-200/60 hover:border-amber-300 hover:shadow-md transition-all duration-200"
          >
            <div className="bg-amber-500 p-2.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">Publicar Noticia</p>
              <p className="text-xs text-gray-500 mt-0.5">Comunicados y anuncios institucionales</p>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all duration-200" />
          </Link>

          {/* Documentos Institucionales */}
          <Link
            to="/documents"
            className="group flex items-center gap-4 p-4 bg-gradient-to-r from-teal-50 to-teal-100/50 border border-teal-100 rounded-xl hover:from-teal-100 hover:to-teal-200/60 hover:border-teal-300 hover:shadow-md transition-all duration-200"
          >
            <div className="bg-teal-600 p-2.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
              <Scroll className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">Documentos Institucionales</p>
              <p className="text-xs text-gray-500 mt-0.5">Archivos y registros oficiales</p>
            </div>
            <ArrowRight className="w-4 h-4 text-teal-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all duration-200" />
          </Link>

        </div>
      </div>

      {/* ── Top Alumnos con Justificativos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-red-500 rounded-full inline-block" />
            Alumnos con más Justificativos Reportados
          </h2>
          {topStudents.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No hay reportes de inasistencias registrados aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 font-bold border-b border-gray-100 pb-2">
                    <th className="pb-3 font-semibold text-gray-500">Alumno</th>
                    <th className="pb-3 font-semibold text-gray-500 text-center">Año / Sección</th>
                    <th className="pb-3 font-semibold text-gray-500 text-center">Total Reposos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topStudents.map((student) => (
                    <tr key={student.name} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 font-bold text-gray-800">{student.name}</td>
                      <td className="py-3 text-center text-gray-500 font-semibold">{student.ano} - {student.seccion}</td>
                      <td className="py-3 text-center">
                        <span className="px-2.5 py-1 bg-red-50 text-red-700 font-black rounded-full border border-red-100 text-xs">
                          {student.count} {student.count === 1 ? 'reposo' : 'reposos'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Más Reposos del Mes (Top Mensual) */}
        <div className="bg-gradient-to-br from-[#0a1628] to-blue-900 text-white rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 opacity-60" />
          <div className="flex-1 flex flex-col justify-start">
            <h3 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2 border-b border-white/10 pb-2 text-white">
              Más Reposos del Mes
            </h3>
            
            {topStudentsMonthly.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-blue-100/50 text-xs text-center font-medium">
                  No hay alumnos con más de 4 reposos registrados este mes.
                </p>
              </div>
            ) : (
              <ul className="space-y-3.5 my-2">
                {topStudentsMonthly.map((student, index) => (
                  <li key={student.name} className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-blue-300 w-4">{index + 1}.</span>
                      <div>
                        <span className="font-bold text-white block leading-tight">{student.name}</span>
                        <span className="text-[10px] text-blue-100/60 font-semibold uppercase tracking-wider">
                          {student.ano} ({student.seccion})
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 bg-red-500/20 text-red-300 font-extrabold rounded-full border border-red-500/30 text-xs shrink-0">
                      {student.count} {student.count === 1 ? 'Reposo' : 'Reposos'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-6 border-t border-white/10 pt-4 flex justify-between items-center">
            <span className="text-[11px] uppercase tracking-widest text-blue-300 font-black">
              TOTAL REPOSOS DEL MES
            </span>
            <span className="text-3xl font-black text-white">{totalMonthly}</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};
