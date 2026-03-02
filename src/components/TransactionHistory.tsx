import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Clock, Filter, Download, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  products?: {
    sku: string;
    name: string;
  };
};

export default function TransactionHistory() {
  const { currentOrgId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchSku, setSearchSku] = useState('');

  useEffect(() => {
    if (currentOrgId) {
      loadTransactions();
    }
  }, [currentOrgId]);

  async function loadTransactions() {
    if (!currentOrgId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          products:product_id (sku, name)
        `)
        .eq('organization_id', currentOrgId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    if (filterType !== 'ALL' && tx.type !== filterType) return false;
    if (searchSku && !tx.products?.sku.toLowerCase().includes(searchSku.toLowerCase())) return false;
    if (dateRange.start && new Date(tx.created_at) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(tx.created_at) > new Date(dateRange.end + 'T23:59:59')) return false;
    return true;
  });

  const exportToCSV = () => {
    const headers = ['Tarih', 'SKU', 'Ürün', 'İşlem Tipi', 'Miktar', 'Referans No', 'Neden'];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.created_at).toLocaleString('tr-TR'),
      tx.products?.sku || '',
      tx.products?.name || '',
      tx.type,
      tx.quantity,
      tx.reference_number || '',
      tx.reason_code || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stok-hareketleri-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'IN': return 'text-green-600 bg-green-50';
      case 'OUT': return 'text-red-600 bg-red-50';
      case 'ADJUST': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'IN': return <TrendingUp className="h-4 w-4" />;
      case 'OUT': return <TrendingDown className="h-4 w-4" />;
      case 'ADJUST': return <RefreshCw className="h-4 w-4" />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'IN': return 'Giriş';
      case 'OUT': return 'Çıkış';
      case 'ADJUST': return 'Düzeltme';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              İşlem Tipi
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Tümü</option>
              <option value="IN">Giriş</option>
              <option value="OUT">Çıkış</option>
              <option value="ADJUST">Düzeltme</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              SKU Ara
            </label>
            <input
              type="text"
              value={searchSku}
              onChange={(e) => setSearchSku(e.target.value)}
              placeholder="SKU..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
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
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" />
            <span>{filteredTransactions.length} işlem gösteriliyor</span>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            CSV İndir
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Tarih & Saat</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Ürün</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">İşlem</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Miktar</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Referans</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Neden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Stok hareketi bulunamadı
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {new Date(tx.created_at).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {tx.products?.sku || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {tx.products?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium ${getTypeColor(tx.type)}`}>
                        {getTypeIcon(tx.type)}
                        {getTypeLabel(tx.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium">
                      <span className={tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                        {tx.quantity > 0 ? '+' : ''}{tx.quantity.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {tx.reference_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {tx.reason_code || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-slate-600">Toplam Giriş</p>
            <p className="text-2xl font-bold text-green-600">
              {filteredTransactions.filter(tx => tx.type === 'IN').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Toplam Çıkış</p>
            <p className="text-2xl font-bold text-red-600">
              {filteredTransactions.filter(tx => tx.type === 'OUT').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Düzeltme</p>
            <p className="text-2xl font-bold text-blue-600">
              {filteredTransactions.filter(tx => tx.type === 'ADJUST').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
