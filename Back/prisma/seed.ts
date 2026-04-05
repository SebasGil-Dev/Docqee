import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cities = [
    {
      name: 'Bogota',
      slug: 'bogota',
      localities: [
        { name: 'Usaquen', slug: 'usaquen' },
        { name: 'Suba', slug: 'suba' },
        { name: 'Kennedy', slug: 'kennedy' },
      ],
    },
    {
      name: 'Medellin',
      slug: 'medellin',
      localities: [
        { name: 'Laureles', slug: 'laureles' },
        { name: 'El Poblado', slug: 'el-poblado' },
      ],
    },
    {
      name: 'Cali',
      slug: 'cali',
      localities: [
        { name: 'Comuna 17', slug: 'comuna-17' },
        { name: 'Comuna 22', slug: 'comuna-22' },
      ],
    },
  ];

  for (const city of cities) {
    const savedCity = await prisma.city.upsert({
      where: { slug: city.slug },
      update: { name: city.name },
      create: { name: city.name, slug: city.slug },
    });

    for (const locality of city.localities) {
      await prisma.locality.upsert({
        where: {
          cityId_slug: {
            cityId: savedCity.id,
            slug: locality.slug,
          },
        },
        update: { name: locality.name },
        create: {
          cityId: savedCity.id,
          name: locality.name,
          slug: locality.slug,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.();
    process.exit(1);
  });
