import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Building2, FolderGit2, Image as ImageIcon, Upload, Sparkles } from 'lucide-react';
import { Product, Provider, Project, Category } from '../types';
import { api } from '../lib/api';

interface ProductFormModalProps {
  isOpen: boolean;
  productToEdit?: Product | null;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  providers: Provider[];
  projects: Project[];
  products?: Product[];
  categoriesList?: Category[];
}

const DEFAULT_CATEGORIES = [
  'Materiales',
  'Herramientas',
  'Fontanería',
  'Electricidad',
  'Pintura',
  'Muebles y Carpintería',
  'Protección y Seguridad',
  'Ferretería General'
];

const NOMENCLATURE_MAP: Record<string, string> = {
  'materiales': 'MAT',
  'herramientas': 'HER',
  'fontanería': 'FON',
  'fontaneria': 'FON',
  'electricidad': 'ELE',
  'pintura': 'PIN',
  'muebles y carpintería': 'MYC',
  'muebles y carpinteria': 'MYC',
  'protección y seguridad': 'SEG',
  'proteccion y seguridad': 'SEG',
  'ferretería general': 'FER',
  'ferreteria general': 'FER',
  'otra categoría': 'OTR',
  'otra categoria': 'OTR',
  'otro': 'OTR'
};

export function getCategoryPrefix(categoryName: string, categoriesList?: Category[]): string {
  const norm = categoryName.trim().toLowerCase();
  if (categoriesList && categoriesList.length > 0) {
    const found = categoriesList.find((c) => c.nombre.trim().toLowerCase() === norm);
    if (found?.nomenclatura && found.nomenclatura.trim()) {
      return found.nomenclatura.trim().toUpperCase();
    }
  }
  if (NOMENCLATURE_MAP[norm]) {
    return NOMENCLATURE_MAP[norm];
  }
  return norm.length >= 3 ? norm.substring(0, 3).toUpperCase() : 'OTR';
}

