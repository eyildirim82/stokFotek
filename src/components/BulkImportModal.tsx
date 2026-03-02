import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { logError } from '../lib/activityLogger';

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportRow {
  sku: string;
  name: string;
  stock: string;
  cost: string;
  price: string;
}

export default function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  const { user, currentOrgId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ImportRow[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setError('CSV dosyası en az bir başlık satırı ve bir veri satırı içermelidir');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length) {
        data.push({
          sku: values[0] || '',
          name: values[1] || '',
          stock: values[2] || '0',
          cost: values[3] || '0',
          price: values[4] || ''
        });
      }
    }

    setPreview(data);
    setError('');
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      setError('İçe aktarılacak veri bulunamadı');
      return;
    }

    if (!currentOrgId) {
      setError('Organizasyon seçilmedi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const productsToInsert = preview.map(row => ({
        sku: row.sku,
        name: row.name,
        current_stock: parseFloat(row.stock) || 0,
        fixed_cost_usd: parseFloat(row.cost) || 0,
        list_price_usd: row.price ? parseFloat(row.price) : null
      }));

      const { error: rpcError } = await supabase.rpc('bulk_create_products', {
        p_products: productsToInsert,
        p_org_id: currentOrgId,
        p_user_id: user?.id || ''
      });

      if (rpcError) throw rpcError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Import error:', err);
      if (currentOrgId) {
        await logError(currentOrgId, 'bulk_import_error', err, {
          previewCount: preview.length
        });
      }
      if (err.code === '23505') {
        setError('Bazı SKU\'lar zaten mevcut. Lütfen dosyanızı kontrol edin.');
      } else {
        setError('İçe aktarma sırasında bir hata oluştu: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Upload className="h-6 w-6 text-slate-900" />
            <h2 className="text-xl font-semibold text-slate-900">Toplu Ürün İçe Aktarma</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-slate-600 mt-0.5" />
              <div className="text-sm text-slate-700">
                <p className="font-medium mb-2">CSV Dosya Formatı:</p>
                <code className="block bg-white px-3 py-2 rounded border border-slate-200 text-xs">
                  SKU,Ürün Adı,Stok,Alış Fiyatı,Liste Fiyatı<br />
                  PROD-001,Örnek Ürün 1,100,10.50,15.99<br />
                  PROD-002,Örnek Ürün 2,50,25.00,39.99
                </code>
                <p className="mt-2 text-xs text-slate-600">
                  • İlk satır başlık olmalıdır<br />
                  • SKU benzersiz olmalıdır<br />
                  • Liste Fiyatı opsiyoneldir
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              CSV Dosyası Seçin
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
            />
          </div>

          {preview.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">
                Önizleme ({preview.length} ürün)
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-slate-700">SKU</th>
                        <th className="px-4 py-2 text-left font-medium text-slate-700">Ürün Adı</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-700">Stok</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-700">Alış</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-700">Liste</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {preview.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium">{row.sku}</td>
                          <td className="px-4 py-2">{row.name}</td>
                          <td className="px-4 py-2 text-right">{row.stock}</td>
                          <td className="px-4 py-2 text-right">${row.cost}</td>
                          <td className="px-4 py-2 text-right">{row.price ? `$${row.price}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            disabled={loading}
          >
            İptal
          </button>
          <button
            onClick={handleImport}
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || preview.length === 0}
          >
            {loading ? 'İçe Aktarılıyor...' : `${preview.length} Ürünü İçe Aktar`}
          </button>
        </div>
      </div>
    </div>
  );
}
