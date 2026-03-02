import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Clock, Activity, Filter, Download } from 'lucide-react';
import { logError } from '../lib/activityLogger';
import type { Database } from '../lib/database.types';

type ActivityLog = Database['public']['Tables']['user_activity_logs']['Row'] & {
  user_profiles?: {
    full_name: string | null;
  };
};

export default function ActivityLogs() {
  const { currentOrgId, userRole } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  const canViewLogs = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    if (currentOrgId && canViewLogs) {
      loadLogs();
    }
  }, [currentOrgId, canViewLogs, filterAction, dateRange.start, dateRange.end, currentPage]);

  async function loadLogs() {
    if (!currentOrgId || !canViewLogs) return;

    setLoading(true);
    try {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('user_activity_logs')
        .select(`
          *,
          user_profiles!user_activity_logs_user_id_fkey (full_name)
        `, { count: 'exact' })
        .eq('organization_id', currentOrgId);

      if (filterAction !== 'ALL') {
        query = query.eq('action', filterAction);
      }

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }

      if (dateRange.end) {
        query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setLogs((data as any[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading activity logs:', error);
      if (currentOrgId) {
        await logError(currentOrgId, 'ActivityLogs_loadLogs', error);
      }
    } finally {
      setLoading(false);
    }
  }

  const exportToCSV = async () => {
    try {
      if (!currentOrgId) return;
      let query = supabase
        .from('user_activity_logs')
        .select(`
          created_at,
          action,
          details,
          user_profiles!user_activity_logs_user_id_fkey (full_name)
        `)
        .eq('organization_id', currentOrgId)
        .limit(1000);

      if (filterAction !== 'ALL') query = query.eq('action', filterAction);
      if (dateRange.start) query = query.gte('created_at', dateRange.start);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const headers = ['Tarih & Saat', 'Kullanıcı', 'İşlem', 'Detaylar'];
      const rows = (data || []).map(log => [
        log.created_at ? new Date(log.created_at).toLocaleString('tr-TR') : '---',
        (log as any).user_profiles?.full_name || 'Bilinmiyor',
        getActionLabel(log.action || ''),
        JSON.stringify(log.details)
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `aktivite-kayitlari-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'create': 'Oluşturma',
      'update': 'Güncelleme',
      'delete': 'Silme',
      'stock_in': 'Stok Girişi',
      'stock_out': 'Stok Çıkışı',
      'BULK_IMPORT': 'Toplu İçe Aktarma',
      'login': 'Giriş',
      'logout': 'Çıkış',
      'legacy_system': 'Eski Sistem Kaydı',
      'system_error': 'Sistem Hatası'
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('stock_in')) return 'text-green-600 bg-green-50';
    if (action.includes('delete') || action.includes('stock_out')) return 'text-red-600 bg-red-50';
    if (action.includes('update')) return 'text-blue-600 bg-blue-50';
    if (action === 'system_error') return 'text-red-700 bg-red-100 border border-red-200';
    if (action === 'legacy_system') return 'text-amber-700 bg-amber-50 border border-amber-100';
    return 'text-slate-600 bg-slate-50';
  };

  if (!canViewLogs) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center">
          <Activity className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Yetkisiz Erişim</h3>
          <p className="text-slate-600">
            Aktivite kayıtlarını görüntülemek için admin veya manager yetkisine sahip olmalısınız.
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              İşlem Tipi
            </label>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Tümü</option>
              <option value="create">Oluşturma</option>
              <option value="update">Güncelleme</option>
              <option value="delete">Silme</option>
              <option value="stock_in">Stok Girişi</option>
              <option value="stock_out">Stok Çıkışı</option>
              <option value="BULK_IMPORT">Toplu İçe Aktarma</option>
              <option value="legacy_system">Eski Sistem Kaydı</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" />
            <span>Toplam {totalCount} kayıt, {logs.length} kayıt gösteriliyor</span>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            CSV İndir (Max 1000)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Tarih & Saat</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Kullanıcı</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">İşlem</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Detaylar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 relative">
              {loading && (
                <div className="absolute inset-0 bg-white/30 flex items-center justify-center z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </div>
              )}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    {loading ? 'Yükleniyor...' : 'Aktivite kaydı bulunamadı'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={(log as any).id || (log as any).log_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {log.created_at ? new Date(log.created_at).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '---'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {log.user_profiles?.full_name || 'Bilinmiyor'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium ${getActionColor(log.action)}`}>
                        <Activity className="h-3.5 w-3.5" />
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <details className="cursor-pointer">
                        <summary className="text-slate-900 hover:text-slate-700">
                          Detayları Görüntüle
                        </summary>
                        <pre className="mt-2 text-xs bg-slate-50 p-2 rounded overflow-auto max-w-md">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              Önceki
            </button>
            <span className="text-sm text-slate-600">
              Sayfa <span className="font-semibold text-slate-900">{currentPage}</span> / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
