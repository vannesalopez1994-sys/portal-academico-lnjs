import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { FormModal } from '../components/FormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Plus, Edit2, Trash2, Upload, FileText, X } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  grade_level: string;
  description: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
}

export const Classes: React.FC = () => {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    grade_level: '',
    description: '',
    file: null as File | null,
    existingFileUrl: '',
  });

  const canManage = profile?.role === 'admin' || profile?.role === 'secretary';

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('grade_level', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setUploading(true);
    try {
      let fileUrl = formData.existingFileUrl;

      if (formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `classes/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, formData.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
      }

      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update({
            name: formData.name,
            grade_level: formData.grade_level,
            description: formData.description,
            file_url: fileUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingClass.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('classes')
          .insert([
            {
              name: formData.name,
              grade_level: formData.grade_level,
              description: formData.description,
              file_url: fileUrl || null,
            },
          ]);

        if (error) throw error;
      }

      await fetchClasses();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving class:', error);
      alert('Error al guardar la clase: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!classToDelete) return;

    try {
      if (classToDelete.file_url) {
        const filePath = classToDelete.file_url.split('/documents/')[1];
        if (filePath) {
          await supabase.storage
            .from('documents')
            .remove([filePath]);
        }
      }

      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classToDelete.id);

      if (error) throw error;
      await fetchClasses();
      setClassToDelete(null);
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Error al eliminar la clase');
    }
  };

  const handleEdit = (classItem: Class) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      grade_level: classItem.grade_level,
      description: classItem.description,
      file: null,
      existingFileUrl: classItem.file_url || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClass(null);
    setFormData({
      name: '',
      grade_level: '',
      description: '',
      file: null,
      existingFileUrl: '',
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

  const removeFile = () => {
    setFormData({ ...formData, file: null, existingFileUrl: '' });
  };

  const groupedClasses = classes.reduce((acc, classItem) => {
    if (!acc[classItem.grade_level]) {
      acc[classItem.grade_level] = [];
    }
    acc[classItem.grade_level].push(classItem);
    return acc;
  }, {} as Record<string, Class[]>);

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
            <div className="bg-orange-100 p-3 rounded-xl">
              <BookOpen className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clases y Asignaturas</h1>
              <p className="text-gray-600">Gestión de clases del plantel</p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
            >
              <Plus className="w-5 h-5" />
              Nueva Clase
            </button>
          )}
        </div>

        {classes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay clases</h3>
            <p className="text-gray-600">
              {canManage ? 'Crea la primera clase del plantel' : 'No hay clases disponibles aún'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedClasses).map(([gradeLevel, classList]) => (
              <div key={gradeLevel} className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{gradeLevel}</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classList.map((classItem) => (
                    <div
                      key={classItem.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-orange-500 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                        {canManage && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(classItem)}
                              className="p-1.5 hover:bg-orange-50 rounded transition"
                            >
                              <Edit2 className="w-4 h-4 text-orange-600" />
                            </button>
                            <button
                              onClick={() => setClassToDelete(classItem)}
                              className="p-1.5 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>
                      {classItem.description && (
                        <p className="text-sm text-gray-600 mb-3">{classItem.description}</p>
                      )}
                      {classItem.file_url && (
                        <a
                          href={classItem.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          Ver Material PDF
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingClass ? 'Editar Clase' : 'Nueva Clase'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Clase
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Matemáticas"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nivel/Grado
            </label>
            <select
              value={formData.grade_level}
              onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="">Selecciona un nivel</option>
              <option value="1er Año">1er Año</option>
              <option value="2do Año">2do Año</option>
              <option value="3er Año">3er Año</option>
              <option value="4to Año">4to Año</option>
              <option value="5to Año">5to Año</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (Opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Descripción breve de la clase"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material PDF (Opcional)
            </label>
            {(formData.file || formData.existingFileUrl) ? (
              <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-gray-700">
                    {formData.file ? formData.file.name : 'Archivo existente'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1 hover:bg-red-50 rounded transition"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload-class"
                />
                <label
                  htmlFor="file-upload-class"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    Click para seleccionar archivo PDF
                  </span>
                  <span className="text-xs text-gray-500 mt-1">Máximo 10MB</span>
                </label>
              </div>
            )}
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
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              {uploading ? 'Guardando...' : editingClass ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        isOpen={!!classToDelete}
        onClose={() => setClassToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Clase"
        message={`¿Estás seguro de que deseas eliminar la clase "${classToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </Layout>
  );
};
