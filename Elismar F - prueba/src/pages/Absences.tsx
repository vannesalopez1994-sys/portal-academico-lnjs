import React, { useEffect, useState } from 'react';
import { supabase, Ausencias, getPublicUrl } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from '../components/FileUpload';
import PDFViewer from '../components/PDFViewer';
import { Layout } from '../components/Layout';
import { Plus, FileText, CheckCircle, XCircle, Clock, Eye, Upload, Trash2, Calendar, AlertCircle } from 'lucide-react';

export const Absences: React.FC = () => {
  const { profile, userRole } = useAuth();
  const [absences, setAbsences] = useState<Ausencias[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Ausencias | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{ url: string; name: string } | null>(null);

  const [newAbsence, setNewAbsence] = useState({
    nombre_alumno_descripcion: '',
    motivo: '',
    fecha_desde: '',
    fecha_hasta: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAbsences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, userRole]);

  const fetchAbsences = async () => {
    if (!profile) return;
    try {
      let query = supabase.from('ausencias').select('*').order('created_at', { ascending: false });

      // If parent, only see theirs. Admin/Secretary see all.
      if (userRole === 'parent') {
        query = query.eq('id_representante', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAbsences(data || []);
    } catch (error) {
      console.error('Error fetching absences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAbsence = async () => {
    if (!selectedFile) {
      alert('Por favor, selecciona un archivo PDF justificativo');
      return;
    }

    if (!newAbsence.nombre_alumno_descripcion || !newAbsence.motivo || !newAbsence.fecha_desde || !newAbsence.fecha_hasta) {
      alert('Por favor, completa todos los campos obligatorios.');
      return;
    }

    try {
      setUploading(true);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`;
      const filePath = `ausencias/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos_pdf')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading PDF:', uploadError);
        alert(`Error al subir el justificativo: ${uploadError.message}`);
        throw uploadError;
      }

      // Store the relative filePath, not the public URL
      const { error: absenceError } = await supabase
        .from('ausencias')
        .insert([
          {
            id_representante: profile?.id,
            nombre_alumno_descripcion: newAbsence.nombre_alumno_descripcion,
            motivo: newAbsence.motivo,
            fecha_desde: newAbsence.fecha_desde,
            fecha_hasta: newAbsence.fecha_hasta,
            ruta_pdf_justificativo: filePath, // Store relative path
            estado: 'pendiente'
          },
        ]);

      if (absenceError) {
        console.error('Error inserting absence row:', absenceError);
        alert(`Error al registrar los datos en la base de datos: ${absenceError.message}`);
        throw absenceError;
      }

      setShowCreateModal(false);
      setNewAbsence({
        nombre_alumno_descripcion: '',
        motivo: '',
        fecha_desde: '',
        fecha_hasta: '',
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
        .from('ausencias')
        .update({
          estado: modalAction === 'approve' ? 'aprobada' : 'rechazada',
        })
        .eq('id', selectedAbsence.id);

      if (error) throw error;

      setShowModal(false);
      setSelectedAbsence(null);
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

      if (selectedAbsence.ruta_pdf_justificativo) {
        // Use the stored relative path directly for deletion
        const filePath = selectedAbsence.ruta_pdf_justificativo;
        if (filePath) {
          await supabase.storage
            .from('documentos_pdf')
            .remove([filePath]);
        }
      }

      const { error } = await supabase
        .from('ausencias')
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
      pendiente: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock, text: 'Pendiente' },
      aprobada: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, text: 'Aprobada' },
      rechazada: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, text: 'Rechazada' },
    };
    const badge = badges[status as keyof typeof badges] || badges.pendiente;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${badge.color}`}>
        <Icon className="w-4 h-4 mr-1.5" />
        {badge.text}
      </span>
    );
  };

  const getCardBorderColor = (status: string) => {
    switch (status) {
      case 'aprobada': return 'border-l-green-500';
      case 'rechazada': return 'border-l-red-500';
      default: return 'border-l-orange-500';
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Inasistencias</h1>
          <p className="text-gray-600 mt-2">
            {userRole === 'parent'
              ? 'Administra las inasistencias de tus hijos'
              : 'Revisa y gestiona las solicitudes de inasistencias recibidas'}
          </p>
        </div>
        {userRole === 'parent' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Reportar Inasistencia
          </button>
        )}
      </div>

      <div className="space-y-6">
        {absences.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No hay inasistencias</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              {userRole === 'parent'
                ? 'Aún no has registrado ninguna solicitud de inasistencia en el sistema.'
                : 'No se encontraron solicitudes de inasistencias registradas.'}
            </p>
          </div>
        ) : (
          absences.map((absence) => (
            <div
              key={absence.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${getCardBorderColor(absence.estado)} p-6 hover:shadow-md transition-all group`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">
                      {absence.nombre_alumno_descripcion}
                    </h3>
                    {getStatusBadge(absence.estado)}
                  </div>

                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                    <div className="flex items-start gap-2">
                      <div className="p-1 bg-blue-50 rounded text-blue-600 mt-1">
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Motivo</p>
                        <p className="text-gray-700 font-medium">{absence.motivo}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="p-1 bg-orange-50 rounded text-orange-600 mt-1">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Fechas</p>
                        <p className="text-gray-700 font-medium">
                          Desde: {new Date(absence.fecha_desde).toLocaleDateString()} Hasta: {new Date(absence.fecha_hasta).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {absence.ruta_pdf_justificativo && <a
                    href={getPublicUrl('documentos_pdf', absence.ruta_pdf_justificativo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition px-3 py-2 bg-blue-50 rounded-lg w-fit"
                  >
                    <Eye size={16} />
                    Ver Justificativo Médico
                  </a>}
                </div>

                <div className="flex items-center gap-2 shrink-0 md:bg-gray-50 md:p-3 rounded-xl">
                  {(userRole === 'admin' || userRole === 'secretary') && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedAbsence(absence);
                          setModalAction('approve');
                          setShowModal(true);
                        }}
                        className="p-2.5 bg-white text-green-600 border border-green-100 rounded-lg hover:bg-green-600 hover:text-white transition shadow-sm"
                        title="Aprobar"
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAbsence(absence);
                          setModalAction('reject');
                          setShowModal(true);
                        }}
                        className="p-2.5 bg-white text-red-600 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition shadow-sm"
                        title="Rechazar"
                      >
                        <XCircle size={20} />
                      </button>
                    </>
                  )}
                  {userRole === 'admin' && (
                    <button
                      onClick={() => {
                        setSelectedAbsence(absence);
                        setShowDeleteModal(true);
                      }}
                      className="p-2.5 bg-white text-gray-400 border border-gray-100 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition shadow-sm"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODALS PERSISTED FROM ORIGINAL VERSION BUT WITH STYLING UPDATES */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Plus className="text-blue-600" /> Reportar Inasistencia
            </h2>
            <div className="grid gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Estudiante</label>
                <input
                  type="text"
                  value={newAbsence.nombre_alumno_descripcion}
                  onChange={(e) => setNewAbsence({ ...newAbsence, nombre_alumno_descripcion: e.target.value })}
                  placeholder="Ej. Juan Pérez - 3er Año C"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition outline-none"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Fecha Inicio</label>
                  <input
                    type="date"
                    value={newAbsence.fecha_desde}
                    onChange={(e) => setNewAbsence({ ...newAbsence, fecha_desde: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Fecha Fin</label>
                  <input
                    type="date"
                    value={newAbsence.fecha_hasta}
                    onChange={(e) => setNewAbsence({ ...newAbsence, fecha_hasta: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Motivo / Descripción</label>
                <textarea
                  value={newAbsence.motivo}
                  onChange={(e) => setNewAbsence({ ...newAbsence, motivo: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none"
                  placeholder="Explique el motivo de la inasistencia..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Justificativo (PDF)</label>
                <FileUpload
                  onFileSelect={setSelectedFile}
                  maxSize={5 * 1024 * 1024}
                  accept=".pdf"
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
              <button
                onClick={() => { setShowCreateModal(false); setSelectedFile(null); }}
                className="px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAbsence}
                disabled={uploading || !selectedFile}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? 'Procesando...' : <><Upload size={20} /> Enviar Solicitud</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE/REJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${modalAction === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <AlertCircle size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {modalAction === 'approve' ? '¿Aprobar Inasistencia?' : '¿Rechazar Inasistencia?'}
            </h3>
            <p className="text-gray-500 mb-8">
              Esta acción actualizará el estado de la solicitud y el representante podrá ver la resolución.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateStatus}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition shadow-lg ${modalAction === 'approve' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Eliminar Registro</h3>
            <p className="text-gray-500 mb-8">
              ¿Estás seguro de que deseas eliminar permanentemente esta inasistencia y su archivo adjunto?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAbsence}
                disabled={deleting}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-100"
              >
                {deleting ? 'Eliminando...' : 'Eliminar Registro'}
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
    </Layout>
  );
};

