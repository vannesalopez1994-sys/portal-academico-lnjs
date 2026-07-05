import React, { useEffect, useState } from 'react';
import { supabase, News } from '../lib/supabase';
import { Award, BookOpen, Users, Calendar, Bell } from 'lucide-react';

export const Home: React.FC = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 md:p-12 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Bienvenido al Sistema de Gestión Académica
            </h1>
            <p className="text-xl text-blue-100">
              Una plataforma integral para la administración eficiente de tu institución educativa
            </p>
          </div>
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-8">
            <Award className="w-24 h-24" />
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div className="bg-blue-100 rounded-full w-14 h-14 flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Gestión Académica</h3>
          <p className="text-gray-600">
            Administra de forma eficiente las actividades académicas de tu institución
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div className="bg-orange-100 rounded-full w-14 h-14 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Comunicación Directa</h3>
          <p className="text-gray-600">
            Mantén una comunicación fluida entre padres, docentes y administración
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div className="bg-green-100 rounded-full w-14 h-14 flex items-center justify-center mb-4">
            <Calendar className="w-7 h-7 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Control de Asistencia</h3>
          <p className="text-gray-600">
            Sistema integrado para el seguimiento y gestión de inasistencias
          </p>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-md p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <Bell className="w-8 h-8 mr-3 text-blue-600" />
          Noticias y Anuncios
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : news.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No hay noticias publicadas</p>
        ) : (
          <div className="space-y-6">
            {news.map((item) => (
              <article key={item.id} className="border-l-4 border-blue-600 pl-6 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 mb-2">{item.content}</p>
                <p className="text-sm text-gray-500">
                  {new Date(item.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Reglamento Institucional</h2>
        <div className="space-y-4 text-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Asistencia</h3>
            <p>
              La asistencia es obligatoria. En caso de inasistencia, los padres deben notificar a través
              del sistema antes de las 8:00 AM.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Horarios</h3>
            <p>
              El horario de clases es de 8:00 AM a 3:00 PM. Se requiere puntualidad para el ingreso a la
              institución.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Uniforme</h3>
            <p>
              El uso del uniforme es obligatorio. Los estudiantes deben presentarse con el uniforme
              completo y en buen estado.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">4. Conducta</h3>
            <p>
              Se espera un comportamiento respetuoso de todos los miembros de la comunidad educativa.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
