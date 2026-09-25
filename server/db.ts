import initSqlJs, { Database } from 'sql.js';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { hashPassword } from './auth';
import { Product, Movement, Project, Provider, User, DashboardStats, MaterialRequest, Order, RequestHistoryEntry } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'reformas.sqlite');
const USE_POSTGRES = Boolean(process.env.DATABASE_URL);

let db: Database | null = null;
let pgPool: Pool | null = null;

function normalizeSqlForPostgres(sql: string, params: any[] = []): string {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

async function runSql(sql: string, params: any[] = []): Promise<any> {
  if (USE_POSTGRES && pgPool) {
    return pgPool.query(normalizeSqlForPostgres(sql, params), params);
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  return db.run(sql, params);
}

async function queryAllRows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (USE_POSTGRES && pgPool) {
    const { rows } = await pgPool.query(normalizeSqlForPostgres(sql, params), params);
    return rows as T[];
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

async function querySingleRow<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryAllRows<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function initDatabase(): Promise<Database | null> {
  if (db || pgPool) return db;

  if (USE_POSTGRES) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
    });

    await createTables();
    await seedInitialData();
    await ensureDefaultUsers();
    await ensureDefaultCategories();
    return null;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      console.log('Base de datos SQLite cargada desde:', DB_PATH);
    } catch (e) {
      console.warn('Error leyendo archivo SQLite existente, creando nueva base de datos', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('Nueva base de datos SQLite inicializada');
  }

  await createTables();
  await seedInitialData();
  await ensureDefaultUsers();
  await ensureDefaultCategories();
  persistDatabase();

  return db;
}

export function persistDatabase() {
  if (USE_POSTGRES || !db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Error persistiendo SQLite en disco:', err);
  }
}

async function createTables() {
  if (USE_POSTGRES && pgPool) {
    await runSql(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL,
        fecha_creacion TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        contacto TEXT,
        email TEXT,
        telefono TEXT,
        direccion TEXT,
        logo_url TEXT
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        cliente TEXT NOT NULL,
        direccion TEXT,
        estado TEXT NOT NULL DEFAULT 'activo',
        fecha_creacion TEXT NOT NULL,
        fecha_inicio TEXT,
        fecha_fin TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        nombre TEXT UNIQUE NOT NULL,
        descripcion TEXT,
        nomenclatura TEXT,
        orden INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        codigo TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        imagen_url TEXT,
        categoria TEXT NOT NULL,
        stock_minimo INTEGER NOT NULL DEFAULT 5,
        stock_fuera_almacen REAL NOT NULL DEFAULT 0,
        proveedor_id TEXT,
        proyecto_id TEXT,
        fecha_creacion TEXT NOT NULL,
        referencia TEXT,
        estado TEXT DEFAULT 'activo',
        FOREIGN KEY (proveedor_id) REFERENCES providers(id),
        FOREIGN KEY (proyecto_id) REFERENCES projects(id)
      );

      CREATE TABLE IF NOT EXISTS movements (
        id TEXT PRIMARY KEY,
        producto_id TEXT NOT NULL,
        tipo TEXT NOT NULL,
        cantidad INTEGER NOT NULL,
        fecha TEXT NOT NULL,
        usuario_id TEXT NOT NULL,
        proyecto_id TEXT,
        observaciones TEXT,
        FOREIGN KEY (producto_id) REFERENCES products(id),
        FOREIGN KEY (usuario_id) REFERENCES users(id),
        FOREIGN KEY (proyecto_id) REFERENCES projects(id)
      );

      CREATE TABLE IF NOT EXISTS material_requests (
        id TEXT PRIMARY KEY,
        tipo_solicitud TEXT NOT NULL,
        es_material_nuevo INTEGER NOT NULL DEFAULT 0,
        producto_id TEXT,
        material_nombre TEXT NOT NULL,
        material_descripcion TEXT,
        material_categoria TEXT,
        proveedor_sugerido TEXT,
        cantidad REAL NOT NULL,
        cantidad_recibida REAL NOT NULL DEFAULT 0,
        cantidad_adjudicada REAL NOT NULL DEFAULT 0,
        cantidad_almacen REAL NOT NULL DEFAULT 0,
        unidad TEXT NOT NULL DEFAULT 'uds',
        proyecto_id TEXT,
        usuario_id TEXT NOT NULL,
        prioridad TEXT NOT NULL DEFAULT 'normal',
        fecha_solicitud TEXT NOT NULL,
        fecha_necesidad TEXT,
        notas TEXT,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        resolucion_notas TEXT,
        fecha_actualizacion TEXT NOT NULL,
        FOREIGN KEY (producto_id) REFERENCES products(id),
        FOREIGN KEY (usuario_id) REFERENCES users(id),
        FOREIGN KEY (proyecto_id) REFERENCES projects(id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        numero_pedido TEXT UNIQUE NOT NULL,
        solicitud_id TEXT,
        producto_id TEXT,
        producto_codigo TEXT,
        producto_nombre TEXT NOT NULL,
        producto_categoria TEXT,
        referencia TEXT,
        proveedor_id TEXT,
        proveedor_nombre TEXT,
        proveedor_telefono TEXT,
        proveedor_email TEXT,
        cantidad REAL NOT NULL,
        unidad TEXT NOT NULL DEFAULT 'uds',
        precio_estimado REAL,
        proyecto_id TEXT,
        proyecto_nombre TEXT,
        usuario_id TEXT NOT NULL,
        usuario_nombre TEXT,
        operario_solicitante_id TEXT,
        operario_solicitante_nombre TEXT,
        fecha_pedido TEXT NOT NULL,
        fecha_estimada_entrega TEXT,
        fecha_recepcion TEXT,
        estado TEXT NOT NULL DEFAULT 'pedido',
        notas TEXT,
        albaran_o_factura TEXT,
        fecha_creacion TEXT NOT NULL,
        fecha_actualizacion TEXT NOT NULL,
        FOREIGN KEY (solicitud_id) REFERENCES material_requests(id),
        FOREIGN KEY (producto_id) REFERENCES products(id),
        FOREIGN KEY (proveedor_id) REFERENCES providers(id),
        FOREIGN KEY (proyecto_id) REFERENCES projects(id),
        FOREIGN KEY (usuario_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS request_history (
        id TEXT PRIMARY KEY,
        solicitud_id TEXT NOT NULL,
        usuario_id TEXT NOT NULL,
        usuario_nombre TEXT NOT NULL,
        accion TEXT NOT NULL,
        detalles TEXT NOT NULL,
        valores_anteriores TEXT,
        valores_nuevos TEXT,
        fecha TEXT NOT NULL,
        FOREIGN KEY (solicitud_id) REFERENCES material_requests(id)
      );

      CREATE INDEX IF NOT EXISTS idx_products_codigo ON products(codigo);
      CREATE INDEX IF NOT EXISTS idx_movements_producto ON movements(producto_id);
      CREATE INDEX IF NOT EXISTS idx_movements_proyecto ON movements(proyecto_id);
      CREATE INDEX IF NOT EXISTS idx_requests_estado ON material_requests(estado);
      CREATE INDEX IF NOT EXISTS idx_requests_usuario ON material_requests(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_requests_proyecto ON material_requests(proyecto_id);
      CREATE INDEX IF NOT EXISTS idx_orders_estado ON orders(estado);
      CREATE INDEX IF NOT EXISTS idx_orders_solicitud ON orders(solicitud_id);
      CREATE INDEX IF NOT EXISTS idx_orders_producto ON orders(producto_id);
      CREATE INDEX IF NOT EXISTS idx_req_history_solicitud ON request_history(solicitud_id);
    `);
    return;
  }

  if (!db) throw new Error('SQLite database unavailable');
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL,
      fecha_creacion TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      contacto TEXT,
      email TEXT,
      telefono TEXT,
      direccion TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      cliente TEXT NOT NULL,
      direccion TEXT,
      estado TEXT NOT NULL DEFAULT 'activo',
      fecha_creacion TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      nombre TEXT UNIQUE NOT NULL,
      descripcion TEXT,
      nomenclatura TEXT,
      orden INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      codigo TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      imagen_url TEXT,
      categoria TEXT NOT NULL,
      stock_minimo INTEGER NOT NULL DEFAULT 5,
      proveedor_id TEXT,
      proyecto_id TEXT,
      fecha_creacion TEXT NOT NULL,
      FOREIGN KEY (proveedor_id) REFERENCES providers(id),
      FOREIGN KEY (proyecto_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS movements (
      id TEXT PRIMARY KEY,
      producto_id TEXT NOT NULL,
      tipo TEXT NOT NULL, -- 'entrada', 'salida', 'reserva'
      cantidad INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      proyecto_id TEXT,
      observaciones TEXT,
      FOREIGN KEY (producto_id) REFERENCES products(id),
      FOREIGN KEY (usuario_id) REFERENCES users(id),
      FOREIGN KEY (proyecto_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS material_requests (
      id TEXT PRIMARY KEY,
      tipo_solicitud TEXT NOT NULL, -- 'preparar_carga' | 'pedido_material'
      es_material_nuevo INTEGER NOT NULL DEFAULT 0,
      producto_id TEXT,
      material_nombre TEXT NOT NULL,
      material_descripcion TEXT,
      material_categoria TEXT,
      proveedor_sugerido TEXT,
      cantidad REAL NOT NULL,
      unidad TEXT NOT NULL DEFAULT 'uds',
      proyecto_id TEXT,
      usuario_id TEXT NOT NULL,
      prioridad TEXT NOT NULL DEFAULT 'normal', -- 'normal' | 'urgente'
      fecha_solicitud TEXT NOT NULL,
      fecha_necesidad TEXT,
      notas TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'en_preparacion' | 'preparado' | 'pedido_realizado' | 'entregado' | 'rechazado'
      resolucion_notas TEXT,
      fecha_actualizacion TEXT NOT NULL,
      FOREIGN KEY (producto_id) REFERENCES products(id),
      FOREIGN KEY (usuario_id) REFERENCES users(id),
      FOREIGN KEY (proyecto_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      numero_pedido TEXT UNIQUE NOT NULL,
      solicitud_id TEXT,
      producto_id TEXT,
      producto_codigo TEXT,
      producto_nombre TEXT NOT NULL,
      producto_categoria TEXT,
      referencia TEXT,
      proveedor_id TEXT,
      proveedor_nombre TEXT,
      proveedor_telefono TEXT,
      proveedor_email TEXT,
      cantidad REAL NOT NULL,
      unidad TEXT NOT NULL DEFAULT 'uds',
      precio_estimado REAL,
      proyecto_id TEXT,
      proyecto_nombre TEXT,
      usuario_id TEXT NOT NULL,
      usuario_nombre TEXT,
      operario_solicitante_id TEXT,
      operario_solicitante_nombre TEXT,
      fecha_pedido TEXT NOT NULL,
      fecha_estimada_entrega TEXT,
      fecha_recepcion TEXT,
      estado TEXT NOT NULL DEFAULT 'pedido', -- 'pendiente' | 'pedido' | 'en_camino' | 'recibido' | 'cancelado'
      notas TEXT,
      albaran_o_factura TEXT,
      fecha_creacion TEXT NOT NULL,
      fecha_actualizacion TEXT NOT NULL,
      FOREIGN KEY (solicitud_id) REFERENCES material_requests(id),
      FOREIGN KEY (producto_id) REFERENCES products(id),
      FOREIGN KEY (proveedor_id) REFERENCES providers(id),
      FOREIGN KEY (proyecto_id) REFERENCES projects(id),
      FOREIGN KEY (usuario_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS request_history (
      id TEXT PRIMARY KEY,
      solicitud_id TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      usuario_nombre TEXT NOT NULL,
      accion TEXT NOT NULL, -- 'creacion' | 'edicion' | 'cambio_estado' | 'pedido_creado'
      detalles TEXT NOT NULL,
      valores_anteriores TEXT,
      valores_nuevos TEXT,
      fecha TEXT NOT NULL,
      FOREIGN KEY (solicitud_id) REFERENCES material_requests(id)
    );

    CREATE INDEX IF NOT EXISTS idx_products_codigo ON products(codigo);
    CREATE INDEX IF NOT EXISTS idx_movements_producto ON movements(producto_id);
    CREATE INDEX IF NOT EXISTS idx_movements_proyecto ON movements(proyecto_id);
    CREATE INDEX IF NOT EXISTS idx_requests_estado ON material_requests(estado);
    CREATE INDEX IF NOT EXISTS idx_requests_usuario ON material_requests(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_requests_proyecto ON material_requests(proyecto_id);
    CREATE INDEX IF NOT EXISTS idx_orders_estado ON orders(estado);
    CREATE INDEX IF NOT EXISTS idx_orders_solicitud ON orders(solicitud_id);
    CREATE INDEX IF NOT EXISTS idx_orders_producto ON orders(producto_id);
    CREATE INDEX IF NOT EXISTS idx_req_history_solicitud ON request_history(solicitud_id);
  `);

  try { db.run("ALTER TABLE providers ADD COLUMN direccion TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE providers ADD COLUMN logo_url TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE projects ADD COLUMN fecha_inicio TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE projects ADD COLUMN fecha_fin TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE products ADD COLUMN referencia TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE products ADD COLUMN estado TEXT DEFAULT 'activo'"); } catch (e) {}
  try { await runSql("ALTER TABLE products ADD COLUMN stock_fuera_almacen REAL NOT NULL DEFAULT 0"); } catch (e) {}
  try { await runSql("ALTER TABLE orders ADD COLUMN cantidad_recibida REAL NOT NULL DEFAULT 0"); } catch (e) {}
  try { await runSql("ALTER TABLE orders ADD COLUMN cantidad_adjudicada REAL NOT NULL DEFAULT 0"); } catch (e) {}
  try { await runSql("ALTER TABLE orders ADD COLUMN cantidad_almacen REAL NOT NULL DEFAULT 0"); } catch (e) {}
  try { db.run("ALTER TABLE categories ADD COLUMN nomenclatura TEXT"); } catch (e) {}
}

async function seedInitialData() {
  // Check if users exist
  const userCountRow = await querySingleRow<{ count: number }>('SELECT COUNT(*) as count FROM users');
  const userCount = Number(userCountRow?.count ?? 0);

  if (userCount === 0) {
    console.log('Sembrando datos iniciales en la base de datos SQLite...');

    // 1. Usuarios
    const adminPass = hashPassword('admin123');
    const operarioPass = hashPassword('operario123');

    await runSql(
      `INSERT INTO users (id, nombre, email, password_hash, rol, fecha_creacion) VALUES 
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?)`,
      [
        'usr-admin-1', 'Antonio Ruiz (Jefe Almacén)', 'admin@reformas.com', adminPass, 'admin', '2025-01-10T08:00:00.000Z',
        'usr-oper-1', 'Carlos Obrero (Instalador)', 'carlos@reformas.com', operarioPass, 'operario', '2025-01-12T09:00:00.000Z',
        'usr-oper-2', 'Laura Fontanera (Oficial)', 'laura@reformas.com', operarioPass, 'operario', '2025-01-15T10:00:00.000Z'
      ]
    );

    // 2. Proveedores
    await runSql(
      `INSERT INTO providers (id, nombre, contacto, email, telefono) VALUES
      (?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?)`,
      [
        'prov-1', 'Suministros BricoPro Madrid', 'Manuel García', 'ventas@bricopro.es', '+34 912 345 678',
        'prov-2', 'Herramientas Industriales Bosch & DeWalt', 'Sonia López', 'pedidos@herramientasind.com', '+34 913 987 654',
        'prov-3', 'Saneamientos & Fontanería Express', 'Javier Ramos', 'contacto@saneamientosexpress.com', '+34 914 112 233',
        'prov-4', 'Pinturas y Revestimientos ProCoat', 'Marta Beltrán', 'info@procoat.es', '+34 915 445 566'
      ]
    );

    // 3. Proyectos
    await runSql(
      `INSERT INTO projects (id, nombre, cliente, direccion, estado, fecha_creacion) VALUES
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?)`,
      [
        'proj-1', 'Reforma Integral Ático Chamberí', 'Carlos Mendoza', 'C/ Santa Engracia 42, Ático B, Madrid', 'activo', '2025-02-01T10:00:00.000Z',
        'proj-2', 'Renovación Baños & Cocina Mayor', 'Elena Rostova', 'C/ Mayor 18, 3º Izq, Madrid', 'activo', '2025-02-15T11:00:00.000Z',
        'proj-3', 'Habilitación Local Comercial Serrano', 'Retail Innova S.L.', 'C/ Serrano 88, Bajo, Madrid', 'activo', '2025-02-20T08:30:00.000Z',
        'proj-4', 'Rehabilitación Fachada Retiro', 'Comunidad Propietarios Alcalá 120', 'C/ Alcalá 120, Madrid', 'finalizado', '2025-01-05T09:00:00.000Z'
      ]
    );

    // 4. Productos
    await runSql(
      `INSERT INTO products (id, codigo, nombre, descripcion, imagen_url, categoria, stock_minimo, proveedor_id, proyecto_id, fecha_creacion) VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'prod-1', 'MAT-001', 'Cemento Gris Portland 25kg', 'Saco de cemento gris de alta resistencia para albañilería general.', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80', 'Materiales', 15, 'prov-1', null, '2025-01-15T10:00:00.000Z',
        'prod-2', 'MAT-002', 'Placa Yeso Laminado 250x120cm', 'Placa estándar 13mm para tabiquería y trasdosados.', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80', 'Materiales', 20, 'prov-1', null, '2025-01-16T10:00:00.000Z',
        'prod-3', 'HER-010', 'Taladro Percutor Batería 18V', 'Taladro percutor brushless con 2 baterías 4Ah y maletín.', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80', 'Herramientas', 3, 'prov-2', null, '2025-01-18T10:00:00.000Z',
        'prod-4', 'HER-015', 'Sierra Circular 165mm', 'Sierra circular inalámbrica de corte recto preciso para madera.', 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&q=80', 'Herramientas', 2, 'prov-2', null, '2025-01-18T10:00:00.000Z',
        'prod-5', 'FON-003', 'Tubo Cobre Sanitario 15mm (2.5m)', 'Tubo de cobre rígido para instalaciones de fontanería y calefacción.', 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&q=80', 'Fontanería', 12, 'prov-3', null, '2025-01-20T10:00:00.000Z',
        'prod-6', 'PIN-001', 'Pintura Plástica Mate Blanco 15L', 'Pintura plástica lavable de alta cubrición antimanchas.', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80', 'Pintura', 8, 'prov-4', null, '2025-01-22T10:00:00.000Z',
        'prod-7', 'ELE-008', 'Foco LED Empotrable 18W Blanco', 'Downlight LED circular 4000K luz neutra para falso techo.', 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=400&q=80', 'Electricidad', 25, 'prov-1', null, '2025-01-24T10:00:00.000Z',
        'prod-8', 'PAR-022', 'Suelo Laminado AC5 Roble m²', 'Cajas de tarima flotante resistente al agua AC5 8mm.', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80', 'Muebles y Carpintería', 30, 'prov-1', 'proj-1', '2025-01-25T10:00:00.000Z'
      ]
    );

    // 5. Movimientos iniciales para generar stock
    // Entradas
    const initialMoves = [
      ['mov-1', 'prod-1', 'entrada', 40, '2025-02-01T08:00:00.000Z', 'usr-admin-1', null, 'Carga inicial almacén'],
      ['mov-2', 'prod-2', 'entrada', 50, '2025-02-01T08:15:00.000Z', 'usr-admin-1', null, 'Recepción pedido BricoPro'],
      ['mov-3', 'prod-3', 'entrada', 5,  '2025-02-01T08:30:00.000Z', 'usr-admin-1', null, 'Equipamiento nuevo taller'],
      ['mov-4', 'prod-4', 'entrada', 3,  '2025-02-01T08:45:00.000Z', 'usr-admin-1', null, 'Compra herramientas Bosch'],
      ['mov-5', 'prod-5', 'entrada', 25, '2025-02-02T09:00:00.000Z', 'usr-admin-1', null, 'Stock fontanería cobre'],
      ['mov-6', 'prod-6', 'entrada', 15, '2025-02-02T09:30:00.000Z', 'usr-admin-1', null, 'Recepción botes ProCoat'],
      ['mov-7', 'prod-7', 'entrada', 60, '2025-02-02T10:00:00.000Z', 'usr-admin-1', null, 'Lote downlights LED'],
      ['mov-8', 'prod-8', 'entrada', 45, '2025-02-03T11:00:00.000Z', 'usr-admin-1', 'proj-1', 'Tarima específica para Reforma Chamberí'],

      // Salidas a proyectos (reduciendo stock)
      ['mov-9', 'prod-1', 'salida', 28, '2025-02-10T09:00:00.000Z', 'usr-oper-1', 'proj-1', 'Hormigonado solera baño'],
      ['mov-10', 'prod-2', 'salida', 35, '2025-02-11T10:30:00.000Z', 'usr-oper-1', 'proj-1', 'Montaje tabiques habitación'],
      ['mov-11', 'prod-5', 'salida', 18, '2025-02-12T14:00:00.000Z', 'usr-oper-2', 'proj-2', 'Tendido tuberías cocina y baño'],
      ['mov-12', 'prod-6', 'salida', 10, '2025-02-14T11:00:00.000Z', 'usr-oper-1', 'proj-2', 'Primera mano imprimación techos'],
      ['mov-13', 'prod-3', 'salida', 2,  '2025-02-15T08:30:00.000Z', 'usr-oper-1', 'proj-3', 'Dotación herramientas a pie de obra'],

      // Reservas (reducen disponible pero quedan en reserva física)
      ['mov-14', 'prod-1', 'reserva', 8, '2025-02-20T16:00:00.000Z', 'usr-oper-2', 'proj-3', 'Apartado para enfoscado local comercial'],
      ['mov-15', 'prod-7', 'reserva', 40, '2025-02-22T12:00:00.000Z', 'usr-oper-1', 'proj-3', 'Reserva iluminación completa local']
    ];

    for (const m of initialMoves) {
      await runSql(
        `INSERT INTO movements (id, producto_id, tipo, cantidad, fecha, usuario_id, proyecto_id, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        m
      );
    }

    console.log('Semillas creadas con éxito');
  }

  // Check if material_requests exist independently
  const reqCountRow = await querySingleRow<{ count: number }>('SELECT COUNT(*) as count FROM material_requests');
  const reqCount = Number(reqCountRow?.count ?? 0);

  if (reqCount === 0) {
    const sampleRequests = [
      [
        'req-1',
        'preparar_carga',
        0,
        'prod-2',
        'Placa Yeso Laminado 250x120cm',
        'Placas de 13mm para trasdosados de la planta alta',
        'Materiales',
        'Suministros BricoPro Madrid',
        8,
        'placas',
        'proj-1',
        'usr-oper-1',
        'urgente',
        new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        new Date(Date.now() + 3600 * 1000 * 18).toISOString(),
        'Dejar preparado en el muelle de carga antes de las 08:00 para la furgoneta #2.',
        'pendiente',
        null,
        new Date(Date.now() - 3600 * 1000 * 4).toISOString()
      ],
      [
        'req-2',
        'pedido_material',
        1,
        null,
        'Grifo Monomando Ducha Negro Mate Termostático',
        'Modelo empotrado termostático con rociador 25cm antical. El cliente no quiere el cromado estándar.',
        'Fontanería',
        'Saneamientos & Fontanería Express',
        2,
        'conjuntos',
        'proj-2',
        'usr-oper-2',
        'normal',
        new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        new Date(Date.now() + 3600 * 1000 * 72).toISOString(),
        'Material nuevo especial para la reforma de Baños Mayor. Necesitamos pedirlo al distribuidor.',
        'pendiente',
        null,
        new Date(Date.now() - 3600 * 1000 * 12).toISOString()
      ],
      [
        'req-3',
        'preparar_carga',
        0,
        'prod-7',
        'Foco LED Empotrable 18W Blanco',
        'Downlight circular 4000K para techo técnico',
        'Electricidad',
        'Suministros BricoPro Madrid',
        12,
        'uds',
        'proj-3',
        'usr-oper-1',
        'normal',
        new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
        new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
        'Para el montaje del falso techo del local comercial.',
        'en_preparacion',
        'Preparando lote en palé #2 por Antonio Ruiz',
        new Date(Date.now() - 3600 * 1000 * 2).toISOString()
      ],
      [
        'req-4',
        'pedido_material',
        1,
        null,
        'Canaleta Pasacables Pisable 75mm Gris',
        'Canaleta curvada de alta resistencia para suelo técnico sin rozas',
        'Electricidad',
        'Suministros BricoPro Madrid',
        6,
        'tiras 2m',
        'proj-3',
        'usr-oper-2',
        'normal',
        new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
        null,
        'Necesario para conectar islas de puestos de trabajo sin rozas.',
        'pedido_realizado',
        'Tramitado con BricoPro, entrega confirmada para el jueves',
        new Date(Date.now() - 3600 * 1000 * 20).toISOString()
      ]
    ];

    for (const r of sampleRequests) {
      await runSql(
        `INSERT INTO material_requests 
         (id, tipo_solicitud, es_material_nuevo, producto_id, material_nombre, material_descripcion, material_categoria, proveedor_sugerido, cantidad, unidad, proyecto_id, usuario_id, prioridad, fecha_solicitud, fecha_necesidad, notas, estado, resolucion_notas, fecha_actualizacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r
      );
    }
  }

  // Check if orders exist
  const orderCountRow = await querySingleRow<{ count: number }>('SELECT COUNT(*) as count FROM orders');
  const orderCount = Number(orderCountRow?.count ?? 0);

  if (orderCount === 0) {
    const sampleOrders = [
      [
        'ord-1',
        'PED-2026-001',
        'req-4',
        null,
        null,
        'Canaleta Pasacables Pisable 75mm Gris',
        'Electricidad',
        'REF-CAN-75G',
        'prov-1',
        'Suministros BricoPro Madrid',
        '+34 912 345 678',
        'ventas@bricopro.es',
        6,
        'tiras 2m',
        42.50,
        'proj-3',
        'Adecuación Local Comercial',
        'usr-admin-1',
        'Adminsuiteak',
        'usr-oper-2',
        'Laura Fontanera (Oficial)',
        new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
        new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
        null,
        'en_camino',
        'Envío confirmado con número de seguimiento DHL-ES-98124.',
        'ALB-2026-9921',
        new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
        new Date(Date.now() - 3600 * 1000 * 20).toISOString()
      ],
      [
        'ord-2',
        'PED-2026-002',
        'req-2',
        null,
        null,
        'Grifo Monomando Ducha Negro Mate Termostático',
        'Fontanería',
        'REF-GRIF-NM-25',
        'prov-3',
        'Saneamientos & Fontanería Express',
        '+34 914 112 233',
        'contacto@saneamientosexpress.com',
        2,
        'conjuntos',
        189.90,
        'proj-2',
        'Reforma Integral Baños Mayor',
        'usr-admin-1',
        'Adminsuiteak',
        'usr-oper-2',
        'Laura Fontanera (Oficial)',
        new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
        new Date(Date.now() + 3600 * 1000 * 48).toISOString(),
        null,
        'pedido',
        'Pedido realizado al distribuidor. Pendiente de recepción en almacén para catalogación.',
        null,
        new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
        new Date(Date.now() - 3600 * 1000 * 8).toISOString()
      ]
    ];

    for (const o of sampleOrders) {
      await runSql(
        `INSERT INTO orders (
          id, numero_pedido, solicitud_id, producto_id, producto_codigo, producto_nombre,
          producto_categoria, referencia, proveedor_id, proveedor_nombre, proveedor_telefono,
          proveedor_email, cantidad, unidad, precio_estimado, proyecto_id, proyecto_nombre,
          usuario_id, usuario_nombre, operario_solicitante_id, operario_solicitante_nombre,
          fecha_pedido, fecha_estimada_entrega, fecha_recepcion, estado, notas, albaran_o_factura,
          fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        o
      );
    }
  }
}

async function ensureDefaultUsers() {
  const adminPass = hashPassword('12345');
  
  // Find if an admin or Adminsuiteak user exists
  const existingAdmin = await querySingleRow<any>(
    `SELECT * FROM users WHERE rol = 'admin' OR LOWER(nombre) = 'adminsuiteak' OR LOWER(email) = 'admin@suiteak.com' OR LOWER(email) = 'admin@reformas.com' LIMIT 1`
  );

  if (existingAdmin) {
    await runSql(
      `UPDATE users SET nombre = 'Adminsuiteak', email = 'admin@suiteak.com', password_hash = ?, rol = 'admin' WHERE id = ?`,
      [adminPass, existingAdmin.id]
    );
  } else {
    await runSql(
      `INSERT INTO users (id, nombre, email, password_hash, rol, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?)`,
      ['usr-admin-1', 'Adminsuiteak', 'admin@suiteak.com', adminPass, 'admin', new Date().toISOString()]
    );
  }
}

async function ensureDefaultCategories() {
  const defaultCats = [
    { nombre: 'Materiales', nomenclatura: 'MAT', descripcion: 'Cemento, áridos, yesos, aislamientos y ladrillos' },
    { nombre: 'Herramientas', nomenclatura: 'HER', descripcion: 'Maquinaria electroportátil, manual y accesorios' },
    { nombre: 'Fontanería', nomenclatura: 'FON', descripcion: 'Tuberías, accesorios de cobre/PVC, sanitarios y grifería' },
    { nombre: 'Electricidad', nomenclatura: 'ELE', descripcion: 'Cableado, mecanismos, iluminación LED y cuadros' },
    { nombre: 'Pintura', nomenclatura: 'PIN', descripcion: 'Pinturas plásticas, esmaltes, masillas e imprimaciones' },
    { nombre: 'Muebles y Carpintería', nomenclatura: 'MYC', descripcion: 'Puertas, tarimas, rodapiés y carpintería a medida' },
    { nombre: 'Protección y Seguridad', nomenclatura: 'SEG', descripcion: 'EPIs, calzado, señalización, guantes y líneas de vida' },
    { nombre: 'Ferretería General', nomenclatura: 'FER', descripcion: 'Tornillería, fijaciones, tacos, cerraduras y consumibles' },
    { nombre: 'Otra categoría', nomenclatura: 'OTR', descripcion: 'Otras categorías y productos varios' }
  ];

  for (let i = 0; i < defaultCats.length; i++) {
    const cat = defaultCats[i];
    const exists = await querySingleRow<any>('SELECT id, nomenclatura FROM categories WHERE LOWER(TRIM(nombre)) = LOWER(?)', [cat.nombre.trim()]);
    if (!exists) {
      await runSql(
        'INSERT INTO categories (id, nombre, descripcion, nomenclatura, orden) VALUES (?, ?, ?, ?, ?)',
        [`cat-${Date.now()}-${i}`, cat.nombre.trim(), cat.descripcion, cat.nomenclatura, i]
      );
    } else if (!exists.nomenclatura || exists.nomenclatura.trim() === '') {
      await runSql('UPDATE categories SET nomenclatura = ? WHERE id = ?', [cat.nomenclatura, exists.id]);
    }
  }

  // Also import any distinct categories already in products table
  try {
    const prodCats = await queryAllRows<{ categoria: string }>('SELECT DISTINCT categoria FROM products WHERE categoria IS NOT NULL');
    for (let j = 0; j < prodCats.length; j++) {
      const trimmed = prodCats[j].categoria?.trim();
      if (trimmed) {
        const exists = await querySingleRow<any>('SELECT id, nomenclatura FROM categories WHERE LOWER(TRIM(nombre)) = LOWER(?)', [trimmed]);
        if (!exists) {
          const autoPrefix = trimmed.length >= 3 ? trimmed.substring(0, 3).toUpperCase() : 'OTR';
          await runSql(
            'INSERT INTO categories (id, nombre, descripcion, nomenclatura, orden) VALUES (?, ?, ?, ?, ?)',
            [`cat-${Date.now()}-${100 + j}`, trimmed, 'Familia de productos', autoPrefix, 50 + j]
          );
        } else if (!exists.nomenclatura) {
          const autoPrefix = trimmed.length >= 3 ? trimmed.substring(0, 3).toUpperCase() : 'OTR';
          await runSql('UPDATE categories SET nomenclatura = ? WHERE id = ?', [autoPrefix, exists.id]);
        }
      }
    }
  } catch (e) {
    // Ignore if products table not yet created
  }
}

// Helper generic query functions
export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return queryAllRows<T>(sql, params);
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return querySingleRow<T>(sql, params);
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  await runSql(sql, params);
  persistDatabase();
}

// Business logic queries for Stock calculations
export async function getProductStockMetrics(productId: string): Promise<{
  stock_actual: number;
  stock_fuera_almacen: number;
  stock_reservado: number;
  stock_disponible: number;
}> {
  const rows = await queryAll<{ tipo: string; total: number }>(
    `SELECT tipo, SUM(cantidad) as total 
     FROM movements 
     WHERE producto_id = ? 
     GROUP BY tipo`,
    [productId]
  );

  let entradas = 0;
  let salidas = 0;
  let reservas = 0;

  for (const r of rows) {
    if (r.tipo === 'entrada') entradas = Number(r.total) || 0;
    else if (r.tipo === 'salida') salidas = Number(r.total) || 0;
    else if (r.tipo === 'reserva') reservas = Number(r.total) || 0;
  }

  const product = await queryOne<{ stock_fuera_almacen?: number }>(
    'SELECT stock_fuera_almacen FROM products WHERE id = ?',
    [productId]
  );
  const stock_fuera_almacen = Number(product?.stock_fuera_almacen) || 0;
  const stock_almacen = entradas - salidas;
  const stock_actual = stock_almacen + stock_fuera_almacen;
  const stock_disponible = Math.max(0, stock_almacen - reservas);

  return {
    stock_actual,
    stock_fuera_almacen,
    stock_reservado: reservas,
    stock_disponible
  };
}

export async function getProducts(options: {
  query?: string;
  category?: string;
  low_stock_only?: boolean;
  project_id?: string;
} = {}): Promise<Product[]> {
  let sql = `
    SELECT p.*, 
      pr.nombre as proveedor_nombre,
      proj.nombre as proyecto_nombre,
      COALESCE((SELECT SUM(cantidad) FROM movements WHERE producto_id = p.id AND tipo = 'entrada'), 0) as total_entradas,
      COALESCE((SELECT SUM(cantidad) FROM movements WHERE producto_id = p.id AND tipo = 'salida' AND COALESCE(observaciones, '') NOT LIKE '%desde tienda/obra%'), 0) as total_salidas,
      COALESCE((SELECT SUM(cantidad) FROM movements WHERE producto_id = p.id AND tipo = 'reserva'), 0) as total_reservas
      ,COALESCE((SELECT SUM(cantidad) FROM orders WHERE producto_id = p.id AND estado IN ('por_tramitar', 'pendiente_recibir')), 0) as unidades_solicitadas
      ,COALESCE((SELECT SUM(cantidad_recibida - cantidad_adjudicada - cantidad_almacen) FROM orders WHERE producto_id = p.id AND estado = 'recibido_tienda_obra'), 0) as unidades_pendientes_almacen
    FROM products p
    LEFT JOIN providers pr ON p.proveedor_id = pr.id
    LEFT JOIN projects proj ON p.proyecto_id = proj.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (options.query) {
    sql += ` AND (p.codigo LIKE ? OR p.nombre LIKE ? OR p.descripcion LIKE ?)`;
    const q = `%${options.query}%`;
    params.push(q, q, q);
  }

  if (options.category && options.category !== 'all') {
    sql += ` AND p.categoria = ?`;
    params.push(options.category);
  }

  if (options.project_id) {
    sql += ` AND p.proyecto_id = ?`;
    params.push(options.project_id);
  }

  sql += ` ORDER BY p.codigo ASC`;

  const rows = await queryAll<any>(sql, params);

  const products: Product[] = rows.map((r) => {
    const totalEntradas = Number(r.total_entradas) || 0;
    const totalSalidas = Number(r.total_salidas) || 0;
    const totalReservas = Number(r.total_reservas) || 0;

    const stock_fuera_almacen = Number(r.stock_fuera_almacen) || 0;
    const stock_almacen = totalEntradas - totalSalidas;
    const stock_actual = stock_almacen + stock_fuera_almacen;
    const stock_reservado = totalReservas;
    const stock_disponible = Math.max(0, stock_almacen - stock_reservado);
    const en_alerta = stock_disponible <= r.stock_minimo;

    return {
      id: r.id,
      codigo: r.codigo,
      referencia: r.referencia || '',
      nombre: r.nombre,
      descripcion: r.descripcion || '',
      imagen_url: r.imagen_url || '',
      categoria: r.categoria,
      stock_minimo: Number(r.stock_minimo),
      estado: r.estado || 'activo',
      proveedor_id: r.proveedor_id,
      proveedor_nombre: r.proveedor_nombre,
      proyecto_id: r.proyecto_id,
      proyecto_nombre: r.proyecto_nombre,
      fecha_creacion: r.fecha_creacion,
      stock_actual,
      stock_fuera_almacen,
      unidades_solicitadas: Number(r.unidades_solicitadas) || 0,
      unidades_pendientes_almacen: Number(r.unidades_pendientes_almacen) || 0,
      stock_reservado,
      stock_disponible,
      en_alerta
    };
  });

  if (options.low_stock_only) {
    return products.filter((p) => p.en_alerta);
  }

  return products;
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await getProducts();
  return products.find((p) => p.id === id || p.codigo === id) || null;
}

export async function getMovements(options: {
  tipo?: string;
  producto_id?: string;
  proyecto_id?: string;
  desde?: string;
  hasta?: string;
} = {}): Promise<Movement[]> {
  let sql = `
    SELECT m.*, 
      p.codigo as producto_codigo, 
      p.nombre as producto_nombre,
      p.categoria as producto_categoria,
      u.nombre as usuario_nombre,
      proj.nombre as proyecto_nombre
    FROM movements m
    JOIN products p ON m.producto_id = p.id
    JOIN users u ON m.usuario_id = u.id
    LEFT JOIN projects proj ON m.proyecto_id = proj.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options.tipo && options.tipo !== 'all') {
    sql += ` AND m.tipo = ?`;
    params.push(options.tipo);
  }

  if (options.producto_id) {
    sql += ` AND m.producto_id = ?`;
    params.push(options.producto_id);
  }

  if (options.proyecto_id) {
    sql += ` AND m.proyecto_id = ?`;
    params.push(options.proyecto_id);
  }

  if (options.desde) {
    sql += ` AND m.fecha >= ?`;
    params.push(options.desde);
  }

  if (options.hasta) {
    sql += ` AND m.fecha <= ?`;
    params.push(options.hasta);
  }

  sql += ` ORDER BY m.fecha DESC`;

  return await queryAll<Movement>(sql, params);
}

export async function getMovementById(id: string): Promise<Movement | null> {
  const sql = `
    SELECT m.*, 
      p.codigo as producto_codigo, 
      p.nombre as producto_nombre,
      p.categoria as producto_categoria,
      u.nombre as usuario_nombre,
      proj.nombre as proyecto_nombre
    FROM movements m
    JOIN products p ON m.producto_id = p.id
    JOIN users u ON m.usuario_id = u.id
    LEFT JOIN projects proj ON m.proyecto_id = proj.id
    WHERE m.id = ?
  `;
  return await queryOne<Movement>(sql, [id]);
}

export async function getProjects(): Promise<Project[]> {
  return await queryAll<Project>(`SELECT * FROM projects ORDER BY estado ASC, nombre ASC`);
}

export async function getProjectById(id: string): Promise<Project | null> {
  return await queryOne<Project>(`SELECT * FROM projects WHERE id = ?`, [id]);
}

export async function getProviders(): Promise<Provider[]> {
  return await queryAll<Provider>(`SELECT * FROM providers ORDER BY nombre ASC`);
}

export async function getProviderById(id: string): Promise<Provider | null> {
  return await queryOne<Provider>(`SELECT * FROM providers WHERE id = ?`, [id]);
}

export async function getUsers(): Promise<User[]> {
  return await queryAll<User>(`SELECT id, nombre, email, rol, fecha_creacion FROM users ORDER BY rol ASC, nombre ASC`);
}

export async function getUserById(id: string): Promise<User | null> {
  return await queryOne<User>(`SELECT id, nombre, email, rol, fecha_creacion FROM users WHERE id = ?`, [id]);
}

export async function getUserByEmail(identifier: string): Promise<(User & { password_hash: string }) | null> {
  const clean = identifier.trim().toLowerCase();
  return await queryOne<User & { password_hash: string }>(
    `SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(nombre) = ?`,
    [clean, clean]
  );
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const allProducts = await getProducts();
  const lowStock = allProducts.filter((p) => p.en_alerta);

  // Today start in ISO
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const todayMoves = await queryAll<Movement>(
    `SELECT * FROM movements WHERE fecha >= ?`,
    [todayIso]
  );

  const entradasHoy = todayMoves.filter((m) => m.tipo === 'entrada').length;
  const salidasHoy = todayMoves.filter((m) => m.tipo === 'salida').length;
  const reservasHoy = todayMoves.filter((m) => m.tipo === 'reserva').length;

  const activeProjects = await queryAll<Project>(
    `SELECT * FROM projects WHERE estado = 'activo'`
  );

  const recentMovements = (await getMovements()).slice(0, 8);

  const pendingRequestsStmt = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM material_requests WHERE estado IN ('pendiente', 'en_preparacion')`
  );
  const solicitudes_pendientes = Number(pendingRequestsStmt?.count) || 0;

  const pendingOrdersStmt = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders WHERE estado IN ('pendiente', 'pedido')`
  );
  const pedidos_pendientes = Number(pendingOrdersStmt?.count) || 0;

  const enCaminoOrdersStmt = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders WHERE estado = 'en_camino'`
  );
  const pedidos_en_camino = Number(enCaminoOrdersStmt?.count) || 0;

  return {
    total_productos: allProducts.length,
    productos_stock_bajo: lowStock.length,
    movimientos_hoy: todayMoves.length,
    entradas_hoy: entradasHoy,
    salidas_hoy: salidasHoy,
    reservas_activas: reservasHoy,
    proyectos_activos: activeProjects.length,
    solicitudes_pendientes,
    pedidos_pendientes,
    pedidos_en_camino,
    alertas: lowStock,
    ultimos_movimientos: recentMovements
  };
}

export async function getMaterialRequests(options: {
  estado?: string;
  tipo_solicitud?: string;
  proyecto_id?: string;
  usuario_id?: string;
  query?: string;
} = {}): Promise<MaterialRequest[]> {
  let sql = `
    SELECT r.*,
      p.codigo as producto_codigo,
      u.nombre as usuario_nombre,
      proj.nombre as proyecto_nombre
    FROM material_requests r
    LEFT JOIN products p ON r.producto_id = p.id
    JOIN users u ON r.usuario_id = u.id
    LEFT JOIN projects proj ON r.proyecto_id = proj.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options.estado && options.estado !== 'all') {
    sql += ` AND r.estado = ?`;
    params.push(options.estado);
  }

  if (options.tipo_solicitud && options.tipo_solicitud !== 'all') {
    sql += ` AND r.tipo_solicitud = ?`;
    params.push(options.tipo_solicitud);
  }

  if (options.proyecto_id) {
    sql += ` AND r.proyecto_id = ?`;
    params.push(options.proyecto_id);
  }

  if (options.usuario_id) {
    sql += ` AND r.usuario_id = ?`;
    params.push(options.usuario_id);
  }

  if (options.query) {
    sql += ` AND (r.material_nombre LIKE ? OR r.material_descripcion LIKE ? OR r.notas LIKE ?)`;
    const q = `%${options.query}%`;
    params.push(q, q, q);
  }

  sql += ` ORDER BY 
    CASE r.estado 
      WHEN 'pendiente' THEN 1 
      WHEN 'en_preparacion' THEN 2 
      WHEN 'preparado' THEN 3 
      WHEN 'pedido_realizado' THEN 4 
      ELSE 5 
    END, 
    CASE r.prioridad 
      WHEN 'urgente' THEN 1 
      ELSE 2 
    END, 
    r.fecha_solicitud DESC`;

  const rows = await queryAll<any>(sql, params);
  return rows.map((r) => ({
    ...r,
    es_material_nuevo: Boolean(r.es_material_nuevo),
    cantidad: Number(r.cantidad)
  }));
}

export async function getMaterialRequestById(id: string): Promise<MaterialRequest | null> {
  const requests = await getMaterialRequests();
  return requests.find((r) => r.id === id) || null;
}

export async function getCategories(): Promise<Array<{ id: string; nombre: string; descripcion?: string; nomenclatura?: string; product_count: number }>> {
  const sql = `
    SELECT 
      c.id, 
      c.nombre, 
      c.descripcion, 
      c.nomenclatura,
      c.orden,
      (SELECT COUNT(*) FROM products p WHERE LOWER(TRIM(p.categoria)) = LOWER(TRIM(c.nombre))) as product_count
    FROM categories c
    ORDER BY c.orden ASC, c.nombre ASC
  `;
  const rows = await queryAll<any>(sql);
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion || '',
    nomenclatura: r.nomenclatura || '',
    product_count: Number(r.product_count || 0)
  }));
}

