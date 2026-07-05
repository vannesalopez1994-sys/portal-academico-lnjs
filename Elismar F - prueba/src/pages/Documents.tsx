import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { FormModal } from '../components/FormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase, DocumentosInstitucionales, getPublicUrl } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FolderOpen, Plus, Trash2, FileText, Upload } from 'lucide-react';

export const Documents: React.FC = () => {
  const { userRole } = useAuth();
  const [documents, setDocuments] = useState<DocumentosInstitucionales[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentosInstitucionales | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    file: null as File | null,
  });

  const canManage = userRole === 'admin' || userRole === 'secretary';

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos_institucionales')
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
    if (!formData.file) return;

    setUploading(true);
    try {
      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documentos_institucionales/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos_pdf')
        .upload(filePath, formData.file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('documentos_institucionales')
        .insert([
          {
            titulo: formData.titulo,
            ruta_pdf: filePath,
          },
        ]);

      if (insertError) throw insertError;

      await fetchDocuments();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      alert('Error al subir el documento: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      const filePath = documentToDelete.ruta_pdf;
      if (filePath) {
        await supabase.storage
          .from('documentos_pdf')
          .remove([filePath]);
      }

      const { error } = await supabase
        .from('documentos_institucionales')
        .delete()
        .eq('id', documentToDelete.id);

      if (error) throw error;
      await fetchDocuments();
      setDocumentToDelete(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error al eliminar el documento');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      titulo: '',
      file: null,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Solo se permiten archivos PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo no debe superar los 10MB');
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
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <FolderOpen className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Documentos Institucionales</h1>
              <p className="text-gray-600">Archivos y normativas del plantel</p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus className="w-5 h-5" />
              Subir Documento
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center">
              <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay documentos</h3>
              <p className="text-gray-600">
                {canManage ? 'Sube el primer documento institucional' : 'No hay documentos disponibles aún'}
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-red-50 p-3 rounded-lg group-hover:bg-red-100 transition">
                    <FileText className="w-8 h-8 text-red-500" />
                  </div>
                  {canManage && (
                    <button
                      onClick={() => setDocumentToDelete(doc)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                      title="Eliminar documento"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2" title={doc.titulo}>
                  {doc.titulo}
                </h3>

                <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                  {new Date(doc.created_at).toLocaleDateString('es-ES')}
                </p>

                <div className="flex gap-3">
                  <a
                    href={getPublicUrl('documentos_pdf', doc.ruta_pdf)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-indigo-50 text-indigo-700 font-medium py-2 px-4 rounded-lg hover:bg-indigo-100 transition"
                  >
                    Ver Documento
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <FormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Subir Nuevo Documento"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título del Documento
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Reglamento Interno 2024"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo PDF
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition cursor-pointer bg-gray-50">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="doc-upload"
                required
              />
              <label
                htmlFor="doc-upload"
                className="cursor-pointer flex flex-col items-center w-full h-full"
              >
                <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                  <Upload className="w-8 h-8 text-indigo-500" />
                </div>
                <span className="text-sm font-medium text-gray-700 mb-1">
                  {formData.file ? formData.file.name : 'Seleccionar archivo PDF'}
                </span>
                <span className="text-xs text-gray-500">
                  {formData.file ? `${(formData.file.size / (1024 * 1024)).toFixed(2)} MB` : 'Máximo 10MB'}
                </span>
              </label>
            </div>
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
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={uploading || !formData.file}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Subir Documento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        isOpen={!!documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Documento"
        message={`¿Estás seguro de que deseas eliminar el documento "${documentToDelete?.titulo}"? Esta acción no se puede deshacer y el archivo PDF se borrará permanentemente.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </Layout>
  );
};
