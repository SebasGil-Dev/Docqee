import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient, estado_simple_enum, tipo_cuenta_enum } from '@prisma/client';
import * as bcrypt from 'bcrypt';

type PlatformAdminSeedUser = {
  apellidos: string;
  correo: string;
  nombres: string;
  password: string;
};

const prisma = new PrismaClient();
const BCRYPT_SALT_ROUNDS = 12;

function loadLocalEnvFile() {
  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const envContent = readFileSync(envPath, 'utf8');

  for (const line of envContent.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

loadLocalEnvFile();

function readPlatformAdminSeedUser(index: 1 | 2): PlatformAdminSeedUser | null {
  const correo = process.env[`PLATFORM_ADMIN_${index}_EMAIL`]?.trim().toLowerCase();
  const password = process.env[`PLATFORM_ADMIN_${index}_PASSWORD`];
  const nombres = process.env[`PLATFORM_ADMIN_${index}_FIRST_NAME`]?.trim();
  const apellidos = process.env[`PLATFORM_ADMIN_${index}_LAST_NAME`]?.trim();

  if (!correo || !password || !nombres || !apellidos) {
    return null;
  }

  return {
    apellidos,
    correo,
    nombres,
    password,
  };
}

async function upsertPlatformAdminSeedUser(user: PlatformAdminSeedUser) {
  const passwordHash = await bcrypt.hash(user.password, BCRYPT_SALT_ROUNDS);
  const existingAccount = await prisma.cuenta_acceso.findUnique({
    where: { correo: user.correo },
    select: {
      id_cuenta: true,
      tipo_cuenta: true,
    },
  });

  if (existingAccount && existingAccount.tipo_cuenta !== tipo_cuenta_enum.ADMIN_PLATAFORMA) {
    throw new Error(
      `No se puede crear admin plataforma: el correo ${user.correo} ya existe con tipo ${existingAccount.tipo_cuenta}.`,
    );
  }

  if (existingAccount) {
    await prisma.$transaction([
      prisma.cuenta_acceso.update({
        where: { id_cuenta: existingAccount.id_cuenta },
        data: {
          correo_verificado: true,
          correo_verificado_at: new Date(),
          estado: estado_simple_enum.ACTIVO,
          password_hash: passwordHash,
          primer_ingreso_pendiente: false,
        },
      }),
      prisma.cuenta_admin_plataforma.upsert({
        where: { id_cuenta: existingAccount.id_cuenta },
        create: {
          id_cuenta: existingAccount.id_cuenta,
          apellidos: user.apellidos,
          nombres: user.nombres,
        },
        update: {
          apellidos: user.apellidos,
          nombres: user.nombres,
        },
      }),
    ]);

    return;
  }

  await prisma.cuenta_acceso.create({
    data: {
      correo: user.correo,
      correo_verificado: true,
      correo_verificado_at: new Date(),
      estado: estado_simple_enum.ACTIVO,
      password_hash: passwordHash,
      primer_ingreso_pendiente: false,
      tipo_cuenta: tipo_cuenta_enum.ADMIN_PLATAFORMA,
      cuenta_admin_plataforma: {
        create: {
          apellidos: user.apellidos,
          nombres: user.nombres,
        },
      },
    },
  });
}

async function main() {
  const platformAdmins = [readPlatformAdminSeedUser(1), readPlatformAdminSeedUser(2)].filter(
    (user): user is PlatformAdminSeedUser => Boolean(user),
  );

  if (platformAdmins.length === 0) {
    console.log(
      'Seed omitido: define PLATFORM_ADMIN_1_* y/o PLATFORM_ADMIN_2_* para crear admins plataforma.',
    );
    return;
  }

  for (const admin of platformAdmins) {
    await upsertPlatformAdminSeedUser(admin);
    console.log(`Admin plataforma listo: ${admin.correo}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
