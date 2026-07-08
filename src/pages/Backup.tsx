import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Upload, AlertTriangle, CheckCircle, ShieldCheck, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const Backup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [backupData, setBackupData] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const [
        rolesRes, usuariosRes, noticiasRes, fotoNoticiasRes, horariosRes,
        materiasRes, planesRes, ausenciasRes, documentosRes, configRes, logsRes
      ] = await Promise.all([
        supabase.from('roles').select('*'),
        supabase.from('usuarios').select('*'),
        supabase.from('noticias').select('*'),
        supabase.from('foto_noticia').select('*'),
        supabase.from('horarios').select('*'),
        supabase.from('materias').select('*'),
        supabase.from('planes_evaluacion').select('*'),
        supabase.from('ausencias').select('*'),
        supabase.from('documentos_institucionales').select('*'),
        supabase.from('configuracion_sistema').select('*'),
        supabase.from('log_sistema').select('*'),
      ]);

      const backup = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        data: {
          roles: rolesRes.data || [],
          usuarios: usuariosRes.data || [],
          noticias: noticiasRes.data || [],
          foto_noticia: fotoNoticiasRes.data || [],
          horarios: horariosRes.data || [],
          materias: materiasRes.data || [],
          planes_evaluacion: planesRes.data || [],
          ausencias: ausenciasRes.data || [],
          documentos_institucionales: documentosRes.data || [],
          configuracion_sistema: configRes.data || [],
          log_sistema: logsRes.data || [],
        },
      };

      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Backup exportado exitosamente' });
    } catch (error) {
      console.error('Error exporting backup:', error);
      setMessage({ type: 'error', text: 'Error al exportar el backup' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const backup = JSON.parse(backupData);

      if (!backup.version || !backup.data) {
        throw new Error('Formato de backup inválido');
      }

      // Orden de inserción para respetar llaves foráneas:
      // 1. roles, materias, usuarios, configuracion_sistema
      // 2. noticias, horarios, documentos_institucionales
      // 3. foto_noticia, planes_evaluacion, ausencias, log_sistema

      const { data: existingRoles } = await supabase.from('roles').select('id_rol');
      const existingRolesIds = new Set(existingRoles?.map((r: any) => r.id_rol) || []);
      const newRoles = backup.data.roles?.filter((r: any) => !existingRolesIds.has(r.id_rol)) || [];
      if (newRoles.length > 0) await supabase.from('roles').insert(newRoles);

      const { data: existingUsuarios } = await supabase.from('usuarios').select('id');
      const existingUsuariosIds = new Set(existingUsuarios?.map((u: any) => u.id) || []);
      const newUsuarios = backup.data.usuarios?.filter((u: any) => !existingUsuariosIds.has(u.id)) || [];
      if (newUsuarios.length > 0) await supabase.from('usuarios').insert(newUsuarios);

      const { data: existingMaterias } = await supabase.from('materias').select('id');
      const existingMateriasIds = new Set(existingMaterias?.map((m: any) => m.id) || []);
      const newMaterias = backup.data.materias?.filter((m: any) => !existingMateriasIds.has(m.id)) || [];
      if (newMaterias.length > 0) await supabase.from('materias').insert(newMaterias);

      // Ahora insertaremos los demás usando upsert para evitar errores de duplicados/llaves
      // Teniendo cuidado con llaves foráneas
      const tablesList = [
        'noticias', 'foto_noticia', 'horarios', 'planes_evaluacion',
        'ausencias', 'documentos_institucionales', 'configuracion_sistema', 'log_sistema'
      ];

      for (const tableName of tablesList) {
        if (backup.data[tableName] && backup.data[tableName].length > 0) {
          await supabase.from(tableName as any).upsert(backup.data[tableName], { onConflict: 'id' }).select();
        }
      }

      setMessage({ type: 'success', text: 'Backup restaurado exitosamente' });
      setShowRestoreModal(false);
      setBackupData('');
    } catch (error) {
      const err = error as Error;
      console.error('Error importing backup:', err);
      setMessage({ type: 'error', text: err.message || 'Error al restaurar el backup' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackupData(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Layout>
      {/* Corporate Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0a1628] via-[#0d2b5e] to-blue-800 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white rounded-full" />
          <div className="absolute bottom-0 left-1/3 w-28 h-28 bg-white rounded-full" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="bg-white/10 border border-white/20 backdrop-blur-sm p-3.5 rounded-2xl shadow-inner">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Sistema de Respaldo</h1>
            <p className="text-blue-200/70 text-sm mt-0.5 font-medium">Exporta e importa los datos del sistema de forma segura</p>
          </div>
        </div>
      </div>

      {/* ── Mensaje de estado ── */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 border font-medium text-sm shadow-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.type === 'success'
            ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            : <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Tarjetas de acción ── */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">

        {/* Exportar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-8 flex flex-col items-center text-center group">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl w-16 h-16 flex items-center justify-center mb-5 shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform duration-300">
            <Download className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Exportar Datos</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Descarga un archivo JSON con todos los datos del sistema
          </p>
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-semibold text-sm tracking-wide shadow-md shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Exportando...' : 'Exportar copia de seguridad'}
          </button>
        </div>

        {/* Importar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-8 flex flex-col items-center text-center group">
          <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl w-16 h-16 flex items-center justify-center mb-5 shadow-lg shadow-violet-200 group-hover:scale-105 transition-transform duration-300">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Importar Datos</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Restaura o migra datos desde un archivo de backup
          </p>
          <button
            onClick={() => setShowRestoreModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white py-3 rounded-xl font-semibold text-sm tracking-wide shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
          >
            <Upload className="w-4 h-4" />
            Importar copia de seguridad
          </button>
        </div>
      </div>

      {/* ── Advertencias ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 rounded-xl p-2 flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-900 mb-3">Advertencias Importantes</h3>
            <ul className="space-y-2">
              {[
                'La importación reemplazará datos en caso de conflicto de IDs.',
                'El orden de inserción respeta las relaciones del esquema de 11 tablas.',
                'Asegúrate de tener conexión al servidor para validar llaves foráneas (ej. Auth).',
                'Siempre realiza un backup antes de importar nuevos datos.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-amber-800">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Modal Importar ── */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">

            {/* Header del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl p-2 shadow-md shadow-violet-200">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Importar Backup</h2>
              </div>
              <button
                onClick={() => { setShowRestoreModal(false); setBackupData(''); }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* File input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Selecciona el archivo de backup
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none transition bg-gray-50"
                />
              </div>

              {/* Preview */}
              {backupData && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vista previa del backup
                  </label>
                  <textarea
                    value={backupData}
                    readOnly
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-mono text-xs text-gray-600 resize-none outline-none"
                  />
                </div>
              )}

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setShowRestoreModal(false); setBackupData(''); }}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowConfirmRestore(true)}
                  disabled={!backupData || loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white rounded-xl text-sm font-semibold shadow-md shadow-violet-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Importando...' : 'Restaurar Backup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Diálogo de Confirmación de Restauración ── */}
      <ConfirmDialog
        isOpen={showConfirmRestore}
        onClose={() => setShowConfirmRestore(false)}
        onConfirm={() => {
          setShowConfirmRestore(false);
          handleImport();
        }}
        title="¿Confirmar restauración?"
        message="Esta acción reemplazará de forma irreversible todos los datos actuales del sistema por los del archivo de respaldo. ¿Desea continuar?"
        confirmText="Sí, restaurar"
        cancelText="Cancelar"
        type="danger"
      />
    </Layout>
  );
};
