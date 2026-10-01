export type Role = 'admin' | 'operario';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  fecha_creacion: string;
}

export interface Provider {
  id: string;
  nombre: string;
  contacto?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  logo_url?: string;
}

export interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  nomenclatura?: string;
  product_count?: number;
}

export type ProjectStatus = 'activo' | 'comienza_en' | 'finalizado';

export interface Project {
  id: string;
  nombre: string;
  cliente: string;
  direccion?: string;
  estado: ProjectStatus;
  fecha_inicio?: string;
  fecha_fin?: string;
  fecha_creacion: string;
}

export type ProductStatus = 'activo' | 'disponible' | 'bajo_pedido' | 'descatalogado';

export interface Product {
  id: string;
  codigo: string;
  referencia?: string;
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  categoria: string;
  stock_minimo: number;
  estado?: ProductStatus;
  proveedor_id?: string;
  proveedor_nombre?: string;
  proyecto_id?: string;
  proyecto_nombre?: string;
  fecha_creacion: string;
  // Computed stock fields:
  stock_actual: number;      // Total de unidades existentes (almacén + tienda/obra)
  stock_fuera_almacen: number; // Unidades recibidas en tienda/obra
  unidades_solicitadas: number;
  unidades_pendientes_almacen: number;
  stock_reservado: number;   // Total reservado actualmente
  stock_disponible: number;  // Físico - reservado
  en_alerta: boolean;        // stock_disponible <= stock_minimo
}

export type MovementType = 'entrada' | 'salida' | 'reserva';

export interface Movement {
  id: string;
  producto_id: string;
  producto_codigo?: string;
  producto_nombre?: string;
  producto_categoria?: string;
  tipo: MovementType;
  cantidad: number;
  fecha: string;
  usuario_id: string;
  usuario_nombre?: string;
  proyecto_id?: string;
  proyecto_nombre?: string;
  observaciones?: string;
}

export interface DashboardStats {
  total_productos: number;
  productos_stock_bajo: number;
  movimientos_hoy: number;
  entradas_hoy: number;
  salidas_hoy: number;
  reservas_activas: number;
  proyectos_activos: number;
  solicitudes_pendientes: number;
  pedidos_pendientes?: number;
  pedidos_en_camino?: number;
  alertas: Product[];
  ultimos_movimientos: Movement[];
}

export type RequestType = 'preparar_carga' | 'pedido_material';
export type RequestStatus =
  | 'pendiente'
  | 'en_preparacion'
  | 'preparado'
  | 'pedido_realizado'
  | 'entregado'
  | 'rechazado';
export type RequestPriority = 'normal' | 'urgente';

export interface MaterialRequest {
  id: string;
  tipo_solicitud: RequestType;
  es_material_nuevo: boolean;
  producto_id?: string | null;
  producto_codigo?: string;
  material_nombre: string;
  material_descripcion?: string;
  material_categoria?: string;
  proveedor_sugerido?: string;
  cantidad: number;
  unidad: string;
  proyecto_id?: string | null;
  proyecto_nombre?: string;
  usuario_id: string;
  usuario_nombre?: string;
  prioridad: RequestPriority;
  fecha_solicitud: string;
  fecha_necesidad?: string | null;
  notas?: string;
  estado: RequestStatus;
  resolucion_notas?: string | null;
  fecha_actualizacion: string;
}

export interface RequestHistoryEntry {
  id: string;
  solicitud_id: string;
  usuario_id: string;
  usuario_nombre: string;
  accion: 'creacion' | 'edicion' | 'cambio_estado' | 'pedido_creado';
  detalles: string;
  valores_anteriores?: string;
  valores_nuevos?: string;
  fecha: string;
}

export type OrderStatus =
  | 'por_tramitar'
  | 'disponible'
  | 'descatalogado'
  | 'sin_existencias'
  | 'pendiente_recibir'
  | 'recibido_tienda_obra'
  | 'reservado'
  | 'recibido'
  | 'cancelado'
  | 'pendiente'
  | 'pedido'
  | 'en_camino';

export interface Order {
  id: string;
  numero_pedido: string;
  solicitud_id?: string | null;
  producto_id?: string | null;
  producto_codigo?: string | null;
  producto_nombre: string;
  producto_categoria?: string | null;
  referencia?: string | null;
  proveedor_id?: string | null;
  proveedor_nombre?: string | null;
  proveedor_telefono?: string | null;
  proveedor_email?: string | null;
  cantidad: number;
  cantidad_recibida?: number;
  cantidad_adjudicada?: number;
  cantidad_almacen?: number;
  unidad: string;
  precio_estimado?: number | null;
  proyecto_id?: string | null;
  proyecto_nombre?: string | null;
  usuario_id: string;
  usuario_nombre?: string | null;
  operario_solicitante_id?: string | null;
  operario_solicitante_nombre?: string | null;
  fecha_pedido: string;
  fecha_estimada_entrega?: string | null;
  fecha_recepcion?: string | null;
  estado: OrderStatus;
  notas?: string | null;
  albaran_o_factura?: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
