import React, { useEffect, useState } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { Plus, Users as UsersIcon, Edit, Trash2, Shield, Mail, Phone } from 'lucide-react';

export const Users: React.FC = () => {
  const { signUp } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'parent',
    phone: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    setError('');
    try {
      await signUp(newUser.email, newUser.password, newUser.full_name, newUser.role, newUser.phone);
      setShowCreateModal(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'parent',
        phone: '',
      });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(selectedUser.id);

      if (authError) {
        const { error } = await supabase.from('profiles').delete().eq('id', selectedUser.id);
        if (error) throw error;
      }

      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: { color: 'bg-blue-100 text-blue-700', icon: Shield, text: 'Administrador' },
      secretary: { color: 'bg-orange-100 text-orange-700', icon: UsersIcon, text: 'Secretaria' },
      parent: { color: 'bg-green-100 text-green-700', icon: UsersIcon, text: 'Padre/Madre' },
    };
    const badge = badges[role as keyof typeof badges];
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
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-2">Administra los usuarios del sistema</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Usuario
        </button>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-bold text-gray-900">{user.full_name}</h3>
                  {getRoleBadge(user.role)}
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {user.email}
                  </div>
                  {user.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {user.phone}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(user);
                  setShowDeleteModal(true);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Eliminar"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuevo Usuario</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="parent">Padre/Madre</option>
                  <option value="secretary">Secretaria</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError('');
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteUser}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario ${selectedUser?.full_name}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};
