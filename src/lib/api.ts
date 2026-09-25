import {
  AuthResponse,
  DashboardStats,
  Movement,
  Product,
  Project,
  Provider,
  Category,
  User,
  Role,
  MaterialRequest,
  RequestStatus,
  Order,
  RequestHistoryEntry
} from '../types';

const TOKEN_KEY = 'reformas_stock_token';
const USER_KEY = 'reformas_stock_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: AuthResponse | null) {
  if (auth) {
    localStorage.setItem(TOKEN_KEY, auth.token);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMsg = data?.error || `Error ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredAuth(res);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  logout() {
    setStoredAuth(null);
  },

  // Stats
  async getStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/api/stats');
  },

  // Products
  async getProducts(params?: {
    query?: string;
    category?: string;
    low_stock?: boolean;
    project_id?: string;
  }): Promise<Product[]> {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.set('query', params.query);
    if (params?.category) queryParams.set('category', params.category);
    if (params?.low_stock) queryParams.set('low_stock', 'true');
    if (params?.project_id) queryParams.set('project_id', params.project_id);

    const qs = queryParams.toString();
    return request<Product[]>(`/api/products${qs ? `?${qs}` : ''}`);
  },

  async getProduct(id: string): Promise<Product> {
    return request<Product>(`/api/products/${encodeURIComponent(id)}`);
  },

  async createProduct(productData: Partial<Product> & { stock_inicial?: number }): Promise<Product> {
    return request<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    return request<Product>(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Movements
  async getMovements(params?: {
    tipo?: string;
    producto_id?: string;
    proyecto_id?: string;
    desde?: string;
    hasta?: string;
  }): Promise<Movement[]> {
    const queryParams = new URLSearchParams();
    if (params?.tipo) queryParams.set('tipo', params.tipo);
    if (params?.producto_id) queryParams.set('producto_id', params.producto_id);
    if (params?.proyecto_id) queryParams.set('proyecto_id', params.proyecto_id);
    if (params?.desde) queryParams.set('desde', params.desde);
    if (params?.hasta) queryParams.set('hasta', params.hasta);

    const qs = queryParams.toString();
    return request<Movement[]>(`/api/movements${qs ? `?${qs}` : ''}`);
  },

  async createMovement(movementData: {
    producto_id: string;
    tipo: 'entrada' | 'salida' | 'reserva';
    cantidad: number;
    proyecto_id?: string;
    usuario_id?: string;
    observaciones?: string;
  }): Promise<{ movement: Movement; product: Product; message: string }> {
    return request<{ movement: Movement; product: Product; message: string }>('/api/movements', {
      method: 'POST',
      body: JSON.stringify(movementData),
    });
  },

  async undoMovement(id: string): Promise<{ success: boolean; message: string; product?: Product }> {
    return request<{ success: boolean; message: string; product?: Product }>(`/api/movements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    return request<Project[]>('/api/projects');
  },

  async getProjectDetails(id: string): Promise<{
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
  }> {
    return request(`/api/projects/${encodeURIComponent(id)}/details`);
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    return request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    return request<Project>(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Providers
  async getProviders(): Promise<Provider[]> {
    return request<Provider[]>('/api/providers');
  },

  async createProvider(data: Partial<Provider>): Promise<Provider> {
    return request<Provider>('/api/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProvider(id: string, data: Partial<Provider>): Promise<Provider> {
    return request<Provider>(`/api/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProvider(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/api/providers/${id}`, {
      method: 'DELETE',
    });
  },

  // Categories / Families
  async getCategories(): Promise<Category[]> {
    return request<Category[]>('/api/categories');
  },

  async createCategory(data: { nombre: string; descripcion?: string; nomenclatura?: string }): Promise<Category> {
    return request<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCategory(id: string, data: { nombre: string; descripcion?: string; nomenclatura?: string }): Promise<Category> {
    return request<Category>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Users
  async getUsers(): Promise<User[]> {
    return request<User[]>('/api/users');
  },

  async createUser(data: {
    nombre: string;
    email: string;
    password: string;
    rol: Role;
  }): Promise<User> {
    return request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(
    id: string,
    data: {
      nombre?: string;
      email?: string;
      password?: string;
      rol?: Role;
    }
  ): Promise<User> {
    return request<User>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Material Requests (Solicitudes)
  async getRequests(params?: {
    estado?: string;
    tipo_solicitud?: string;
    proyecto_id?: string;
    usuario_id?: string;
    query?: string;
  }): Promise<MaterialRequest[]> {
    const queryParams = new URLSearchParams();
    if (params?.estado) queryParams.set('estado', params.estado);
    if (params?.tipo_solicitud) queryParams.set('tipo_solicitud', params.tipo_solicitud);
    if (params?.proyecto_id) queryParams.set('proyecto_id', params.proyecto_id);
    if (params?.usuario_id) queryParams.set('usuario_id', params.usuario_id);
    if (params?.query) queryParams.set('query', params.query);

    const qs = queryParams.toString();
    return request<MaterialRequest[]>(`/api/requests${qs ? `?${qs}` : ''}`);
  },

  async getRequest(id: string): Promise<MaterialRequest> {
    return request<MaterialRequest>(`/api/requests/${encodeURIComponent(id)}`);
  },

  async createRequest(data: Partial<MaterialRequest>): Promise<MaterialRequest> {
    return request<MaterialRequest>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRequestStatus(
    id: string,
    data: {
      estado: RequestStatus;
      resolucion_notas?: string;
      registrar_movimiento?: boolean;
      tipo_movimiento?: 'salida' | 'reserva';
    }
  ): Promise<{ request: MaterialRequest; movimientoCreado?: any }> {
    return request<{ request: MaterialRequest; movimientoCreado?: any }>(
      `/api/requests/${encodeURIComponent(id)}/status`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  async updateRequest(id: string, data: Partial<MaterialRequest>): Promise<MaterialRequest> {
    return request<MaterialRequest>(`/api/requests/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getRequestHistory(id: string): Promise<RequestHistoryEntry[]> {
    return request<RequestHistoryEntry[]>(`/api/requests/${encodeURIComponent(id)}/history`);
  },

  async deleteRequest(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/api/requests/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    );
  },

  // Orders (Pedidos a Distribuidores / Proveedores)
  async getOrders(params?: {
    estado?: string;
    proveedor_id?: string;
    proyecto_id?: string;
    query?: string;
  }): Promise<Order[]> {
    const queryParams = new URLSearchParams();
    if (params?.estado) queryParams.set('estado', params.estado);
    if (params?.proveedor_id) queryParams.set('proveedor_id', params.proveedor_id);
    if (params?.proyecto_id) queryParams.set('proyecto_id', params.proyecto_id);
    if (params?.query) queryParams.set('query', params.query);

    const qs = queryParams.toString();
    return request<Order[]>(`/api/orders${qs ? `?${qs}` : ''}`);
  },

  async getOrder(id: string): Promise<Order> {
    return request<Order>(`/api/orders/${encodeURIComponent(id)}`);
  },

  async createOrder(data: Partial<Order>): Promise<Order> {
    return request<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    return request<Order>(`/api/orders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async receiveOrder(
    id: string,
    data: {
      codigo_producto?: string;
      categoria_producto?: string;
      stock_minimo?: number;
      descripcion_producto?: string;
      albaran?: string;
    }
  ): Promise<{ success: boolean; order: Order; product: Product; message: string }> {
    return request<{ success: boolean; order: Order; product: Product; message: string }>(
      `/api/orders/${encodeURIComponent(id)}/receive`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async deleteOrder(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/api/orders/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    );
  },

  // Time API
  async getTime(): Promise<{
    timestamp: number;
    iso: string;
    timezone: string;
    zoneName: string;
    formatted: {
      date: string;
      time: string;
      short: string;
      dayOfWeek: string;
    };
  }> {
    return request('/api/time');
  },
};
