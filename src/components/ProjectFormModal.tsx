import React, { useState } from 'react';
import { X, FolderGit2, AlertCircle, Building, User, MapPin, Calendar } from 'lucide-react';
import { Project } from '../types';
import { api } from '../lib/api';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
  projectToEdit?: Project | null;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectToEdit,
}) => {
  const [nombre, setNombre] = useState('');
  const [cliente, setCliente] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [estado, setEstado] = useState<'activo' | 'comienza_en' | 'finalizado'>('activo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (projectToEdit) {
      setNombre(projectToEdit.nombre || '');
      setCliente(projectToEdit.cliente || '');
      setDireccion(projectToEdit.direccion || '');
      setFechaInicio(projectToEdit.fecha_inicio || '');
      setFechaFin(projectToEdit.fecha_fin || '');
      setEstado(projectToEdit.estado || 'activo');
    } else {
      setNombre('');
      setCliente('');
      setDireccion('');
      setFechaInicio('');
      setFechaFin('');
      setEstado('activo');
    }
    setError(null);
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const isEditing = Boolean(projectToEdit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la obra / proyecto es obligatorio');
      return;
    }
    if (!cliente.trim()) {
      setError('El cliente es obligatorio');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result: Project;
      if (isEditing && projectToEdit) {
        result = await api.updateProject(projectToEdit.id, {
          nombre: nombre.trim(),
          cliente: cliente.trim(),
          direccion: direccion.trim() || undefined,
          fecha_inicio: fechaInicio || undefined,
          fecha_fin: fechaFin || undefined,
          estado,
        });
      } else {
        result = await api.createProject({
          nombre: nombre.trim(),
          cliente: cliente.trim(),
          direccion: direccion.trim() || undefined,
          fecha_inicio: fechaInicio || undefined,
          fecha_fin: fechaFin || undefined,
          estado,
        });
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar proyecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EA1D24] text-white flex items-center justify-center font-bold">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? 'Editar Proyecto / Obra' : 'Nuevo Proyecto / Obra'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isEditing ? 'Modificar datos del proyecto' : 'Registrar un centro de coste y destino de material'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="proj-nombre">
              Nombre de la Obra o Proyecto *
            </label>
            <div className="relative">
              <input
                id="proj-nombre"
                type="text"
                placeholder="Ej: Reforma Integral Ático Chamberí"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
              />
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="proj-cliente">
              Cliente / Propietario *
            </label>
            <div className="relative">
              <input
                id="proj-cliente"
                type="text"
                placeholder="Ej: Familia Gómez, Retail Innova S.L."
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                required
                className="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="proj-direccion">
              Dirección de la Obra
            </label>
            <div className="relative">
              <input
                id="proj-direccion"
                type="text"
                placeholder="Ej: C/ Santa Engracia 42, Ático B, Madrid"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
              />
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Dates: Fecha Inicio & Fecha Fin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="proj-fecha-inicio">
                Fecha Inicio
              </label>
              <div className="relative">
                <input
                  id="proj-fecha-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="proj-fecha-fin">
                Fecha Fin (Estimada)
              </label>
              <div className="relative">
                <input
                  id="proj-fecha-fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Estado del Proyecto
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
            >
              <option value="activo">Activo (en ejecución)</option>
              <option value="comienza_en">
                {fechaInicio ? `Comienza en: ${fechaInicio}` : 'Comienza en (Fecha prevista)'}
              </option>
              <option value="finalizado">Finalizado / Entregado</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-project"
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-xs shadow-red-600/20"
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
