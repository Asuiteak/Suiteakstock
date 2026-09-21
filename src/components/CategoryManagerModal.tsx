import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, Pencil, Trash2, AlertCircle, Check, FolderTree, AlertTriangle } from 'lucide-react';
import { Category, Product } from '../types';
import { api } from '../lib/api';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  products: Product[];
  onCategoriesUpdated: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  products,
  onCategoriesUpdated,
  onShowToast,
}) => {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editNomenclatura, setEditNomenclatura] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');
  const [newNomenclatura, setNewNomenclatura] = useState('');
  const [loading, setLoading] = useState(false);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setNewNombre('');
    setNewDescripcion('');
    setNewNomenclatura('');
    setEditingCatId(null);
    setCatToDelete(null);
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate product counts per category
  const categoryCounts = categories.map((cat) => {
    const count = products.filter(
      (p) => p.categoria && p.categoria.trim().toLowerCase() === cat.nombre.trim().toLowerCase()
    ).length;
    return { ...cat, calculated_count: count };
  });

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) {
      setError('El nombre de la categoría o familia es obligatorio');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.createCategory({
        nombre: newNombre.trim(),
        descripcion: newDescripcion.trim() || undefined,
        nomenclatura: newNomenclatura.trim() ? newNomenclatura.trim().toUpperCase() : undefined,
      });
      setNewNombre('');
      setNewDescripcion('');
      setNewNomenclatura('');
      onCategoriesUpdated();
      onShowToast?.(`Familia "${newNombre.trim()}" creada con éxito`, 'success');
    } catch (err: any) {
      setError(err.message || 'Error al crear la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditNombre(cat.nombre);
    setEditDescripcion(cat.descripcion || '');
    setEditNomenclatura(cat.nomenclatura || '');
    setError(null);
  };

  const handleSaveEdit = async (catId: string) => {
    if (!editNombre.trim()) {
      setError('El nombre no puede estar vacío');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.updateCategory(catId, {
        nombre: editNombre.trim(),
        descripcion: editDescripcion.trim() || undefined,
        nomenclatura: editNomenclatura.trim() ? editNomenclatura.trim().toUpperCase() : undefined,
      });
      setEditingCatId(null);
      onCategoriesUpdated();
      onShowToast?.('Familia actualizada correctamente', 'success');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!catToDelete) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.deleteCategory(catToDelete.id);
      setCatToDelete(null);
      onCategoriesUpdated();
      onShowToast?.(res.message || 'Categoría eliminada', 'success');
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la categoría');
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
            <div className="w-10 h-10 rounded-xl bg-[#EA1D24] text-white flex items-center justify-center font-bold">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Árbol de Familias y Categorías
              </h2>
              <p className="text-xs text-neutral-400">
                Organización jerárquica de productos en almacén
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* New Category Form */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#EA1D24]" />
              <span>Añadir Nueva Familia / Categoría</span>
            </h3>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nombre de la familia *
                  </label>
                  <input
                    type="text"
                    value={newNombre}
                    onChange={(e) => {
                      setNewNombre(e.target.value);
                      if (!newNomenclatura && e.target.value.trim().length >= 3) {
                        setNewNomenclatura(e.target.value.trim().substring(0, 3).toUpperCase());
                      }
                    }}
                    placeholder="Ej. Climatización"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-[#EA1D24]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nomenclatura / Prefijo (3 letras)
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={newNomenclatura}
                    onChange={(e) => setNewNomenclatura(e.target.value.toUpperCase())}
                    placeholder="Ej. CLI, MAT, ELE"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold uppercase text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-[#EA1D24]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={newDescripcion}
                    onChange={(e) => setNewDescripcion(e.target.value)}
                    placeholder="Breve descripción o notas..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-[#EA1D24]"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !newNombre.trim()}
                  className="px-4 py-1.5 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Familia</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Existing Categories */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Familias registradas ({categoryCounts.length})</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {products.length} productos totales
              </span>
            </h3>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              {categoryCounts.map((cat) => {
                const isEditing = editingCatId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="p-3.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {isEditing ? (
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                            placeholder="Nombre..."
                            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-[#EA1D24]"
                            autoFocus
                          />
                          <input
                            type="text"
                            maxLength={5}
                            value={editNomenclatura}
                            onChange={(e) => setEditNomenclatura(e.target.value.toUpperCase())}
                            placeholder="Nomenclatura (ej. MAT)..."
                            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold uppercase text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-[#EA1D24]"
                          />
                          <input
                            type="text"
                            value={editDescripcion}
                            onChange={(e) => setEditDescripcion(e.target.value)}
                            placeholder="Descripción..."
                            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-[#EA1D24]"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(cat.id)}
                            disabled={loading}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Guardar</span>
                          </button>
                          <button
                            onClick={() => setEditingCatId(null)}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-50 text-[#EA1D24] border border-red-200/60 flex items-center justify-center shrink-0 mt-0.5">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                                {cat.nombre}
                              </h4>
                              {cat.nomenclatura && (
                                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-[#EA1D24] border border-red-200">
                                  {cat.nomenclatura}
                                </span>
                              )}
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {cat.calculated_count} {cat.calculated_count === 1 ? 'producto' : 'productos'}
                              </span>
                            </div>
                            {cat.descripcion && (
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                {cat.descripcion}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 self-end sm:self-center">
                          <button
                            onClick={() => handleStartEdit(cat)}
                            title="Editar nombre y descripción"
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCatToDelete(cat)}
                            title="Eliminar familia"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Delete Category Confirmation Modal */}
      {catToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">¿Eliminar familia?</h3>
                <p className="text-[11px] text-slate-500">Confirmación de seguridad</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              ¿Estás seguro de que deseas eliminar la familia{' '}
              <strong className="text-slate-900">"{catToDelete.nombre}"</strong>?
              Los productos vinculados no se perderán; se reasignarán automáticamente a la categoría general.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {loading ? 'Eliminando...' : 'Sí, eliminar familia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
