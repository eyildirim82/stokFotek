import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { logActivity } from '../lib/activityLogger';
import { Search, TrendingUp, TrendingDown, ArrowLeftRight, CheckCircle2, AlertCircle, Package, X } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

export default function StockOperations() {
    const { user, currentOrgId, userRole } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [quantity, setQuantity] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [operationType, setOperationType] = useState<'IN' | 'OUT'>('IN');
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const canManageStock = userRole === 'admin' || userRole === 'manager' || userRole === 'warehouse_staff';

    useEffect(() => {
        if (searchTerm.length >= 2) {
            searchProducts();
        } else {
            setSearchResults([]);
        }
    }, [searchTerm]);

    async function searchProducts() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('is_deleted', false)
                .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
                .limit(5);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (error) {
            console.error('Error searching products:', error);
        }
    }

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setSearchTerm('');
        setSearchResults([]);
        setStatus(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !currentOrgId) return;

        if (!canManageStock) {
            setStatus({ type: 'error', message: 'Bu işlem için yetkiniz yok.' });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            const qty = parseFloat(quantity);
            if (isNaN(qty) || qty <= 0) {
                setStatus({ type: 'error', message: 'Geçerli bir miktar giriniz' });
                setLoading(false);
                return;
            }

            const actualQuantity = operationType === 'OUT' ? -qty : qty;
            const newStock = selectedProduct.current_stock + actualQuantity;

            const { data: updateData, error: updateError } = await (supabase
                .from('products') as any)
                .update({
                    current_stock: newStock,
                    version: selectedProduct.version + 1
                })
                .eq('product_id', selectedProduct.product_id)
                .eq('version', selectedProduct.version)
                .select();

            if (updateError) throw updateError;

            if (!updateData || updateData.length === 0) {
                setStatus({ type: 'error', message: 'Güncelleme başarısız. Ürün verisi değişmiş olabilir.' });
                setLoading(false);
                return;
            }

            const { error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    product_id: selectedProduct.product_id,
                    user_id: user?.id,
                    type: operationType,
                    quantity: actualQuantity,
                    reference_number: referenceNumber || null,
                    organization_id: currentOrgId
                } as any);

            if (transactionError) throw transactionError;

            await logActivity(currentOrgId, operationType === 'IN' ? 'stock_in' : 'stock_out', 'transaction', selectedProduct.product_id, {
                sku: selectedProduct.sku,
                product_name: selectedProduct.name,
                old_stock: selectedProduct.current_stock,
                new_stock: newStock,
                quantity: actualQuantity,
                reference_number: referenceNumber
            });

            setStatus({
                type: 'success',
                message: `${selectedProduct.sku} için ${qty} miktar ${operationType === 'IN' ? 'giriş' : 'çıkış'} işlemi başarıyla kaydedildi.`
            });

            // Update the local selected product state with new stock/version
            setSelectedProduct(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    current_stock: newStock,
                    version: prev.version + 1
                } as Product;
            });

            setQuantity('');
            setReferenceNumber('');
        } catch (err) {
            console.error('Error:', err);
            setStatus({ type: 'error', message: 'İşlem sırasında bir hata oluştu' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 rounded-lg">
                            <ArrowLeftRight className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Stok İşlemleri</h2>
                            <p className="text-sm text-slate-500">Hızlı stok girişi ve çıkışı yapın</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Product Search */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Ürün Ara (SKU veya İsim)
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Örn: E2G-2MN..."
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                            />
                            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                        </div>

                        {searchResults.length > 0 && (
                            <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                {searchResults.map((product) => (
                                    <button
                                        key={product.product_id}
                                        onClick={() => handleSelectProduct(product)}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-900">{product.sku}</p>
                                            <p className="text-sm text-slate-500">{product.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">Mevcut</p>
                                            <p className="font-bold text-slate-900">{product.current_stock.toFixed(2)}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedProduct ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                    <Package className="h-32 w-32" />
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                    <div className="space-y-1">
                                        <div className="inline-flex px-2 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded">Seçili Ürün</div>
                                        <h3 className="text-2xl font-bold text-slate-900">{selectedProduct.sku}</h3>
                                        <p className="text-slate-600">{selectedProduct.name}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm text-center min-w-[120px]">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Mevcut Stok</p>
                                            <p className="text-2xl font-black text-slate-900">{selectedProduct.current_stock.toFixed(2)}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedProduct(null)}
                                            className="p-2 text-slate-400 hover:text-slate-600 self-start"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                    <div className="space-y-4">
                                        <div className="flex p-1 bg-white border border-slate-200 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => setOperationType('IN')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${operationType === 'IN'
                                                    ? 'bg-green-600 text-white shadow-md'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <TrendingUp className="h-4 w-4" />
                                                STOK GİRİŞİ
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setOperationType('OUT')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${operationType === 'OUT'
                                                    ? 'bg-red-600 text-white shadow-md'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <TrendingDown className="h-4 w-4" />
                                                STOK ÇIKIŞI
                                            </button>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-bold text-slate-700">Miktar</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-bold text-slate-700">Referans No (İrsaliye/Fatura)</label>
                                            <input
                                                type="text"
                                                value={referenceNumber}
                                                onChange={(e) => setReferenceNumber(e.target.value)}
                                                placeholder="Örn: IRS-12345"
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className={`w-full py-4 rounded-xl text-white font-bold shadow-lg transition-all transform active:scale-[0.98] ${operationType === 'IN' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {loading ? 'İŞLENİYOR...' : 'İŞLEMİ KAYDET'}
                                        </button>
                                    </div>
                                </form>

                                {status && (
                                    <div className={`mt-6 p-4 rounded-xl border animate-in zoom-in-95 ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                                        } flex items-center gap-3`}>
                                        {status.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                        <p className="text-sm font-medium">{status.message}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">İşlem yapmak için yukarıdan ürün arayın</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
