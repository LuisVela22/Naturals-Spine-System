import { PrismaClient, Rol, EstadoValidacion } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE usuarios CASCADE;');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Crear Administrador (Personal de la Empresa - AC_02)
  const adminUser = await prisma.usuario.create({
    data: {
      correo_electronico: 'admin@naturalsspine.com',
      password_hash: passwordHash,
      rol: Rol.ADMIN,
      activo: true,
      personal: {
        create: {
          numero_empleado: 'EMP-001',
          nombre_completo: 'Ing. Administrador General',
          departamento: 'Operaciones Clínicas',
        },
      },
    },
  });

  // 2. Crear Cliente Institucional Aprobado (Hospital - AC_01, RN01)
  const clienteUser = await prisma.usuario.create({
    data: {
      correo_electronico: 'contacto@hospitalangeles.com',
      password_hash: passwordHash,
      rol: Rol.CLIENTE,
      activo: true,
      cliente: {
        create: {
          rfc: 'HAN901120ABC',
          razon_social: 'Hospitales Ángeles S.A. de C.V.',
          nombre_contacto: 'Dra. Patricia Martínez',
          telefono: '5512345678',
          direccion_fiscal: 'Av. Ejército Nacional 600, CDMX',
          estado_validacion: EstadoValidacion.APROBADO,
        },
      },
    },
  });

  console.log('Semillas creadas con éxito:');
  console.log(`- Admin: admin@naturalsspine.com / Password123!`);
  console.log(`- Cliente: contacto@hospitalangeles.com / Password123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });