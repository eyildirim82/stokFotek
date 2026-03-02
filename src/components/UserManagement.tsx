import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, X, Shield, Eye, Briefcase, Package } from 'lucide-react';

interface UserRole {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'manager' | 'warehouse_staff' | 'viewer';
  created_at: string;
  user_profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface UserManagementProps {
  organizationId: string;
  currentUserRole: string;
}

const roleIcons = {
  admin: Shield,
  manager: Briefcase,
  warehouse_staff: Package,
  viewer: Eye,
};

const roleDescriptions = {
  admin: 'Tam yetki - Tüm işlemleri yapabilir',
  manager: 'Ürün ve stok yönetimi yapabilir',
  warehouse_staff: 'Sadece stok hareketleri yapabilir',
  viewer: 'Sadece görüntüleyebilir',
};

export default function UserManagement({ organizationId, currentUserRole }: UserManagementProps) {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'manager' | 'warehouse_staff' | 'viewer'>('viewer');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserRoles();
  }, [organizationId]);

  async function loadUserRoles() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          user_profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('organization_id', organizationId);

      if (error) throw error;
      setUserRoles(data as any[] as UserRole[]);
    } catch (error) {
      console.error('Error loading user roles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser() {
    if (!newUserEmail.trim()) {
      setError('Email adresi gerekli');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', newUserEmail)
        .single();

      if (userError) {
        setError('Kullanıcı bulunamadı. Kullanıcının önce kayıt olması gerekiyor.');
        setProcessing(false);
        return;
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userData.id,
          organization_id: organizationId,
          role: newUserRole,
        });

      if (roleError) {
        if (roleError.code === '23505') {
          setError('Bu kullanıcı zaten organizasyona ekli');
        } else {
          throw roleError;
        }
      } else {
        await loadUserRoles();
        setShowAddUser(false);
        setNewUserEmail('');
        setNewUserRole('viewer');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      setError('Kullanıcı eklenirken hata oluştu');
    } finally {
      setProcessing(false);
    }
  }

  async function handleRemoveUser(roleId: string) {
    if (!confirm('Bu kullanıcıyı organizasyondan kaldırmak istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      await loadUserRoles();
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Kullanıcı kaldırılırken hata oluştu');
    }
  }

  async function handleUpdateRole(roleId: string, newRole: string) {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', roleId);

      if (error) throw error;
      await loadUserRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Rol güncellenirken hata oluştu');
    }
  }

  if (currentUserRole !== 'admin') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
        Bu bölümü görüntülemek için admin yetkisine sahip olmanız gerekiyor.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Kullanıcı Yönetimi</h2>
        </div>
        <button
          onClick={() => setShowAddUser(!showAddUser)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Kullanıcı Ekle
        </button>
      </div>

      {showAddUser && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Yeni Kullanıcı Ekle</h3>
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Adresi
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="kullanici@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Rol
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="viewer">Görüntüleyici</option>
                <option value="warehouse_staff">Depo Görevlisi</option>
                <option value="manager">Yönetici</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {roleDescriptions[newUserRole]}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddUser}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Ekleniyor...' : 'Ekle'}
              </button>
              <button
                onClick={() => {
                  setShowAddUser(false);
                  setError('');
                  setNewUserEmail('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Eklenme Tarihi
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {userRoles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              ) : (
                userRoles.map((userRole) => {
                  const RoleIcon = roleIcons[userRole.role];
                  return (
                    <tr key={userRole.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {userRole.user_profiles?.email || 'Bilinmeyen'}
                        {userRole.user_profiles?.full_name && (
                          <span className="block text-xs text-slate-500">{userRole.user_profiles.full_name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <RoleIcon className="h-4 w-4 text-slate-600" />
                          <select
                            value={userRole.role}
                            onChange={(e) => handleUpdateRole(userRole.id, e.target.value)}
                            className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-slate-900"
                          >
                            <option value="viewer">Görüntüleyici</option>
                            <option value="warehouse_staff">Depo Görevlisi</option>
                            <option value="manager">Yönetici</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {new Date(userRole.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button
                          onClick={() => handleRemoveUser(userRole.id)}
                          className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                          title="Kullanıcıyı Kaldır"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
