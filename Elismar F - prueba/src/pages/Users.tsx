import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';

import { supabase, supabaseAdmin, Usuarios } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users as UsersIcon, Search, UserPlus, Shield, User, Mail, Trash2, Edit2, Key } from 'lucide-react';
import { FormModal } from '../components/FormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const Users: React.FC = () => {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<Usuarios[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<Usuarios | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'parent'
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    role: '',
    password: ''
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersResponse] = await Promise.all([
        supabase
          .from('usuarios')
          .select('*, roles(nombre_rol)')
          .order('created_at', { ascending: false })
      ]);

      if (usersResponse.error) throw usersResponse.error;

      setUsers(usersResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseAdmin) {
      alert('Error: La Service Role Key no está configurada.');
      return;
    }

    try {
      setCreating(true);

      // 1. Create the user in Auth using Admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: {
          full_name: newUser.fullName,
          role: newUser.role
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Fetch the role ID
        const authRoleMap: Record<string, string> = {
          'admin': 'admin',
          'secretary': 'secretary',
          'parent': 'parent'
        };

        const { data: roleData } = await supabase
          .from('roles')
          .select('id_rol')
          .eq('nombre_rol', authRoleMap[newUser.role as keyof typeof authRoleMap] || 'parent')
          .maybeSingle();

        // 3. Insert into public.usuarios
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert({
            id: authData.user.id,
            id_rol: roleData?.id_rol,
            nombre_completo: newUser.fullName,
            correo: newUser.email,
          });

        if (insertError) throw insertError;
      }

      setShowCreateModal(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'parent' });
      await fetchData();
      alert('Usuario creado exitosamente.');
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(`Error al crear usuario: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (user: Usuarios) => {
    setEditingUser(user);
    setEditFormData({
      fullName: user.nombre_completo,
      role: (user as any).roles?.nombre_rol || 'parent',
      password: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseAdmin || !editingUser) return;

    try {
      setUpdating(true);

      // 1. Update Auth user metadata and optionally password
      const updatePayload: any = {
        user_metadata: {
          full_name: editFormData.fullName,
          role: editFormData.role
        }
      };

      if (editFormData.password) {
        updatePayload.password = editFormData.password;
      }

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        editingUser.id,
        updatePayload
      );

      if (authError) throw authError;

      // 2. Fetch role ID
      const { data: roleData } = await supabase
        .from('roles')
        .select('id_rol')
        .eq('nombre_rol', editFormData.role)
        .maybeSingle();

      // 3. Update public.usuarios
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          nombre_completo: editFormData.fullName,
          id_rol: roleData?.id_rol,
        })
        .eq('id', editingUser.id);

      if (updateError) throw updateError;

      setShowEditModal(false);
      setEditingUser(null);
      await fetchData();
      alert('Usuario actualizado exitosamente.');
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(`Error al actualizar usuario: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      // In Supabase, deleting from `usuarios` depends on relationships.
      // Usually, deleting the auth user requires Admin API access or an RPC.
      // The user mentioned an RPC `delete_user` in the past. 
      // Assuming it's still available or we just delete from the public schema.
      const { error } = await supabase.rpc('delete_user', { user_id: userToDelete.id });

      if (error) {
        // Fallback just deleting from public if RPC fails
        const { error: fallbackError } = await supabase.from('usuarios').delete().eq('id', userToDelete.id);
        if (fallbackError) throw fallbackError;
      }

      await fetchData();
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar el usuario. Es posible que tenga registros asociados.');
    }
  };

  const filteredUsers = users.filter(user =>
    user.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.roles?.nombre_rol?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1 w-fit"><Shield className="w-4 h-4" /> Administrador</span>;
      case 'secretary':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1 w-fit"><Key className="w-4 h-4" /> Secretaría</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium flex items-center gap-1 w-fit"><User className="w-4 h-4" /> Representante</span>;
    }
  };

  if (userRole !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-lg">No tienes permisos para gestionar usuarios.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <UsersIcon className="text-blue-600" /> Gestión de Usuarios
        </h1>
        <p className="text-gray-600 mt-2">Administra los accesos y roles del sistema</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o rol..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            onClick={() => setShowCreateModal(true)}
          >
            <UserPlus className="w-5 h-5" />
            Nuevo Usuario
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="px-6 py-4 font-semibold">Usuario</th>
                  <th className="px-6 py-4 font-semibold">Datos de Contacto</th>
                  <th className="px-6 py-4 font-semibold">Rol</th>
                  <th className="px-6 py-4 font-semibold">Fecha Registro</th>
                  <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{user.nombre_completo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Mail className="w-4 h-4" /> {user.correo}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.roles?.nombre_rol || 'Desconocido')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setUserToDelete(user)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar permanentemente a "${userToDelete?.nombre_completo}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {showCreateModal && (
        <FormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Crear Nuevo Usuario"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="juan@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="parent">Representante</option>
                <option value="secretary">Secretaría</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {creating ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </FormModal>
      )}

      {showEditModal && (
        <FormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Editar Usuario"
        >
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={editFormData.fullName}
                onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                value={editingUser?.correo}
              />
              <p className="text-xs text-gray-400 mt-1">El correo no puede ser modificado.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña (Opcional)</label>
              <input
                type="password"
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                placeholder="Dejar en blanco para mantener actual"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
              >
                <option value="parent">Representante</option>
                <option value="secretary">Secretaría</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {updating ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </Layout>
  );
};
