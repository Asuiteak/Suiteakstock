import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Truck,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Check,
  Search,
  Phone,
  Mail,
  User,
  MapPin,
  Package,
  AlertTriangle,
  Building2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { Provider, Product } from '../types';
import { api } from '../lib/api';

interface ProviderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Provider[];
  products: Product[];
  onProvidersUpdated: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProviderManagerModal: React.FC<ProviderManagerModalProps> = ({
  isOpen,
  onClose,
  providers,
  products,
  onProvidersUpdated,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  // Form fields
  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);

  // Reset states on open/close
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      resetForm();
      setProviderToDelete(null);
      setError(null);
    }
  }, [isOpen]);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingProviderId(null);
    setNombre('');
    setContacto('');
    setEmail('');
    setTelefono('');
    setDireccion('');
    setLogoUrl('');
    setError(null);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleStartEdit = (prov: Provider) => {
    setEditingProviderId(prov.id);
    setNombre(prov.nombre || '');
    setContacto(prov.contacto || '');
    setEmail(prov.email || '');
    setTelefono(prov.telefono || '');
    setDireccion(prov.direccion || '');
    setLogoUrl(prov.logo_url || '');
    setIsFormOpen(true);
    setError(null);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre del proveedor o empresa es obligatorio');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      nombre: nombre.trim(),
      contacto: contacto.trim() || undefined,
      email: email.trim() || undefined,
      telefono: telefono.trim() || undefined,
      direccion: direccion.trim() || undefined,
      logo_url: logoUrl.trim() || undefined,
    };

    try {
      if (editingProviderId) {
        await api.updateProvider(editingProviderId, payload);
        onShowToast?.(`Proveedor "${payload.nombre}" actualizado correctamente`, 'success');
      } else {
        await api.createProvider(payload);
        onShowToast?.(`Proveedor "${payload.nombre}" añadido con éxito`, 'success');
      }
      resetForm();
      onProvidersUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!providerToDelete) return;

    setLoading(true);
    try {
      await api.deleteProvider(providerToDelete.id);
      onShowToast?.(`Proveedor "${providerToDelete.nombre}" eliminado`, 'info');
      setProviderToDelete(null);
      onProvidersUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar proveedor');
    } finally {
      setLoading(false);
    }
  };

  // Map product counts to providers
  const providersWithCounts = useMemo(() => {
    return providers.map((prov) => {
      const count = products.filter((p) => p.proveedor_id === prov.id).length;
      return {
        ...prov,
        productCount: count,
      };
    });
  }, [providers, products]);

  // Filtered providers by search query
  const filteredProviders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return providersWithCounts;

    return providersWithCounts.filter((p) => {
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.contacto && p.contacto.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.telefono && p.telefono.toLowerCase().includes(q)) ||
        (p.direccion && p.direccion.toLowerCase().includes(q))
      );
    });
  }, [providersWithCounts, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      id="modal-provider-manager-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="modal-provider-manager-content"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">Gestión de Proveedores</h3>
                <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                  {providers.length} {providers.length === 1 ? 'proveedor' : 'proveedores'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulta los proveedores actuales, añade nuevos colaboradores o edita sus datos de contacto.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Action & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, contacto, teléfono, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          <button
            type="button"
            id="btn-add-provider-toggle"
            onClick={() => {
              if (isFormOpen && !editingProviderId) {
                resetForm();
              } else {
                handleStartCreate();
              }
            }}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
              isFormOpen && !editingProviderId
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-[#EA1D24] hover:bg-[#c9181e] active:bg-[#b0141a] text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isFormOpen && !editingProviderId ? 'Ocultar Formulario' : 'Nuevo Proveedor'}</span>
          </button>
        </div>

        {/* Collapsible Create / Edit Form */}
        {isFormOpen && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#EA1D24]" />
                {editingProviderId ? 'Editar Proveedor' : 'Nuevo Proveedor de Materiales'}
              </h4>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nombre */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Empresa / Nombre <span className="text-[#EA1D24]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Suministros Eléctricos del Norte"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-white"
                  />
                </div>

                {/* Persona de Contacto */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Gómez (Comercial)"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-white"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. +34 912 345 678"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-white"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="Ej. pedidos@proveedor.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-white"
                  />
                </div>
              </div>

              {/* Dirección & Logo / Imagen */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dirección / Almacén / Sede
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Polígono Industrial San Fernando, Nave 12"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-white"
                  />
                </div>

                {/* Imagen o Logotipo */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Foto o Logotipo del Proveedor
                  </label>
                  
                  <div className="flex flex-col sm:flex-row items-start gap-3 bg-white p-3 rounded-xl border border-slate-200">
                    {/* Preview avatar */}
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {logoUrl ? (
                        <>
                          <img
                            src={logoUrl}
                            alt="Logo preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setLogoUrl('')}
                            className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-1 hover:bg-rose-700 transition-colors shadow-xs"
                            title="Quitar imagen"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center">
                          <ImageIcon className="w-6 h-6 stroke-1" />
                          <span className="text-[9px] mt-0.5">Sin foto</span>
                        </div>
                      )}
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors">
                          <Upload className="w-3.5 h-3.5 text-slate-600" />
                          <span>Subir imagen o logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setLogoUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <span className="text-[11px] text-slate-400">o pega enlace web:</span>
                      </div>
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/logo.png"
                        value={logoUrl.startsWith('data:') ? '(Imagen subida desde archivo)' : logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        disabled={logoUrl.startsWith('data:')}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{loading ? 'Guardando...' : editingProviderId ? 'Guardar Cambios' : 'Guardar Proveedor'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Providers List Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredProviders.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Truck className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No se encontraron proveedores</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No hay ningún proveedor que coincida con "${searchQuery}".`
                  : 'Aún no has registrado ningún proveedor para los productos.'}
              </p>
              {!isFormOpen && (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="mt-4 px-4 py-2 bg-[#EA1D24] text-white text-xs font-bold rounded-xl hover:bg-[#c9181e] transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir primer proveedor</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredProviders.map((prov) => {
                const isSelectedForEdit = editingProviderId === prov.id;
                return (
                  <div
                    key={prov.id}
                    className={`bento-card p-4 flex flex-col justify-between transition-all group relative border ${
                      isSelectedForEdit ? 'border-[#EA1D24] ring-2 ring-[#EA1D24]/20 bg-red-50/10' : 'hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors overflow-hidden">
                            {prov.logo_url ? (
                              <img
                                src={prov.logo_url}
                                alt={prov.nombre}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain p-0.5"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              prov.nombre.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate" title={prov.nombre}>
                              {prov.nombre}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                <Package className="w-3 h-3 text-slate-500" />
                                {prov.productCount} {prov.productCount === 1 ? 'producto' : 'productos'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(prov)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar proveedor"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProviderToDelete(prov)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar proveedor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100 mt-2">
                        {prov.contacto && (
                          <div className="flex items-center gap-2 text-slate-700">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{prov.contacto}</span>
                          </div>
                        )}

                        {prov.telefono && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a
                              href={`tel:${prov.telefono}`}
                              className="text-slate-600 hover:text-blue-600 hover:underline truncate"
                            >
                              {prov.telefono}
                            </a>
                          </div>
                        )}

                        {prov.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a
                              href={`mailto:${prov.email}`}
                              className="text-slate-600 hover:text-blue-600 hover:underline truncate"
                            >
                              {prov.email}
                            </a>
                          </div>
                        )}

                        {prov.direccion && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate text-[11px]">{prov.direccion}</span>
                          </div>
                        )}

                        {!prov.contacto && !prov.telefono && !prov.email && !prov.direccion && (
                          <p className="text-[11px] text-slate-400 italic">Sin datos de contacto especificados</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando {filteredProviders.length} de {providers.length} proveedores registrados</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {providerToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setProviderToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-md w-full animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h4 className="text-base font-bold text-slate-900 text-center">
              ¿Eliminar proveedor "{providerToDelete.nombre}"?
            </h4>

            <p className="text-xs text-slate-600 text-center mt-2">
              Si eliminas este proveedor, los productos que estén vinculados a él quedarán sin proveedor asignado, pero
              no se eliminarán de tu inventario.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setProviderToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Eliminando...' : 'Sí, eliminar proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
