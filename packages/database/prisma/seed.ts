/**
 * Database Seed Script
 * Creates test users for development
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const testUsers = [
    { id: 'test1', email: 'test1@example.com', name: '测试用户1' },
    { id: 'test2', email: 'test2@example.com', name: '测试用户2' },
    { id: 'test3', email: 'test3@example.com', name: '测试用户3' },
    // Also add mock-user-1 which is used in the frontend
    { id: 'mock-user-1', email: 'mock@example.com', name: '当前用户 (Mock)' },
  ];

  for (const user of testUsers) {
    const created = await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name },
      create: user,
    });
    console.log(`  ✓ User created/updated: ${created.id} (${created.name})`);
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
