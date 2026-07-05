import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Upload, Trash2, Eye, EyeOff, Download, Plus } from 'lucide-react';
import { FormModal } from '../components/FormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

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

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<InstitutionalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<InstitutionalDocument | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; documentId: string | null }>({
    isOpen: false,
    documentId: null,
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'reglamento' as 'organigrama' | 'reglamento' | 'norma',
    file: null as File | null,
    published: false,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('institutional_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file && !selectedDocument) {
      alert('Por favor selecciona un archivo');
      return;
    }

    setUploading(true);

    try {
      let fileUrl = selectedDocument?.file_url || '';
      let fileName = selectedDocument?.file_name || '';
      let fileSize = selectedDocument?.file_size || null;

      if (formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const filePath = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, formData.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileName = formData.file.name;
        fileSize = formData.file.size;
      }

      const documentData = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        published: formData.published,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };

      if (selectedDocument) {
        const { error } = await supabase
          .from('institutional_documents')
          .update(documentData)
          .eq('id', selectedDocument.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('institutional_documents')
          .insert([documentData]);

        if (error) throw error;
      }

      await fetchDocuments();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Error al guardar el documento');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('institutional_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchDocuments();
      setDeleteConfirm({ isOpen: false, documentId: null });
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error al eliminar el documento');
    }
  };

  const handleTogglePublished = async (doc: InstitutionalDocument) => {
    try {
      const { error } = await supabase
        .from('institutional_documents')
        .update({ published: !doc.published })
        .eq('id', doc.id);

      if (error) throw error;

      await fetchDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Error al actualizar el documento');
    }
  };

  const handleEdit = (doc: InstitutionalDocument) => {
    setSelectedDocument(doc);
    setFormData({
      title: doc.title,
      description: doc.description || '',
      category: doc.category,
      file: null,
      published: doc.published,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDocument(null);
    setFormData({
      title: '',
      description: '',
      category: 'reglamento',
      file: null,
      published: false,
    });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Documentos Institucionales</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nuevo Documento
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No hay documentos institucionales</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(doc.category)}`}>
                    {getCategoryLabel(doc.category)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTogglePublished(doc)}
                      className={`p-2 rounded-lg transition ${
                        doc.published
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={doc.published ? 'Ocultar' : 'Publicar'}
                    >
                      {doc.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">{doc.title}</h3>
                {doc.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{doc.description}</p>
                )}

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <FileText className="w-4 h-4" />
                    <span className="truncate">{doc.file_name}</span>
                  </div>
                  {doc.file_size && (
                    <p className="text-xs text-gray-500 mb-3">
                      Tamaño: {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(doc.file_url, doc.file_name)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Descargar
                    </button>
                    <button
                      onClick={() => handleEdit(doc)}
                      className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, documentId: doc.id })}
                      className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedDocument ? 'Editar Documento' : 'Nuevo Documento'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
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
              Descripción (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as 'organigrama' | 'reglamento' | 'norma' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="organigrama">Organigrama</option>
              <option value="reglamento">Reglamento</option>
              <option value="norma">Norma</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo PDF {selectedDocument && '(dejar vacío para mantener el actual)'}
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={!selectedDocument}
            />
            {selectedDocument && (
              <p className="text-sm text-gray-500 mt-2">
                Archivo actual: {selectedDocument.file_name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="published"
              checked={formData.published}
              onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="published" className="text-sm font-medium text-gray-700">
              Publicar documento (visible para todos)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={uploading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  {selectedDocument ? 'Actualizar' : 'Guardar'}
                </>
              )}
            </button>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, documentId: null })}
        onConfirm={() => deleteConfirm.documentId && handleDelete(deleteConfirm.documentId)}
        title="Eliminar Documento"
        message="¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
};