export function generateNextProductCode(
  categoryName: string,
  products: Product[] = [],
  categoriesList?: Category[]
): string {
  const prefix = getCategoryPrefix(categoryName, categoriesList);
  const normCat = categoryName.trim().toLowerCase();

  // Find all products in this category or matching this prefix
  const matchingProducts = products.filter((p) => {
    const prodCat = (p.categoria || '').trim().toLowerCase();
    const prodCode = (p.codigo || '').toUpperCase();
    return prodCat === normCat || prodCode.startsWith(`${prefix}-`);
  });

  // Calculate highest numeric index
  let maxNum = 0;
  matchingProducts.forEach((p) => {
    const code = (p.codigo || '').toUpperCase();
    const parts = code.split('-');
    if (parts.length >= 2) {
      const parsed = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });

  const nextNum = Math.max(matchingProducts.length, maxNum) + 1;
  const formattedNum = String(nextNum).padStart(3, '0');
  return `${prefix}-${formattedNum}`;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  productToEdit,
  onClose,
  onSuccess,
  providers,
  projects,
  products = [],
  categoriesList = [],
}) => {
  const [codigo, setCodigo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [categoria, setCategoria] = useState('Materiales');
  const [customCategoria, setCustomCategoria] = useState('');
  const [estado, setEstado] = useState<'activo' | 'disponible' | 'bajo_pedido' | 'descatalogado'>('activo');
  const [stockMinimo, setStockMinimo] = useState('5');
  const [stockInicial, setStockInicial] = useState('0');
  const [proveedorId, setProveedorId] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available categories to display in dropdown
  const availableCategories = React.useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    if (categoriesList && categoriesList.length > 0) {
      categoriesList.forEach((c) => set.add(c.nombre));
    }
    return Array.from(set);
  }, [categoriesList]);

  useEffect(() => {
    if (productToEdit) {
      setCodigo(productToEdit.codigo);
      setReferencia(productToEdit.referencia || '');
      setNombre(productToEdit.nombre);
      setDescripcion(productToEdit.descripcion || '');
      setImagenUrl(productToEdit.imagen_url || '');
      setEstado(productToEdit.estado || 'activo');
      if (availableCategories.includes(productToEdit.categoria)) {
        setCategoria(productToEdit.categoria);
        setCustomCategoria('');
      } else {
        setCategoria('Otro');
        setCustomCategoria(productToEdit.categoria);
      }
      setStockMinimo(String(productToEdit.stock_minimo));
      setStockInicial('0');
      setProveedorId(productToEdit.proveedor_id || '');
      setProyectoId(productToEdit.proyecto_id || '');
    } else {
      // Auto suggest next code based on selected category count
      const initialCat = 'Materiales';
      const nextCode = generateNextProductCode(initialCat, products, categoriesList);
      setCodigo(nextCode);
      setReferencia('');
      setNombre('');
      setDescripcion('');
      setImagenUrl('');
      setCategoria(initialCat);
      setCustomCategoria('');
      setEstado('activo');
      setStockMinimo('5');
      setStockInicial('0');
      setProveedorId('');
      setProyectoId('');
    }
    setError(null);
  }, [productToEdit, isOpen, products, categoriesList]);

  // When category changes and we are creating a new product, update the code automatically!
  const handleCategoryChange = (newCat: string) => {
    setCategoria(newCat);
    if (!productToEdit) {
      const catToUse = newCat === 'Otro' ? (customCategoria || 'Otro') : newCat;
      const autoCode = generateNextProductCode(catToUse, products, categoriesList);
      setCodigo(autoCode);
    }
  };

  const handleCustomCategoryChange = (val: string) => {
    setCustomCategoria(val);
    if (!productToEdit && categoria === 'Otro') {
      const autoCode = generateNextProductCode(val || 'Otro', products, categoriesList);
      setCodigo(autoCode);
    }
  };

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('La imagen no debe superar los 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImagenUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) {
      setError('El código del producto es obligatorio');
      return;
    }
    if (!nombre.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }

    const finalCat = categoria === 'Otro' ? customCategoria.trim() : categoria;
    if (!finalCat) {
      setError('Debes especificar una categoría');
      return;
    }

    const minStockNum = Number(stockMinimo);
    if (isNaN(minStockNum) || minStockNum < 0) {
      setError('El stock mínimo debe ser un número mayor o igual a 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        codigo: codigo.trim().toUpperCase(),
        referencia: referencia.trim() || null,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        imagen_url: imagenUrl.trim(),
        categoria: finalCat,
        estado,
        stock_minimo: minStockNum,
        proveedor_id: proveedorId || null,
        proyecto_id: proyectoId || null,
      };

      let result: Product;
      if (productToEdit) {
        result = await api.updateProduct(productToEdit.id, payload);
      } else {
        payload.stock_inicial = Number(stockInicial) || 0;
        result = await api.createProduct(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EA1D24] text-white flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {productToEdit ? 'Editar Producto / Material' : 'Nuevo Producto / Material'}
              </h2>
              <p className="text-xs text-neutral-400">
                {productToEdit ? 'Modifica la ficha técnica del producto' : 'Añadir un nuevo artículo al catálogo del almacén'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700" htmlFor="prod-codigo">
                  Código Interno *
                </label>
                {!productToEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const catToUse = categoria === 'Otro' ? (customCategoria || 'Otro') : categoria;
                      setCodigo(generateNextProductCode(catToUse, products, categoriesList));
                    }}
                    title="Recalcular código correlativo"
                    className="text-[10px] text-[#EA1D24] hover:underline flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-código</span>
                  </button>
                )}
              </div>
              <input
                id="prod-codigo"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: MAT-001"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden text-xs"
              />
              <span className="text-[10px] text-slate-400">Código correlativo según categoría</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="prod-referencia">
                Referencia Fabricante
              </label>
              <input
                id="prod-referencia"
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej: REF-98442-A"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden text-xs"
              />
              <span className="text-[10px] text-slate-400">Ref. proveedor o catálogo</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado del Producto
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden text-xs"
              >
                <option value="activo">Activo (En stock / habitual)</option>
                <option value="disponible">Disponible para uso</option>
                <option value="bajo_pedido">Bajo Pedido (Pendiente)</option>
                <option value="descatalogado">Descatalogado</option>
              </select>
              <span className="text-[10px] text-slate-400">Visibilidad y estado</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="prod-nombre">
              Nombre del Producto *
            </label>
            <input
              id="prod-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Cemento Gris Portland 25kg"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Categoría *
              </label>
              <select
                value={categoria}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} ({getCategoryPrefix(cat, categoriesList)})
                  </option>
                ))}
                <option value="Otro">Otra categoría...</option>
              </select>
              {categoria === 'Otro' && (
                <input
                  type="text"
                  placeholder="Especifica la categoría"
                  value={customCategoria}
                  onChange={(e) => handleCustomCategoryChange(e.target.value)}
                  className="w-full mt-2 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="prod-stock-minimo">
                Stock Mínimo (Umbral de Alerta) *
              </label>
              <input
                id="prod-stock-minimo"
                type="number"
                min="0"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400">
                Se activará alerta si el stock disponible baja de esta cifra.
              </span>
            </div>
          </div>

          {!productToEdit && (
            <div className="p-3 bg-red-50/40 rounded-xl border border-red-200">
              <label className="block font-semibold text-slate-900 mb-1" htmlFor="prod-stock-inicial">
                Stock Inicial en Almacén (Opcional)
              </label>
              <input
                id="prod-stock-inicial"
                type="number"
                min="0"
                value={stockInicial}
                onChange={(e) => setStockInicial(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-slate-900 font-mono focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-600 mt-1 block">
                Generará automáticamente una entrada de material inicial asociada a este producto.
              </span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="prod-descripcion">
              Descripción y Ficha Técnica
            </label>
            <textarea
              id="prod-descripcion"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles, dimensiones, marca, precauciones o especificaciones de obra..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
            />
          </div>

          {/* Image URL or Upload */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Imagen del Producto
            </label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="URL de imagen (https://...)"
                  value={imagenUrl}
                  onChange={(e) => setImagenUrl(e.target.value)}
                  className="w-full px-3 py-2 pl-8 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
                <ImageIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
              <label className="cursor-pointer px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Subir</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            {imagenUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={imagenUrl}
                  alt="Vista previa"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setImagenUrl('')}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Quitar imagen
                </button>
              </div>
            )}
          </div>

          {/* Relations: Supplier & Dedicated Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Proveedor Habitual</span>
              </label>
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
              >
                <option value="">-- Sin proveedor específico --</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Proyecto Dedicado</span>
              </label>
              <select
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
              >
                <option value="">-- Material de almacén general --</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.nombre} ({proj.cliente})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-xs shadow-red-600/20"
            >
              {loading ? 'Guardando...' : productToEdit ? 'Actualizar Producto' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
