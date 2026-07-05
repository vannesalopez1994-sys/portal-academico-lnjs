import React, { useEffect, useState } from 'react';
import { supabase, Absence } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import FileUpload from '../components/FileUpload';
import PDFViewer from '../components/PDFViewer';
import { Plus, FileText, CheckCircle, XCircle, Clock, Eye, Upload, Trash2 } from 'lucide-react';

interface Justificativo {
  id: string;
  absence_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export const Absences: React.FC = () => {
  const { profile } = useAuth();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [justificativos, setJustificativos] = useState<Record<string, Justificativo[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{ url: string; name: string } | null>(null);

  const [newAbsence, setNewAbsence] = useState({
    student_name: '',
    reason: '',
    date_from: '',
    date_to: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAbsences();
  }, [profile]);

  const fetchAbsences = async () => {
    try {
      let query = supabase.from('absences').select('*').order('created_at', { ascending: false });

      if (profile?.role === 'parent') {
        query = query.eq('parent_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAbsences(data || []);

      if (data) {
        const absenceIds = data.map(a => a.id);
        const { data: justData, error: justError } = await supabase
          .from('justificativos')
          .select('*')
          .in('absence_id', absenceIds)
          .order('created_at', { ascending: false });

        if (!justError && justData) {
          const grouped = justData.reduce((acc, just) => {
            if (!acc[just.absence_id]) {
              acc[just.absence_id] = [];
            }
            acc[just.absence_id].push(just);
            return acc;
          }, {} as Record<string, Justificativo[]>);
          setJustificativos(grouped);
        }
      }
    } catch (error) {
      console.error('Error fetching absences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAbsence = async () => {
    if (!selectedFile) {
      alert('Por favor, selecciona un archivo PDF');
      return;
    }

    try {
      setUploading(true);

      const { data: absenceData, error: absenceError } = await supabase
        .from('absences')
        .insert([
          {
            ...newAbsence,
            parent_id: profile?.id,
          },
        ])
        .select()
        .single();

      if (absenceError) throw absenceError;

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${absenceData.id}-${Date.now()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('justificativos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('justificativos')
        .getPublicUrl(filePath);

      const { error: justError } = await supabase.from('justificativos').insert([
        {
          absence_id: absenceData.id,
          file_name: selectedFile.name,
          file_url: urlData.publicUrl,
          file_size: selectedFile.size,
          uploaded_by: profile?.id,
          status: 'pending',
        },
      ]);

      if (justError) throw justError;

      setShowCreateModal(false);
      setNewAbsence({
        student_name: '',
        reason: '',
        date_from: '',
        date_to: '',
      });
      setSelectedFile(null);
      fetchAbsences();
    } catch (error) {
      console.error('Error creating absence:', error);
      alert('Error al crear la inasistencia. Por favor, intenta nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedAbsence) return;

    try {
      const { error } = await supabase
        .from('absences')
        .update({
          status: modalAction === 'approve' ? 'approved' : 'rejected',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          comments: comments || null,
        })
        .eq('id', selectedAbsence.id);

      if (error) throw error;

      const absenceJustificativos = justificativos[selectedAbsence.id] || [];
      if (absenceJustificativos.length > 0) {
        const { error: justError } = await supabase
          .from('justificativos')
          .update({
            status: modalAction === 'approve' ? 'approved' : 'rejected',
            reviewed_by: profile?.id,
            reviewed_at: new Date().toISOString(),
            review_notes: comments || null,
          })
          .eq('absence_id', selectedAbsence.id);

        if (justError) console.error('Error updating justificativos:', justError);
      }

      setShowModal(false);
      setSelectedAbsence(null);
      setComments('');
      fetchAbsences();
    } catch (error) {
      console.error('Error updating absence:', error);
    }
  };

  const handleViewPdf = (fileUrl: string, fileName: string) => {
    setSelectedPdf({ url: fileUrl, name: fileName });
    setPdfViewerOpen(true);
  };

  const handleDeleteAbsence = async () => {
    if (!selectedAbsence) return;

    try {
      setDeleting(true);

      const absenceJustificativos = justificativos[selectedAbsence.id] || [];

      for (const just of absenceJustificativos) {
        const filePath = just.file_url.split('/').slice(-2).join('/');

        const { error: storageError } = await supabase.storage
          .from('justificativos')
          .remove([filePath]);

        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
        }
      }

      const { error } = await supabase
        .from('absences')
        .delete()
        .eq('id', selectedAbsence.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setSelectedAbsence(null);
      fetchAbsences();
    } catch (error) {
      console.error('Error deleting absence:', error);
      alert('Error al eliminar la inasistencia. Por favor, intenta nuevamente.');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-orange-100 text-orange-700', icon: Clock, text: 'Pendiente' },
      approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Aprobada' },
      rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, text: 'Rechazada' },
    };
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Inasistencias</h1>
          <p className="text-gray-600 mt-2">
            {profile?.role === 'parent'
              ? 'Administra las inasistencias de tus hijos'
              : 'Revisa y gestiona las solicitudes de inasistencias'}
          </p>
        </div>
        {profile?.role === 'parent' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nueva Inasistencia
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {absences.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay inasistencias</h3>
            <p className="text-gray-600">
              {profile?.role === 'parent'
                ? 'Aún no has registrado ninguna inasistencia'
                : 'No hay solicitudes de inasistencias pendientes'}
            </p>
          </div>
        ) : (
          absences.map((absence) => {
            const absenceJustificativos = justificativos[absence.id] || [];
            return (
              <div key={absence.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-gray-900">{absence.student_name}</h3>
                      {getStatusBadge(absence.status)}
                    </div>
                    <p className="text-gray-600 mb-3">{absence.reason}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Desde: {new Date(absence.date_from).toLocaleDateString()}</span>
                      <span>Hasta: {new Date(absence.date_to).toLocaleDateString()}</span>
                    </div>

                    {absenceJustificativos.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold text-gray-700">Justificativos:</p>
                        {absenceJustificativos.map((just) => (
                          <div
                            key={just.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-red-500" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{just.file_name}</p>
                                <p className="text-xs text-gray-500">
                                  {(just.file_size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewPdf(just.file_url, just.file_name)}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Ver PDF</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {absence.comments && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Comentarios:</span> {absence.comments}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {(profile?.role === 'admin' || profile?.role === 'secretary') && absence.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedAbsence(absence);
                            setModalAction('approve');
                            setShowModal(true);
                          }}
                          className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                          title="Aprobar"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAbsence(absence);
                            setModalAction('reject');
                            setShowModal(true);
                          }}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                          title="Rechazar"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {profile?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setSelectedAbsence(absence);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nueva Inasistencia</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Estudiante
                </label>
                <input
                  type="text"
                  value={newAbsence.student_name}
                  onChange={(e) => setNewAbsence({ ...newAbsence, student_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
                <textarea
                  value={newAbsence.reason}
                  onChange={(e) => setNewAbsence({ ...newAbsence, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Desde</label>
                  <input
                    type="date"
                    value={newAbsence.date_from}
                    onChange={(e) => setNewAbsence({ ...newAbsence, date_from: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={uploading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Hasta</label>
                  <input
                    type="date"
                    value={newAbsence.date_to}
                    onChange={(e) => setNewAbsence({ ...newAbsence, date_to: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={uploading}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Justificativo (PDF)
                </label>
                <FileUpload
                  onFileSelect={setSelectedFile}
                  maxSize={5 * 1024 * 1024}
                  accept=".pdf"
                  disabled={uploading}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedFile(null);
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAbsence}
                disabled={uploading || !selectedFile}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Crear Inasistencia</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {modalAction === 'approve' ? 'Aprobar Inasistencia' : 'Rechazar Inasistencia'}
            </h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de que deseas {modalAction === 'approve' ? 'aprobar' : 'rechazar'} esta
              solicitud?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentarios (opcional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Agrega un comentario..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setComments('');
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateStatus}
                className={`px-5 py-2.5 rounded-lg text-white font-medium transition ${
                  modalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Eliminar Inasistencia</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de que deseas eliminar esta inasistencia? Esta acción no se puede deshacer
              y también eliminará todos los justificativos asociados.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAbsence(null);
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAbsence}
                disabled={deleting}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfViewerOpen && selectedPdf && (
        <PDFViewer
          isOpen={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false);
            setSelectedPdf(null);
          }}
          fileUrl={selectedPdf.url}
          fileName={selectedPdf.name}
        />
      )}
    </div>
  );
};
