import React, { useState, useEffect } from 'react';
import { supabase, Noticias, FotoNoticia, Horarios, getPublicUrl } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Newspaper, ArrowRight, BookOpen, Clock, AlertCircle } from 'lucide-react';
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
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-8 md:p-12 text-white mb-12 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Bienvenido, {profile?.nombre_completo || 'Usuario'}
          </h1>
          <p className="text-xl text-blue-100 mb-8 font-light">
            L.N. Joaquina Sánchez - Portal de Gestión e Información Escolar
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/news"
              className="px-6 py-3 bg-white text-blue-700 rounded-full font-bold hover:bg-blue-50 transition shadow-lg flex items-center gap-2"
            >
              <Newspaper className="w-5 h-5" /> Ver Todas las Noticias
            </Link>
            {userRole === 'parent' && (
              <Link
                to="/absences"
                className="px-6 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-500 transition shadow-lg border border-blue-500 flex items-center gap-2"
              >
                <AlertCircle className="w-5 h-5" /> Reportar Inasistencia
              </Link>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-8 md:mt-0 flex-shrink-0">
          <img
            src="/logo_liceo.png"
            alt="Logo L.N. Joaquina Sánchez"
            className="h-24 md:h-32 w-auto object-contain drop-shadow-2xl"
          />
        </div>

        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full scale-150 transform translate-x-1/4">
            <path fill="#FFFFFF" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,97.4,-2.2C98.1,13.6,93.4,29.8,83.9,43.2C74.4,56.6,60.1,67.2,44.5,74.9C28.9,82.6,12,87.4,-4.3,95.1C-20.6,102.8,-36.3,113.4,-49.6,108.9C-62.9,104.4,-73.8,84.8,-81.9,65.8C-90,46.8,-95.3,28.4,-94.1,10.7C-92.9,-7,-85.2,-24.1,-75.7,-39.3C-66.2,-54.5,-54.9,-67.8,-41.4,-75.4C-27.9,-83,-12.2,-84.9,2.2,-88.7C16.6,-92.5,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
              <Newspaper className="text-orange-500" /> Últimas Noticias
            </h2>
            <Link to="/news" className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid gap-6">
            {news.length === 0 ? (
              <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-100">
                <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay noticias recientes.</p>
              </div>
            ) : (
              news.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition flex flex-col sm:flex-row group">
                  {item.fotos.length > 0 ? (
                    <div className="sm:w-48 h-48 sm:h-auto overflow-hidden">
                      <img
                        src={getPublicUrl('documentos_pdf', item.fotos[0].ruta_foto)}
                        alt={item.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>
                  ) : (
                    <div className="hidden sm:flex sm:w-16 bg-orange-50 items-center justify-center text-orange-400">
                      <Newspaper />
                    </div>
                  )}
                  <div className="p-6 flex-1">
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">Noticia Oficial</p>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{item.titulo}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2 text-sm">{item.contenido}</p>
                    <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(item.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
              <Calendar className="text-green-500" /> Horarios Recientes
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {schedules.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No se han publicado horarios.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm mb-1">{schedule.seccion}</h4>
                        <p className="text-xs text-gray-500">Publicado: {new Date(schedule.created_at).toLocaleDateString('es-ES')}</p>
                      </div>
                      <a
                        href={getPublicUrl('documentos_pdf', schedule.ruta_pdf)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                      >
                        <BookOpen className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <Link to="/schedules" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                Ver todos los horarios →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};