export async function getCategoryById(id: string): Promise<any> {
  return await queryOne<any>('SELECT * FROM categories WHERE id = ?', [id]);
}

export async function getOrders(options: {
  estado?: string;
  proveedor_id?: string;
  proyecto_id?: string;
  query?: string;
} = {}): Promise<Order[]> {
  let sql = `SELECT * FROM orders WHERE 1=1`;
  const params: any[] = [];

  if (options.estado && options.estado !== 'all') {
    sql += ` AND estado = ?`;
    params.push(options.estado);
  }

  if (options.proveedor_id) {
    sql += ` AND proveedor_id = ?`;
    params.push(options.proveedor_id);
  }

  if (options.proyecto_id) {
    sql += ` AND proyecto_id = ?`;
    params.push(options.proyecto_id);
  }

  if (options.query) {
    sql += ` AND (numero_pedido LIKE ? OR producto_nombre LIKE ? OR proveedor_nombre LIKE ? OR referencia LIKE ? OR notas LIKE ?)`;
    const q = `%${options.query}%`;
    params.push(q, q, q, q, q);
  }

  sql += ` ORDER BY 
    CASE estado 
      WHEN 'en_camino' THEN 1 
      WHEN 'pedido' THEN 2 
      WHEN 'pendiente' THEN 3 
      WHEN 'recibido' THEN 4 
      ELSE 5 
    END, 
    fecha_pedido DESC`;

  const rows = await queryAll<any>(sql, params);
  return rows.map((r) => ({
    ...r,
    cantidad: Number(r.cantidad),
    cantidad_recibida: Number(r.cantidad_recibida) || 0,
    cantidad_adjudicada: Number(r.cantidad_adjudicada) || 0,
    cantidad_almacen: Number(r.cantidad_almacen) || 0,
    precio_estimado: r.precio_estimado ? Number(r.precio_estimado) : null
  }));
}

