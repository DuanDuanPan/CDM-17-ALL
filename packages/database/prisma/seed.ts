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
    // === 新增：软件敏捷开发详细模板 ===
    {
      id: 'tpl-scrum-sprint',
      name: 'Scrum Sprint开发',
      description: '完整的Scrum Sprint迭代开发模板，包含产品待办、Sprint规划、每日站会、评审和回顾',
      categoryId: 'cat-pm',
      structure: {
        rootNode: {
          label: 'Sprint N',
          _tempId: 'sprint-root',
          type: 'PBS',
          children: [
            {
              label: 'Sprint规划',
              _tempId: 'planning',
              type: 'TASK',
              children: [
                { label: '确定Sprint目标', _tempId: 'goal', type: 'TASK' },
                { label: '评估Story点数', _tempId: 'estimate', type: 'TASK' },
                { label: '承诺交付范围', _tempId: 'commit', type: 'TASK' },
              ],
            },
            {
              label: 'Sprint Backlog',
              _tempId: 'backlog',
              type: 'PBS',
              children: [
                {
                  label: 'US01: 用户登录',
                  _tempId: 'us01',
                  type: 'REQUIREMENT',
                  children: [
                    { label: 'Task: 设计API', _tempId: 'task-api', type: 'TASK' },
                    { label: 'Task: 前端实现', _tempId: 'task-fe', type: 'TASK' },
                    { label: 'Task: 单元测试', _tempId: 'task-ut', type: 'TASK' },
                  ],
                },
                {
                  label: 'US02: 数据导出',
                  _tempId: 'us02',
                  type: 'REQUIREMENT',
                  children: [
                    { label: 'Task: 导出逻辑', _tempId: 'task-export', type: 'TASK' },
                    { label: 'Task: 格式处理', _tempId: 'task-format', type: 'TASK' },
                  ],
                },
              ],
            },
            {
              label: 'Sprint评审',
              _tempId: 'review',
              type: 'TASK',
              children: [
                { label: '演示准备', _tempId: 'demo-prep', type: 'TASK' },
                { label: '功能演示', _tempId: 'demo', type: 'TASK' },
                { label: '反馈收集', _tempId: 'feedback', type: 'TASK' },
              ],
            },
            {
              label: 'Sprint回顾',
              _tempId: 'retro',
              type: 'TASK',
              children: [
                { label: '做得好的', _tempId: 'went-well' },
                { label: '待改进项', _tempId: 'improve' },
                { label: '行动计划', _tempId: 'action', type: 'TASK' },
              ],
            },
          ],
        },
        edges: [
          { sourceRef: 'goal', targetRef: 'estimate', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'estimate', targetRef: 'commit', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'task-api', targetRef: 'task-fe', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'task-fe', targetRef: 'task-ut', kind: 'dependency', dependencyType: 'FS' },
        ],
      },
      defaultClassification: 'internal',
      requiredFields: ['executor', 'dueDate'],
      status: TemplateStatus.PUBLISHED,
      isPublic: true,
    },
    // === 新增：装备系统工程研制模板 ===
    {
      id: 'tpl-equipment-se',
      name: '装备系统工程研制',
      description: '装备系统工程全生命周期模板，覆盖论证、设计、研制、试验、定型等阶段',
      categoryId: 'cat-tech',
      structure: {
        rootNode: {
          label: '装备型号研制',
          _tempId: 'se-root',
          type: 'PBS',
          children: [
            {
              label: '一、论证阶段',
              _tempId: 'phase-1',
              type: 'PBS',
              children: [
                { label: '任务需求分析', _tempId: 'req-analysis', type: 'REQUIREMENT' },
                { label: '技术可行性论证', _tempId: 'feasibility', type: 'TASK' },
                { label: '总体方案论证', _tempId: 'proposal', type: 'TASK' },
                { label: '研制任务书', _tempId: 'task-book', type: 'DATA' },
              ],
            },
            {
              label: '二、方案阶段',
              _tempId: 'phase-2',
              type: 'PBS',
              children: [
                { label: '总体技术方案', _tempId: 'tech-plan', type: 'DATA' },
                {
                  label: '分系统设计',
                  _tempId: 'subsystems',
                  type: 'PBS',
                  children: [
                    { label: '结构分系统', _tempId: 'struct', type: 'PBS' },
                    { label: '电子分系统', _tempId: 'elec', type: 'PBS' },
                    { label: '软件分系统', _tempId: 'soft', type: 'PBS' },
                  ],
                },
                { label: '方案评审', _tempId: 'plan-review', type: 'TASK' },
              ],
            },
            {
              label: '三、工程研制阶段',
              _tempId: 'phase-3',
              type: 'PBS',
              children: [
                { label: '详细设计', _tempId: 'detail-design', type: 'TASK' },
                { label: '原理样机研制', _tempId: 'prototype', type: 'TASK' },
                { label: '工程样机研制', _tempId: 'engineering', type: 'TASK' },
                { label: '整机联试', _tempId: 'integration', type: 'TASK' },
              ],
            },
            {
              label: '四、设计定型阶段',
              _tempId: 'phase-4',
              type: 'PBS',
              children: [
                { label: '定型试验', _tempId: 'qual-test', type: 'TASK' },
                { label: '可靠性试验', _tempId: 'reliability', type: 'TASK' },
                { label: '设计定型评审', _tempId: 'design-review', type: 'TASK' },
                { label: '定型文件', _tempId: 'qual-doc', type: 'DATA' },
              ],
            },
            {
              label: '五、生产定型阶段',
              _tempId: 'phase-5',
              type: 'PBS',
              children: [
                { label: '工艺定型', _tempId: 'process', type: 'TASK' },
                { label: '首批生产', _tempId: 'first-batch', type: 'TASK' },
                { label: '生产定型评审', _tempId: 'prod-review', type: 'TASK' },
              ],
            },
          ],
        },
        edges: [
          { sourceRef: 'req-analysis', targetRef: 'feasibility', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'feasibility', targetRef: 'proposal', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'task-book', targetRef: 'tech-plan', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'plan-review', targetRef: 'detail-design', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'prototype', targetRef: 'engineering', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'engineering', targetRef: 'integration', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'integration', targetRef: 'qual-test', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'design-review', targetRef: 'process', kind: 'dependency', dependencyType: 'FS' },
        ],
      },
      defaultClassification: 'confidential',
      requiredFields: ['owner', 'dueDate'],
      status: TemplateStatus.PUBLISHED,
      isPublic: true,
    },
    // === 新增：卫星系统研制模板 ===
    {
      id: 'tpl-satellite',
      name: '卫星系统研制',
      description: '卫星系统研制模板，包含总体设计、有效载荷、平台分系统和测试验证',
      categoryId: 'cat-tech',
      structure: {
        rootNode: {
          label: 'XX卫星',
          _tempId: 'sat-root',
          type: 'PBS',
          children: [
            {
              label: '卫星总体',
              _tempId: 'sat-sys',
              type: 'PBS',
              children: [
                { label: '任务轨道设计', _tempId: 'orbit', type: 'TASK' },
                { label: '总体方案', _tempId: 'sat-plan', type: 'DATA' },
                { label: '接口定义', _tempId: 'interface', type: 'DATA' },
              ],
            },
            {
              label: '有效载荷',
              _tempId: 'payload',
              type: 'PBS',
              children: [
                { label: '遥感相机', _tempId: 'camera', type: 'PBS' },
                { label: '数据传输', _tempId: 'data-tx', type: 'PBS' },
              ],
            },
            {
              label: '卫星平台',
              _tempId: 'platform',
              type: 'PBS',
              children: [
                { label: '结构与热控', _tempId: 'struct-thermal', type: 'PBS' },
                { label: '姿态控制', _tempId: 'adcs', type: 'PBS' },
                { label: '推进系统', _tempId: 'propulsion', type: 'PBS' },
                { label: '电源系统', _tempId: 'power', type: 'PBS' },
                { label: '测控与数管', _tempId: 'ttc', type: 'PBS' },
              ],
            },
            {
              label: '总装与测试',
              _tempId: 'ait',
              type: 'PBS',
              children: [
                { label: '部组件测试', _tempId: 'unit-test', type: 'TASK' },
                { label: '整星总装', _tempId: 'assembly', type: 'TASK' },
                { label: '环境试验', _tempId: 'env-test', type: 'TASK' },
                { label: '发射场测试', _tempId: 'launch-test', type: 'TASK' },
              ],
            },
          ],
        },
        edges: [
          { sourceRef: 'sat-plan', targetRef: 'interface', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'unit-test', targetRef: 'assembly', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'assembly', targetRef: 'env-test', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'env-test', targetRef: 'launch-test', kind: 'dependency', dependencyType: 'FS' },
        ],
      },
      defaultClassification: 'confidential',
      requiredFields: ['owner'],
      status: TemplateStatus.PUBLISHED,
      isPublic: true,
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
