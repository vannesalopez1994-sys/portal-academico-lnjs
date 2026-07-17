import React, { useState, useEffect, ErrorInfo } from 'react';

class InlineErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Statistics Module Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-50 text-red-900 border border-red-200 rounded-xl m-10">
          <h2 className="text-2xl font-bold mb-4">Error en el componente de Estadísticas:</h2>
          <pre className="whitespace-pre-wrap bg-red-100 p-4 rounded-lg">{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  LineChart,
  MonitorCheck,
  MousePointerClick,
  CalendarCheck,
  Loader2,
  ShieldCheck,
  KeyRound,
  UserCircle2,
  BarChart2,
  LogIn,
  FileUp,
  UserPlus,
  UserMinus,
  FileText,
  Bell,
  Clock3,
  XCircle,
  Users,
  Calendar
} from 'lucide-react';

export const Statistics: React.FC = () => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Resumen
  const [totalVisitasMes, setTotalVisitasMes] = useState(0);
  const [diaMasTrafico, setDiaMasTrafico] = useState('Ninguno');
  
  // Gráficos y Tablas
  const [chartData, setChartData] = useState<any[]>([]);
  const [latestConnections, setLatestConnections] = useState<any[]>([]);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const POR_PAGINA = 10;

  // Nuevas Estadísticas Comparativas
  const [absencesMonthlyData, setAbsencesMonthlyData] = useState<any[]>([]);
  const [absencesAnnualData, setAbsencesAnnualData] = useState<any[]>([]);
  const [usersRolesData, setUsersRolesData] = useState<any[]>([]);
  const [vistaComparativa, setVistaComparativa] = useState<'mensual' | 'anual'>('mensual');

  useEffect(() => {
    fetchStatistics();
  }, [userRole]);

  const fetchStatistics = async () => {
    if (userRole !== 'admin') {
      setLoading(false);
      return;
    }

    try {
      // 1. Obtener usuarios con roles
      const { data: usersData, error: usersErr } = await supabase
        .from('usuarios')
        .select('correo, roles(nombre_rol)');

      if (usersErr) throw usersErr;

      // 2. Obtener historial de accesos
      const { data: logsData, error: logsErr } = await supabase
        .from('historial_accesos')
        .select('*')
        .order('fecha_acceso', { ascending: false });

      if (logsErr) throw logsErr;

      // 3. Obtener inasistencias para comparar (1ro a 5to año)
      const { data: absencesData, error: absencesErr } = await supabase
        .from('ausencias')
        .select('ano_escolar, fecha_desde');

      if (absencesErr) throw absencesErr;

      const logs = logsData || [];
      const users = usersData || [];
      const absences = absencesData || [];

      // --- CÁLCULO 1: Total Visitas del Mes ---
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const visitasMesCount = logs.filter((log: any) => {
        const logDate = new Date(log.fecha_acceso);
        return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
      }).length;

      setTotalVisitasMes(visitasMesCount);

      // --- CÁLCULO 2: Día de la Semana con Más Tráfico ---
      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diasCount = [0, 0, 0, 0, 0, 0, 0];
      
      logs.forEach((log: any) => {
        const logDate = new Date(log.fecha_acceso);
        diasCount[logDate.getDay()]++;
      });
      
      let maxDayIndex = 0;
      let maxDayCount = 0;
      diasCount.forEach((count, index) => {
        if (count > maxDayCount) {
          maxDayCount = count;
          maxDayIndex = index;
        }
      });
      
      setDiaMasTrafico(maxDayCount > 0 ? diasSemana[maxDayIndex] : 'Ninguno');

      // --- CÁLCULO 3: Gráfico de Visitas de Representantes (últimos 6 meses) ---
      const representativeEmails = new Set(
        users
          .filter((u: any) => {
            const roleName = u.roles?.nombre_rol?.toLowerCase();
            return roleName === 'representante';
          })
          .map((u: any) => u.correo)
      );

      const representativeLogs = logs.filter((log: any) =>
        representativeEmails.has(log.correo)
      );

      const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return {
          mes: `${mesesNombres[d.getMonth()]} ${d.getFullYear()}`,
          monthNum: d.getMonth(),
          yearNum: d.getFullYear(),
          visitas: 0
        };
      });

      representativeLogs.forEach((log: any) => {
        const logDate = new Date(log.fecha_acceso);
        const logMonth = logDate.getMonth();
        const logYear = logDate.getFullYear();
        
        const matched = last6Months.find((m: any) => m.monthNum === logMonth && m.yearNum === logYear);
        if (matched) {
          matched.visitas++;
        }
      });

      setChartData(last6Months);

      // --- CÁLCULO 4: Distribución de Usuarios por Rol ---
      const rolesCount: Record<string, number> = {
        'Administrador': 0,
        'Secretaría': 0,
        'Representante': 0
      };
      users.forEach((u: any) => {
        const roleName = u.roles?.nombre_rol || 'Representante';
        const normRole = roleName.toLowerCase();
        if (normRole.includes('admin')) {
          rolesCount['Administrador']++;
        } else if (normRole.includes('secret')) {
          rolesCount['Secretaría']++;
        } else {
          rolesCount['Representante']++;
        }
      });
      const pieData = Object.keys(rolesCount).map(role => ({
        name: role,
        value: rolesCount[role]
      }));
      setUsersRolesData(pieData);

      // --- CÁLCULO 5: Inasistencias de 1ro a 5to Año ---
      const normalizeYear = (yr: string) => {
        if (!yr) return 'Otros';
        const y = yr.toLowerCase();
        if (y.includes('1er') || y.includes('1o') || y.includes('primero')) return '1er Año';
        if (y.includes('2do') || y.includes('2o') || y.includes('segundo')) return '2do Año';
        if (y.includes('3er') || y.includes('3o') || y.includes('tercero')) return '3er Año';
        if (y.includes('4to') || y.includes('4o') || y.includes('cuarto')) return '4to Año';
        if (y.includes('5to') || y.includes('5o') || y.includes('quinto')) return '5to Año';
        return 'Otros';
      };

      // 5.1. Vista Mensual (últimos 6 meses)
      const last6MonthsAbsences = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return {
          mes: `${mesesNombres[d.getMonth()]} ${d.getFullYear()}`,
          monthNum: d.getMonth(),
          yearNum: d.getFullYear(),
          '1er Año': 0,
          '2do Año': 0,
          '3er Año': 0,
          '4to Año': 0,
          '5to Año': 0
        };
      });

      absences.forEach((abs: any) => {
        const absDate = new Date(abs.fecha_desde);
        const absMonth = absDate.getMonth();
        const absYear = absDate.getFullYear();
        const yearCategory = normalizeYear(abs.ano_escolar);
        
        const matched = last6MonthsAbsences.find((m: any) => m.monthNum === absMonth && m.yearNum === absYear);
        if (matched && yearCategory !== 'Otros') {
          matched[yearCategory]++;
        }
      });
      setAbsencesMonthlyData(last6MonthsAbsences);

      // 5.2. Vista Anual
      const annualAbsencesData = [
        { name: '1er Año', inasistencias: 0 },
        { name: '2do Año', inasistencias: 0 },
        { name: '3er Año', inasistencias: 0 },
        { name: '4to Año', inasistencias: 0 },
        { name: '5to Año', inasistencias: 0 }
      ];
      absences.forEach((abs: any) => {
        const yearCategory = normalizeYear(abs.ano_escolar);
        const matched = annualAbsencesData.find(item => item.name === yearCategory);
        if (matched) {
          matched.inasistencias++;
        }
      });
      setAbsencesAnnualData(annualAbsencesData);

      // --- CÁLCULO 6: Tabla de Actividad (todos los registros para paginar) ---
      const mappedConnections = logs.map((log: any) => {
        const matchedUser = users.find((u: any) => u.correo === log.correo);
        return {
          id: log.id,
          correo: log.correo,
          fecha_acceso: log.fecha_acceso,
          nombre_rol: matchedUser?.roles?.nombre_rol || 'Representante',
          accion: log.accion || 'Inició sesión',
          modulo: log.modulo || 'Sistema'
        };
      });

      setLatestConnections(mappedConnections);

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccionBadge = (accion: string) => {
    const a = accion?.toLowerCase() || '';
    if (a.includes('inici') && a.includes('sesi')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700"><LogIn className="w-3 h-3" />{accion}</span>;
    if (a.includes('report') || a.includes('inasistencia')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700"><CalendarCheck className="w-3 h-3" />{accion}</span>;
    if (a.includes('subi') || a.includes('archivo')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700"><FileUp className="w-3 h-3" />{accion}</span>;
    if (a.includes('public') || a.includes('noticia')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-violet-50 text-violet-700"><Bell className="w-3 h-3" />{accion}</span>;
    if (a.includes('cre') && a.includes('usuario')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700"><UserPlus className="w-3 h-3" />{accion}</span>;
    if (a.includes('elimin') && a.includes('usuario')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700"><UserMinus className="w-3 h-3" />{accion}</span>;
    if (a.includes('denegado')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600"><XCircle className="w-3 h-3" />{accion}</span>;
    if (a.includes('actualiz') || a.includes('edit')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700"><FileText className="w-3 h-3" />{accion}</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-600"><Clock3 className="w-3 h-3" />{accion}</span>;
  };

  const getModuloBadge = (modulo: string) => {
    const m = modulo?.toLowerCase() || '';
    const colors: Record<string, string> = {
      'inasistencias': 'bg-orange-100 text-orange-800',
      'noticias': 'bg-violet-100 text-violet-800',
      'horarios': 'bg-blue-100 text-blue-800',
      'planes de evaluación': 'bg-indigo-100 text-indigo-800',
      'documentos': 'bg-teal-100 text-teal-800',
      'usuarios': 'bg-rose-100 text-rose-800',
      'sistema': 'bg-gray-100 text-gray-700',
    };
    const colorClass = colors[m] || 'bg-gray-100 text-gray-700';
    return <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${colorClass}`}>{modulo}</span>;
  };

  const getRoleBadge = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'administrador':
      case 'admin':
        return <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold flex items-center gap-1 w-fit"><ShieldCheck className="w-3.5 h-3.5" /> Administrador</span>;
      case 'secretaría':
      case 'secretaria':
      case 'secretary':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 w-fit"><KeyRound className="w-3.5 h-3.5" /> Secretaría</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 w-fit"><UserCircle2 className="w-3.5 h-3.5" /> Representante</span>;
    }
  };

  if (userRole !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-lg">No tienes permisos para visualizar estadísticas.</p>
        </div>
      </Layout>
    );
  }

  if (loading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando Estadísticas...</p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <InlineErrorBoundary>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          
          {/* Corporate Page Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#0a1628] via-[#0d2b5e] to-blue-800 rounded-2xl p-6 mb-8 shadow-xl">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-white rounded-full" />
              <div className="absolute bottom-0 left-1/3 w-28 h-28 bg-white rounded-full" />
            </div>
            <div className="relative flex items-center gap-4">
              <div className="bg-white/10 border border-white/20 backdrop-blur-sm p-3.5 rounded-2xl shadow-inner">
                <LineChart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Métricas del Sistema</h1>
                <p className="text-blue-200/70 text-sm mt-0.5 font-medium">Panel de control de flujo de visitas y tráfico escolar</p>
              </div>
            </div>
          </div>

          {/* Tarjetas de Resumen (Top) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Total Visitas del Mes */}
            <div className="relative overflow-hidden bg-white p-8 rounded-3xl shadow-sm border border-blue-100 flex items-center gap-6 hover:shadow-md transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -translate-y-8 translate-x-8 opacity-50" />
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-2xl shadow-md shadow-blue-200 flex items-center justify-center shrink-0">
                <MousePointerClick size={26} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Visitas del Mes</p>
                <h4 className="text-4xl font-black text-gray-900 leading-none mt-2">{totalVisitasMes}</h4>
              </div>
            </div>

            {/* Día de la Semana con Más Tráfico */}
            <div className="relative overflow-hidden bg-white p-8 rounded-3xl shadow-sm border border-indigo-100 flex items-center gap-6 hover:shadow-md transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -translate-y-8 translate-x-8 opacity-50" />
              <div className="bg-gradient-to-br from-indigo-500 to-violet-700 p-4 rounded-2xl shadow-md shadow-indigo-200 flex items-center justify-center shrink-0">
                <CalendarCheck size={26} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Día de la Semana con Más Tráfico</p>
                <h4 className="text-3xl font-black text-gray-900 leading-none mt-2">{diaMasTrafico}</h4>
              </div>
            </div>
          </div>

          {/* Fila de Gráficos Comparativos Avanzados */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            
            {/* Gráfico 1: Inasistencias de 1ro a 5to Año */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                    <div className="bg-orange-600 p-1.5 rounded-lg"><Calendar size={16} className="text-white" /></div> Comparativa de Inasistencias por Año Escolar
                  </h3>
                  <p className="text-xs text-gray-400 font-medium mt-1">Comparativa de ausencias de alumnos de 1ro a 5to año</p>
                </div>
                {/* Selector de Vista */}
                <div className="flex bg-gray-100 p-1 rounded-xl w-fit self-start sm:self-center">
                  <button
                    onClick={() => setVistaComparativa('mensual')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${vistaComparativa === 'mensual' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Mensual
                  </button>
                  <button
                    onClick={() => setVistaComparativa('anual')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${vistaComparativa === 'anual' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Anual
                  </button>
                </div>
              </div>

              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  {vistaComparativa === 'mensual' ? (
                    <BarChart data={absencesMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '16px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#64748b' }} />
                      <Bar dataKey="1er Año" fill="#3b82f6" radius={[4, 4, 0, 0]} name="1ro" />
                      <Bar dataKey="2do Año" fill="#10b981" radius={[4, 4, 0, 0]} name="2do" />
                      <Bar dataKey="3er Año" fill="#f59e0b" radius={[4, 4, 0, 0]} name="3ro" />
                      <Bar dataKey="4to Año" fill="#f97316" radius={[4, 4, 0, 0]} name="4to" />
                      <Bar dataKey="5to Año" fill="#ef4444" radius={[4, 4, 0, 0]} name="5to" />
                    </BarChart>
                  ) : (
                    <BarChart data={absencesAnnualData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '16px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
                        }}
                      />
                      <Bar dataKey="inasistencias" fill="#6366f1" radius={[6, 6, 0, 0]} name="Inasistencias Acumuladas" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Distribución de Usuarios por Rol */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <div className="bg-purple-600 p-1.5 rounded-lg"><Users size={16} className="text-white" /></div> Distribución de Roles
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-1">Porcentaje de usuarios registrados por rol</p>
              </div>

              <div className="h-48 w-full relative flex items-center justify-center min-w-0 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={usersRolesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {usersRolesData.map((_, index) => {
                        const COLORS = ['#6366f1', '#3b82f6', '#14b8a6'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total</span>
                  <span className="text-2xl font-black text-gray-800 mt-1">
                    {usersRolesData.reduce((acc, curr) => acc + curr.value, 0)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-gray-50 text-center">
                {usersRolesData.map((item, idx) => {
                  const COLORS = ['bg-indigo-500', 'bg-blue-500', 'bg-teal-500'];
                  return (
                    <div key={item.name} className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${COLORS[idx % COLORS.length]}`} />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{item.name}</span>
                      </div>
                      <span className="text-sm font-black text-gray-800 mt-1">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Gráfico Profesional (Centro) - Tráfico Mensual */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-10">
            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg"><BarChart2 size={16} className="text-white" /></div> Tráfico Mensual de Representantes
            </h3>
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitas"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorVisitas)"
                    name="Visitas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla de Actividad del Sistema */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 bg-gray-50/50 border-b flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <div className="bg-slate-700 p-1.5 rounded-lg"><MonitorCheck size={16} className="text-white" /></div> Registro de Actividad del Sistema
              </h2>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Monitoreo en Tiempo Real
              </div>
            </div>

            {latestConnections.length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-gray-400 text-sm">No se registran acciones aún en el historial.</p>
              </div>
            ) : (() => {
              const totalPaginas = Math.ceil(latestConnections.length / POR_PAGINA);
              const inicio = (paginaActual - 1) * POR_PAGINA;
              const fin = inicio + POR_PAGINA;
              const registrosPagina = latestConnections.slice(inicio, fin);
              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Usuario</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Rol</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Acción</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-center">Módulo</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-center">Fecha</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {registrosPagina.map((conn) => (
                          <tr key={conn.id} className="hover:bg-gray-50/40 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-gray-900 font-bold text-sm">{conn.correo}</p>
                            </td>
                            <td className="px-6 py-4">
                              {getRoleBadge(conn.nombre_rol)}
                            </td>
                            <td className="px-6 py-4">
                              {getAccionBadge(conn.accion)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {getModuloBadge(conn.modulo)}
                            </td>
                            <td className="px-6 py-4 text-center text-xs font-semibold text-gray-500">
                              {new Date(conn.fecha_acceso).toLocaleDateString('es-ES')}
                            </td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-gray-700">
                              {new Date(conn.fecha_acceso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Controles de Paginación */}
                  <div className="px-8 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-gray-500 font-medium">
                      Mostrando <span className="font-black text-gray-700">{inicio + 1}–{Math.min(fin, latestConnections.length)}</span> de <span className="font-black text-gray-700">{latestConnections.length}</span> registros
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                        disabled={paginaActual === 1}
                        className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        ← Anterior
                      </button>
                      <span className="px-4 py-2 rounded-xl text-xs font-black bg-slate-700 text-white shadow-sm">
                        Página {paginaActual} de {totalPaginas}
                      </span>
                      <button
                        onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                        disabled={paginaActual === totalPaginas}
                        className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Siguiente →
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>


        </div>
      </InlineErrorBoundary>
    </Layout>
  );
};
