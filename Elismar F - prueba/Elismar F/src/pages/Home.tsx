import React, { useEffect, useState } from 'react';
import { supabase, News } from '../lib/supabase';
import { Award, BookOpen, Users, Calendar, Bell, FileText, Download } from 'lucide-react';

interface InstitutionalDocument {
  id: string;
  title: string;
  description: string | null;
  category: 'organigrama' | 'reglamento' | 'norma';
  file_url: string;
  file_name: string;
  file_size: number | null;
  published: boolean;
  created_at: string;
}

export const Home: React.FC = () => {
  const [news, setNews] = useState<News[]>([]);
  const [documents, setDocuments] = useState<InstitutionalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(true);

  useEffect(() => {
    fetchNews();
    fetchDocuments();
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

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('institutional_documents')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error al descargar el archivo');
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      organigrama: 'Organigrama',
      reglamento: 'Reglamento',
      norma: 'Norma',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      organigrama: 'bg-blue-100 text-blue-800 border-blue-200',
      reglamento: 'bg-green-100 text-green-800 border-green-200',
      norma: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const groupedDocuments = documents.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, InstitutionalDocument[]>);

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

      <section className="bg-white rounded-xl shadow-md p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <FileText className="w-8 h-8 mr-3 text-blue-600" />
          Documentos Institucionales
        </h2>

        {docsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay documentos disponibles</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDocuments).map(([category, docs]) => (
              <div key={category}>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getCategoryColor(category)}`}>
                    {getCategoryLabel(category)}
                  </span>
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition">
                            {doc.title}
                          </h4>
                          {doc.description && (
                            <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{doc.file_name}</span>
                            {doc.file_size && (
                              <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(doc.file_url, doc.file_name)}
                          className="flex-shrink-0 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
                          title="Descargar documento"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
