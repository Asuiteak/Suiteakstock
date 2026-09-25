import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Camera,
  AlertTriangle,
  Filter,
  Eye,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  FolderGit2,
  Building2,
  CheckCircle2,
  Layers,
  Sparkles,
  LayoutGrid,
  List,
  MoreVertical,
  FolderTree,
  Truck,
  Phone,
  Mail,
  ShoppingBag,
  PackageCheck,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Product, Project, User, Category, Order, Provider, ProductStatus } from '../types';

interface ProductsViewProps {
  products: Product[];
  currentUser: User;
  projects: Project[];
  categoriesList?: Category[];
  orders?: Order[];
  providers?: Provider[];
  onOpenCategoryManager?: () => void;
  onOpenProviderManager?: () => void;
  onSelectProduct: (productId: string) => void;
  onNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onOpenMovement: (type: 'entrada' | 'salida', productId: string) => void;
  onOpenScanner: () => void;
  onReceiveOrder?: (order: Order) => void;
  onNavigateToOrders?: () => void;
  onOrderProduct?: (product: Product) => void;
  onUpdateProductStatus?: (productId: string, estado: ProductStatus) => void;
  initialFilterAlert?: boolean;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  currentUser,
  projects,
  categoriesList = [],
  orders = [],
  providers = [],
  onOpenCategoryManager,
  onOpenProviderManager,
  onSelectProduct,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onOpenMovement,
  onOpenScanner,
  onReceiveOrder,
  onNavigateToOrders,
  onOrderProduct,
  onUpdateProductStatus,
  initialFilterAlert = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState(initialFilterAlert);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeMenuProductId, setActiveMenuProductId] = useState<string | null>(null);
  const [tableMenuProductId, setTableMenuProductId] = useState<string | null>(null);

  const isAdmin = currentUser.rol === 'admin';

  // Extract unique categories from both database categoriesList and products
  const categories = Array.from(
    new Set([
      ...categoriesList.map((c) => c.nombre),
      ...products.map((p) => p.categoria).filter(Boolean),
    ])
  ).sort();

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.codigo.toLowerCase().includes(search.toLowerCase()) ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || p.categoria === selectedCategory;
    const matchesProject = selectedProject === 'all' || p.proyecto_id === selectedProject;
    const matchesLowStock = !onlyLowStock || p.en_alerta;

    return matchesSearch && matchesCategory && matchesProject && matchesLowStock;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar - Bento Style */}
      <div className="bento-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Catálogo de Almacén</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-[#EA1D24] border border-red-200">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'artículo' : 'artículos'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de stock físico, materiales dedicados y herramientas en depósito.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              title="Vista Bento Grid"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Bento</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Vista Tabla"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">Tabla</span>
            </button>
          </div>

          <button
            id="btn-products-scan"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <Camera className="w-4 h-4 text-red-400" />
            <span>Escanear Código</span>
          </button>

          {onOpenProviderManager && (
            <button
              id="btn-manage-providers"
              onClick={onOpenProviderManager}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Consultar listado, añadir, editar o eliminar proveedores"
            >
              <Truck className="w-4 h-4 text-sky-400" />
              <span>Proveedores</span>
            </button>
          )}

          {isAdmin && onOpenCategoryManager && (
            <button
              id="btn-manage-categories"
              onClick={onOpenCategoryManager}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Crear, editar o eliminar familias y categorías"
            >
              <FolderTree className="w-4 h-4 text-amber-400" />
              <span>Familias / Categorías</span>
            </button>
          )}

          {isAdmin && onOrderProduct && (
            <button
              id="btn-new-order-from-products"
              onClick={() => onOrderProduct(products[0] || null)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Realizar nuevo pedido a distribuidor"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Realizar Pedido</span>
            </button>
          )}

          {isAdmin && (
            <button
              id="btn-new-product"
              onClick={onNewProduct}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-red-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar - Bento Module */}
      <div className="bento-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Text Search */}
          <div className="flex-1 relative">
            <input
              id="input-product-search"
              type="text"
              placeholder="Buscar por código (MAT-001) o nombre del material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-56 flex flex-col gap-1">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
            >
              <option value="all">Todas las familias / categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {isAdmin && onOpenCategoryManager && (
              <button
                type="button"
                onClick={onOpenCategoryManager}
                className="text-[11px] text-slate-500 hover:text-[#EA1D24] flex items-center gap-1 font-semibold px-1 py-0.5 transition-colors self-start"
              >
                <FolderTree className="w-3 h-3 text-[#EA1D24]" />
                <span>Gestionar árbol de familias</span>
              </button>
            )}
          </div>

          {/* Project Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
            >
              <option value="all">Todos los proyectos / Almacén</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Low stock toggle */}
          <button
            id="btn-filter-low-stock"
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 ${
              onlyLowStock
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${onlyLowStock ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>Solo Stock Bajo</span>
          </button>
        </div>
      </div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="bento-card p-12 text-center text-slate-500">
          <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-base">No se encontraron productos</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Prueba a modificar los términos de búsqueda o los filtros seleccionados.
          </p>
          {(search || selectedCategory !== 'all' || selectedProject !== 'all' || onlyLowStock) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setSelectedProject('all');
                setOnlyLowStock(false);
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Restablecer Filtros
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Bento Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((p) => {
            const isLowStock = p.en_alerta;
            const stockPct = Math.min(100, Math.round((p.stock_disponible / (p.stock_minimo * 2 || 1)) * 100));

            return (
              <div
                key={p.id}
                className={`bento-card p-5 flex flex-col justify-between group relative transition-all ${
                  isLowStock ? 'border-amber-300/80 bg-amber-50/20' : ''
                }`}
              >
                <div>
                  {/* Top Bar: Code Pill + Category / Alert + 3-Dots Menu in Upper Right */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        {p.codigo}
                      </span>
                      {p.referencia && (
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          Ref: {p.referencia}
                        </span>
                      )}
                      {p.estado === 'bajo_pedido' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200">
                          <ShoppingBag className="w-3 h-3 text-red-600" /> Bajo Pedido
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /> Bajo Stock
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                          {p.categoria}
                        </span>
                      )}
                    </div>

                    {/* 3-Dots Menu Icon in Top Right of Card */}
                    <div className="relative">
                      <button
                        type="button"
                        id={`btn-product-options-${p.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuProductId(activeMenuProductId === p.id ? null : p.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Opciones de la ficha"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuProductId === p.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuProductId(null);
                            }}
                          />
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-8 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left animate-in fade-in"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuProductId(null);
                                onSelectProduct(p.id);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Ver detalle</span>
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuProductId(null);
                                  onEditProduct(p);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-t border-slate-100"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Editar producto</span>
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuProductId(null);
                                  onDeleteProduct(p);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Eliminar producto</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Product Title & Info */}
                  <div className="flex items-start gap-3 mb-4">
                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <Boxes className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => onSelectProduct(p.id)}
                        className="font-bold text-slate-900 text-sm hover:text-[#EA1D24] transition-colors block text-left leading-snug line-clamp-2"
                      >
                        {p.nombre}
                      </button>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        {p.proyecto_nombre ? (
                          <span className="inline-flex items-center gap-1 text-slate-600 truncate font-medium">
                            <FolderGit2 className="w-3 h-3 text-[#EA1D24]" />
                            {p.proyecto_nombre}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Almacén central</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stock Gauge Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500 font-medium">Disponibilidad</span>
                      <span
                        className={`font-mono font-bold ${
                          isLowStock ? 'text-amber-700 font-extrabold' : 'text-emerald-700'
                        }`}
                      >
                        {p.stock_disponible} uds disponibles
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(5, stockPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Micro Metric Bento Grid (3 cells) */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-500 block font-medium">Físico</span>
                      <span className="font-bold font-mono text-slate-900 text-sm">{p.stock_actual}</span>
                    </div>
                    <div className="bg-amber-50/60 p-2 rounded-xl border border-amber-200/60">
                      <span className="text-[10px] text-amber-700 block font-medium">Reserva</span>
                      <span className="font-bold font-mono text-amber-800 text-sm">
                        {p.stock_reservado > 0 ? p.stock_reservado : 0}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-500 block font-medium">Mínimo</span>
                      <span className="font-bold font-mono text-slate-600 text-sm">{p.stock_minimo}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer: Clean, only Detalle, Entrada, Salida */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectProduct(p.id)}
                    className="text-xs font-bold text-slate-600 hover:text-[#EA1D24] flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detalle
                  </button>

                  <div className="flex items-center gap-1.5">
                    {onOrderProduct && (
                      <button
                        onClick={() => onOrderProduct(p)}
                        title={`Realizar pedido a distribuidor para ${p.nombre}`}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Pedir
                      </button>
                    )}
                    <button
                      onClick={() => onOpenMovement('entrada', p.id)}
                      title="Registrar entrada"
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" /> Entrada
                    </button>
                    <button
                      onClick={() => onOpenMovement('salida', p.id)}
                      disabled={p.stock_actual <= 0}
                      title="Registrar salida"
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> Salida
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bento-card overflow-hidden w-full max-w-full">
          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Código / Imagen</th>
                  <th className="py-3.5 px-4">Producto & Categoría</th>
                  <th className="py-3.5 px-4 text-center">Físico</th>
                  <th className="py-3.5 px-4 text-center">Reservado</th>
                  <th className="py-3.5 px-4 text-center">Disponible</th>
                  <th className="py-3.5 px-4 text-center">Mínimo</th>
                  <th className="py-3.5 px-4">Proyecto Asignado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/90 transition-colors ${
                      p.en_alerta ? 'bg-amber-50/25' : ''
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {p.imagen_url ? (
                          <img
                            src={p.imagen_url}
                            alt={p.nombre}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 object-cover rounded-xl border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                            <Boxes className="w-5 h-5" />
                          </div>
                        )}
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {p.codigo}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => onSelectProduct(p.id)}
                        className="text-left font-bold text-slate-900 hover:text-[#EA1D24] transition-colors block text-sm"
                      >
                        {p.nombre}
                      </button>
                      <span className="text-[11px] text-slate-500">{p.categoria}</span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {p.stock_actual}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                      {p.stock_reservado > 0 ? p.stock_reservado : '-'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-full text-xs ${
                          p.en_alerta
                            ? 'bg-amber-100 text-amber-800 font-extrabold border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.en_alerta && <AlertTriangle className="w-3 h-3" />}
                        {p.stock_disponible}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      {p.stock_minimo}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {p.proyecto_nombre ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                          <FolderGit2 className="w-3 h-3 text-[#EA1D24]" />
                          <span className="truncate max-w-[130px]">{p.proyecto_nombre}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Almacén general</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectProduct(p.id)}
                          title="Ver detalle del producto"
                          className="p-1.5 text-slate-500 hover:text-[#EA1D24] hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {onOrderProduct && (
                          <button
                            onClick={() => onOrderProduct(p)}
                            title="Realizar pedido a distribuidor"
                            className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onOpenMovement('entrada', p.id)}
                          title="Registrar entrada de material"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onOpenMovement('salida', p.id)}
                          disabled={p.stock_actual <= 0}
                          title="Registrar salida de material"
                          className="p-1.5 text-rose-700 hover:bg-rose-50 disabled:opacity-30 rounded-lg transition-colors"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setTableMenuProductId(tableMenuProductId === p.id ? null : p.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Más opciones"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {tableMenuProductId === p.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setTableMenuProductId(null)}
                                />
                                <div className="absolute right-0 top-8 z-30 w-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left animate-in fade-in">
                                  <button
                                    onClick={() => {
                                      setTableMenuProductId(null);
                                      onEditProduct(p);
                                    }}
                                    className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Editar producto</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTableMenuProductId(null);
                                      onDeleteProduct(p);
                                    }}
                                    className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Eliminar producto</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apartado en Rojo: Productos y Pedidos Pendientes de Recibir */}
      {(() => {
        const pendingOrders = orders.filter(
          (o) => o.estado === 'pendiente' || o.estado === 'en_camino'
        );
        const bajoPedidoProducts = products.filter((p) => p.estado === 'bajo_pedido');

        return (
          <div className="mt-10 border-2 border-red-500 rounded-2xl bg-gradient-to-b from-red-50/70 to-red-100/30 p-6 shadow-md shadow-red-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EA1D24] text-white flex items-center justify-center font-bold shrink-0 shadow-xs shadow-red-500/30">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#EA1D24]">
                      Control de Entradas Pendientes
                    </span>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-red-600 text-white">
                      {pendingOrders.length} {pendingOrders.length === 1 ? 'pedido en curso' : 'pedidos en curso'}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Productos Pendientes de Recibir de Distribuidores
                  </h2>
                </div>
              </div>

              {onNavigateToOrders && (
                <button
                  onClick={onNavigateToOrders}
                  className="px-3.5 py-1.5 bg-white hover:bg-red-50 text-[#EA1D24] rounded-xl text-xs font-bold border border-red-300 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
                >
                  <span>Ver Gestión de Pedidos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-xs text-red-950/80 mt-3">
              Detecta productos y materiales pedidos que <strong>aún no han entrado físicamente en el stock</strong>. Utiliza los datos de contacto directo (teléfono o email) para comunicarte con el distribuidor y reclamar o agilizar la entrega.
            </p>

            {pendingOrders.length === 0 && bajoPedidoProducts.length === 0 ? (
              <div className="mt-4 p-5 bg-white/80 rounded-xl border border-red-200 text-center text-xs text-slate-600">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                <p className="font-bold text-slate-800">Al día: No hay pedidos pendientes de recibir</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Todos los pedidos tramitados han sido recepcionados e integrados en el inventario de stock.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl border-2 border-red-300/80 p-4 flex flex-col justify-between shadow-2xs hover:border-red-500 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                          {order.numero_pedido}
                        </span>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {order.estado === 'pendiente' ? 'Pendiente Envío' : 'En Tránsito'}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm leading-snug">
                        {order.nombre_material}
                      </h3>
                      <div className="text-xs font-semibold text-slate-600 mt-0.5">
                        Cantidad pedida: <strong className="text-slate-900">{order.cantidad} unidades</strong>
                      </div>

                      {/* Distributor contact details */}
                      <div className="mt-3 p-2.5 bg-red-50/60 rounded-lg border border-red-100 text-xs space-y-1.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-red-600" />
                          <span>Distribuidor: {order.proveedor_nombre || 'Distribuidor asignado'}</span>
                        </div>
                        {order.proveedor_contacto && (
                          <div className="text-[11px] text-slate-500 pl-5">
                            Persona de contacto: {order.proveedor_contacto}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1 pl-5">
                          {order.proveedor_telefono ? (
                            <a
                              href={`tel:${order.proveedor_telefono}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-300 text-[11px] font-bold transition-colors"
                              title="Llamar directamente al distribuidor"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>Llamar ({order.proveedor_telefono})</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Sin teléfono registrado</span>
                          )}

                          {order.proveedor_email && (
                            <a
                              href={`mailto:${order.proveedor_email}?subject=Reclamación%20Pedido%20${order.numero_pedido}&body=Hola,%20les%20contactamos%20en%20referencia%20al%20pedido%20${order.numero_pedido}%20pendiente%20de%20recibir...`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 rounded-lg border border-blue-300 text-[11px] font-bold transition-colors"
                              title="Enviar correo electrónico al distribuidor"
                            >
                              <Mail className="w-3 h-3 text-blue-600" />
                              <span>Enviar Email</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Obra y Fecha */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 px-1">
                        <span>
                          {order.proyecto_nombre ? `Destino: ${order.proyecto_nombre}` : 'Almacén central'}
                        </span>
                        {order.fecha_estimada_entrega && (
                          <span className="font-semibold text-red-700">
                            Previsto: {order.fecha_estimada_entrega}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reception Action Button */}
                    {onReceiveOrder && currentUser.rol === 'admin' && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => onReceiveOrder(order)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Recepcionar Entrada y Catalogar</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
