import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
        <p className="text-gray-600 mb-8">
          No tienes permisos para acceder a esta página. Si crees que esto es un error, contacta al
          admin.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver al Inicio
        </button>
      </div>
    </div>
  );
};
