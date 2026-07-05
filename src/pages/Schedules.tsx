import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FileUp, CalendarCheck2, CheckCircle, Trash2, Download, AlertCircle, Loader2, TableProperties, ListChecks, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, Horarios } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const Schedules: React.FC = () => {
  const { userRole } = useAuth();
  const [schedules, setSchedules] = useState<Horarios[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Filtros de búsqueda
  const [filterAno, setFilterAno] = useState('');
  const [filterSeccion, setFilterSeccion] = useState('');
  const [scheduleToDelete, setScheduleToDelete] = useState<Horarios | null>(null);

  // Form state
  const [anoEscolar, setAnoEscolar] = useState('');
  const [seccion, setSeccion] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const canEdit = userRole === 'admin' || userRole === 'secretary';

  // Generar secciones de la A a la Z
  const SECCIONES = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

  const fetchInitialData = async () => {
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anoEscolar || !seccion || !file) {
      setErrorMessage('Por favor, complete todos los campos obligatorios y seleccione un archivo PDF.');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setUploading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `horarios/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos_pdf')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos_pdf')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('horarios')
        .insert([
          {
            anio_escolar: anoEscolar,
            seccion: seccion,
            ruta_pdf: publicUrl,
          }
        ]);

      if (dbError) throw dbError;

      setStatus('success');
      setAnoEscolar('');
      setSeccion('');
      setFile(null);

      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await fetchInitialData();
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Upload Error:', error);
      setErrorMessage(error.message || 'Error al publicar el horario');
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;

    try {
      const filePath = scheduleToDelete.ruta_pdf.split('/documentos_pdf/')[1];
      if (filePath) {
        await supabase.storage.from('documentos_pdf').remove([filePath]);
      }

      const { error } = await supabase
        .from('horarios')
        .delete()
        .eq('id', scheduleToDelete.id);

      if (error) throw error;
      await fetchInitialData();
      toast.success('Horario eliminado con éxito');
    } catch (error) {
      console.error('Delete Error:', error);
      toast.error('Error al eliminar el horario');
    } finally {
      setScheduleToDelete(null);
    }
  };

  const filteredSchedules = schedules.filter((schedule) => {
    const matchAno = filterAno ? schedule.anio_escolar === filterAno : true;
    const matchSeccion = filterSeccion ? schedule.seccion === filterSeccion : true;
    return matchAno && matchSeccion;
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Corporate Page Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#0a1628] via-[#0d2b5e] to-blue-800 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white rounded-full" />
            <div className="absolute bottom-0 left-1/2 w-28 h-28 bg-white rounded-full" />
          </div>
          <div className="relative flex items-center gap-4">
            <div className="bg-white/10 border border-white/20 backdrop-blur-sm p-3.5 rounded-2xl shadow-inner">
              <CalendarCheck2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Horarios Escolares</h1>
              <p className="text-blue-200/70 text-sm mt-0.5 font-medium">Gestión y consulta de horarios del plantel en formato PDF</p>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h2 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-100">
                <ListChecks className="text-blue-600" size={18} />
              </div>
              Cargar Nuevo Horario
            </h2>

            {status === 'error' && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-3 animate-head-shake">
                <AlertCircle size={20} className="shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 flex items-center gap-1">
                    <LayoutGrid size={14} className="text-gray-400" /> Año Escolar *
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    value={anoEscolar}
                    onChange={(e) => setAnoEscolar(e.target.value)}
                    required
                  >
                    <option value="">Seleccione año...</option>
                    <option value="1er Año">1er Año</option>
                    <option value="2do Año">2do Año</option>
                    <option value="3er Año">3er Año</option>
                    <option value="4to Año">4to Año</option>
                    <option value="5to Año">5to Año</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 flex items-center gap-1">
                    <TableProperties size={14} className="text-gray-400" /> Sección *
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    value={seccion}
                    onChange={(e) => setSeccion(e.target.value)}
                    required
                  >
                    <option value="">Seleccione sección...</option>
                    {SECCIONES.map(s => (
                      <option key={s} value={s}>Sección {s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 flex items-center gap-1">
                    <FileUp size={14} className="text-gray-400" /> Cargar PDF *
                  </label>
                  <div className="relative">
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0] || null;
                        if (selectedFile) {
                          if (selectedFile.type !== 'application/pdf') {
                            toast.error('Solo se permiten archivos PDF');
                            return;
                          }
                          if (selectedFile.size > 10 * 1024 * 1024) {
                            toast.error('El archivo no debe superar los 10MB');
                            return;
                          }
                        }
                        setFile(selectedFile);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      required
                    />
                    <div className={`border-2 border-dashed rounded-xl p-3 flex items-center justify-center transition-all ${file ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                      <span className="text-xs text-gray-400 truncate font-medium">
                        {file ? file.name : "Subir archivo del Horario"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex">
                <button
                  type="submit"
                  disabled={uploading}
                  className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg ${status === 'success'
                    ? 'bg-green-600 text-white shadow-green-100'
                    : uploading
                      ? 'bg-blue-300 text-white cursor-not-allowed shadow-none'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                    }`}
                >
                  {status === 'success' ? (
                    <><CheckCircle size={20} /> ¡Publicado con éxito!</>
                  ) : uploading ? (
                    <><Loader2 size={20} className="animate-spin" /> Procesando...</>
                  ) : (
                    <><FileUp size={20} /> Publicar Horario</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Horarios Table Premium */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 bg-gray-50/50 border-b flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-900">Horarios Publicados</h2>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {filterAno || filterSeccion ? `Filtrados: ${filteredSchedules.length} de ${schedules.length}` : `Total: ${schedules.length}`}
            </div>
          </div>

          {/* Filtros de Búsqueda */}
          <div className="px-8 py-4 bg-gray-50/30 border-b flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtrar por:</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              <select
                className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={filterAno}
                onChange={(e) => setFilterAno(e.target.value)}
              >
                <option value="">Todos los años</option>
                <option value="1er Año">1er Año</option>
                <option value="2do Año">2do Año</option>
                <option value="3er Año">3er Año</option>
                <option value="4to Año">4to Año</option>
                <option value="5to Año">5to Año</option>
              </select>

              <select
                className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={filterSeccion}
                onChange={(e) => setFilterSeccion(e.target.value)}
              >
                <option value="">Todas las secciones</option>
                {SECCIONES.map(s => (
                  <option key={s} value={s}>Sección {s}</option>
                ))}
              </select>

              {(filterAno || filterSeccion) && (
                <button
                  onClick={() => { setFilterAno(''); setFilterSeccion(''); }}
                  className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline transition"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-20 text-center flex flex-col items-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sincronizando horarios...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="p-20 text-center">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CalendarCheck2 className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">El archivo está vacío</h3>
              <p className="text-gray-400 text-sm">No se han publicado horarios para este periodo.</p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="p-20 text-center">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CalendarCheck2 className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Sin resultados</h3>
              <p className="text-gray-400 text-sm">No se encontraron horarios que coincidan con los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white">
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Año Escolar</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-center">Sección</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-center">Publicación</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSchedules.map((schedule) => (
                    <tr key={schedule.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                            {schedule.anio_escolar?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-gray-900 font-black">{schedule.anio_escolar}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Horario Escolar</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-wider border border-blue-100">
                          Sección {schedule.seccion || 'N/A'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center text-xs font-bold text-gray-500">
                        {new Date(schedule.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <a
                            href={schedule.ruta_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition shadow-sm border border-blue-100"
                            title="Descargar PDF"
                          >
                            <Download size={18} />
                          </a>
                          {canEdit && (
                            <button
                              onClick={() => setScheduleToDelete(schedule)}
                              className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-100"
                              title="Eliminar Horario"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={!!scheduleToDelete}
        onClose={() => setScheduleToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Horario"
        message={`¿Estás seguro de que deseas eliminar permanentemente el horario de ${scheduleToDelete?.anio_escolar} - Sección ${scheduleToDelete?.seccion}? Esta acción no se puede deshacer y el archivo PDF se borrará permanentemente.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </Layout>
  );
};
