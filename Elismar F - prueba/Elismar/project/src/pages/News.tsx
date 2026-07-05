import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { FormModal } from '../components/FormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Newspaper, Plus, Edit2, Trash2, Eye, EyeOff, Upload, X, Calendar } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  event_date?: string;
  event_time?: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  published: boolean;
  profiles?: {
    full_name: string;
  };
}

export const News: React.FC = () => {
  const { profile } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [newsToDelete, setNewsToDelete] = useState<NewsItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    event_date: '',
    event_time: '',
    published: true,
    image: null as File | null,
    existingImageUrl: '',
  });

  const canManage = profile?.role === 'admin' || profile?.role === 'secretary';

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('id, title, content, image_url, event_date, event_time, author_id, created_at, updated_at, published, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setUploading(true);
    try {
      let imageUrl = formData.existingImageUrl;

      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `news/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, formData.image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      if (editingNews) {
        const { error } = await supabase
          .from('news')
          .update({
            title: formData.title,
            content: formData.content,
            event_date: formData.event_date || null,
            event_time: formData.event_time || null,
            published: formData.published,
            image_url: imageUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingNews.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('news')
          .insert([
            {
              title: formData.title,
              content: formData.content,
              event_date: formData.event_date || null,
              event_time: formData.event_time || null,
              published: formData.published,
              image_url: imageUrl || null,
              author_id: profile.id,
            },
          ]);

        if (error) throw error;
      }

      await fetchNews();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving news:', error);
      alert('Error al guardar la noticia: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!newsToDelete) return;

    try {
      if (newsToDelete.image_url) {
        const filePath = newsToDelete.image_url.split('/images/')[1];
        if (filePath) {
          await supabase.storage
            .from('images')
            .remove([filePath]);
        }
      }

      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', newsToDelete.id);

      if (error) throw error;
      await fetchNews();
      setNewsToDelete(null);
    } catch (error) {
      console.error('Error deleting news:', error);
      alert('Error al eliminar la noticia');
    }
  };

  const handleEdit = (newsItem: NewsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      content: newsItem.content,
      event_date: newsItem.event_date || '',
      event_time: newsItem.event_time || '',
      published: newsItem.published,
      image: null,
      existingImageUrl: newsItem.image_url || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNews(null);
    setFormData({
      title: '',
      content: '',
      event_date: '',
      event_time: '',
      published: true,
      image: null,
      existingImageUrl: '',
    });
  };

  const togglePublished = async (newsItem: NewsItem) => {
    try {
      const { error } = await supabase
        .from('news')
        .update({ published: !newsItem.published })
        .eq('id', newsItem.id);

      if (error) throw error;
      await fetchNews();
    } catch (error) {
      console.error('Error toggling published status:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Solo se permiten archivos de imagen');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar los 5MB');
        return;
      }
      setFormData({ ...formData, image: file });
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image: null, existingImageUrl: '' });
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Newspaper className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Noticias e Información</h1>
              <p className="text-gray-600">Información del plantel</p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Nueva Noticia
            </button>
          )}
        </div>

        <div className="grid gap-6">
          {news.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Newspaper className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay noticias</h3>
              <p className="text-gray-600">
                {canManage ? 'Crea la primera noticia para el plantel' : 'No hay noticias disponibles aún'}
              </p>
            </div>
          ) : (
            news.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden ${!item.published ? 'opacity-60' : ''}`}
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-64 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                        {!item.published && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                            Borrador
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Por {item.profiles?.full_name || 'Desconocido'} • {new Date(item.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      {(item.event_date || item.event_time) && (
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                          <Calendar className="w-4 h-4" />
                          {item.event_date && (
                            <span>{new Date(item.event_date).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}</span>
                          )}
                          {item.event_time && (
                            <span>• {item.event_time.slice(0, 5)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePublished(item)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                          title={item.published ? 'Ocultar' : 'Publicar'}
                        >
                          {item.published ? (
                            <Eye className="w-5 h-5 text-gray-600" />
                          ) : (
                            <EyeOff className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-5 h-5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => setNewsToDelete(item)}
                          className="p-2 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <FormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingNews ? 'Editar Noticia' : 'Nueva Noticia'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contenido
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha del Evento (Opcional)
              </label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora del Evento (Opcional)
              </label>
              <input
                type="time"
                value={formData.event_time}
                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagen (Opcional)
            </label>
            {(formData.image || formData.existingImageUrl) ? (
              <div className="relative">
                <img
                  src={formData.image ? URL.createObjectURL(formData.image) : formData.existingImageUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    Click para seleccionar una imagen
                  </span>
                  <span className="text-xs text-gray-500 mt-1">Máximo 5MB</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              checked={formData.published}
              onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="published" className="text-sm text-gray-700">
              Publicar inmediatamente
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              disabled={uploading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              {uploading ? 'Guardando...' : editingNews ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        isOpen={!!newsToDelete}
        onClose={() => setNewsToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Noticia"
        message={`¿Estás seguro de que deseas eliminar la noticia "${newsToDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </Layout>
  );
};
