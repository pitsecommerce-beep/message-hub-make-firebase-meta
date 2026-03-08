import { useState, useRef, useEffect } from 'react';
import { Database, Upload, Download, FileSpreadsheet, Users, Package, Loader2, Check, AlertCircle, X, Trash2, HardDrive, Calendar, Hash } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { bulkImportContacts, bulkImportProducts, bulkImportData, subscribeKnowledgeBases, createKnowledgeBase, deleteKnowledgeBase, deleteKnowledgeBaseData } from '@/services/firestore';
import { classNames } from '@/utils/helpers';
import PageHeader from '@/components/shared/PageHeader';
import type { Contact, Product, KnowledgeBase } from '@/types';

type ImportType = 'contacts' | 'products' | 'custom';

interface ImportResult {
  success: boolean;
  count: number;
  message: string;
}

const CONTACT_TEMPLATE_HEADERS = ['nombre', 'teléfono', 'email', 'empresa', 'rfc', 'dirección', 'plataforma', 'notas'];
const PRODUCT_TEMPLATE_HEADERS = ['sku', 'nombre', 'descripción', 'precio_unitario', 'categoría', 'stock'];

export default function DatabasesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ImportType>('contacts');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [allData, setAllData] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [customName, setCustomName] = useState('');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.teamId) return;
    const unsub = subscribeKnowledgeBases(user.teamId, setKnowledgeBases);
    return () => unsub();
  }, [user?.teamId]);

  const tabs = [
    { id: 'contacts' as ImportType, label: 'Contactos', icon: <Users size={16} />, desc: 'Importa tu lista de clientes y prospectos' },
    { id: 'products' as ImportType, label: 'Productos / Servicios', icon: <Package size={16} />, desc: 'Importa tu catálogo de productos' },
    { id: 'custom' as ImportType, label: 'Base de conocimiento', icon: <Database size={16} />, desc: 'Carga datos para que tu agente IA consulte' },
  ];

  const downloadTemplate = () => {
    const headers = activeTab === 'contacts' ? CONTACT_TEMPLATE_HEADERS : PRODUCT_TEMPLATE_HEADERS;
    const sampleRow = activeTab === 'contacts'
      ? ['Juan Perez', '+525512345678', 'juan@empresa.com', 'Mi Empresa SA', 'XAXX010101000', 'Av. Reforma 123, CDMX', 'whatsapp', 'Cliente VIP']
      : ['SKU-001', 'Producto Ejemplo', 'Descripción del producto', '150.00', 'General', '100'];

    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

      if (jsonData.length === 0) {
        setResult({ success: false, count: 0, message: 'El archivo está vacío' });
        return;
      }

      const headers = Object.keys(jsonData[0]);
      setPreviewHeaders(headers);
      setAllData(jsonData);
      setPreviewData(jsonData.slice(0, 5));

      // Pre-fill custom name from file name
      if (activeTab === 'custom' && !customName) {
        const nameFromFile = file.name.replace(/\.(xlsx|xls|csv)$/i, '').replace(/[_-]/g, ' ');
        setCustomName(nameFromFile);
      }
    } catch {
      setResult({ success: false, count: 0, message: 'Error al leer el archivo. Asegúrate de que sea un Excel (.xlsx, .xls) o CSV válido.' });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!user?.teamId || previewData.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const fullData: Record<string, string>[] = allData;
      let count = 0;

      if (activeTab === 'contacts') {
        const now = new Date().toISOString();
        const contacts: Omit<Contact, 'id'>[] = fullData.map(row => {
          const name = row['nombre'] || row['name'] || row['Nombre'] || row['Name'] || Object.values(row)[0] || '';
          return {
            teamId: user.teamId,
            name,
            phone: row['teléfono'] || row['telefono'] || row['phone'] || row['Teléfono'] || row['Telefono'] || row['Phone'] || undefined,
            email: row['email'] || row['Email'] || row['correo'] || undefined,
            company: row['empresa'] || row['company'] || row['Empresa'] || undefined,
            rfc: row['rfc'] || row['RFC'] || undefined,
            address: row['dirección'] || row['direccion'] || row['address'] || row['Dirección'] || row['Direccion'] || undefined,
            platform: (row['plataforma'] || row['platform'] || 'whatsapp') as Contact['platform'],
            platformId: row['teléfono'] || row['telefono'] || row['phone'] || row['email'] || `import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            tags: [],
            notes: row['notas'] || row['notes'] || '',
            createdAt: now,
            updatedAt: now,
            lastMessageAt: now,
          } as Omit<Contact, 'id'>;
        });
        count = await bulkImportContacts(user.teamId, contacts);

        // Register as knowledge base
        const kbName = customName.trim() || `Contactos - ${new Date().toLocaleDateString('es-MX')}`;
        await createKnowledgeBase(user.teamId, {
          teamId: user.teamId,
          name: kbName,
          collectionName: 'contacts',
          fileName: fileName,
          recordCount: count,
          headers: Object.keys(fullData[0]),
          createdAt: now,
          updatedAt: now,
        });
      } else if (activeTab === 'products') {
        const now = new Date().toISOString();
        const products: Omit<Product, 'id'>[] = fullData.map(row => ({
          teamId: user.teamId,
          sku: row['sku'] || row['SKU'] || row['codigo'] || `SKU-${Date.now().toString(36).slice(-4).toUpperCase()}`,
          name: row['nombre'] || row['name'] || row['Nombre'] || row['producto'] || Object.values(row)[0] || '',
          description: row['descripción'] || row['descripcion'] || row['description'] || row['Descripción'] || row['Descripcion'] || undefined,
          unitPrice: parseFloat(row['precio_unitario'] || row['precio'] || row['price'] || row['Precio'] || '0') || 0,
          category: row['categoría'] || row['categoria'] || row['category'] || row['Categoría'] || row['Categoria'] || undefined,
          stock: parseInt(row['stock'] || row['Stock'] || row['inventario'] || '0') || undefined,
          createdAt: now,
          updatedAt: now,
        }));
        count = await bulkImportProducts(user.teamId, products);

        const kbName = customName.trim() || `Productos - ${new Date().toLocaleDateString('es-MX')}`;
        await createKnowledgeBase(user.teamId, {
          teamId: user.teamId,
          name: kbName,
          collectionName: 'products',
          fileName: fileName,
          recordCount: count,
          headers: Object.keys(fullData[0]),
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const collectionSlug = `kb_${Date.now().toString(36)}`;
        const kbName = customName.trim();
        if (!kbName) {
          setResult({ success: false, count: 0, message: 'Ingresa un nombre para la base de datos' });
          setImporting(false);
          return;
        }
        const now = new Date().toISOString();
        count = await bulkImportData(user.teamId, collectionSlug, fullData);

        await createKnowledgeBase(user.teamId, {
          teamId: user.teamId,
          name: kbName,
          collectionName: collectionSlug,
          fileName: fileName,
          recordCount: count,
          headers: Object.keys(fullData[0]),
          createdAt: now,
          updatedAt: now,
        });
      }

      setResult({ success: true, count, message: `Se importaron ${count} registros exitosamente` });
      setPreviewData([]);
      setAllData([]);
      setPreviewHeaders([]);
      setFileName('');
      setCustomName('');
      setShowUpload(false);
    } catch (err) {
      setResult({ success: false, count: 0, message: err instanceof Error ? err.message : 'Error al importar' });
    }
    setImporting(false);
  };

  const handleDeleteKB = async (kb: KnowledgeBase) => {
    if (!user?.teamId) return;
    setDeleting(kb.id);
    try {
      // Delete the actual data if it's a custom collection (not contacts/products which are shared)
      if (kb.collectionName.startsWith('kb_')) {
        await deleteKnowledgeBaseData(user.teamId, kb.collectionName);
      }
      await deleteKnowledgeBase(user.teamId, kb.id);
    } catch (err) {
      console.error('Error deleting KB:', err);
    }
    setDeleting(null);
  };

  const clearPreview = () => {
    setPreviewData([]);
    setAllData([]);
    setPreviewHeaders([]);
    setFileName('');
    setResult(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getTypeIcon = (collectionName: string) => {
    if (collectionName === 'contacts') return <Users size={18} className="text-blue-500" />;
    if (collectionName === 'products') return <Package size={18} className="text-emerald-500" />;
    return <Database size={18} className="text-violet-500" />;
  };

  const getTypeLabel = (collectionName: string) => {
    if (collectionName === 'contacts') return 'Contactos';
    if (collectionName === 'products') return 'Productos';
    return 'Base de conocimiento';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Bases de Datos"
        subtitle="Gestiona tus bases de datos y conocimiento para tus agentes de IA"
        actions={
          <button onClick={() => setShowUpload(!showUpload)} className="btn-primary text-sm flex items-center gap-2">
            <Upload size={16} /> {showUpload ? 'Ver mis bases' : 'Cargar nueva base'}
          </button>
        }
      />

      {/* Uploaded Knowledge Bases List */}
      {!showUpload && (
        <div>
          {knowledgeBases.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
                <HardDrive size={32} className="text-violet-500" />
              </div>
              <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200 mb-2">Sin bases de datos cargadas</h3>
              <p className="text-sm text-surface-500 max-w-md mx-auto mb-4">Carga tu primera base de datos para que tus agentes de IA puedan consultar información y responder preguntas a tus clientes.</p>
              <button onClick={() => setShowUpload(true)} className="btn-primary inline-flex items-center gap-2"><Upload size={16} /> Cargar base de datos</button>
            </div>
          ) : (
            <div className="space-y-3">
              {knowledgeBases.map(kb => (
                <div key={kb.id} className="card p-5 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                        {getTypeIcon(kb.collectionName)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">{kb.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-surface-400">
                          <span className="flex items-center gap-1">
                            <FileSpreadsheet size={12} /> {kb.fileName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash size={12} /> {kb.recordCount} registros
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {formatDate(kb.createdAt)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-500">
                            {getTypeLabel(kb.collectionName)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteKB(kb)}
                      disabled={deleting === kb.id}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-500 transition-colors"
                      title="Eliminar base de datos"
                    >
                      {deleting === kb.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                  {kb.headers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {kb.headers.slice(0, 8).map(h => (
                        <span key={h} className="px-2 py-0.5 rounded text-xs bg-surface-100 dark:bg-surface-700 text-surface-500">{h}</span>
                      ))}
                      {kb.headers.length > 8 && (
                        <span className="px-2 py-0.5 rounded text-xs bg-surface-100 dark:bg-surface-700 text-surface-400">+{kb.headers.length - 8} más</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result && (
            <div className={classNames(
              'mt-4 p-4 rounded-lg flex items-start gap-3',
              result.success
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'
            )}>
              {result.success ? <Check size={18} className="text-emerald-600 dark:text-emerald-400 mt-0.5" /> : <AlertCircle size={18} className="text-red-600 dark:text-red-400 mt-0.5" />}
              <div>
                <p className={classNames('text-sm font-medium', result.success ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300')}>{result.message}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Section */}
      {showUpload && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); clearPreview(); }}
                className={classNames(
                  'card p-4 text-left transition-all duration-200 hover:shadow-md',
                  activeTab === tab.id ? 'ring-2 ring-primary-500 border-primary-300 dark:border-primary-600' : ''
                )}
              >
                <div className={classNames(
                  'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                  activeTab === tab.id ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'
                )}>
                  {tab.icon}
                </div>
                <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">{tab.label}</p>
                <p className="text-xs text-surface-500 mt-0.5">{tab.desc}</p>
              </button>
            ))}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
                {activeTab === 'contacts' ? 'Importar Contactos' : activeTab === 'products' ? 'Importar Productos' : 'Importar Base de Conocimiento'}
              </h3>
              {activeTab !== 'custom' && (
                <button onClick={downloadTemplate} className="btn-secondary text-sm flex items-center gap-2">
                  <Download size={14} /> Descargar plantilla
                </button>
              )}
            </div>

            {/* Custom name field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Nombre de la base de datos {activeTab === 'custom' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                className="input-field max-w-md"
                placeholder={activeTab === 'contacts' ? 'Ej: Clientes Q1 2026' : activeTab === 'products' ? 'Ej: Catálogo Primavera' : 'Ej: Preguntas frecuentes, Precios especiales...'}
                value={customName}
                onChange={e => setCustomName(e.target.value)}
              />
              <p className="text-xs text-surface-400 mt-1">Este nombre te ayudará a identificar la base de datos y asignarla a tus agentes de IA.</p>
            </div>

            {activeTab !== 'custom' && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  {activeTab === 'contacts'
                    ? 'Columnas esperadas: nombre, teléfono, email, empresa, rfc, dirección, plataforma, notas.'
                    : 'Columnas esperadas: sku, nombre, descripción, precio_unitario, categoría, stock.'
                  }
                </p>
              </div>
            )}

            {activeTab === 'custom' && (
              <div className="mb-4 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
                <p className="text-xs text-violet-700 dark:text-violet-400">
                  Sube cualquier Excel o CSV con información que quieras que tu agente de IA pueda consultar: catálogos de precios, preguntas frecuentes, políticas, guías, etc.
                </p>
              </div>
            )}

            {!fileName && (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-colors">
                <Upload size={32} className="text-surface-400 mb-2" />
                <p className="text-sm font-medium text-surface-600 dark:text-surface-400">Haz clic para seleccionar tu archivo</p>
                <p className="text-xs text-surface-400 mt-1">Acepta .xlsx, .xls, .csv</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            )}

            {fileName && previewData.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    <span className="text-sm font-medium text-surface-800 dark:text-surface-200">{fileName}</span>
                    <span className="text-xs text-surface-400">({allData.length} filas total)</span>
                  </div>
                  <button onClick={clearPreview} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400"><X size={16} /></button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-surface-200 dark:border-surface-700 mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-50 dark:bg-surface-700">
                        {previewHeaders.map(h => (
                          <th key={h} className="text-left px-3 py-2 font-medium text-surface-600 dark:text-surface-300 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i} className="border-t border-surface-100 dark:border-surface-700">
                          {previewHeaders.map(h => (
                            <td key={h} className="px-3 py-1.5 text-surface-700 dark:text-surface-400 whitespace-nowrap max-w-[200px] truncate">{String(row[h] || '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="btn-primary flex items-center gap-2"
                >
                  {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {importing ? 'Importando...' : `Importar ${allData.length} registros`}
                </button>
              </div>
            )}

            {result && showUpload && (
              <div className={classNames(
                'mt-4 p-4 rounded-lg flex items-start gap-3',
                result.success
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'
              )}>
                {result.success ? <Check size={18} className="text-emerald-600 dark:text-emerald-400 mt-0.5" /> : <AlertCircle size={18} className="text-red-600 dark:text-red-400 mt-0.5" />}
                <div>
                  <p className={classNames('text-sm font-medium', result.success ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300')}>{result.message}</p>
                  {result.success && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">La base de datos está disponible para asignar a tus agentes de IA.</p>}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
