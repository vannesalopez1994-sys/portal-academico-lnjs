import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Layout } from '../components/Layout';

import { supabase, supabaseAdmin, Usuarios } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users2, Search, UserPlus, ShieldCheck, AtSign, Trash2, Pencil, KeyRound, UserCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { FormModal } from '../components/FormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FieldHelp } from '../components/FieldHelp';

export const Users: React.FC = () => {
  const { profile, userRole } = useAuth();
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
  const [editingUser, setEditingUser] = useState<Usuarios | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    role: 'parent',
    newPassword: '',
    estado: 'activo',
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

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
      toast.error('Error: La Service Role Key no está configurada.');
      return;
    }

    // Strong password validation
    const passwordRules = [
      { label: 'mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
      { label: 'al menos una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
      { label: 'al menos un número', test: (p: string) => /[0-9]/.test(p) },
      { label: 'al menos un carácter especial (!@#$%^&*)', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
    ];
    const failedRules = passwordRules.filter(r => !r.test(newUser.password));
    if (failedRules.length > 0) {
      toast.error(`Contraseña insegura. Falta: ${failedRules.map(r => r.label).join(', ')}.`);
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
          'admin': 'Administrador',
          'secretary': 'Secretaría',
          'parent': 'Representante'
        };

        const { data: roleData } = await supabase
          .from('roles')
          .select('id_rol')
          .eq('nombre_rol', authRoleMap[newUser.role as keyof typeof authRoleMap] || 'Representante')
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
      toast.success('Usuario creado exitosamente.');
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(`Error al crear usuario: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (user: Usuarios) => {
    setEditingUser(user);
    const reverseRoleMap: Record<string, string> = {
      'Administrador': 'admin',
      'Secretaría': 'secretary',
      'Representante': 'parent'
    };
    setEditForm({
      fullName: user.nombre_completo,
      role: reverseRoleMap[user.roles?.nombre_rol || ''] || 'parent',
      newPassword: '',
      estado: user.estado || 'activo',
    });
    setShowEditPassword(false);
    setChangePassword(false);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Validate password if provided
    if (editForm.newPassword) {
      const passwordRules = [
        { label: 'mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
        { label: 'al menos una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
        { label: 'al menos un número', test: (p: string) => /[0-9]/.test(p) },
        { label: 'al menos un carácter especial (!@#$%^&*)', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
      ];
      const failedRules = passwordRules.filter(r => !r.test(editForm.newPassword));
      if (failedRules.length > 0) {
        toast.error(`Contraseña insegura. Falta: ${failedRules.map(r => r.label).join(', ')}.`);
        return;
      }
    }

    if (!supabaseAdmin) {
      toast.error('Error: La Service Role Key no está configurada. No se puede actualizar.');
      return;
    }

    try {
      setCreating(true);

      const authRoleMap: Record<string, string> = {
        'admin': 'Administrador',
        'secretary': 'Secretaría',
        'parent': 'Representante'
      };

      const { data: roleData } = await supabase
        .from('roles')
        .select('id_rol')
        .eq('nombre_rol', authRoleMap[editForm.role] || 'Representante')
        .maybeSingle();

      // 1. Update public.usuarios table
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre_completo: editForm.fullName,
          id_rol: roleData?.id_rol,
          estado: editForm.estado,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // 2. If a new password was entered, update it via Admin API
      if (editForm.newPassword.trim() !== '') {
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          editingUser.id,
          { password: editForm.newPassword.trim() }
        );
        if (passwordError) throw new Error('Usuario actualizado, pero error al cambiar contraseña: ' + passwordError.message);
      }

      setShowEditModal(false);
      setEditingUser(null);
      await fetchData();
      toast.success('Usuario actualizado exitosamente.' + (editForm.newPassword ? ' La contraseña ha sido cambiada.' : ''));
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(`Error al actualizar usuario: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    if (!supabaseAdmin) {
      toast.error('Error: La Service Role Key no está configurada. No se puede eliminar el usuario.');
      return;
    }

    try {
      // Step 1: Delete related records from public tables first
      await supabase.from('historial_accesos').delete().eq('correo', userToDelete.correo);
      await supabase.from('ausencias').delete().eq('id_representante', userToDelete.id);

      // Step 2: Delete from public.usuarios
      const { error: publicError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', userToDelete.id);

      if (publicError) {
        console.warn('Error deleting from public.usuarios:', publicError.message);
        // Continue anyway to try deleting from auth
      }

      // Step 3: Delete from auth.users (requires Admin API)
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.id);

      if (authError) throw authError;

      await fetchData();
      setUserToDelete(null);
      toast.success('Usuario eliminado correctamente del sistema.');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`Error al eliminar el usuario: ${error.message}`);
    }
  };

  const filteredUsers = users.filter(user => {
    // Si el usuario logueado NO es el Administrador Máster, ocultamos la cuenta Máster
    const isMasterAdminEmail = 'adminmaster2026l.n.joaquinas@gmail.com';
    if (profile?.correo !== isMasterAdminEmail && user.correo === isMasterAdminEmail) {
      return false;
    }
    return user.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.roles?.nombre_rol?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getRoleBadge = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'administrador':
      case 'admin':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold flex items-center gap-1.5 w-fit border border-purple-200"><ShieldCheck className="w-4 h-4" /> Administrador</span>;
      case 'secretaría':
      case 'secretaria':
      case 'secretary':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold flex items-center gap-1.5 w-fit border border-blue-200"><KeyRound className="w-4 h-4" /> Secretaría</span>;
      default:
        return <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-semibold flex items-center gap-1.5 w-fit border border-teal-200"><UserCircle2 className="w-4 h-4" /> Representante</span>;
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
      {/* Corporate Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0a1628] via-[#0d2b5e] to-blue-800 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white rounded-full" />
          <div className="absolute bottom-0 left-1/3 w-28 h-28 bg-white rounded-full" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="bg-white/10 border border-white/20 backdrop-blur-sm p-3.5 rounded-2xl shadow-inner">
            <Users2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Gestión de Usuarios</h1>
            <p className="text-blue-200/70 text-sm mt-0.5 font-medium">Administra los accesos y roles del sistema</p>
          </div>
        </div>
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
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md shadow-blue-200 font-semibold"
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
                  <th className="px-6 py-4 font-semibold">Estado</th>
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
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <AtSign className="w-4 h-4 text-blue-400" /> {user.correo}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.roles?.nombre_rol || 'Desconocido')}
                    </td>
                    <td className="px-6 py-4">
                      {user.estado === 'inactivo' ? (
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold border border-red-200">
                          Inactivo
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold border border-green-200">
                          Activo
                        </span>
                      )}
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
                          <Pencil className="w-4 h-4" />
                        </button>
                        {user.correo !== 'adminmaster2026l.n.joaquinas@gmail.com' && (
                          <button
                            onClick={() => setUserToDelete(user)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
              <FieldHelp
                hint="Ingresa el nombre y apellido completo del usuario tal como se registrará en el sistema."
                example="Ana Rodríguez"
                position="bottom"
              >
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                />
              </FieldHelp>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <FieldHelp
                hint="Correo válido que usará el usuario para iniciar sesión. Debe ser único en el sistema."
                example="ana.rodriguez@gmail.com"
                position="bottom"
              >
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="juan@ejemplo.com"
                />
              </FieldHelp>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <FieldHelp
                hint="Mínimo 8 caracteres, una mayúscula, un número y un carácter especial (!@#$)."
                example="MiClave@2025"
                position="bottom"
              >
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Mínimo 8 car., mayúscula, número y especial"
                />
              </FieldHelp>
              <p className="text-xs text-gray-400 mt-1">Ej: <span className="font-mono font-semibold">MiClave@2024</span></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <FieldHelp
                hint="Define los permisos del usuario. Representante: solo consulta. Secretaría: gestiona expedientes. Administrador: acceso total."
                example="Representante"
                position="bottom"
              >
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="parent">Representante</option>
                  <option value="secretary">Secretaría</option>
                  <option value="admin">Administrador</option>
                </select>
              </FieldHelp>
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
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          title="Editar Usuario"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <FieldHelp
                hint="Modifica el nombre y apellido que el usuario verá en su perfil dentro del sistema."
                example="Carlos Pérez"
                position="bottom"
              >
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  disabled={editingUser?.correo === 'adminmaster2026l.n.joaquinas@gmail.com'}
                />
              </FieldHelp>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <FieldHelp
                hint="Cambia el nivel de acceso del usuario. El cambio toma efecto en su próximo inicio de sesión."
                example="Secretaría"
                position="bottom"
              >
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  disabled={editingUser?.correo === 'adminmaster2026l.n.joaquinas@gmail.com'}
                >
                  <option value="parent">Representante</option>
                  <option value="secretary">Secretaría</option>
                  <option value="admin">Administrador</option>
                </select>
              </FieldHelp>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado de la Cuenta</label>
              <FieldHelp
                hint="Activo: el usuario puede iniciar sesión. Inactivo: el acceso queda bloqueado temporalmente."
                example="Activo"
                position="bottom"
              >
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  value={editForm.estado}
                  onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                  disabled={editingUser?.correo === 'adminmaster2026l.n.joaquinas@gmail.com'}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </FieldHelp>
            </div>

            <div className="pt-2">
              {!changePassword ? (
                <button
                  type="button"
                  onClick={() => setChangePassword(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition outline-none"
                >
                  <Lock className="w-4 h-4" />
                  ¿Cambiar contraseña de este usuario?
                </button>
              ) : (
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
                    <button
                      type="button"
                      onClick={() => {
                        setChangePassword(false);
                        setEditForm(prev => ({ ...prev, newPassword: '' }));
                      }}
                      className="text-xs text-red-500 hover:text-red-600 transition outline-none"
                    >
                      Cancelar cambio
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                      placeholder="Mínimo 8 car., mayúscula, número y especial"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">Mínimo 8 caracteres, incluir mayúscula, número y carácter especial. Ej: <span className="font-mono font-semibold">MiClave@2024</span></p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {creating ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </Layout>
  );
};
