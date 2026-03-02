import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Edit2, TrendingUp, TrendingDown, AlertCircle, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductListProps {
  onEditProduct: (product: Product) => void;
  onStockMove: (product: Product, type: 'IN' | 'OUT') => void;
  refreshTrigger: number;
}

type SortField = 'sku' | 'name' | 'current_stock' | 'fixed_cost_usd' | 'list_price_usd';
type SortDirection = 'asc' | 'desc';

export default function ProductList({ onEditProduct, onStockMove, refreshTrigger }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'negative'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at' as SortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadProducts();
  }, [refreshTrigger, debouncedSearch, stockFilter, sortField, sortDirection, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, stockFilter]);

  async function loadProducts() {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_deleted', false);

      // Search
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%`);
      }

      // Stock Filters
      if (stockFilter === 'low') {
        // We can't easily join the min_stock_level logic in a single query if it's dynamic
        // but for now we'll use a fixed threshold or the column if available in a more complex query
        // For simplicity and correctness with Supabase filter:
        query = query.lt('current_stock', 10).gte('current_stock', 0);
      } else if (stockFilter === 'negative') {
        query = query.lt('current_stock', 0);
      }

      // Sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;
      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const calculateInventoryValue = (product: Product) => {
    return product.current_stock * product.fixed_cost_usd;
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Ürün adı veya SKU ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <Package className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${stockFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setStockFilter('low')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${stockFilter === 'low'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            Düşük Stok
          </button>
          <button
            onClick={() => setStockFilter('negative')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${stockFilter === 'negative'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            Negatif
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('sku')}
                >
                  <div className="flex items-center gap-1">
                    SKU
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Ürün Adı
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('current_stock')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Stok
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="hidden md:table-cell px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('fixed_cost_usd')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Alış Fiyatı
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="hidden lg:table-cell px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('list_price_usd')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Liste Fiyatı
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="hidden xl:table-cell px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Envanter Değeri
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-4 sm:px-6 py-8 text-center text-slate-500">
                    {searchTerm || stockFilter !== 'all' ? 'Filtre kriterlerine uygun ürün bulunamadı' : 'Ürün bulunamadı'}
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const inventoryValue = calculateInventoryValue(product);
                  const minStock = product.min_stock_level || 10;
                  const isLowStock = product.current_stock < minStock;
                  const isNegative = product.current_stock < 0;

                  return (
                    <tr key={product.product_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 text-sm font-medium text-slate-900">{product.sku}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-700">{product.name}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-right">
                        <span className={`inline-flex items-center gap-1 font-medium ${isNegative ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-slate-900'
                          }`}>
                          {isNegative && <AlertCircle className="h-4 w-4" />}
                          {product.current_stock.toFixed(2)}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-6 py-4 text-sm text-right text-slate-700">
                        ${product.fixed_cost_usd.toFixed(2)}
                      </td>
                      <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm text-right text-slate-700">
                        {product.list_price_usd ? `$${product.list_price_usd.toFixed(2)}` : '-'}
                      </td>
                      <td className="hidden xl:table-cell px-4 sm:px-6 py-4 text-sm text-right font-medium text-slate-900">
                        ${inventoryValue.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <button
                            onClick={() => onStockMove(product, 'IN')}
                            className="p-1.5 hover:bg-green-50 rounded-md transition-colors"
                            title="Stok Girişi"
                          >
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => onStockMove(product, 'OUT')}
                            className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                            title="Stok Çıkışı"
                          >
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          </button>
                          <button
                            onClick={() => onEditProduct(product)}
                            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="h-4 w-4 text-slate-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-3">
          <div className="text-sm text-slate-600">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalCount)} / {totalCount} ürün
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-700">
              Sayfa {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-slate-600">Bu Sayfadaki Toplam Ürün</p>
            <p className="text-2xl font-bold text-slate-900">{products.length}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Bu Sayfadaki Stok Değeri</p>
            <p className="text-2xl font-bold text-slate-900">
              ${products.reduce((sum, p) => sum + calculateInventoryValue(p), 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
