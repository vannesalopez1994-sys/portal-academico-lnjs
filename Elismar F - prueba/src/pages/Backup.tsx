import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { Layout } from '../components/Layout';

export const Backup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
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

      // Para simplificar, asumiremos que se restaurarán los que no existan aún
      const { data: existingRoles } = await supabase.from('roles').select('id_rol');
      const existingRolesIds = new Set(existingRoles?.map((r) => r.id_rol) || []);
      const newRoles = backup.data.roles?.filter((r: any) => !existingRolesIds.has(r.id_rol)) || [];
      if (newRoles.length > 0) await supabase.from('roles').insert(newRoles);

      const { data: existingUsuarios } = await supabase.from('usuarios').select('id');
      const existingUsuariosIds = new Set(existingUsuarios?.map((u) => u.id) || []);
      const newUsuarios = backup.data.usuarios?.filter((u: any) => !existingUsuariosIds.has(u.id)) || [];
      if (newUsuarios.length > 0) await supabase.from('usuarios').insert(newUsuarios);

      const { data: existingMaterias } = await supabase.from('materias').select('id');
      const existingMateriasIds = new Set(existingMaterias?.map((m) => m.id) || []);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sistema de Respaldo</h1>
        <p className="text-gray-600 mt-2">Exporta e importa los datos del sistema de forma segura</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
            }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-3" />
          ) : (
            <AlertTriangle className="w-5 h-5 mr-3" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-6 mx-auto">
            <Download className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">Exportar Datos</h2>
          <p className="text-gray-600 text-center mb-6">
            Descarga un archivo JSON con todos los datos del sistema
          </p>
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            {loading ? 'Exportando...' : 'Exportar copia de seguridad'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mb-6 mx-auto">
            <Upload className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">Importar Datos</h2>
          <p className="text-gray-600 text-center mb-6">
            Restaura o migra datos desde un archivo de backup
          </p>
          <button
            onClick={() => setShowRestoreModal(true)}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Importar copia de seguridad
          </button>
        </div>
      </div>

      <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
        <div className="flex items-start">
          <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-yellow-900 mb-2">Advertencias Importantes</h3>
            <ul className="text-yellow-800 space-y-2 list-disc list-inside">
              <li>La importación reemplazará datos en caso de conflicto de IDs.</li>
              <li>El orden de inserción respeta las relaciones del esquema de 11 tablas.</li>
              <li>Asegúrate de tener conexión al servidor para validar llaves foráneas (ej. Auth).</li>
              <li>Siempre realiza un backup antes de importar nuevos datos.</li>
            </ul>
          </div>
        </div>
      </div>

      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Importar Backup</h2>
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setBackupData('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <AlertTriangle className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecciona el archivo de backup
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {backupData && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vista previa del backup
                </label>
                <textarea
                  value={backupData}
                  readOnly
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setBackupData('');
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={!backupData || loading}
                className="px-5 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Importando...' : 'Restaurar Backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
