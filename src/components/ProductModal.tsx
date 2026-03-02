import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { logActivity, logError } from '../lib/activityLogger';
import { X, Package } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const { user, currentOrgId, userRole } = useAuth();
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    fixed_cost_usd: '',
    list_price_usd: '',
    current_stock: '0',
    min_stock_level: '10'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canManageProducts = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        fixed_cost_usd: product.fixed_cost_usd.toString(),
        list_price_usd: product.list_price_usd?.toString() || '',
        current_stock: product.current_stock.toString(),
        min_stock_level: product.min_stock_level?.toString() || '10'
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!canManageProducts) {
      setError('Bu işlem için yetkiniz yok. Sadece admin ve manager kullanıcılar ürün oluşturabilir/düzenleyebilir.');
      return;
    }

    setLoading(true);

    try {
      const data = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        fixed_cost_usd: parseFloat(formData.fixed_cost_usd),
        list_price_usd: formData.list_price_usd ? parseFloat(formData.list_price_usd) : null,
        current_stock: parseFloat(formData.current_stock),
        min_stock_level: parseFloat(formData.min_stock_level),
        organization_id: currentOrgId
      };

      if (product) {
        // For existing products, we update basic info but NOT stock directly
        // Stock should be managed via Stock Operations tab for audit trail
        const { sku, current_stock, ...updateData } = data;

        const { error: updateError } = await supabase
          .from('products')
          .update(updateData as any)
          .eq('product_id', product.product_id);

        if (updateError) throw updateError;

        if (currentOrgId) {
          await logActivity(currentOrgId, 'update', 'product', product.product_id, {
            sku: product.sku,
            changes: updateData
          });
        }
      } else {
        // Atomic creation with initial stock and transaction
        const { error: rpcError } = await supabase.rpc('create_product_with_stock', {
          p_sku: data.sku,
          p_name: data.name,
          p_fixed_cost_usd: data.fixed_cost_usd,
          p_list_price_usd: data.list_price_usd || 0,
          p_min_stock_level: data.min_stock_level,
          p_current_stock: data.current_stock,
          p_org_id: currentOrgId || '',
          p_user_id: user?.id || ''
        });

        if (rpcError) throw rpcError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error:', err);
      if (currentOrgId) {
        await logError(currentOrgId, 'product_management_error', err, {
          action: product ? 'update' : 'create',
          sku: formData.sku
        });
      }
      if (err.code === '23505') {
        setError('Bu SKU zaten kullanılıyor');
      } else {
        setError('İşlem sırasında bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!canManageProducts) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Yetkisiz Erişim</h2>
          <p className="text-slate-600 mb-4">
            Bu işlem için yetkiniz yok. Sadece admin ve manager kullanıcılar ürün oluşturabilir/düzenleyebilir.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Tamam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-slate-900" />
            <h2 className="text-xl font-semibold text-slate-900">
              {product ? 'Ürün Düzenle' : 'Yeni Ürün'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              SKU *
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="PROD-001"
              required
              disabled={!!product}
            />
            {product && (
              <p className="mt-1 text-xs text-slate-500">SKU düzenlenemez</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ürün Adı *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Ürün adı"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Alış Fiyatı (USD) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.fixed_cost_usd}
              onChange={(e) => setFormData({ ...formData, fixed_cost_usd: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Liste Fiyatı (USD)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.list_price_usd}
              onChange={(e) => setFormData({ ...formData, list_price_usd: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Minimum Stok Seviyesi
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.min_stock_level}
              onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="10"
            />
            <p className="mt-1 text-xs text-slate-500">Bu seviyenin altında stok uyarısı gösterilir</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {product ? 'Mevcut Stok Miktarı' : 'Başlangıç Stok Miktarı'}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.current_stock}
              onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="0.00"
              disabled={!!product}
              title={product ? "Stok miktarını değiştirmek için lütfen 'Stok İşlemleri' sekmesini kullanın." : ""}
            />
            {product && (
              <p className="mt-1 text-xs text-slate-500 italic">
                Stok değişimi için 'Stok İşlemleri' sekmesini kullanın.
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              disabled={loading}
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