export async function getOrderById(id: string): Promise<Order | null> {
  const row = await queryOne<any>(`SELECT * FROM orders WHERE id = ?`, [id]);
  if (!row) return null;
  return {
    ...row,
    cantidad: Number(row.cantidad),
    cantidad_recibida: Number(row.cantidad_recibida) || 0,
    cantidad_adjudicada: Number(row.cantidad_adjudicada) || 0,
    cantidad_almacen: Number(row.cantidad_almacen) || 0,
    precio_estimado: row.precio_estimado ? Number(row.precio_estimado) : null
  };
}

export async function getRequestHistory(solicitudId: string): Promise<RequestHistoryEntry[]> {
  const sql = `SELECT * FROM request_history WHERE solicitud_id = ? ORDER BY fecha DESC`;
  return await queryAll<RequestHistoryEntry>(sql, [solicitudId]);
}

export async function addRequestHistoryEntry(
  solicitudId: string,
  userId: string,
  userNombre: string,
  accion: 'creacion' | 'edicion' | 'cambio_estado' | 'pedido_creado',
  detalles: string,
  valoresAnteriores?: string,
  valoresNuevos?: string
) {
  const id = 'hist-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  await runSql(
    `INSERT INTO request_history (id, solicitud_id, usuario_id, usuario_nombre, accion, detalles, valores_anteriores, valores_nuevos, fecha)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, solicitudId, userId, userNombre, accion, detalles, valoresAnteriores || null, valoresNuevos || null, now]
  );
  persistDatabase();
}
