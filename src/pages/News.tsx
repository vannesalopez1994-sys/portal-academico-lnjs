import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { FormModal } from '../components/FormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase, Noticias, FotoNoticia } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Newspaper, Trash2, Image as ImageIcon, Upload, Globe, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

interface NoticiaConFotos extends Noticias {
  fotos: FotoNoticia[];
}

export const News: React.FC = () => {
  const { userRole } = useAuth();
  const [news, setNews] = useState<NoticiaConFotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    file: null as File | null,
  });

  const canManage = userRole === 'admin' || userRole === 'secretary';

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data: noticiasData, error: noticiasError } = await supabase
        .from('noticias')
        .select('*')
        .order('fecha', { ascending: false });

      if (noticiasError) throw noticiasError;

      if (noticiasData) {
        const { data: fotosData, error: fotosError } = await supabase
          .from('foto_noticia')
          .select('*');

        if (fotosError) throw fotosError;

        const combinedNews: NoticiaConFotos[] = noticiasData.map((noticia: Noticias) => ({
          ...noticia,
          fotos: (fotosData || []).filter((foto: FotoNoticia) => foto.id_noticia === noticia.id)
        }));

        setNews(combinedNews);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setUploading(true);
    try {
      // 1. Crear la Noticia
      const { data: noticiaCreada, error: insertError } = await supabase
        .from('noticias')
        .insert([
          {
            titulo: formData.titulo,
            contenido: formData.contenido,
            fecha: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Subir imagen si existe
      if (formData.file && noticiaCreada) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `noticias/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('imagenes_sistema')
          .upload(filePath, formData.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('imagenes_sistema')
          .getPublicUrl(filePath);

        const { error: fotoError } = await supabase
          .from('foto_noticia')
          .insert([
            {
              id_noticia: noticiaCreada.id,
              ruta_foto: publicUrl,
            },
          ]);

        if (fotoError) throw fotoError;
      }

      await fetchNews();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error al crear noticia:', error);
      toast.error('Error: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!newsToDelete) return;

    try {
      // Find photos
      const noticia = news.find(n => n.id === newsToDelete);
      if (noticia && noticia.fotos.length > 0) {
        for (const foto of noticia.fotos) {
          const filePath = foto.ruta_foto.split('/imagenes_sistema/')[1];
          if (filePath) {
            await supabase.storage
              .from('imagenes_sistema')
              .remove([filePath]);
          }
        }
      }

      const { error } = await supabase
        .from('noticias')
        .delete()
        .eq('id', newsToDelete);

      if (error) throw error;

      await fetchNews();
      setNewsToDelete(null);
    } catch (error) {
      console.error('Error deleting news:', error);
      toast.error('Error al eliminar la noticia');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      titulo: '',
      contenido: '',
      file: null,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten imágenes (JPG, PNG, WebP)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no debe superar los 5MB');
        return;
      }
      setFormData({ ...formData, file });
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
    <Layout bgClass="bg-blue-50/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Newspaper className="w-10 h-10 text-blue-900 stroke-[1.5]" />
            <div>
              <h1 className="text-3xl font-bold text-gray-950">Noticias y Avisos</h1>
              <p className="text-gray-500 text-sm mt-0.5">Información relevante para la comunidad escolar</p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition font-semibold text-sm shadow-md shadow-blue-100"
            >
              Crear Noticia
            </button>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {news.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Newspaper className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay noticias</h3>
              <p className="text-gray-600">
                {canManage ? 'Publica el primer aviso o noticia escolar' : 'No hay noticias disponibles en este momento'}
              </p>
            </div>
          ) : (
            news.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-lg border border-blue-100/50 overflow-hidden flex flex-col md:flex-row p-6 md:p-8 gap-6 md:gap-8 hover:border-blue-200 transition-all duration-300"
              >
                {item.fotos.length > 0 ? (
                  <div className="md:w-1/4 h-48 md:h-48 rounded-xl overflow-hidden relative bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <img
                      src={item.fotos[0].ruta_foto}
                      alt={item.titulo}
                      className="max-w-full max-h-full object-contain transition duration-300 hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="md:w-1/4 min-h-[160px] bg-[#0d1b3e] border-4 border-[#1a2b54] rounded-2xl flex items-center justify-center p-6 text-white select-none">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <Globe className="w-12 h-12 text-blue-200 stroke-[1.25]" />
                      <MessageSquare className="w-6 h-6 text-white absolute -bottom-1 -right-1 fill-[#0d1b3e] stroke-[1.5]" />
                    </div>
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-2xl font-bold text-gray-950 leading-snug">{item.titulo}</h3>
                      {canManage && (
                        <button
                          onClick={() => setNewsToDelete(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Eliminar noticia"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-4 font-semibold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      Publicado el {new Date(item.fecha).toLocaleDateString('es-ES')}
                    </p>
                    <div className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">
                      {item.contenido}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <FormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Crear Nueva Noticia o Aviso"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Suspensión de actividades por lluvia"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contenido de la Noticia
            </label>
            <textarea
              value={formData.contenido}
              onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
              placeholder="Escribe el cuerpo completo de la noticia..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent min-h-[150px]"
              required
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Imagen (Opcional)
            </span>
            <label
              htmlFor="img-upload"
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition cursor-pointer bg-gray-50 flex flex-col items-center justify-center w-full"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="img-upload"
              />
              <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                <ImageIcon className="w-8 h-8 text-orange-500" />
              </div>
              <span className="text-sm font-medium text-gray-700 mb-1">
                {formData.file ? formData.file.name : 'Añadir foto a la noticia'}
              </span>
              <span className="text-xs text-gray-500">
                {formData.file ? `${(formData.file.size / (1024 * 1024)).toFixed(2)} MB` : 'PNG, JPG. Máximo 5MB'}
              </span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              disabled={uploading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={uploading || !formData.titulo || !formData.contenido}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publicar Noticia</span>
                </>
              )}
            </button>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        isOpen={!!newsToDelete}
        onClose={() => setNewsToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Noticia"
        message={`¿Estás seguro de que deseas eliminar esta noticia? Las fotos asociadas también se borrarán permanentemente.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </Layout>
  );
};
