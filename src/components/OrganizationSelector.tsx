import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Check } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

interface OrganizationSelectorProps {
  currentOrgId: string | null;
  onOrgChange: (orgId: string) => void;
}

export default function OrganizationSelector({ currentOrgId, onOrgChange }: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  }

  const currentOrg = organizations.find(org => org.id === currentOrgId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <Building2 className="h-4 w-4 text-slate-600" />
        <span className="text-sm font-medium text-slate-900">
          {loading ? 'Yükleniyor...' : currentOrg?.name || 'Organizasyon Seçin'}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
            <div className="py-1">
              {organizations.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 text-center">
                  Organizasyon bulunamadı
                </div>
              ) : (
                organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      onOrgChange(org.id);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span>{org.name}</span>
                    {currentOrgId === org.id && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
