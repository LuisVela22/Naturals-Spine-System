import { PrismaClient, Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Datos del nuevo empleado
  const correo = process.env.NUEVO_CORREO;
  const password = process.env.NUEVA_PASSWORD;
  const numeroEmpleado = process.env.NUMERO_EMPLEADO;
  const nombreCompleto = process.env.NOMBRE_COMPLETO;
  const departamento = process.env.DEPARTAMENTO;

  // Validar que los datos requeridos estén presentes
  if (
    !correo ||
    !password ||
    !numeroEmpleado ||
    !nombreCompleto
  ) {
    throw new Error(
      'Faltan datos para registrar al personal.',
    );
  }

  // Verificar si el correo ya existe
  const usuarioExistente = await prisma.usuario.findUnique({
    where: {
      correo_electronico: correo,
    },
  });

  if (usuarioExistente) {
    throw new Error(
      'Ya existe una cuenta registrada con ese correo.',
    );
  }

  // Verificar si el número de empleado ya existe
  const empleadoExistente =
    await prisma.personalEmpresa.findUnique({
      where: {
        numero_empleado: numeroEmpleado,
      },
    });

  if (empleadoExistente) {
    throw new Error(
      'El número de empleado ya se encuentra registrado.',
    );
  }

  // Generar hash de la contraseña
  const passwordHash = await bcrypt.hash(password, 12);

  // Crear usuario y personal asociado
  const nuevoUsuario = await prisma.usuario.create({
    data: {
      correo_electronico: correo,
      password_hash: passwordHash,
      rol: Rol.ADMIN,
      activo: true,

      personal: {
        create: {
          numero_empleado: numeroEmpleado,
          nombre_completo: nombreCompleto,
          departamento: departamento || null,
        },
      },
    },

    include: {
      personal: true,
    },
  });

  console.log('Cuenta creada correctamente:');
  console.log({
    id: nuevoUsuario.id,
    correo: nuevoUsuario.correo_electronico,
    rol: nuevoUsuario.rol,
    activo: nuevoUsuario.activo,
    personal: nuevoUsuario.personal,
  });
}

main()
  .catch((error) => {
    console.error('Error al crear la cuenta:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });