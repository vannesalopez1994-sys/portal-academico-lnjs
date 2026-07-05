import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/Modal';
import { Download, Upload, Database, AlertTriangle, CheckCircle } from 'lucide-react';

export const Backup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupData, setBackupData] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const [profilesRes, absencesRes, newsRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('absences').select('*'),
        supabase.from('news').select('*'),
        supabase.from('system_settings').select('*'),
      ]);

      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          profiles: profilesRes.data || [],
          absences: absencesRes.data || [],
          news: newsRes.data || [],
          system_settings: settingsRes.data || [],
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
    } catch (error: any) {
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

      const { data: existingProfiles } = await supabase.from('profiles').select('id');
      const existingIds = new Set(existingProfiles?.map((p) => p.id) || []);

      const newProfiles = backup.data.profiles.filter((p: any) => !existingIds.has(p.id));

      if (newProfiles.length > 0) {
        const { error: profilesError } = await supabase.from('profiles').insert(newProfiles);
        if (profilesError) throw profilesError;
      }

      await Promise.all([
        supabase.from('absences').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('news').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);

      await Promise.all([
        supabase.from('absences').insert(backup.data.absences),
        supabase.from('news').insert(backup.data.news),
      ]);

      for (const setting of backup.data.system_settings) {
        await supabase
          .from('system_settings')
          .upsert(setting, { onConflict: 'key' });
      }

      setMessage({ type: 'success', text: 'Backup restaurado exitosamente' });
      setShowRestoreModal(false);
      setBackupData('');
    } catch (error: any) {
      console.error('Error importing backup:', error);
      setMessage({ type: 'error', text: error.message || 'Error al restaurar el backup' });
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sistema de Respaldo</h1>
        <p className="text-gray-600 mt-2">Exporta e importa los datos del sistema de forma segura</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center ${
            message.type === 'success'
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
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Download className="w-5 h-5 mr-2" />
            {loading ? 'Exportando...' : 'Exportar Backup'}
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
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition flex items-center justify-center"
          >
            <Upload className="w-5 h-5 mr-2" />
            Importar Backup
          </button>
        </div>
      </div>

      <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
        <div className="flex items-start">
          <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-yellow-900 mb-2">Advertencias Importantes</h3>
            <ul className="text-yellow-800 space-y-2 list-disc list-inside">
              <li>La importación reemplazará los datos existentes de inasistencias y noticias</li>
              <li>Los perfiles de usuario solo se agregarán si no existen</li>
              <li>Siempre realiza un backup antes de importar nuevos datos</li>
              <li>Verifica que el archivo de backup sea válido antes de importarlo</li>
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
    </div>
  );
};
