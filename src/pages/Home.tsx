import React, { useState, useEffect } from 'react';
import { supabase, Noticias, FotoNoticia, Horarios } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { CalendarCheck2, Rss, ArrowRight, FileText, Clock, ClipboardX, Eye, Globe, MessageSquare, Newspaper, CalendarDays, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NoticiaConFotos extends Noticias {
  fotos: FotoNoticia[];
}

export const Home: React.FC = () => {
  const { profile, userRole } = useAuth();
  const [news, setNews] = useState<NoticiaConFotos[]>([]);
  const [schedules, setSchedules] = useState<Horarios[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch latest 3 news
      const { data: noticiasData } = await supabase
        .from('noticias')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(3);

      if (noticiasData) {
        const { data: fotosData } = await supabase
          .from('foto_noticia')
          .select('*');

        const combinedNews: NoticiaConFotos[] = noticiasData.map((noticia: Noticias) => ({
          ...noticia,
          fotos: (fotosData || []).filter((foto: FotoNoticia) => foto.id_noticia === noticia.id)
        }));
        setNews(combinedNews);
      }

      // Fetch upcoming schedules
      const { data: schedulesData } = await supabase
        .from('horarios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (schedulesData) {
        setSchedules(schedulesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Banner Principal Institucional */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-8 md:p-12 text-white mb-12 shadow-xl relative overflow-hidden border border-blue-600/20">
        {/* Decoración de fondo */}
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full scale-150 transform translate-x-1/4">
            <path fill="#FFFFFF" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,97.4,-2.2C98.1,13.6,93.4,29.8,83.9,43.2C74.4,56.6,60.1,67.2,44.5,74.9C28.9,82.6,12,87.4,-4.3,95.1C-20.6,102.8,-36.3,113.4,-49.6,108.9C-62.9,104.4,-73.8,84.8,-81.9,65.8C-90,46.8,-95.3,28.4,-94.1,10.7C-92.9,-7,-85.2,-24.1,-75.7,-39.3C-66.2,-54.5,-54.9,-67.8,-41.4,-75.4C-27.9,-83,-12.2,-84.9,2.2,-88.7C16.6,-92.5,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>

        {/* Contenido en flex: texto a la izquierda, logo a la derecha */}
        <div className="relative z-10 flex items-center justify-between gap-6">
          {/* Texto */}
          <div className="flex-1 min-w-0">
            <span className="px-3 py-1 bg-blue-500/30 text-blue-200 text-xs font-bold uppercase tracking-widest rounded-full mb-4 inline-block backdrop-blur-sm">
              Portal Oficial 2026
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight break-words">
              Bienvenido, {profile?.nombre_completo || 'Usuario'}
            </h1>
            <p className="text-lg md:text-xl text-blue-100/90 mb-8 font-light">
              Aplicación Académica - Liceo Nacional Joaquina Sánchez
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/news"
                className="px-6 py-3 bg-white text-blue-800 rounded-xl font-bold hover:bg-blue-50 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 transform hover:-translate-y-0.5"
              >
                <Eye className="w-5 h-5 text-blue-600" /> Ver Todas las Noticias
              </Link>
              {userRole === 'parent' && (
                <Link
                  to="/absences"
                  className="px-6 py-3 bg-blue-600/50 text-white rounded-xl font-bold hover:bg-blue-600 transition-all duration-300 shadow-md hover:shadow-lg border border-blue-500/40 flex items-center gap-2 transform hover:-translate-y-0.5 backdrop-blur-sm"
                >
                  <ClipboardX className="w-5 h-5 text-red-300" /> Reportar Inasistencia
                </Link>
              )}
            </div>
          </div>

          {/* Logo: se muestra solo en pantallas medianas o mayores */}
          <div className="hidden sm:flex shrink-0 w-28 h-28 md:w-36 md:h-36 items-center justify-center">
            <img
              src="/logo_liceo.jpg.jpeg"
              alt="Liceo Nacional Joaquina Sánchez"
              className="w-full h-full object-contain filter drop-shadow-xl"
            />
          </div>
        </div>
      </div>

      {/* Secciones del Dashboard */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Noticias */}
        <div className="lg:col-span-2 space-y-6">
          {/* Encabezado premium de sección */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-700 p-2.5 rounded-xl shadow-md shadow-blue-200">
                <Rss className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Últimas Noticias</h2>
                <p className="text-xs text-gray-400 font-medium">Comunicados y anuncios oficiales</p>
              </div>
            </div>
            <Link
              to="/news"
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg transition-all duration-200"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid gap-5">
            {news.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-gray-100">
                <div className="bg-gray-50 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Newspaper className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-gray-500 font-semibold">No hay noticias recientes en cartelera.</p>
                <p className="text-gray-400 text-xs mt-1">Las novedades institucionales aparecerán aquí.</p>
              </div>
            ) : (
              news.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-blue-100 transition-all duration-300 flex flex-col sm:flex-row group relative"
                >
                  {/* Accent bar lateral */}
                  <div className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${index === 0 ? 'bg-gradient-to-b from-blue-500 to-indigo-600' : index === 1 ? 'bg-gradient-to-b from-emerald-400 to-teal-600' : 'bg-gradient-to-b from-amber-400 to-orange-500'}`} />

                  {item.fotos.length > 0 ? (
                    <div className="sm:w-52 h-44 sm:h-auto overflow-hidden relative shrink-0 ml-1 bg-slate-50 border border-slate-100 flex items-center justify-center rounded-xl">
                      <img
                        src={item.fotos[0].ruta_foto}
                        alt={item.titulo}
                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10 group-hover:to-black/5 transition-all duration-300" />
                    </div>
                  ) : (
                    <div className="flex sm:w-52 h-40 sm:h-auto bg-gradient-to-br from-[#0d1b3e] to-blue-900 items-center justify-center shrink-0 ml-1">
                      <div className="relative flex flex-col items-center gap-2 opacity-60">
                        <Globe className="w-10 h-10 text-blue-300 stroke-[1.25]" />
                        <MessageSquare className="w-5 h-5 text-white/70 -mt-2" />
                      </div>
                    </div>
                  )}

                  <div className="p-5 pl-6 flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md inline-block">
                          Noticia Oficial
                        </span>
                        {index === 0 && (
                          <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-widest bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md inline-block">
                            Reciente
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-extrabold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-800 transition-colors leading-snug">
                        {item.titulo}
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{item.contenido}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                      <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        {new Date(item.fecha).toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <span className="text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Leer más <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna Derecha: Horarios */}
        <div className="space-y-6">
          {/* Encabezado premium */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-2.5 rounded-xl shadow-md shadow-emerald-200">
              <CalendarCheck2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Horarios Recientes</h2>
              <p className="text-xs text-gray-400 font-medium">Últimos publicados</p>
            </div>
          </div>

          {/* Panel oscuro premium de horarios */}
          <div className="bg-gradient-to-br from-[#0a1628] to-[#0d2040] rounded-2xl shadow-xl border border-white/5 overflow-hidden">
            <div className="p-5">
              {schedules.length === 0 ? (
                <div className="text-center py-10">
                  <div className="bg-white/5 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-3">
                    <CalendarDays className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm font-semibold">Sin horarios publicados aún.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {schedules.map((schedule, idx) => (
                    <div
                      key={schedule.id}
                      className="group/item flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${idx % 3 === 0 ? 'bg-emerald-500/20 text-emerald-300' : idx % 3 === 1 ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate group-hover/item:text-emerald-300 transition-colors">
                            Sección {schedule.seccion}
                          </p>
                          <p className="text-[11px] text-white/40 font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-emerald-500/50" />
                            {new Date(schedule.created_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <a
                        href={schedule.ruta_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver PDF"
                        className="shrink-0 p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all duration-300 border border-emerald-500/20"
                      >
                        <FileText className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-white/10 text-center">
                <Link
                  to="/schedules"
                  className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors group"
                >
                  Ver todos los horarios
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
