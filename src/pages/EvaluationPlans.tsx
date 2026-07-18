import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FileUp, CheckCircle, Trash2, Download, AlertCircle, Loader2, GraduationCap, ClipboardList, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, PlanesEvaluacion } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FieldHelp } from '../components/FieldHelp';

export const EvaluationPlans: React.FC = () => {
  const { userRole } = useAuth();
  const [plans, setPlans] = useState<PlanesEvaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Materias desde la Base de Datos
  const [materias, setMaterias] = useState<any[]>([]);

  // Filtros de búsqueda
  const [filterAno, setFilterAno] = useState('');
  const [filterSeccion, setFilterSeccion] = useState('');
  const [filterMateria, setFilterMateria] = useState('');
  const [planToDelete, setPlanToDelete] = useState<PlanesEvaluacion | null>(null);

  // Form state
  const [anoEscolar, setAnoEscolar] = useState('');
  const [seccion, setSeccion] = useState('');
  const [nombreMateria, setNombreMateria] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const canEdit = userRole === 'admin' || userRole === 'secretary';

  // Generar secciones de la A a la Z
  const SECCIONES = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

  const fetchInitialData = async () => {
    try {
      const [plansRes, materiasRes] = await Promise.all([
        supabase.from('planes_evaluacion').select('*').order('created_at', { ascending: false }),
        supabase.from('materias').select('*').order('nombre_materia', { ascending: true })
      ]);

      if (plansRes.error) throw plansRes.error;
      if (materiasRes.error) throw materiasRes.error;

      setPlans(plansRes.data || []);
      setMaterias(materiasRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSave = async () => {
    if (!anoEscolar || !seccion || !nombreMateria || !file) {
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
      const filePath = `planes_evaluacion/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos_pdf')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos_pdf')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('planes_evaluacion')
        .insert([
          {
            anio_escolar: anoEscolar,
            seccion: seccion,
            materia: nombreMateria,
            ruta_pdf: publicUrl,
          }
        ]);

      if (dbError) throw dbError;

      setStatus('success');
      setAnoEscolar('');
      setSeccion('');
      setNombreMateria('');
      setFile(null);

      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchInitialData();
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Upload Error:', error);
      setErrorMessage(error.message || 'Error al subir el plan de evaluación');
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;

    try {
      const filePath = planToDelete.ruta_pdf.split('/documentos_pdf/')[1];
      if (filePath) {
        await supabase.storage.from('documentos_pdf').remove([filePath]);
      }

      const { error } = await supabase
        .from('planes_evaluacion')
        .delete()
        .eq('id', planToDelete.id);

      if (error) throw error;
      fetchInitialData();
      toast.success('Plan de evaluación eliminado con éxito');
    } catch (error) {
      console.error('Delete Error:', error);
      toast.error('Error al eliminar el plan');
    } finally {
      setPlanToDelete(null);
    }
  };

  const uniqueMaterias = Array.from(new Set(plans.map(p => p.materia).filter(Boolean))).sort();

  const filteredPlans = plans.filter((plan) => {
    const matchAno = filterAno ? plan.anio_escolar === filterAno : true;
    const matchSeccion = filterSeccion ? plan.seccion === filterSeccion : true;
    const matchMateria = filterMateria ? plan.materia === filterMateria : true;
    return matchAno && matchSeccion && matchMateria;
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
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Planes de Evaluación</h1>
              <p className="text-blue-200/70 text-sm mt-0.5 font-medium">Gestión y consulta de planificación académica flexible</p>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-10">
            <h2 className="text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
              <ClipboardList className="text-blue-500" size={20} /> Cargar Nuevo Plan
            </h2>

            {status === 'error' && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-3 animate-head-shake">
                <AlertCircle size={20} className="shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 flex items-center gap-1">
                  <GraduationCap size={16} className="text-gray-400" /> Año Escolar *
                </label>
                <FieldHelp
                  hint="Selecciona el año al que corresponde este plan de evaluación."
                  example="2do Año"
                  position="bottom"
                >
                  <select
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    value={anoEscolar}
                    onChange={(e) => setAnoEscolar(e.target.value)}
                  >
                    <option value="">Seleccione año...</option>
                    <option value="1er Año">1er Año</option>
                    <option value="2do Año">2do Año</option>
                    <option value="3er Año">3er Año</option>
                    <option value="4to Año">4to Año</option>
                    <option value="5to Año">5to Año</option>
                  </select>
                </FieldHelp>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 flex items-center gap-1">
                  <Layers size={16} className="text-gray-400" /> Sección *
                </label>
                <FieldHelp
                  hint="Selecciona la sección del aula para la que aplica este plan de evaluación."
                  example="Sección A"
                  position="bottom"
                >
                  <select
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    value={seccion}
                    onChange={(e) => setSeccion(e.target.value)}
                  >
                    <option value="">Seleccione sección...</option>
                    {SECCIONES.map(s => (
                      <option key={s} value={s}>Sección {s}</option>
                    ))}
                  </select>
                </FieldHelp>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 flex items-center gap-1">
                  <GraduationCap size={16} className="text-gray-400" /> Materia *
                </label>
                <FieldHelp
                  hint="Escribe el nombre de la asignatura tal como aparece en el programa escolar."
                  example="Matemáticas"
                  position="bottom"
                >
                  <input
                    type="text"
                    placeholder="Ej: Matemáticas"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                    value={nombreMateria}
                    onChange={(e) => setNombreMateria(e.target.value)}
                    required
                  />
                </FieldHelp>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 flex items-center gap-1">
                  <FileUp size={16} className="text-gray-400" /> Cargar PDF
                </label>
                <FieldHelp
                  hint="Sube el Plan de Evaluación del lapso en formato PDF. Máximo 10 MB."
                  example="plan_eval_2do_A_mate.pdf"
                  position="bottom"
                >
                  <div className="relative">
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`border-2 border-dashed rounded-xl p-3 flex items-center justify-center transition-all ${file ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                      <span className="text-xs text-gray-400 truncate font-medium">
                        {file ? file.name : "Subir archivo del Plan de Evaluación"}
                      </span>
                    </div>
                  </div>
                </FieldHelp>
              </div>
            </div>

            <div className="flex">
              <button
                onClick={handleSave}
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
                  <><FileUp size={20} /> Publicar Plan de Evaluación</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Planes Table Premium */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 bg-gray-50/50 border-b flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-900">Planes de Evaluación Publicados</h2>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {filterAno || filterSeccion || filterMateria ? `Filtrados: ${filteredPlans.length} de ${plans.length}` : `Total: ${plans.length}`}
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

              <select
                className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={filterMateria}
                onChange={(e) => setFilterMateria(e.target.value)}
              >
                <option value="">Todas las materias</option>
                {uniqueMaterias.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {(filterAno || filterSeccion || filterMateria) && (
                <button
                  onClick={() => { setFilterAno(''); setFilterSeccion(''); setFilterMateria(''); }}
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
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sincronizando expedientes...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="p-20 text-center">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">El archivo está vacío</h3>
              <p className="text-gray-400 text-sm">No se han publicado planes de evaluación para este periodo.</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="p-20 text-center">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Sin resultados</h3>
              <p className="text-gray-400 text-sm">No se encontraron planes de evaluación que coincidan con los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white">
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Materia</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-center">Año / Sección</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-center">Publicación</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPlans.map((plan) => (
                    <tr key={plan.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                            {plan.materia?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-gray-900 font-black">{plan.materia}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Plan Académico</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-wider border border-blue-100">
                          {plan.anio_escolar} - {plan.seccion || 'N/A'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center text-xs font-bold text-gray-500">
                        {new Date(plan.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <a
                            href={plan.ruta_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition shadow-sm border border-blue-100"
                            title="Descargar PDF"
                          >
                            <Download size={18} />
                          </a>
                          {canEdit && (
                            <button
                              onClick={() => setPlanToDelete(plan)}
                              className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-100"
                              title="Eliminar Plan"
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
        isOpen={!!planToDelete}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Plan de Evaluación"
        message={`¿Estás seguro de que deseas eliminar permanentemente el plan de evaluación de la materia ${planToDelete?.materia} (${planToDelete?.anio_escolar} - Sección ${planToDelete?.seccion})? Esta acción no se puede deshacer y el archivo PDF se borrará permanentemente.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </Layout>
  );
};