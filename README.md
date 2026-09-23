# SuiteakStock - Sistema de Control y Gestión de Almacén

Sistema integral para el control de inventario, stock de materiales, obras y reformas, gestión de pedidos y preparación de cargas para operarios y administradores.

---

## 🚀 Cómo exportar y ejecutar el proyecto en tu ordenador local

### Paso 1: Descargar el proyecto desde Google AI Studio
1. En la barra superior derecha de Google AI Studio, haz clic en el icono de **Ajustes / Menú**.
2. Selecciona **Export to ZIP** (o **Export to GitHub** si prefieres sincronizarlo con tu repositorio).
3. Descomprime el archivo `.zip` en la carpeta de tu ordenador donde desees trabajar (por ejemplo, `C:\proyectos\suiteak-stock` o `~/proyectos/suiteak-stock`).

---

### Paso 2: Requisitos previos en tu ordenador
- Tener instalado **Node.js** (versión 18, 20 o superior).
  - Si no lo tienes, puedes descargarlo de forma gratuita desde [nodejs.org](https://nodejs.org/).
  - Para verificar que lo tienes instalado, abre una terminal o consola (PowerShell, CMD o Terminal) y ejecuta:
    ```bash
    node -v
    npm -v
    ```

---

### Paso 3: Instalación de dependencias
Abre la terminal en la carpeta raíz del proyecto y ejecuta:

```bash
npm install
```

*(Esto descargará todas las librerías necesarias de React, Tailwind CSS, Express y PostgreSQL).* 

---

### Paso 4: Configurar variables de entorno
Copia el archivo `.env.example` a `.env` y rellena los valores reales:

```bash
copy .env.example .env
```

Debe incluir, al menos:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.TU_PROYECTO.supabase.co:5432/postgres?sslmode=require"
JWT_SECRET="tu-clave-secreta"
APP_URL="https://tu-app-render-url"
PORT="3000"
```

> Si `DATABASE_URL` no está presente, la aplicación puede usar el modo local con SQLite como fallback, pero para producción y uso compartido debe usar PostgreSQL.

---

### Paso 5: Iniciar la aplicación

#### Modo Desarrollo (con recarga automática de cambios):
```bash
npm run dev
```

#### Modo Producción:
```bash
npm run build
npm start
```

Una vez ejecutado, verás en la consola:
```
Servidor de Control de Stock corriendo en http://0.0.0.0:3000
```

Abre tu navegador web e ingresa a:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📱 Uso desde el móvil o tablet en la misma red Wi-Fi

Dado que el servidor escucha en `0.0.0.0:3000`, puedes acceder desde cualquier teléfono móvil, tablet o pistola de escaneo conectada a la misma red local Wi-Fi:

1. Averigua la dirección IP local de tu ordenador:
   - En **Windows**: ejecuta `ipconfig` en la consola (busca *Dirección IPv4*, ej: `192.168.1.45`).
   - En **Mac / Linux**: ejecuta `ifconfig` o `ip a` (ej: `192.168.1.45`).
2. En el navegador de tu móvil o tablet, entra a:
   `http://192.168.1.45:3000` *(reemplazando por tu IP)*.
3. Podrás utilizar la cámara de tu móvil para escanear códigos de barras reales en el almacén.

---

## 🔑 Credenciales de acceso incluidas

| Rol | Usuario / Correo | Contraseña | Permisos |
|---|---|---|---|
| **Administrador** | `Adminsuiteak` (o `admin@suiteak.com`) | `12345` | Control total, gestión y creación de usuarios, altas/bajas de productos y obras, deshacer movimientos, aprobación/eliminación de solicitudes y auditoría |
| **Operario** | `carlos@suiteak.com` | `operario123` | Escaneo rápido, consulta de stock, registro de entradas/salidas/reservas y solicitudes de carga |

*(Nota: En la barra superior de navegación dispones además de un botón de cambio rápido para alternar entre Administrador y Operario en un solo clic).*

---

## 🗄️ Persistencia de Datos y respaldo

- La aplicación está diseñada para usar **PostgreSQL** con `DATABASE_URL` en producción.
- Si la variable `DATABASE_URL` no existe, el proyecto puede caer a un modo local con SQLite como fallback temporal.
- Para uso real en empresa y acceso compartido por varios usuarios, la opción recomendada es:
  - **Supabase** para la base de datos
  - **Render** o similar para el hosting
  - **pg_dump** en un equipo local para hacer backups periódicos
- La base de datos no debe depender de un archivo local en el servidor del hosting, porque ese archivo puede desaparecer al reiniciar el contenedor.

---

## 🛠️ Scripts disponibles en el proyecto

- `npm run dev`: Inicia el servidor fullstack en modo desarrollo.
- `npm run build`: Compila la interfaz cliente con Vite y el servidor backend con esbuild.
- `npm start`: Inicia el servidor optimizado para producción.
- `npm run lint`: Valida tipos de TypeScript sin emitir código.
- `npm run clean`: Limpia la carpeta de compilación `dist`.
