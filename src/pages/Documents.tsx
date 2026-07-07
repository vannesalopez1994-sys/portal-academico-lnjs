import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { FormModal } from '../components/FormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase, DocumentosInstitucionales } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Upload, ExternalLink, FileBadge2, FolderArchive, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

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

      const { data: { publicUrl } } = supabase.storage
        .from('documentos_pdf')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('documentos_institucionales')
        .insert([
          {
            titulo: formData.titulo,
            ruta_pdf: publicUrl,
          },
        ]);

      if (insertError) throw insertError;

      await fetchDocuments();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir el documento: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      const filePath = documentToDelete.ruta_pdf.split('/documentos_pdf/')[1];
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
      toast.error('Error al eliminar el documento');
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
        toast.error('Solo se permiten archivos PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo no debe superar los 10MB');
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
        {/* Corporate Page Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#0a1628] via-[#0d2b5e] to-blue-800 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white rounded-full" />
            <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white rounded-full" />
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 border border-white/20 backdrop-blur-sm p-3.5 rounded-2xl shadow-inner">
                <FolderArchive className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Documentos Institucionales</h1>
                <p className="text-blue-200/70 text-sm mt-0.5 font-medium">Archivos y normativas del plantel · Liceo Nacional Joaquina Sánchez</p>
              </div>
            </div>
            {canManage && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-white text-blue-900 px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all shadow-lg font-bold text-sm w-fit shrink-0"
              >
                <Plus className="w-4 h-4" />
                Subir Documento
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-5">
                <FolderArchive className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sin documentos disponibles</h3>
              <p className="text-gray-400 max-w-xs mx-auto text-sm">
                {canManage ? 'Sube el primer documento institucional' : 'No hay documentos publicados aún'}
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Top colored bar */}
                <div className="h-1.5 bg-gradient-to-r from-blue-600 to-blue-400" />

                <div className="p-5 flex flex-col flex-1">
                  {/* Header card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-50 border border-red-100 p-2.5 rounded-xl">
                        <FileBadge2 className="w-6 h-6 text-red-500" />
                      </div>
                      <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full uppercase tracking-widest">
                        PDF
                      </span>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => setDocumentToDelete(doc)}
                        className="p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title="Eliminar documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-gray-800 mb-2 line-clamp-2 flex-1" title={doc.titulo}>
                    {doc.titulo}
                  </h3>

                  <p className="text-[11px] text-gray-400 font-medium mb-4 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-blue-300" />
                    Publicado: {new Date(doc.created_at).toLocaleDateString('es-ES')}
                  </p>

                  <a
                    href={doc.ruta_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#0a1628] to-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-all duration-200 text-sm shadow-md shadow-blue-900/20"
                  >
                    <ExternalLink className="w-4 h-4" />
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
