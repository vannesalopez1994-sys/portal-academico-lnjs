import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { FormModal } from '../components/FormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase, Horarios, getPublicUrl } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Plus, Trash2, FileText, Upload } from 'lucide-react';

export const Schedules: React.FC = () => {
  const { userRole } = useAuth();
  const [schedules, setSchedules] = useState<Horarios[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<Horarios | null>(null);
  const [formData, setFormData] = useState({
    seccion: '',
    file: null as File | null,
  });

  const canManage = userRole === 'admin' || userRole === 'secretary';

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('horarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
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
      const filePath = `horarios/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos_pdf')
        .upload(filePath, formData.file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('horarios')
        .insert([
          {
            seccion: formData.seccion,
            ruta_pdf: filePath,
          },
        ]);

      if (insertError) throw insertError;

      await fetchSchedules();
      handleCloseModal();
    } // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (error: any) {
      console.error('Error uploading schedule:', error);
      if (error.message?.includes('not found')) {
        alert('El bucket de almacenamiento no existe. Por favor, contacta al administrador del sistema.');
      } else {
        alert('Error al subir el horario: ' + (error.message || 'Error desconocido'));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;

    try {
      const filePath = scheduleToDelete.ruta_pdf;
      if (filePath) {
        await supabase.storage
          .from('documentos_pdf')
          .remove([filePath]);
      }

      const { error } = await supabase
        .from('horarios')
        .delete()
        .eq('id', scheduleToDelete.id);

      if (error) throw error;
      await fetchSchedules();
      setScheduleToDelete(null);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Error al eliminar el horario');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      seccion: '',
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
            <div className="bg-green-100 p-3 rounded-xl">
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Horarios</h1>
              <p className="text-gray-600">Horarios del plantel en formato PDF</p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Plus className="w-5 h-5" />
              Subir Horario
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay horarios</h3>
              <p className="text-gray-600">
                {canManage ? 'Sube el primer horario del plantel' : 'No hay horarios disponibles aún'}
              </p>
            </div>
          ) : (
            schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-red-600" />
                  </div>
                  {canManage && (
                    <button
                      onClick={() => setScheduleToDelete(schedule)}
                      className="p-2 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Sección: {schedule.seccion}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {new Date(schedule.created_at).toLocaleDateString('es-ES')}
                </p>
                <a
                  href={getPublicUrl('documentos_pdf', schedule.ruta_pdf)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Ver PDF
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      <FormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Subir Nuevo Horario"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sección del Horario
            </label>
            <input
              type="text"
              value={formData.seccion}
              onChange={(e) => setFormData({ ...formData, seccion: e.target.value })}
              placeholder="Ej: 3er Año Sección A"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo PDF
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                required
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  {formData.file ? formData.file.name : 'Click para seleccionar archivo PDF'}
                </span>
                <span className="text-xs text-gray-500 mt-1">Máximo 10MB</span>
              </label>
            </div>
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
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading || !formData.file}
            >
              {uploading ? 'Subiendo...' : 'Subir Horario'}
            </button>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        isOpen={!!scheduleToDelete}
        onClose={() => setScheduleToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Horario"
        message={`¿Estás seguro de que deseas eliminar el horario de la sección "${scheduleToDelete?.seccion}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </Layout>
  );
};
