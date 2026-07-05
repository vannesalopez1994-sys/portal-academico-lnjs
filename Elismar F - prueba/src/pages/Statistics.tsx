import React, { useState, useEffect, useRef, ErrorInfo } from 'react';

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
          <pre className="whitespace-pre-wrap bg-red-100 p-4 rounded-lg mt-4 text-xs">{this.state.error?.stack}</pre>
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  Users as UsersIcon,
  BookOpen,
  Download,
  Activity,
  Loader2,
  Megaphone,
  Folder,
  PieChart as PieChartIcon,
  FileText,
  Clock,
  Calendar
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const INSTITUTIONAL_LOGO = '/logo_liceo.png';

export const Statistics: React.FC = () => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState({
    usuariosPorRol: [] as any[],
    planesPorAnio: [] as any[],
    resumenMensual: [] as any[],
    planesDetallados: [] as any[],
    noticiasDetalladas: [] as any[],
    horariosDetallados: [] as any[],
    documentosDetallados: [] as any[],
    actividadNoticias: [] as any[],
    distribucionContenido: [] as any[],
    horariosPorAnio: [] as any[],
    totales: {
      usuarios: 0,
      inasistencias: 0,
      planes: 0,
      noticias: 0,
      horarios: 0,
      documentos: 0
    }
  });

  // Paleta premium
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    fetchStatistics();
  }, [userRole]);

  const fetchStatistics = async () => {
    if (userRole !== 'admin') return;

    try {
      // 1. Usuarios por rol
      const { data: usersData } = await supabase.from('usuarios').select('id, id_rol, roles(nombre_rol)');
      const rolesCount: Record<string, number> = {};
      usersData?.forEach(user => {
        const roleName = (user.roles as any)?.nombre_rol || 'Desconocido';
        rolesCount[roleName] = (rolesCount[roleName] || 0) + 1;
      });

      const usuariosPorRol = Object.entries(rolesCount).map(([name, value]) => ({
        name: name === 'admin' ? 'Administradores' : name === 'parent' ? 'Representantes' : name === 'secretary' ? 'Secretaría' : name,
        value
      }));

      // 2. Datos de Planes, Noticias, Horarios y Documentos
      const [
        { data: plansData },
        { data: newsData },
        { data: scheduleData },
        { data: docsData }
      ] = await Promise.all([
        supabase.from('planes_evaluacion').select('*'),
        supabase.from('noticias').select('*').order('created_at', { ascending: false }),
        supabase.from('horarios').select('*'),
        supabase.from('documentos_institucionales').select('*')
      ]);

      // Detalle para tablas PDF
      const planesDetallados = (plansData || []).map(p => ({ materia: p.materia, anio: p.anio_escolar, seccion: p.seccion }));
      const noticiasDetalladas = (newsData || []).map(n => ({ titulo: n.titulo, fecha: new Date(n.created_at).toLocaleDateString() }));
      const horariosDetallados = (scheduleData || []).map(h => ({ seccion: h.seccion, fecha: new Date(h.created_at).toLocaleDateString() }));
      const documentosDetallados = (docsData || []).map(d => ({ titulo: d.titulo, fecha: new Date(d.created_at).toLocaleDateString() }));

      // 3. Gráficos de Distribución de Contenido
      const totalContenido = (plansData?.length || 0) + (newsData?.length || 0) + (scheduleData?.length || 0);
      const distribucionContenido = [
        { name: 'Planes', value: plansData?.length || 0 },
        { name: 'Noticias', value: newsData?.length || 0 },
        { name: 'Horarios', value: scheduleData?.length || 0 }
      ];

      // 4. Actividad de Noticias (Histórico 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      });

      const noticiasPorMes: Record<string, number> = {};
      newsData?.forEach(n => {
        const date = new Date(n.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        noticiasPorMes[monthKey] = (noticiasPorMes[monthKey] || 0) + 1;
      });
      const actividadNoticias = meses.map(m => ({ mes: m, cantidad: noticiasPorMes[m] || 0 }));

      // 5. Horarios por Año/Sección
      const schedulesBySection: Record<string, number> = {};
      scheduleData?.forEach(h => {
        const section = h.seccion?.split(' ')[0] || 'Otras'; // Simplificamos a primer nombre
        schedulesBySection[section] = (schedulesBySection[section] || 0) + 1;
      });
      const horariosPorAnio = Object.entries(schedulesBySection).map(([name, value]) => ({ name, value }));

      // 6. Totales finales
      const { count: uCount } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
      const { count: aCount } = await supabase.from('ausencias').select('*', { count: 'exact', head: true });

      setStats({
        usuariosPorRol,
        planesPorAnio: [], // Ya no se usa individualmente
        resumenMensual: [], // Ya no se usa individualmente
        planesDetallados,
        noticiasDetalladas,
        horariosDetallados,
        documentosDetallados,
        actividadNoticias,
        distribucionContenido,
        horariosPorAnio,
        totales: {
          usuarios: uCount || 0,
          inasistencias: aCount || 0,
          planes: plansData?.length || 0,
          noticias: newsData?.length || 0,
          horarios: scheduleData?.length || 0,
          documentos: docsData?.length || 0
        }
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);

    try {
      const element = reportRef.current;
      // Forzamos visibilidad del membrete solo para la captura
      const header = element.querySelector('.print-only');
      if (header) header.classList.remove('hidden');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      if (header) header.classList.add('hidden');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);

      pdf.addImage(imgData, 'PNG', 0, 10, canvas.width * ratio, canvas.height * ratio);
      pdf.save(`reporte-gestion-completo-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error al generar el PDF.');
    } finally {
      setExporting(false);
    }
  };

  const currentFormattedDate = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  if (loading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sincronizando Sistema...</p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <InlineErrorBoundary>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-indigo-600 rounded-[2rem] shadow-2xl shadow-indigo-200">
                <TrendingUp className="text-white w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-gray-900 leading-none mb-2">Dashboard Académico</h1>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Inteligencia de Datos Joaquina Sánchez</p>
              </div>
            </div>

            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-100 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              <span>Exportar Informe</span>
            </button>
          </div>

          {/* Captura del Reporte */}
          <div ref={reportRef} className="space-y-10 bg-white p-8 rounded-[3rem] shadow-sm border border-gray-50">

            {/* Membrete (Solo para PDF) */}
            <div className="print-only hidden flex flex-col space-y-6 mb-10">
              <div className="flex items-start gap-6">
                <img src={INSTITUTIONAL_LOGO} alt="Insignia" className="w-24 h-24 object-contain" />
                <div className="flex flex-col justify-center">
                  <p className="text-xs font-bold text-gray-700 leading-tight">REPÚBLICA BOLIVARIANA DE VENEZUELA</p>
                  <p className="text-xs font-bold text-gray-700 leading-tight">MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN</p>
                  <p className="text-sm font-black text-gray-900 mt-1">L.N. JOAQUINA SÁNCHEZ - S1140D0701</p>
                  <p className="text-[10px] font-bold text-gray-400 italic mt-2">Emitido el: {currentFormattedDate}</p>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" />
            </div>

            {/* Grid de Métricas (6 Tarjetas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard label="Usuarios Totales" value={stats.totales.usuarios} icon={<UsersIcon size={24} />} color="blue" />
              <StatCard label="Noticias" value={stats.totales.noticias} icon={<Megaphone size={24} />} color="purple" />
              <StatCard label="Planes" value={stats.totales.planes} icon={<BookOpen size={24} />} color="green" />
              <StatCard label="Horarios" value={stats.totales.horarios} icon={<Calendar size={24} />} color="cyan" />
              <StatCard label="Documentos" value={stats.totales.documentos} icon={<Folder size={24} />} color="orange" />
              <StatCard label="Faltas" value={stats.totales.inasistencias} icon={<Activity size={24} />} color="red" />
            </div>

            {/* Gráficos Principales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Distribución de Contenido (Doughnut) */}
              <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 h-[28rem]">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <PieChartIcon size={20} className="text-indigo-500" /> Distribución de Carga
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.distribucionContenido} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                        {stats.distribucionContenido.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Legend verticalAlign="bottom" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Actividad de Noticias (Area) */}
              <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 h-[28rem]">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <FileText size={20} className="text-purple-500" /> Actividad Informativa
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.actividadNoticias}>
                      <defs>
                        <linearGradient id="colorNews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: '15px' }} />
                      <Area type="monotone" dataKey="cantidad" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorNews)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Carga de Horarios (Bar) */}
              <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 lg:col-span-2">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <Clock size={20} className="text-cyan-500" /> Estado de Horarios por Nivel
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.horariosPorAnio}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'medium' }} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '15px' }} />
                      <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} barSize={50} name="Horarios Listos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Firmas (Solo visibles en PDF) */}
            <div className="print-only hidden grid grid-cols-2 gap-20 pt-20 pb-5">
              <div className="text-center border-t-2 border-slate-900 pt-3">
                <p className="text-[10px] font-black uppercase">Firma del Director</p>
                <p className="text-[8px] text-slate-400">Sello de la Institución</p>
              </div>
              <div className="text-center border-t-2 border-slate-900 pt-3">
                <p className="text-[10px] font-black uppercase">Coordinación de Evaluación</p>
                <p className="text-[8px] text-slate-400">Control Académico</p>
              </div>
            </div>

          </div>
        </div>
      </InlineErrorBoundary>
    </Layout>
  );
};

// Componente helper para las tarjetas
const StatCard = ({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) => {
  const themes: any = {
    blue: "bg-blue-50 text-blue-600 shadow-blue-100",
    purple: "bg-purple-50 text-purple-600 shadow-purple-100",
    green: "bg-green-50 text-green-600 shadow-green-100",
    cyan: "bg-cyan-50 text-cyan-600 shadow-cyan-100",
    orange: "bg-orange-50 text-orange-600 shadow-orange-100",
    red: "bg-red-50 text-red-600 shadow-red-100"
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-5 hover:shadow-lg transition-all group">
      <div className={`p-4 rounded-2xl ${themes[color]} transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <h4 className="text-3xl font-black text-slate-900 leading-none mt-1">{value}</h4>
      </div>
    </div>
  );
};
