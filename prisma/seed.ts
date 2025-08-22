import { prisma } from '../src/utils/prisma.js';

async function main() {
  console.log('🌱 Seeding database...');
  
  // Add any seed data here if needed
  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });