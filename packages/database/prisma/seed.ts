/**
 * Database Seed Script
 * Creates test users and template library for development
 */

import { PrismaClient, TemplateStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedUsers() {
  console.log('👤 Seeding users...');

  const testUsers = [
    { id: 'test1', email: 'test1@example.com', name: '测试用户1' },
    { id: 'test2', email: 'test2@example.com', name: '测试用户2' },
    { id: 'test3', email: 'test3@example.com', name: '测试用户3' },
    { id: 'mock-user-1', email: 'mock@example.com', name: '当前用户 (Mock)' },
  ];

  for (const user of testUsers) {
    const created = await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name },
      create: user,
    });
    console.log(`  ✓ User: ${created.id} (${created.name})`);
  }
}

async function seedTemplates() {
  console.log('📋 Seeding template library...');

  // Seed template categories
  const categories = [
    { id: 'cat-pm', name: '项目管理', icon: 'Kanban', sortOrder: 1 },
    { id: 'cat-problem', name: '问题分析', icon: 'Search', sortOrder: 2 },
    { id: 'cat-tech', name: '技术设计', icon: 'Code', sortOrder: 3 },
  ];

  for (const category of categories) {
    const created = await prisma.templateCategory.upsert({
      where: { id: category.id },
      update: { name: category.name, icon: category.icon, sortOrder: category.sortOrder },
      create: category,
    });
    console.log(`  ✓ Category: ${created.name}`);
  }

  // Seed templates
  const templates = [
    {
      id: 'tpl-agile',
      name: '敏捷研发管理',
      description: '适用于敏捷开发团队的项目管理模板，包含Sprint规划、用户故事、回顾等结构',
      categoryId: 'cat-pm',
      structure: {
        rootNode: {
          label: '项目名称',
          children: [
            {
              label: 'Epic 1',
              type: 'REQUIREMENT',
              children: [
                { label: 'Story 1.1', type: 'TASK' },
                { label: 'Story 1.2', type: 'TASK' },
              ],
            },
            {
              label: 'Sprint Backlog',
              children: [{ label: '待办事项', type: 'TASK' }],
            },
            { label: '回顾记录' },
          ],
        },
      },
      defaultClassification: 'internal',
      requiredFields: ['executor', 'dueDate'],
      status: TemplateStatus.PUBLISHED,
    },
    {
      id: 'tpl-postmortem',
      name: '故障复盘',
      description: '用于故障分析和复盘的模板，帮助团队系统地记录和分析问题',
      categoryId: 'cat-problem',
      structure: {
        rootNode: {
          label: '故障复盘',
          children: [
            { label: '故障现象' },
            { label: '影响范围' },
            {
              label: '根因分析',
              children: [{ label: '直接原因' }, { label: '根本原因' }],
            },
            { label: '改进措施', type: 'TASK' },
            { label: '跟踪验证', type: 'TASK' },
          ],
        },
      },
      defaultClassification: 'internal',
      requiredFields: null,
      status: TemplateStatus.PUBLISHED,
    },
    {
      id: 'tpl-architecture',
      name: '系统架构设计',
      description: '软件系统架构设计模板，涵盖关键架构决策和组件分解',
      categoryId: 'cat-tech',
      structure: {
        rootNode: {
          label: '系统架构',
          children: [
            { label: '需求分析', type: 'REQUIREMENT' },
            { label: '技术选型' },
            {
              label: '模块设计',
              children: [
                { label: '前端模块' },
                { label: '后端模块' },
                { label: '数据层' },
              ],
            },
            { label: '部署架构' },
            { label: '安全设计' },
          ],
        },
      },
      defaultClassification: 'confidential',
      requiredFields: ['owner'],
      status: TemplateStatus.PUBLISHED,
    },
  ];

  for (const template of templates) {
    const created = await prisma.template.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        description: template.description,
        structure: template.structure,
        defaultClassification: template.defaultClassification,
        requiredFields: template.requiredFields,
        status: template.status,
      },
      create: template,
    });
    console.log(`  ✓ Template: ${created.name}`);
  }
}

async function main() {
  console.log('🌱 Seeding database...');

  await seedUsers();
  await seedTemplates();

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
