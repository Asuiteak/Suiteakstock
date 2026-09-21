import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  Building,
  User as UserIcon,
  MapPin,
  Clock,
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  X,
  Boxes,
  Eye,
  Calendar,
  Trash2,
  AlertTriangle,
  MoreVertical,
  Pencil
} from 'lucide-react';
import { Project, Movement, Product, MovementType, User } from '../types';
import { api } from '../lib/api';
import { ProjectFormModal } from './ProjectFormModal';

interface ProjectsViewProps {
  projects: Project[];
  currentUser?: User;
  onNewProject: () => void;
  onOpenMovement: (type: MovementType, productId?: string, projectId?: string) => void;
  onSelectProduct: (productId: string) => void;
  onRefreshProjects: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  currentUser,
  onNewProject,
  onOpenMovement,
  onSelectProduct,
  onRefreshProjects,
  onShowToast,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);
  const [isDetailMenuOpen, setIsDetailMenuOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectDetails, setProjectDetails] = useState<{
    project: Project;
    movements: Movement[];
    dedicatedProducts: Product[];
    materialsSummary: {
      producto_id: string;
      codigo: string;
      nombre: string;
      categoria: string;
      salidas: number;
      reservas: number;
    }[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteProject(projectToDelete.id);
      if (onShowToast) {
        onShowToast(res.message || `Proyecto "${projectToDelete.nombre}" eliminado`, 'success');
      }
      if (selectedProjectId === projectToDelete.id) {
        setSelectedProjectId(null);
      }
      setProjectToDelete(null);
      onRefreshProjects();
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err.message || 'Error al eliminar el proyecto', 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectDetails(null);
      return;
    }

    setLoadingDetails(true);
    api.getProjectDetails(selectedProjectId)
      .then((data) => setProjectDetails(data))
      .catch((err) => console.error('Error cargando detalles del proyecto:', err))
      .finally(() => setLoadingDetails(false));
  }, [selectedProjectId]);

  const handleToggleStatus = async () => {
    if (!projectDetails) return;
    const newStatus = projectDetails.project.estado === 'activo' ? 'finalizado' : 'activo';
    setStatusUpdating(true);
    try {
      const updated = await api.updateProject(projectDetails.project.id, {
        estado: newStatus,
      });
      setProjectDetails({
        ...projectDetails,
        project: updated,
      });
      onRefreshProjects();
    } catch (err) {
      console.error('Error actualizando estado del proyecto:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header - Bento Card */}
      <div className="bento-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Proyectos y Obras</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-[#EA1D24] border border-red-200">
              {projects.length} obras registradas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centros de coste y destinos de material. Consulta qué materiales han salido y qué está reservado para cada obra.
          </p>
        </div>

        <button
          id="btn-new-project-view"
          onClick={onNewProject}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-red-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Proyecto</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((proj) => {
          const isActivo = proj.estado === 'activo';
          return (
            <div
              key={proj.id}
              className="bento-card p-6 flex flex-col justify-between group transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-red-50 text-[#EA1D24] border border-red-200/60 flex items-center justify-center">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 relative">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                        proj.estado === 'activo'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : proj.estado === 'comienza_en'
                          ? 'bg-amber-50 text-amber-800 border-amber-200 normal-case'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {proj.estado === 'comienza_en'
                        ? proj.fecha_inicio
                          ? `Comienza en: ${proj.fecha_inicio}`
                          : 'Comienza próximamente'
                        : proj.estado}
                    </span>

                    {/* 3-dots Menu Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuProjectId(activeMenuProjectId === proj.id ? null : proj.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Opciones de la obra"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuProjectId === proj.id && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuProjectId(null);
                          }}
                        />
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 z-30 w-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 animate-in fade-in"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuProjectId(null);
                              setEditingProject(proj);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuProjectId(null);
                              setProjectToDelete(proj);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Borrar</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base mb-2 leading-snug">
                  {proj.nombre}
                </h3>

                <div className="space-y-2 text-xs text-slate-600 mb-5">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">{proj.cliente}</span>
                  </div>
                  {proj.direccion && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-500">{proj.direccion}</span>
                    </div>
                  )}
                  {(proj.fecha_inicio || proj.fecha_fin) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {proj.fecha_inicio && (
                        <span><strong className="text-slate-700">Inicio:</strong> {proj.fecha_inicio}</span>
                      )}
                      {proj.fecha_fin && (
                        <span><strong className="text-slate-700">Fin:</strong> {proj.fecha_fin}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Registrado: {new Date(proj.fecha_creacion).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedProjectId(proj.id)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Materiales</span>
                </button>

                {isActivo && (
                  <button
                    onClick={() => onOpenMovement('salida', undefined, proj.id)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Asignar Salida</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Details Modal */}
      {selectedProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EA1D24] text-white flex items-center justify-center font-bold">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {projectDetails?.project.nombre || 'Cargando obra...'}
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Cliente: {projectDetails?.project.cliente}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {projectDetails?.project && (
                  <div className="relative">
                    <button
                      type="button"
                      id="btn-project-detail-options"
                      onClick={() => setIsDetailMenuOpen(!isDetailMenuOpen)}
                      className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Opciones de la obra"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {isDetailMenuOpen && (
                      <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-slate-700 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailMenuOpen(false);
                            setEditingProject(projectDetails.project);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailMenuOpen(false);
                            setProjectToDelete(projectDetails.project);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Borrar</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    setIsDetailMenuOpen(false);
                    setSelectedProjectId(null);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {loadingDetails || !projectDetails ? (
                <div className="py-12 text-center text-xs text-slate-500">Cargando desglose de la obra...</div>
              ) : (
                <>
                  {/* Status and Action banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                            projectDetails.project.estado === 'activo'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : projectDetails.project.estado === 'comienza_en'
                              ? 'bg-amber-100 text-amber-800 border-amber-200 normal-case'
                              : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          {projectDetails.project.estado === 'comienza_en'
                            ? projectDetails.project.fecha_inicio
                              ? `Comienza en: ${projectDetails.project.fecha_inicio}`
                              : 'Comienza próximamente'
                            : projectDetails.project.estado}
                        </span>
                        {projectDetails.project.direccion && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {projectDetails.project.direccion}
                          </span>
                        )}
                        {(projectDetails.project.fecha_inicio || projectDetails.project.fecha_fin) && (
                          <span className="text-xs text-slate-600 flex items-center gap-2 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {projectDetails.project.fecha_inicio && <span>Inicio: {projectDetails.project.fecha_inicio}</span>}
                            {projectDetails.project.fecha_fin && <span>Fin: {projectDetails.project.fecha_fin}</span>}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleStatus}
                        disabled={statusUpdating}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                      >
                        {statusUpdating
                          ? 'Actualizando...'
                          : projectDetails.project.estado === 'activo'
                          ? 'Marcar como Finalizado'
                          : 'Reabrir como Activo'}
                      </button>

                      {projectDetails.project.estado === 'activo' && (
                        <button
                          onClick={() => {
                            const pId = projectDetails.project.id;
                            setSelectedProjectId(null);
                            onOpenMovement('salida', undefined, pId);
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Retirar Material</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary of Dispatched and Reserved Materials */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-[#EA1D24]" />
                      <span>Materiales Consumidos y Reservados para esta Obra</span>
                    </h3>

                    {projectDetails.materialsSummary.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Aún no se ha retirado ni reservado material para este proyecto.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px]">
                            <tr>
                              <th className="py-2.5 px-3">Código</th>
                              <th className="py-2.5 px-3">Material</th>
                              <th className="py-2.5 px-3">Categoría</th>
                              <th className="py-2.5 px-3 text-right">Salidas (Consumido)</th>
                              <th className="py-2.5 px-3 text-right">Reservado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {projectDetails.materialsSummary.map((item) => (
                              <tr key={item.producto_id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-mono font-bold text-slate-700">
                                  {item.codigo}
                                </td>
                                <td className="py-2 px-3">
                                  <button
                                    onClick={() => {
                                      setSelectedProjectId(null);
                                      onSelectProduct(item.producto_id);
                                    }}
                                    className="font-semibold text-slate-900 hover:text-[#EA1D24] text-left"
                                  >
                                    {item.nombre}
                                  </button>
                                </td>
                                <td className="py-2 px-3 text-slate-500">{item.categoria}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                                  {item.salidas > 0 ? `-${item.salidas}` : '0'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-amber-600">
                                  {item.reservas > 0 ? item.reservas : '0'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Movements log for this project */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span>Historial de Movimientos de la Obra ({projectDetails.movements.length})</span>
                    </h3>

                    {projectDetails.movements.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                        Sin movimientos registrados.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-600 text-[11px] uppercase sticky top-0">
                            <tr>
                              <th className="py-2 px-3">Fecha</th>
                              <th className="py-2 px-3">Tipo</th>
                              <th className="py-2 px-3">Material</th>
                              <th className="py-2 px-3 text-right">Cant.</th>
                              <th className="py-2 px-3">Responsable</th>
                              <th className="py-2 px-3">Observaciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {projectDetails.movements.map((m) => (
                              <tr key={m.id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 text-slate-500">
                                  {new Date(m.fecha).toLocaleDateString()}
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${
                                      m.tipo === 'salida'
                                        ? 'bg-rose-100 text-rose-800'
                                        : m.tipo === 'reserva'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {m.tipo.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-800">
                                  {m.producto_nombre}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold">
                                  {m.tipo === 'salida' ? `-${m.cantidad}` : m.cantidad}
                                </td>
                                <td className="py-2 px-3 text-slate-600">{m.usuario_nombre}</td>
                                <td className="py-2 px-3 text-slate-500 italic truncate max-w-[120px]">
                                  {m.observaciones || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedProjectId(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación de Proyecto */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              ¿Eliminar obra / proyecto?
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              ¿Estás seguro de que deseas eliminar el proyecto <strong>{projectToDelete.nombre}</strong> (Cliente: {projectToDelete.cliente})?
              Los materiales vinculados volverán a figurar como material general de almacén.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Eliminando...' : 'Eliminar Obra'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <ProjectFormModal
          isOpen={Boolean(editingProject)}
          onClose={() => setEditingProject(null)}
          onSuccess={() => {
            setEditingProject(null);
            onRefreshProjects();
            onShowToast?.('Proyecto actualizado con éxito', 'success');
          }}
          projectToEdit={editingProject}
        />
      )}
    </div>
  );
};
