# 🚀 Guía de Instalación y Despliegue Local - Naturals & Spine

Esta guía contiene los pasos necesarios para levantar el entorno de desarrollo local (Base de Datos PostgreSQL en Docker, Backend en NestJS y Frontend en Vue 3).

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado y abierto en tu computadora:

1. **Docker Desktop** (Debe estar **abierto y en ejecución** en segundo plano con el ícono verde).
2. **Node.js** (Versión 18 o 20 LTS recomendada) y **npm**.
3. **Git**.

---

## 1. Clonar el Repositorio

Abre una terminal y clona el proyecto:

\`\`\`bash
git clone <URL_DEL_REPOSITORIO>
cd <CARPETA_DEL_REPOSITORIO>
\`\`\`

---

## 2. Levantar la Base de Datos (PostgreSQL en Docker)

Asegúrate de que Docker Desktop esté corriendo y ejecuta el contenedor de PostgreSQL:

\`\`\`bash
docker run --name postgres-naturals-spine \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=supersecretpassword \
  -e POSTGRES_DB=naturals_spine_db \
  -p 5432:5432 \
  -d postgres:15
\`\`\`

> **Nota:** Si la máquina se reinicia o apagas Docker, solo debes volver a encender el contenedor con:  
> \`docker start postgres-naturals-spine\`

---

## 3. Configuración y Despliegue del Backend

Abre una terminal y entra a la carpeta del backend:

\`\`\`bash
cd backend-naturals-spine
\`\`\`

### A. Instalar Dependencias
\`\`\`bash
npm install
\`\`\`

### B. Crear el archivo de Variables de Entorno (`.env`)
Crea un archivo llamado `.env` dentro de `backend-naturals-spine/` con el siguiente contenido:

\`\`\`env
# Base de Datos
DATABASE_URL="postgresql://postgres:supersecretpassword@localhost:5432/naturals_spine_db?schema=public"

# Seguridad JWT
JWT_SECRET="CLAVE_SUPER_SECRETA_NATURALS_SPINE_2026"
JWT_EXPIRATION="1h"
PORT=3000

# Servicio de Correo SMTP (Gmail)
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER="naturals.spine.notificaciones@gmail.com"
MAIL_PASS="pziodsgzetdjglaj"
MAIL_FROM="Naturals & Spine <naturals.spine.notificaciones@gmail.com>"

# URL del Frontend
FRONTEND_URL="http://localhost:5173"
\`\`\`

### C. Generar Prisma y Ejecutar Migraciones
Ejecuta las migraciones para crear todas las tablas en PostgreSQL e inicializar el cliente de Prisma:

\`\`\`bash
# 1. Aplicar las migraciones a la BD
npx prisma migrate dev

# 2. Generar el tipado del cliente Prisma
npx prisma generate

# 3. (Opcional) Si existe script de seed/datos iniciales:
# npm run prisma:seed
\`\`\`

### D. Iniciar el Backend
\`\`\`bash
npm run start:dev
\`\`\`

> El backend estará disponible en `http://localhost:3000`. Debe mostrar en consola el mensaje de verificación exitosa de conexión con Gmail.

---

## 4. Configuración y Despliegue del Frontend

Abre **otra terminal** y entra a la carpeta del frontend:

\`\`\`bash
cd frontend-naturals-spine
\`\`\`

### A. Instalar Dependencias
\`\`\`bash
npm install
\`\`\`

### B. Iniciar el Servidor de Desarrollo
\`\`\`bash
npm run dev
\`\`\`

> El frontend estará disponible en `http://localhost:5173`.

---

## 🔑 Credenciales de Prueba

### Administrador (Rol: ADMIN)
- **Correo:** `admin@naturalsspine.com`
- **Contraseña:** `Password123!`
- **Panel:** `http://localhost:5173/admin/dashboard`

### Cliente Institucional Aprobado (Rol: CLIENTE)
- **Correo:** `contacto@hospitalangeles.com`
- **Contraseña:** `Password123!`
- **Panel:** `http://localhost:5173/cliente/dashboard`

---

## 🛠️ Solución de Problemas Comunes

- **Error: `Can't reach database server at localhost:5432`**: Docker Desktop no está encendido o el contenedor está detenido. Ejecuta `docker start postgres-naturals-spine`.
- **Error TypeScript en Prisma (`La propiedad X no existe en PrismaService`)**: Ejecuta en el backend:
  \`\`\`bash
  npx prisma generate
  \`\`\`
  y en VS Code presiona `Ctrl + Shift + P` -> **Developer: Reload Window**.
- **Visualizar datos con interfaz gráfica**: Puedes correr `npx prisma studio` en la carpeta del backend para explorar la base de datos en `http://localhost:5555`.