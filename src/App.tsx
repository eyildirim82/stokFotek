import { useState } from 'react';
import { Package, Plus, Upload, BarChart3, History, Users, Activity, ArrowLeftRight } from 'lucide-react';
import { useAuth } from './lib/auth';
import ProductList from './components/ProductList';
import ProductModal from './components/ProductModal';
import StockMoveModal from './components/StockMoveModal';
import BulkImportModal from './components/BulkImportModal';
import TransactionHistory from './components/TransactionHistory';
import ActivityLogs from './components/ActivityLogs';
import StockOperations from './components/StockOperations';
import AuthForm from './components/AuthForm';
import Header from './components/Header';
import UserManagement from './components/UserManagement';
import type { Database } from './lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];
type Tab = 'products' | 'operations' | 'history' | 'activity' | 'users';

function App() {
  const { user, loading, currentOrgId, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockMoveType, setStockMoveType] = useState<'IN' | 'OUT'>('IN');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleStockMove = (product: Product, type: 'IN' | 'OUT') => {
    setSelectedProduct(product);
    setStockMoveType(type);
    setShowStockModal(true);
  };

  const handleCloseProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
  };

  const handleCloseStockModal = () => {
    setShowStockModal(false);
    setSelectedProduct(null);
  };


  const canCreateProducts = userRole === 'admin' || userRole === 'manager';
  const canViewUsers = userRole === 'admin';
  const canViewActivity = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-900 rounded-xl shadow-lg">
                <Package className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Envanter Yönetimi</h1>
                <p className="text-slate-600 mt-1">Ürünlerinizi takip edin ve yönetin</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {activeTab === 'products' && canCreateProducts && (
                <>
                  <button
                    onClick={() => setShowBulkImport(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="hidden sm:inline">Toplu İçe Aktar</span>
                    <span className="sm:hidden">İçe Aktar</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setShowProductModal(true);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg"
                  >
                    <Plus className="h-5 w-5" />
                    Yeni Ürün
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 bg-white rounded-lg shadow-sm border border-slate-200 p-1 inline-flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'products'
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:bg-slate-50'
              }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Ürünler</span>
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'operations'
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:bg-slate-50'
              }`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Stok İşlemleri</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'history'
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:bg-slate-50'
              }`}
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">İşlem Geçmişi</span>
          </button>
          {canViewActivity && (
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'activity'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Aktivite Kayıtları</span>
            </button>
          )}
          {canViewUsers && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'users'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Kullanıcılar</span>
            </button>
          )}
        </div>

        {activeTab === 'products' ? (
          <ProductList
            onEditProduct={handleEditProduct}
            onStockMove={handleStockMove}
            refreshTrigger={refreshTrigger}
          />
        ) : activeTab === 'operations' ? (
          <StockOperations />
        ) : activeTab === 'history' ? (
          <TransactionHistory />
        ) : activeTab === 'activity' ? (
          <ActivityLogs />
        ) : (
          <UserManagement organizationId={currentOrgId || ''} currentUserRole={userRole || ''} />
        )}
      </div>

      {showProductModal && (
        <ProductModal
          product={selectedProduct}
          onClose={handleCloseProductModal}
          onSuccess={handleRefresh}
        />
      )}

      {showStockModal && (
        <StockMoveModal
          product={selectedProduct}
          type={stockMoveType}
          onClose={handleCloseStockModal}
          onSuccess={handleRefresh}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}

export default App;
