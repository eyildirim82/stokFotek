import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { logError } from '../lib/activityLogger'; // Added logError import
import { X, TrendingUp, TrendingDown } from 'lucide-react'; // Changed Lucide icons import
import type { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

interface StockMoveModalProps {
  product: Product | null;
  type: 'IN' | 'OUT';
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockMoveModal({ product, type, onClose, onSuccess }: StockMoveModalProps) {
  const { user, currentOrgId, userRole } = useAuth();
  const [quantity, setQuantity] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!product) return null;

  const canManageStock = userRole === 'admin' || userRole === 'manager' || userRole === 'warehouse_staff';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!canManageStock) {
      setError('Bu işlem için yetkiniz yok. Sadece admin, manager ve warehouse_staff kullanıcılar stok hareketi yapabilir.');
      return;
    }

    setLoading(true);

    try {
      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) {
        setError('Geçerli bir miktar giriniz');
        setLoading(false);
        return;
      }

      const actualQuantity = type === 'OUT' ? -qty : qty;

      if (!currentOrgId || !user) {
        setError('Oturum bilgisi eksik');
        setLoading(false);
        return;
      }

      // Atomic update via RPC
      const { error: rpcError } = await supabase.rpc(
        'process_stock_movement',
        {
          p_product_id: product.product_id,
          p_org_id: currentOrgId,
          p_user_id: user.id,
          p_type: type,
          p_quantity: actualQuantity,
          p_reference_number: referenceNumber || undefined, // Changed from || null to || undefined
          p_reason_code: 'MANUAL_UPDATE', // Kept as is, assuming 'reasonCode' variable was not intended
          p_current_version: product.version
        }
      );

      if (rpcError) throw rpcError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error:', err);
      const errorMessage = err.message || 'İşlem sırasında bir hata oluştu';
      setError(errorMessage);
      if (currentOrgId) {
        await logError(currentOrgId, 'StockMoveModal_handleSubmit', err);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!canManageStock) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Yetkisiz Erişim</h2>
          <p className="text-slate-600 mb-4">
            Bu işlem için yetkiniz yok. Sadece admin, manager ve warehouse_staff kullanıcılar stok hareketi yapabilir.
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
            {type === 'IN' ? (
              <TrendingUp className="h-6 w-6 text-green-600" />
            ) : (
              <TrendingDown className="h-6 w-6 text-red-600" />
            )}
            <h2 className="text-xl font-semibold text-slate-900">
              {type === 'IN' ? 'Stok Girişi' : 'Stok Çıkışı'}
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
              Ürün
            </label>
            <p className="text-sm text-slate-900 font-medium">{product.name}</p>
            <p className="text-xs text-slate-500">SKU: {product.sku}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mevcut Stok
            </label>
            <p className="text-sm text-slate-900 font-medium">{product.current_stock.toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Miktar *
            </label>
            <input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Referans No (İrsaliye/Fatura)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Opsiyonel"
            />
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
              className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${type === 'IN'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
                }`}
              disabled={loading}
            >
              {loading ? 'İşleniyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
