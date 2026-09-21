import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  initDatabase,
  getProducts,
  getProductById,
  getProductStockMetrics,
  getMovements,
  getMovementById,
  getProjects,
  getProjectById,
  getProviders,
  getProviderById,
  getUsers,
  getUserById,
  getUserByEmail,
  getDashboardStats,
  getMaterialRequests,
  getMaterialRequestById,
  getCategories,
  getCategoryById,
  getOrders,
  getOrderById,
  getRequestHistory,
  addRequestHistoryEntry,
  execute,
  queryOne
} from './server/db';
import {
  authenticateToken,
  requireAdmin,
  generateToken,
  comparePassword,
  hashPassword,
  AuthenticatedRequest
} from './server/auth';
import { MovementType } from './src/types';

const PORT = 3000;

async function startServer() {
  await initDatabase();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Time API: Official synchronized world time in Spain (Europe/Madrid)
  app.get('/api/time', (req: Request, res: Response) => {
    const now = new Date();
    res.json({
      timestamp: now.getTime(),
      iso: now.toISOString(),
      timezone: 'Europe/Madrid',
      zoneName: 'Hora Oficial de España (Península y Baleares)',
      formatted: {
        date: new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'full' }).format(now),
        time: new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', timeStyle: 'medium' }).format(now),
        short: new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(now),
        dayOfWeek: new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long' }).format(now),
      }
    });
  });

  // Auth: Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
      }

      const user = getUserByEmail(email.trim().toLowerCase());
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const isValid = comparePassword(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const safeUser = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        fecha_creacion: user.fecha_creacion
      };

      const token = generateToken(safeUser);
      return res.json({ token, user: safeUser });
    } catch (err: any) {
      console.error('Error en /api/auth/login:', err);
      return res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  });

  // Auth: Me
  app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    return res.json({ user: req.user });
  });

  // Dashboard Stats
  app.get('/api/stats', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = getDashboardStats();
      return res.json(stats);
    } catch (err: any) {
      console.error('Error en /api/stats:', err);
      return res.status(500).json({ error: 'Error al obtener estadísticas del dashboard' });
    }
  });

  // Products: List & Search
  app.get('/api/products', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { query, category, low_stock, project_id } = req.query;
      const products = getProducts({
        query: query ? String(query) : undefined,
        category: category ? String(category) : undefined,
        low_stock_only: low_stock === 'true',
        project_id: project_id ? String(project_id) : undefined
      });
      return res.json(products);
    } catch (err: any) {
      console.error('Error en /api/products:', err);
      return res.status(500).json({ error: 'Error al consultar productos' });
    }
  });

  // Products: Get Single
  app.get('/api/products/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const product = getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      return res.json(product);
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al consultar producto' });
    }
  });

  // Products: Create (Admin Only)
  app.post('/api/products', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        codigo,
        referencia,
        nombre,
        descripcion,
        imagen_url,
        categoria,
        stock_minimo,
        estado,
        proveedor_id,
        proyecto_id,
        stock_inicial
      } = req.body;

      if (!codigo || !codigo.trim()) {
        return res.status(400).json({ error: 'El código del producto es obligatorio' });
      }
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
      }
      if (!categoria || !categoria.trim()) {
        return res.status(400).json({ error: 'La categoría es obligatoria' });
      }

      const minStockNum = Number(stock_minimo);
      if (isNaN(minStockNum) || minStockNum < 0) {
        return res.status(400).json({ error: 'El stock mínimo debe ser un número igual o superior a 0' });
      }

      // Check unique code
      const existing = queryOne('SELECT id FROM products WHERE LOWER(codigo) = LOWER(?)', [codigo.trim()]);
      if (existing) {
        return res.status(400).json({ error: `Ya existe un producto con el código "${codigo}"` });
      }

      const id = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const now = new Date().toISOString();

      execute(
        `INSERT INTO products (id, codigo, referencia, nombre, descripcion, imagen_url, categoria, stock_minimo, estado, proveedor_id, proyecto_id, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          codigo.trim().toUpperCase(),
          referencia?.trim() || null,
          nombre.trim(),
          descripcion?.trim() || null,
          imagen_url?.trim() || null,
          categoria.trim(),
          minStockNum,
          estado || 'activo',
          proveedor_id || null,
          proyecto_id || null,
          now
        ]
      );

      // If initial stock was provided, create an entrada movement
      const initStockNum = Number(stock_inicial);
      if (!isNaN(initStockNum) && initStockNum > 0) {
        const moveId = 'mov-init-' + Date.now();
        execute(
          `INSERT INTO movements (id, producto_id, tipo, cantidad, fecha, usuario_id, proyecto_id, observaciones)
           VALUES (?, ?, 'entrada', ?, ?, ?, ?, 'Stock inicial registrado al crear producto')`,
          [moveId, id, initStockNum, now, req.user!.id, proyecto_id || null]
        );
      }

      const created = getProductById(id);
      return res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creando producto:', err);
      return res.status(500).json({ error: 'Error al registrar el producto' });
    }
  });

  // Products: Update (Admin for all fields, Any authenticated user for provider)
  app.put('/api/products/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        codigo,
        referencia,
        nombre,
        descripcion,
        imagen_url,
        categoria,
        stock_minimo,
        estado,
        proveedor_id,
        proyecto_id
      } = req.body;

      const current = getProductById(id);
      if (!current) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // If user is not admin, only permit updating proveedor_id (as requested)
      if (req.user?.rol !== 'admin') {
        const isTryingToChangeOtherFields =
          codigo !== undefined ||
          referencia !== undefined ||
          nombre !== undefined ||
          descripcion !== undefined ||
          imagen_url !== undefined ||
          categoria !== undefined ||
          stock_minimo !== undefined ||
          estado !== undefined ||
          proyecto_id !== undefined;

        if (isTryingToChangeOtherFields) {
          return res.status(403).json({
            error: 'Solo los administradores pueden modificar los datos técnicos del producto. Como operario puedes cambiar el proveedor.'
          });
        }

        execute(
          `UPDATE products SET proveedor_id = ? WHERE id = ?`,
          [proveedor_id ? (proveedor_id || null) : null, id]
        );

        const updated = getProductById(id);
        return res.json(updated);
      }

      if (codigo && codigo.trim().toUpperCase() !== current.codigo) {
        const duplicate = queryOne('SELECT id FROM products WHERE LOWER(codigo) = LOWER(?) AND id != ?', [codigo.trim(), id]);
        if (duplicate) {
          return res.status(400).json({ error: `El código "${codigo}" ya está en uso por otro producto` });
        }
      }

      const minStockNum = stock_minimo !== undefined ? Number(stock_minimo) : current.stock_minimo;
      if (isNaN(minStockNum) || minStockNum < 0) {
        return res.status(400).json({ error: 'El stock mínimo debe ser un número válido >= 0' });
      }

      const finalEstado = estado !== undefined ? estado : (current.estado || 'activo');

      execute(
        `UPDATE products SET 
          codigo = ?, 
          referencia = ?,
          nombre = ?, 
          descripcion = ?, 
          imagen_url = ?, 
          categoria = ?, 
          stock_minimo = ?, 
          estado = ?,
          proveedor_id = ?, 
          proyecto_id = ?
         WHERE id = ?`,
        [
          codigo ? codigo.trim().toUpperCase() : current.codigo,
          referencia !== undefined ? (referencia?.trim() || null) : (current.referencia || null),
          nombre ? nombre.trim() : current.nombre,
          descripcion !== undefined ? descripcion : current.descripcion,
          imagen_url !== undefined ? imagen_url : current.imagen_url,
          categoria ? categoria.trim() : current.categoria,
          minStockNum,
          finalEstado,
          proveedor_id !== undefined ? (proveedor_id || null) : current.proveedor_id,
          proyecto_id !== undefined ? (proyecto_id || null) : current.proyecto_id,
          id
        ]
      );

      const updated = getProductById(id);
      return res.json(updated);
    } catch (err: any) {
      console.error('Error actualizando producto:', err);
      return res.status(500).json({ error: 'Error al actualizar el producto' });
    }
  });

  // Products: Delete (Admin Only)
  app.delete('/api/products/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const product = getProductById(id);
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // Eliminar peticiones y movimientos asociados primero
      execute('DELETE FROM material_requests WHERE producto_id = ?', [id]);
      execute('DELETE FROM movements WHERE producto_id = ?', [id]);
      execute('DELETE FROM products WHERE id = ?', [id]);

      return res.json({ success: true, message: `Producto "${product.nombre}" y su histórico eliminados correctamente` });
    } catch (err: any) {
      console.error('Error eliminando producto:', err);
      return res.status(500).json({ error: 'Error al eliminar producto' });
    }
  });

  // Categories: List
  app.get('/api/categories', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const categories = getCategories();
      return res.json(categories);
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al consultar categorías' });
    }
  });

  // Categories: Create (Admin Only)
  app.post('/api/categories', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { nombre, descripcion, nomenclatura } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre de la familia/categoría es obligatorio' });
      }
      const trimmed = nombre.trim();
      const existing = queryOne<any>('SELECT id FROM categories WHERE LOWER(TRIM(nombre)) = LOWER(?)', [trimmed]);
      if (existing) {
        return res.status(400).json({ error: `La familia o categoría "${trimmed}" ya existe` });
      }

      const id = 'cat-' + Date.now();
      const nom = nomenclatura ? nomenclatura.trim().toUpperCase() : (trimmed.length >= 3 ? trimmed.substring(0, 3).toUpperCase() : 'OTR');
      execute(
        'INSERT INTO categories (id, nombre, descripcion, nomenclatura, orden) VALUES (?, ?, ?, ?, ?)',
        [id, trimmed, descripcion ? descripcion.trim() : null, nom, 10]
      );

      const all = getCategories();
      const created = all.find((c) => c.id === id);
      return res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creando categoría:', err);
      return res.status(500).json({ error: 'Error al crear la categoría' });
    }
  });

  // Categories: Update (Admin Only)
  app.put('/api/categories/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { nombre, descripcion, nomenclatura } = req.body;
      const current = getCategoryById(id);
      if (!current) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
      }

      const trimmed = nombre.trim();
      const duplicate = queryOne<any>('SELECT id FROM categories WHERE LOWER(TRIM(nombre)) = LOWER(?) AND id != ?', [trimmed, id]);
      if (duplicate) {
        return res.status(400).json({ error: `Ya existe otra categoría con el nombre "${trimmed}"` });
      }

      const oldName = current.nombre;
      const nom = nomenclatura !== undefined ? (nomenclatura ? nomenclatura.trim().toUpperCase() : null) : current.nomenclatura;
      execute(
        'UPDATE categories SET nombre = ?, descripcion = ?, nomenclatura = ? WHERE id = ?',
        [trimmed, descripcion !== undefined ? (descripcion ? descripcion.trim() : null) : current.descripcion, nom, id]
      );

      // Cascade update in products table if name changed
      if (oldName.toLowerCase() !== trimmed.toLowerCase()) {
        execute('UPDATE products SET categoria = ? WHERE LOWER(TRIM(categoria)) = LOWER(?)', [trimmed, oldName.trim()]);
      }

      const all = getCategories();
      const updated = all.find((c) => c.id === id);
      return res.json(updated);
    } catch (err: any) {
      console.error('Error actualizando categoría:', err);
      return res.status(500).json({ error: 'Error al actualizar la categoría' });
    }
  });

  // Categories: Delete (Admin Only)
  app.delete('/api/categories/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const current = getCategoryById(id);
      if (!current) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      // Reassign products under this category to 'General'
      execute(
        "UPDATE products SET categoria = 'General' WHERE LOWER(TRIM(categoria)) = LOWER(?)",
        [current.nombre.trim()]
      );

      execute('DELETE FROM categories WHERE id = ?', [id]);
      return res.json({ success: true, message: `Categoría "${current.nombre}" eliminada correctamente` });
    } catch (err: any) {
      console.error('Error eliminando categoría:', err);
      return res.status(500).json({ error: 'Error al eliminar la categoría' });
    }
  });

  // Movements: List
  app.get('/api/movements', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tipo, producto_id, proyecto_id, desde, hasta } = req.query;
      const movements = getMovements({
        tipo: tipo ? String(tipo) : undefined,
        producto_id: producto_id ? String(producto_id) : undefined,
        proyecto_id: proyecto_id ? String(proyecto_id) : undefined,
        desde: desde ? String(desde) : undefined,
        hasta: hasta ? String(hasta) : undefined
      });
      return res.json(movements);
    } catch (err: any) {
      console.error('Error en /api/movements:', err);
      return res.status(500).json({ error: 'Error al consultar movimientos' });
    }
  });

  // Movements: Register (Entrada, Salida, Reserva)
  app.post('/api/movements', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        producto_id,
        tipo,
        cantidad,
        proyecto_id,
        usuario_id,
        observaciones
      } = req.body;

      if (!producto_id) {
        return res.status(400).json({ error: 'Debes seleccionar un producto' });
      }

      if (!['entrada', 'salida', 'reserva'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de movimiento inválido (debe ser entrada, salida o reserva)' });
      }

      const qty = Number(cantidad);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'La cantidad del movimiento debe ser un número entero mayor que cero' });
      }

      const product = getProductById(producto_id);
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // Reglas de negocio del PRD:
      // "En movimientos de salida o reserva, el proyecto es obligatorio."
      if ((tipo === 'salida' || tipo === 'reserva') && !proyecto_id) {
        return res.status(400).json({
          error: `El proyecto / cliente es obligatorio para registrar una ${tipo === 'salida' ? 'salida' : 'reserva'} de material.`
        });
      }

      // "El stock no puede ser negativo. Si una salida supera el stock disponible, se bloquea y se muestra error."
      const metrics = getProductStockMetrics(producto_id);
      if (tipo === 'salida') {
        if (qty > metrics.stock_actual) {
          return res.status(400).json({
            error: `Operación bloqueada: Stock insuficiente. El stock físico actual es de ${metrics.stock_actual} unidades (solicitado: ${qty}).`
          });
        }
      }

      if (tipo === 'reserva') {
        if (qty > metrics.stock_disponible) {
          return res.status(400).json({
            error: `Operación bloqueada: No hay suficiente stock disponible sin reservar. Stock libre disponible: ${metrics.stock_disponible} unidades (solicitado: ${qty}).`
          });
        }
      }

      // Responsable: "se autocompleta con el usuario logueado, editable solo por admin"
      let responsibleUserId = req.user!.id;
      if (req.user!.rol === 'admin' && usuario_id) {
        responsibleUserId = usuario_id;
      }

      const movementId = 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const now = new Date().toISOString();

      execute(
        `INSERT INTO movements (id, producto_id, tipo, cantidad, fecha, usuario_id, proyecto_id, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movementId,
          producto_id,
          tipo,
          qty,
          now,
          responsibleUserId,
          proyecto_id || null,
          observaciones?.trim() || null
        ]
      );

      const movements = getMovements({ producto_id });
      const newMovement = movements.find((m) => m.id === movementId) || null;
      const updatedProduct = getProductById(producto_id);

      return res.status(201).json({
        movement: newMovement,
        product: updatedProduct,
        message: `${tipo.toUpperCase()} de ${qty} unidad(es) registrada con éxito.`
      });
    } catch (err: any) {
      console.error('Error registrando movimiento:', err);
      return res.status(500).json({ error: 'Error al registrar el movimiento' });
    }
  });

  // Movements: Undo / Delete (Admin or Movement Creator)
  app.delete('/api/movements/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const movement = getMovementById(id);
      if (!movement) {
        return res.status(404).json({ error: 'Movimiento no encontrado' });
      }

      // Permissions: Admin or the user who registered it
      if (req.user!.rol !== 'admin' && req.user!.id !== movement.usuario_id) {
        return res.status(403).json({ error: 'No tienes permisos para deshacer este movimiento.' });
      }

      // Check consistency when undoing an "entrada" (cannot leave physical stock negative)
      if (movement.tipo === 'entrada') {
        const metrics = getProductStockMetrics(movement.producto_id);
        if (metrics.stock_actual - movement.cantidad < 0) {
          return res.status(400).json({
            error: `No se puede deshacer esta entrada porque parte o la totalidad de las unidades ya han salido de almacén. Stock físico actual: ${metrics.stock_actual}, cantidad a revertir: ${movement.cantidad}.`
          });
        }
      }

      execute('DELETE FROM movements WHERE id = ?', [id]);
      const updatedProduct = getProductById(movement.producto_id);

      return res.json({
        success: true,
        message: `Movimiento de ${movement.tipo.toUpperCase()} (${movement.cantidad} uds) deshecho. El stock de "${movement.producto_nombre}" ha sido actualizado.`,
        product: updatedProduct
      });
    } catch (err: any) {
      console.error('Error deshaciendo movimiento:', err);
      return res.status(500).json({ error: 'Error al deshacer el movimiento' });
    }
  });

  // Projects: List
  app.get('/api/projects', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const projects = getProjects();
      return res.json(projects);
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al consultar proyectos' });
    }
  });

  // Projects: Detail (with movements & materials summary)
  app.get('/api/projects/:id/details', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const project = getProjectById(id);
      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }

      const projectMovements = getMovements({ proyecto_id: id });
      const dedicatedProducts = getProducts({ project_id: id });

      // Summary of materials consumed vs reserved
      const materialsSummaryMap: Record<string, {
        producto_id: string;
        codigo: string;
        nombre: string;
        categoria: string;
        salidas: number;
        reservas: number;
      }> = {};

      for (const m of projectMovements) {
        if (!materialsSummaryMap[m.producto_id]) {
          materialsSummaryMap[m.producto_id] = {
            producto_id: m.producto_id,
            codigo: m.producto_codigo || '',
            nombre: m.producto_nombre || '',
            categoria: m.producto_categoria || '',
            salidas: 0,
            reservas: 0
          };
        }
        if (m.tipo === 'salida') {
          materialsSummaryMap[m.producto_id].salidas += m.cantidad;
        } else if (m.tipo === 'reserva') {
          materialsSummaryMap[m.producto_id].reservas += m.cantidad;
        }
      }

      return res.json({
        project,
        movements: projectMovements,
        dedicatedProducts,
        materialsSummary: Object.values(materialsSummaryMap)
      });
    } catch (err: any) {
      console.error('Error en /api/projects/:id/details:', err);
      return res.status(500).json({ error: 'Error al cargar detalles del proyecto' });
    }
  });

  // Projects: Create
  app.post('/api/projects', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { nombre, cliente, direccion, estado, fecha_inicio, fecha_fin } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre del proyecto es obligatorio' });
      }
      if (!cliente || !cliente.trim()) {
        return res.status(400).json({ error: 'El nombre del cliente es obligatorio' });
      }

      const id = 'proj-' + Date.now();
      const now = new Date().toISOString();
      const validStatuses = ['activo', 'comienza_en', 'finalizado'];
      const projectStatus = validStatuses.includes(estado) ? estado : 'activo';

      execute(
        `INSERT INTO projects (id, nombre, cliente, direccion, estado, fecha_inicio, fecha_fin, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          nombre.trim(),
          cliente.trim(),
          direccion?.trim() || null,
          projectStatus,
          fecha_inicio?.trim() || null,
          fecha_fin?.trim() || null,
          now
        ]
      );

      const created = getProjectById(id);
      return res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creando proyecto:', err);
      return res.status(500).json({ error: 'Error al crear proyecto' });
    }
  });

  // Projects: Update
  app.put('/api/projects/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { nombre, cliente, direccion, estado, fecha_inicio, fecha_fin } = req.body;
      const current = getProjectById(id);
      if (!current) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }

      const validStatuses = ['activo', 'comienza_en', 'finalizado'];
      const projectStatus = estado && validStatuses.includes(estado) ? estado : current.estado;

      execute(
        `UPDATE projects SET 
          nombre = ?, 
          cliente = ?, 
          direccion = ?, 
          estado = ?,
          fecha_inicio = ?,
          fecha_fin = ?
         WHERE id = ?`,
        [
          nombre ? nombre.trim() : current.nombre,
          cliente ? cliente.trim() : current.cliente,
          direccion !== undefined ? (direccion?.trim() || null) : current.direccion,
          projectStatus,
          fecha_inicio !== undefined ? (fecha_inicio?.trim() || null) : current.fecha_inicio,
          fecha_fin !== undefined ? (fecha_fin?.trim() || null) : current.fecha_fin,
          id
        ]
      );

      const updated = getProjectById(id);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al actualizar proyecto' });
    }
  });

  // Projects: Delete (Admin Only)
  app.delete('/api/projects/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const project = getProjectById(id);
      if (!project) {
        return res.status(404).json({ error: 'Proyecto u obra no encontrada' });
      }

      // Desvincular productos, movimientos y solicitudes de este proyecto
      execute('DELETE FROM material_requests WHERE proyecto_id = ?', [id]);
      execute('UPDATE products SET proyecto_id = NULL WHERE proyecto_id = ?', [id]);
      execute('UPDATE movements SET proyecto_id = NULL WHERE proyecto_id = ?', [id]);
      execute('DELETE FROM projects WHERE id = ?', [id]);

      return res.json({ success: true, message: `Obra "${project.nombre}" eliminada correctamente.` });
    } catch (err: any) {
      console.error('Error al eliminar proyecto:', err);
      return res.status(500).json({ error: 'Error al eliminar el proyecto u obra' });
    }
  });

  // Providers: List
  app.get('/api/providers', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const providers = getProviders();
      return res.json(providers);
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al consultar proveedores' });
    }
  });

  // Providers: Create (Admin Only)
  app.post('/api/providers', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { nombre, contacto, email, telefono, direccion, logo_url } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' });
      }

      const id = 'prov-' + Date.now();
      execute(
        `INSERT INTO providers (id, nombre, contacto, email, telefono, direccion, logo_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, nombre.trim(), contacto?.trim() || null, email?.trim() || null, telefono?.trim() || null, direccion?.trim() || null, logo_url || null]
      );

      return res.status(201).json({
        id,
        nombre: nombre.trim(),
        contacto: contacto?.trim() || null,
        email: email?.trim() || null,
        telefono: telefono?.trim() || null,
        direccion: direccion?.trim() || null,
        logo_url: logo_url || null
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al crear proveedor' });
    }
  });

  // Providers: Update (Admin Only)
  app.put('/api/providers/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { nombre, contacto, email, telefono, direccion, logo_url } = req.body;
      const provider = getProviderById(id);
      if (!provider) {
        return res.status(404).json({ error: 'Proveedor no encontrado' });
      }

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' });
      }

      execute(
        `UPDATE providers SET nombre = ?, contacto = ?, email = ?, telefono = ?, direccion = ?, logo_url = ? WHERE id = ?`,
        [
          nombre.trim(),
          contacto?.trim() || null,
          email?.trim() || null,
          telefono?.trim() || null,
          direccion?.trim() || null,
          logo_url !== undefined ? (logo_url || null) : provider.logo_url,
          id
        ]
      );

      const updated = getProviderById(id);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al actualizar proveedor' });
    }
  });

  // Providers: Delete (Admin Only)
  app.delete('/api/providers/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const provider = getProviderById(id);
      if (!provider) {
        return res.status(404).json({ error: 'Proveedor no encontrado' });
      }

      // Unlink products associated with this provider
      execute('UPDATE products SET proveedor_id = NULL WHERE proveedor_id = ?', [id]);
      execute('DELETE FROM providers WHERE id = ?', [id]);

      return res.json({ success: true, message: `Proveedor "${provider.nombre}" eliminado correctamente.` });
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al eliminar proveedor' });
    }
  });

  // Users: List (for admin and movement assignment)
  app.get('/api/users', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = getUsers();
      return res.json(users);
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al consultar usuarios' });
    }
  });

  // Users: Create (Admin Only)
  app.post('/api/users', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { nombre, email, password, rol } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre de usuario o nombre completo es obligatorio' });
      }
      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
      }
      if (!password || !password.trim()) {
        return res.status(400).json({ error: 'La contraseña es obligatoria' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanNombre = nombre.trim();
      const userRole = rol === 'admin' ? 'admin' : 'operario';

      // Check if email or username already taken
      const existing = queryOne(
        `SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(nombre) = ?`,
        [cleanEmail, cleanNombre.toLowerCase()]
      );
      if (existing) {
        return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico o nombre de usuario.' });
      }

      const userId = 'usr-' + Date.now();
      const passwordHash = hashPassword(password.trim());
      const now = new Date().toISOString();

      execute(
        `INSERT INTO users (id, nombre, email, password_hash, rol, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, cleanNombre, cleanEmail, passwordHash, userRole, now]
      );

      const createdUser = getUserById(userId);
      return res.status(201).json(createdUser);
    } catch (err: any) {
      console.error('Error creando usuario:', err);
      return res.status(500).json({ error: 'Error al crear el usuario' });
    }
  });

  // Users: Update (Admin Only)
  app.put('/api/users/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { nombre, email, password, rol } = req.body;

      const user = getUserById(id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const cleanEmail = email ? email.trim().toLowerCase() : user.email;
      const cleanNombre = nombre ? nombre.trim() : user.nombre;
      const userRole = rol ? (rol === 'admin' ? 'admin' : 'operario') : user.rol;

      // Uniqueness check for email / name
      const duplicate = queryOne(
        `SELECT id FROM users WHERE (LOWER(email) = ? OR LOWER(nombre) = ?) AND id != ?`,
        [cleanEmail, cleanNombre.toLowerCase(), id]
      );
      if (duplicate) {
        return res.status(400).json({ error: 'Ya existe otro usuario con ese correo o nombre.' });
      }

      // Check if trying to remove admin role from the only admin
      if (user.rol === 'admin' && userRole !== 'admin') {
        const adminCount = queryOne(`SELECT COUNT(*) as count FROM users WHERE rol = 'admin'`);
        if (adminCount && Number(adminCount.count) <= 1) {
          return res.status(400).json({ error: 'No se puede quitar el rol al único administrador del sistema.' });
        }
      }

      if (password && password.trim()) {
        const passwordHash = hashPassword(password.trim());
        execute(
          `UPDATE users SET nombre = ?, email = ?, rol = ?, password_hash = ? WHERE id = ?`,
          [cleanNombre, cleanEmail, userRole, passwordHash, id]
        );
      } else {
        execute(
          `UPDATE users SET nombre = ?, email = ?, rol = ? WHERE id = ?`,
          [cleanNombre, cleanEmail, userRole, id]
        );
      }

      const updated = getUserById(id);
      return res.json(updated);
    } catch (err: any) {
      console.error('Error actualizando usuario:', err);
      return res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  });

  // Users: Delete (Admin Only)
  app.delete('/api/users/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (req.user?.id === id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de usuario activa.' });
      }

      const targetUser = getUserById(id);
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (targetUser.rol === 'admin') {
        const adminCount = queryOne(`SELECT COUNT(*) as count FROM users WHERE rol = 'admin'`);
        if (adminCount && Number(adminCount.count) <= 1) {
          return res.status(400).json({ error: 'No se puede eliminar el único administrador del sistema.' });
        }
      }

      execute('DELETE FROM users WHERE id = ?', [id]);
      return res.json({ success: true, message: `Usuario "${targetUser.nombre}" eliminado correctamente.` });
    } catch (err: any) {
      console.error('Error eliminando usuario:', err);
      return res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  });

  // ==========================================
  // Material Requests (Solicitudes de Operarios)
  // ==========================================

  // Requests: List
  app.get('/api/requests', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { estado, tipo_solicitud, proyecto_id, usuario_id, query } = req.query;
      const requests = getMaterialRequests({
        estado: estado as string,
        tipo_solicitud: tipo_solicitud as string,
        proyecto_id: proyecto_id as string,
        usuario_id: usuario_id as string,
        query: query as string
      });
      return res.json(requests);
    } catch (err: any) {
      console.error('Error al listar solicitudes:', err);
      return res.status(500).json({ error: 'Error al consultar solicitudes de material' });
    }
  });

  // Requests: Get By ID
  app.get('/api/requests/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const request = getMaterialRequestById(id);
      if (!request) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }
      return res.json(request);
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al obtener la solicitud' });
    }
  });

  // Requests: Create (Operarios and Admins)
  app.post('/api/requests', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        tipo_solicitud,
        es_material_nuevo,
        producto_id,
        material_nombre,
        material_descripcion,
        material_categoria,
        proveedor_sugerido,
        cantidad,
        unidad,
        proyecto_id,
        prioridad,
        fecha_necesidad,
        notas
      } = req.body;

      if (!material_nombre || !material_nombre.trim()) {
        return res.status(400).json({ error: 'El nombre del material o producto es obligatorio' });
      }

      const qty = Number(cantidad);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'La cantidad debe ser un número positivo' });
      }

      // If existing product, verify it exists
      let prodId = producto_id || null;
      let finalName = material_nombre.trim();
      let finalCategory = material_categoria?.trim() || 'General';
      let isNewMaterial = Boolean(es_material_nuevo);

      if (prodId) {
        const prod = getProductById(prodId);
        if (prod) {
          finalName = prod.nombre;
          finalCategory = prod.categoria;
          isNewMaterial = false;
        } else {
          prodId = null;
        }
      }

      const id = 'req-' + Date.now();
      const now = new Date().toISOString();
      const requestType = tipo_solicitud === 'pedido_material' ? 'pedido_material' : 'preparar_carga';
      const requestPriority = prioridad === 'urgente' ? 'urgente' : 'normal';
      const requestUnit = unidad?.trim() || 'uds';
      const userId = req.user?.id || 'usr-oper-1';

      execute(
        `INSERT INTO material_requests (
          id, tipo_solicitud, es_material_nuevo, producto_id, material_nombre,
          material_descripcion, material_categoria, proveedor_sugerido, cantidad, unidad,
          proyecto_id, usuario_id, prioridad, fecha_solicitud, fecha_necesidad,
          notas, estado, resolucion_notas, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          requestType,
          isNewMaterial ? 1 : 0,
          prodId,
          finalName,
          material_descripcion?.trim() || null,
          finalCategory,
          proveedor_sugerido?.trim() || null,
          qty,
          requestUnit,
          proyecto_id?.trim() || null,
          userId,
          requestPriority,
          now,
          fecha_necesidad?.trim() || null,
          notas?.trim() || null,
          'pendiente',
          null,
          now
        ]
      );

      // Audit history
      addRequestHistoryEntry(
        id,
        userId,
        req.user?.nombre || 'Usuario',
        'creacion',
        `Petición inicial registrada por el operario: ${qty} ${requestUnit} de "${finalName}". Prioridad: ${requestPriority}.`,
        undefined,
        JSON.stringify({ material: finalName, cantidad: qty, unidad: requestUnit, prioridad: requestPriority, proyecto_id })
      );

      const created = getMaterialRequestById(id);
      return res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creando solicitud:', err);
      return res.status(500).json({ error: 'Error al registrar solicitud de material' });
    }
  });

  // Requests: Update Status & Resolution (Admin or Owner)
  app.put('/api/requests/:id/status', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { estado, resolucion_notas, registrar_movimiento, tipo_movimiento } = req.body;

      const current = getMaterialRequestById(id);
      if (!current) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }

      // Valid status values
      const validStatuses = [
        'pendiente',
        'en_preparacion',
        'preparado',
        'pedido_realizado',
        'entregado',
        'rechazado'
      ];
      if (!validStatuses.includes(estado)) {
        return res.status(400).json({ error: 'Estado de solicitud inválido' });
      }

      // Non-admins can only cancel their own request if it is still pending
      if (req.user?.rol !== 'admin') {
        if (current.usuario_id !== req.user?.id || estado !== 'rechazado') {
          return res.status(403).json({ error: 'Permisos insuficientes para cambiar el estado de la solicitud' });
        }
      }

      const now = new Date().toISOString();
      const updatedNotes = resolucion_notas !== undefined ? (resolucion_notas?.trim() || null) : current.resolucion_notas;

      execute(
        `UPDATE material_requests SET 
          estado = ?, 
          resolucion_notas = ?, 
          fecha_actualizacion = ? 
         WHERE id = ?`,
        [estado, updatedNotes, now, id]
      );

      // Audit history entry
      addRequestHistoryEntry(
        id,
        req.user!.id,
        req.user!.nombre,
        'cambio_estado',
        `Estado actualizado de "${current.estado}" a "${estado}"${updatedNotes ? `. Nota: ${updatedNotes}` : ''}`,
        JSON.stringify({ estado: current.estado }),
        JSON.stringify({ estado, resolucion_notas: updatedNotes })
      );

      // Optional: automatically record stock movement if requested and applicable
      let movimientoCreado = null;
      if (
        registrar_movimiento &&
        current.producto_id &&
        (estado === 'preparado' || estado === 'entregado')
      ) {
        const moveType = tipo_movimiento === 'reserva' ? 'reserva' : 'salida';
        const moveId = 'mov-' + Date.now();
        const moveObs = `Automático por solicitud #${id}: ${estado === 'preparado' ? 'Preparación de carga' : 'Entrega a obra'} (${current.material_nombre})`;

        execute(
          `INSERT INTO movements (id, producto_id, tipo, cantidad, fecha, usuario_id, proyecto_id, observaciones)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            moveId,
            current.producto_id,
            moveType,
            current.cantidad,
            now,
            req.user?.id || current.usuario_id,
            current.proyecto_id || null,
            moveObs
          ]
        );

        movimientoCreado = {
          id: moveId,
          tipo: moveType,
          cantidad: current.cantidad
        };
      }

      const updated = getMaterialRequestById(id);
      return res.json({
        request: updated,
        movimientoCreado
      });
    } catch (err: any) {
      console.error('Error actualizando estado de solicitud:', err);
      return res.status(500).json({ error: 'Error al actualizar el estado de la solicitud' });
    }
  });

  // Requests: Edit Request (Admin or Owner)
  app.put('/api/requests/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const current = getMaterialRequestById(id);
      if (!current) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }

      // Non-admin can only edit their own request
      if (req.user?.rol !== 'admin' && current.usuario_id !== req.user?.id) {
        return res.status(403).json({ error: 'No tienes permisos para editar esta solicitud' });
      }

      const {
        material_nombre,
        material_descripcion,
        material_categoria,
        proveedor_sugerido,
        cantidad,
        unidad,
        proyecto_id,
        prioridad,
        fecha_necesidad,
        notas
      } = req.body;

      const newQty = cantidad !== undefined ? Number(cantidad) : current.cantidad;
      if (isNaN(newQty) || newQty <= 0) {
        return res.status(400).json({ error: 'La cantidad debe ser un número positivo' });
      }

      const newName = material_nombre !== undefined ? material_nombre.trim() : current.material_nombre;
      if (!newName) {
        return res.status(400).json({ error: 'El nombre del material es obligatorio' });
      }

      const prevVals = {
        material_nombre: current.material_nombre,
        cantidad: current.cantidad,
        unidad: current.unidad,
        prioridad: current.prioridad,
        proyecto_id: current.proyecto_id,
        notas: current.notas,
        fecha_necesidad: current.fecha_necesidad
      };

      const newVals = {
        material_nombre: newName,
        cantidad: newQty,
        unidad: unidad !== undefined ? unidad.trim() : current.unidad,
        prioridad: prioridad !== undefined ? (prioridad === 'urgente' ? 'urgente' : 'normal') : current.prioridad,
        proyecto_id: proyecto_id !== undefined ? (proyecto_id || null) : current.proyecto_id,
        notas: notas !== undefined ? (notas?.trim() || null) : current.notas,
        fecha_necesidad: fecha_necesidad !== undefined ? (fecha_necesidad?.trim() || null) : current.fecha_necesidad
      };

      const now = new Date().toISOString();

      execute(
        `UPDATE material_requests SET 
          material_nombre = ?,
          material_descripcion = ?,
          material_categoria = ?,
          proveedor_sugerido = ?,
          cantidad = ?,
          unidad = ?,
          proyecto_id = ?,
          prioridad = ?,
          fecha_necesidad = ?,
          notas = ?,
          fecha_actualizacion = ?
         WHERE id = ?`,
        [
          newVals.material_nombre,
          material_descripcion !== undefined ? (material_descripcion?.trim() || null) : current.material_descripcion,
          material_categoria !== undefined ? (material_categoria?.trim() || null) : current.material_categoria,
          proveedor_sugerido !== undefined ? (proveedor_sugerido?.trim() || null) : current.proveedor_sugerido,
          newVals.cantidad,
          newVals.unidad,
          newVals.proyecto_id,
          newVals.prioridad,
          newVals.fecha_necesidad,
          newVals.notas,
          now,
          id
        ]
      );

      // Audit history: detect differences
      const changes: string[] = [];
      if (prevVals.material_nombre !== newVals.material_nombre) changes.push(`Material: "${prevVals.material_nombre}" -> "${newVals.material_nombre}"`);
      if (prevVals.cantidad !== newVals.cantidad) changes.push(`Cantidad: ${prevVals.cantidad} -> ${newVals.cantidad}`);
      if (prevVals.unidad !== newVals.unidad) changes.push(`Unidad: ${prevVals.unidad} -> ${newVals.unidad}`);
      if (prevVals.prioridad !== newVals.prioridad) changes.push(`Prioridad: ${prevVals.prioridad} -> ${newVals.prioridad}`);
      if (prevVals.proyecto_id !== newVals.proyecto_id) changes.push(`Proyecto modificado`);
      if (prevVals.fecha_necesidad !== newVals.fecha_necesidad) changes.push(`Fecha de necesidad modificada`);

      const summaryText = changes.length > 0 
        ? `Modificado por ${req.user!.nombre} (${req.user!.rol}): ${changes.join(', ')}`
        : `Datos revisados y actualizados por ${req.user!.nombre}`;

      addRequestHistoryEntry(
        id,
        req.user!.id,
        req.user!.nombre,
        'edicion',
        summaryText,
        JSON.stringify(prevVals),
        JSON.stringify(newVals)
      );

      const updated = getMaterialRequestById(id);
      return res.json(updated);
    } catch (err: any) {
      console.error('Error editando solicitud:', err);
      return res.status(500).json({ error: 'Error al actualizar la solicitud' });
    }
  });

  // Requests: Get History
  app.get('/api/requests/:id/history', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const history = getRequestHistory(id);
      return res.json(history);
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al consultar historial de la solicitud' });
    }
  });

  // Requests: Delete
  app.delete('/api/requests/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const request = getMaterialRequestById(id);
      if (!request) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }

      // Can delete if admin or if owner and pending
      if (req.user?.rol !== 'admin' && (request.usuario_id !== req.user?.id || request.estado !== 'pendiente')) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar esta solicitud' });
      }

      execute('DELETE FROM request_history WHERE solicitud_id = ?', [id]);
      execute('DELETE FROM material_requests WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Solicitud eliminada' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al eliminar la solicitud' });
    }
  });

  // ==========================================
  // Orders (Pedidos a Distribuidores / Proveedores)
  // ==========================================

  // Orders: List
  app.get('/api/orders', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { estado, proveedor_id, proyecto_id, query } = req.query;
      const orders = getOrders({
        estado: estado as string,
        proveedor_id: proveedor_id as string,
        proyecto_id: proyecto_id as string,
        query: query as string
      });
      return res.json(orders);
    } catch (err: any) {
      console.error('Error al consultar pedidos:', err);
      return res.status(500).json({ error: 'Error al consultar pedidos' });
    }
  });

  // Orders: Get Single
  app.get('/api/orders/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const order = getOrderById(id);
      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }
      return res.json(order);
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al obtener el pedido' });
    }
  });

  // Orders: Create (Admin Only)
  app.post('/api/orders', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        solicitud_id,
        producto_id,
        producto_codigo,
        producto_nombre,
        producto_categoria,
        referencia,
        proveedor_id,
        proveedor_nombre,
        proveedor_telefono,
        proveedor_email,
        cantidad,
        unidad,
        precio_estimado,
        proyecto_id,
        proyecto_nombre,
        operario_solicitante_id,
        operario_solicitante_nombre,
        fecha_pedido,
        fecha_estimada_entrega,
        estado,
        notas,
        albaran_o_factura
      } = req.body;

      const prodName = (producto_nombre || req.body.nombre_material || '').trim();
      if (!prodName) {
        return res.status(400).json({ error: 'El nombre del producto o material pedido es obligatorio' });
      }

      const qty = Number(cantidad);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'La cantidad debe ser un número mayor a 0' });
      }

      const id = 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const orderNum = 'PED-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
      const now = new Date().toISOString();
      const orderDate = fecha_pedido?.trim() || now;
      const orderStatus = estado || 'pendiente_recibir';

      // Fetch supplier details if supplier id given
      let provName = proveedor_nombre?.trim() || null;
      let provPhone = proveedor_telefono?.trim() || null;
      let provEmail = proveedor_email?.trim() || null;
      if (proveedor_id) {
        const prov = getProviderById(proveedor_id);
        if (prov) {
          provName = prov.nombre;
          provPhone = provPhone || prov.telefono || null;
          provEmail = provEmail || prov.email || null;
        }
      }

      // Fetch project name if project id given
      let projName = proyecto_nombre?.trim() || null;
      if (proyecto_id && !projName) {
        const proj = getProjectById(proyecto_id);
        if (proj) projName = proj.nombre;
      }

      execute(
        `INSERT INTO orders (
          id, numero_pedido, solicitud_id, producto_id, producto_codigo, producto_nombre,
          producto_categoria, referencia, proveedor_id, proveedor_nombre, proveedor_telefono,
          proveedor_email, cantidad, unidad, precio_estimado, proyecto_id, proyecto_nombre,
          usuario_id, usuario_nombre, operario_solicitante_id, operario_solicitante_nombre,
          fecha_pedido, fecha_estimada_entrega, fecha_recepcion, estado, notas, albaran_o_factura,
          fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          orderNum,
          solicitud_id || null,
          producto_id || null,
          producto_codigo || null,
          prodName,
          producto_categoria?.trim() || null,
          referencia?.trim() || null,
          proveedor_id || null,
          provName,
          provPhone,
          provEmail,
          qty,
          unidad?.trim() || 'uds',
          precio_estimado ? Number(precio_estimado) : null,
          proyecto_id || null,
          projName,
          req.user!.id,
          req.user!.nombre,
          operario_solicitante_id || null,
          operario_solicitante_nombre || null,
          orderDate,
          fecha_estimada_entrega?.trim() || null,
          null,
          orderStatus,
          notas?.trim() || null,
          albaran_o_factura?.trim() || null,
          now,
          now
        ]
      );

      // If linked to a request: update request status to 'pedido_realizado' and log history!
      if (solicitud_id) {
        execute(
          `UPDATE material_requests SET estado = 'pedido_realizado', fecha_actualizacion = ? WHERE id = ?`,
          [now, solicitud_id]
        );

        addRequestHistoryEntry(
          solicitud_id,
          req.user!.id,
          req.user!.nombre,
          'pedido_creado',
          `Pedido ${orderNum} tramitado por administración al distribuidor "${provName || 'Proveedor'}". Cantidad: ${qty} ${unidad || 'uds'}.`,
          undefined,
          JSON.stringify({ numero_pedido: orderNum, cantidad: qty, proveedor: provName, precio_estimado })
        );
      }

      // If product exists, update status to 'bajo_pedido'
      if (producto_id) {
        execute(
          `UPDATE products SET estado = 'bajo_pedido' WHERE id = ?`,
          [producto_id]
        );
      }

      const created = getOrderById(id);
      return res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creando pedido:', err);
      return res.status(500).json({ error: 'Error al crear pedido' });
    }
  });

  // Orders: Update
  app.put('/api/orders/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const current = getOrderById(id);
      if (!current) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      const {
        estado,
        fecha_estimada_entrega,
        fecha_recepcion,
        proveedor_id,
        proveedor_nombre,
        proveedor_telefono,
        proveedor_email,
        referencia,
        notas,
        albaran_o_factura,
        precio_estimado,
        cantidad
      } = req.body;

      const now = new Date().toISOString();
      const newStatus = estado || current.estado;

      execute(
        `UPDATE orders SET 
          estado = ?,
          fecha_estimada_entrega = ?,
          fecha_recepcion = ?,
          proveedor_id = ?,
          proveedor_nombre = ?,
          proveedor_telefono = ?,
          proveedor_email = ?,
          referencia = ?,
          notas = ?,
          albaran_o_factura = ?,
          precio_estimado = ?,
          cantidad = ?,
          fecha_actualizacion = ?
         WHERE id = ?`,
        [
          newStatus,
          fecha_estimada_entrega !== undefined ? (fecha_estimada_entrega?.trim() || null) : current.fecha_estimada_entrega,
          fecha_recepcion !== undefined ? (fecha_recepcion?.trim() || null) : current.fecha_recepcion,
          proveedor_id !== undefined ? (proveedor_id || null) : current.proveedor_id,
          proveedor_nombre !== undefined ? (proveedor_nombre?.trim() || null) : current.proveedor_nombre,
          proveedor_telefono !== undefined ? (proveedor_telefono?.trim() || null) : current.proveedor_telefono,
          proveedor_email !== undefined ? (proveedor_email?.trim() || null) : current.proveedor_email,
          referencia !== undefined ? (referencia?.trim() || null) : current.referencia,
          notas !== undefined ? (notas?.trim() || null) : current.notas,
          albaran_o_factura !== undefined ? (albaran_o_factura?.trim() || null) : current.albaran_o_factura,
          precio_estimado !== undefined ? (precio_estimado ? Number(precio_estimado) : null) : current.precio_estimado,
          cantidad !== undefined ? Number(cantidad) : current.cantidad,
          now,
          id
        ]
      );

      // If status changed and linked to request, update request history
      if (current.solicitud_id && newStatus !== current.estado) {
        addRequestHistoryEntry(
          current.solicitud_id,
          req.user!.id,
          req.user!.nombre,
          'cambio_estado',
          `Estado del pedido ${current.numero_pedido} actualizado a "${newStatus}".`,
          JSON.stringify({ estado: current.estado }),
          JSON.stringify({ estado: newStatus })
        );
      }

      const updated = getOrderById(id);
      return res.json(updated);
    } catch (err: any) {
      console.error('Error actualizando pedido:', err);
      return res.status(500).json({ error: 'Error al actualizar pedido' });
    }
  });

  // Orders: Receive Order into Stock & Catalog
  // "Cuando este pedido se registre como nueva entrada pasara al apartado de productos y se podra catalogar."
  app.post('/api/orders/:id/receive', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const order = getOrderById(id);
      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      const {
        codigo_producto,
        categoria_producto,
        stock_minimo,
        descripcion_producto,
        albaran
      } = req.body;

      const now = new Date().toISOString();
      let targetProductId = order.producto_id;
      let targetProductCode = order.producto_codigo;

      // If product does not yet exist in catalog, create it now!
      if (!targetProductId) {
        // Generate product code if not supplied
        const generatedCode = codigo_producto?.trim()?.toUpperCase() || 
          ('PRD-' + Math.floor(1000 + Math.random() * 9000));

        // Check if code exists
        const existingProd = queryOne('SELECT id FROM products WHERE LOWER(codigo) = LOWER(?)', [generatedCode]);
        if (existingProd) {
          targetProductId = existingProd.id;
          targetProductCode = generatedCode;
        } else {
          const newProdId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
          const minStock = stock_minimo ? Number(stock_minimo) : 5;

          execute(
            `INSERT INTO products (
              id, codigo, referencia, nombre, descripcion, imagen_url, categoria, stock_minimo, estado, proveedor_id, proyecto_id, fecha_creacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newProdId,
              generatedCode,
              order.referencia || null,
              order.producto_nombre,
              descripcion_producto?.trim() || order.notas || null,
              null,
              categoria_producto?.trim() || order.producto_categoria || 'General',
              minStock,
              'activo',
              order.proveedor_id || null,
              order.proyecto_id || null,
              now
            ]
          );

          targetProductId = newProdId;
          targetProductCode = generatedCode;
        }
      } else {
        // Mark product status as active
        execute(`UPDATE products SET estado = 'activo' WHERE id = ?`, [targetProductId]);
      }

      // Register an "entrada" movement in warehouse for the received items
      const movementId = 'mov-ent-' + Date.now();
      const movementObs = `Entrada por recepción de pedido ${order.numero_pedido}${albaran ? ` (Albarán: ${albaran})` : ''} de proveedor ${order.proveedor_nombre || 'distribuidor'}`;

      execute(
        `INSERT INTO movements (id, producto_id, tipo, cantidad, fecha, usuario_id, proyecto_id, observaciones)
         VALUES (?, ?, 'entrada', ?, ?, ?, ?, ?)`,
        [
          movementId,
          targetProductId,
          order.cantidad,
          now,
          req.user!.id,
          order.proyecto_id || null,
          movementObs
        ]
      );

      // Update order status to 'recibido'
      execute(
        `UPDATE orders SET 
          estado = 'recibido',
          producto_id = ?,
          producto_codigo = ?,
          fecha_recepcion = ?,
          albaran_o_factura = COALESCE(?, albaran_o_factura),
          fecha_actualizacion = ?
         WHERE id = ?`,
        [
          targetProductId,
          targetProductCode,
          now,
          albaran?.trim() || null,
          now,
          id
        ]
      );

      // If linked to a request, advance request to 'preparado' and log history!
      if (order.solicitud_id) {
        execute(
          `UPDATE material_requests SET 
            estado = 'preparado', 
            producto_id = ?, 
            resolucion_notas = 'Material recibido de distribuidor y catalogado en stock. Listo para carga.',
            fecha_actualizacion = ? 
           WHERE id = ?`,
          [targetProductId, now, order.solicitud_id]
        );

        addRequestHistoryEntry(
          order.solicitud_id,
          req.user!.id,
          req.user!.nombre,
          'cambio_estado',
          `Material recibido en almacén mediante pedido ${order.numero_pedido}. Entrada registrada (+${order.cantidad} ${order.unidad}) y catalogado con código ${targetProductCode}.`,
          JSON.stringify({ estado: 'pedido_realizado' }),
          JSON.stringify({ estado: 'preparado', producto_codigo: targetProductCode })
        );
      }

      const updatedOrder = getOrderById(id);
      const catalogedProduct = getProductById(targetProductId);

      return res.json({
        success: true,
        order: updatedOrder,
        product: catalogedProduct,
        message: `Pedido ${order.numero_pedido} recibido. Se ha registrado una entrada de ${order.cantidad} ${order.unidad} y el producto está catalogado en stock.`
      });
    } catch (err: any) {
      console.error('Error al recepcionar pedido:', err);
      return res.status(500).json({ error: 'Error al recepcionar pedido en stock' });
    }
  });

  // Orders: Delete
  app.delete('/api/orders/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const order = getOrderById(id);
      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      execute('DELETE FROM orders WHERE id = ?', [id]);
      return res.json({ success: true, message: `Pedido ${order.numero_pedido} eliminado.` });
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al eliminar pedido' });
    }
  });

  // Download SQLite database backup file
  app.get('/api/backup/download', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const dbPath = path.join(process.cwd(), 'data', 'reformas.sqlite');
      if (fs.existsSync(dbPath)) {
        res.setHeader('Content-Disposition', 'attachment; filename="reformas.sqlite"');
        res.setHeader('Content-Type', 'application/x-sqlite3');
        return res.sendFile(dbPath);
      }
      return res.status(404).json({ error: 'Archivo de base de datos no encontrado' });
    } catch (err: any) {
      console.error('Error enviando backup:', err);
      return res.status(500).json({ error: 'Error al descargar copia de seguridad' });
    }
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Control de Stock corriendo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error al arrancar el servidor:', err);
  process.exit(1);
});
