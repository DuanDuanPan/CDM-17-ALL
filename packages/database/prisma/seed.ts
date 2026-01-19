/**
 * Database Seed Script
 * Creates test users and template library for development
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TemplateStatus } from '@prisma/client';

// Prisma 7: Use Driver Adapter for database connection
const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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
    { id: 'cat-aerospace', name: '航天研发', icon: 'Rocket', sortOrder: 4 },
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
      requiredFields: undefined,
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
    // ========================================
    // 卫星研发领域应用场景模板（基于 feature-specification.md）
    // ========================================

    // === 场景一：卫星总体设计协同 ===
    {
      id: 'tpl-sat-design',
      name: '卫星总体设计协同',
      description: '覆盖卫星总体设计全流程，支持PBS分解、指标分配、多分系统并行协同设计，适用于论证和方案阶段',
      categoryId: 'cat-aerospace',
      structure: {
        rootNode: {
          label: 'XX卫星总体设计',
          _tempId: 'design-root',
          type: 'PBS',
          children: [
            {
              label: '任务分析',
              _tempId: 'mission-analysis',
              type: 'PBS',
              children: [
                {
                  label: '任务需求',
                  _tempId: 'mission-req',
                  type: 'PBS',
                  children: [
                    { label: '成像需求', _tempId: 'imaging-req', type: 'REQUIREMENT' },
                    { label: '覆盖需求', _tempId: 'coverage-req', type: 'REQUIREMENT' },
                    { label: '寿命需求', _tempId: 'lifetime-req', type: 'REQUIREMENT' },
                  ],
                },
                {
                  label: '约束条件',
                  _tempId: 'constraints',
                  type: 'PBS',
                  children: [
                    { label: '发射窗口', _tempId: 'launch-window' },
                    { label: '成本约束', _tempId: 'cost-constraint' },
                  ],
                },
              ],
            },
            {
              label: '总体方案设计',
              _tempId: 'overall-design',
              type: 'PBS',
              children: [
                { label: '轨道设计', _tempId: 'orbit-design', type: 'PBS' },
                { label: '构型设计', _tempId: 'config-design', type: 'PBS' },
                { label: '总体指标分配', _tempId: 'index-allocation', type: 'PBS' },
              ],
            },
            {
              label: '分系统设计',
              _tempId: 'subsystem-design',
              type: 'PBS',
              children: [
                { label: '结构分系统', _tempId: 'structure-sys', type: 'PBS' },
                { label: '热控分系统', _tempId: 'thermal-sys', type: 'PBS' },
                { label: '姿轨控分系统', _tempId: 'adcs-sys', type: 'PBS' },
                { label: '电源分系统', _tempId: 'power-sys', type: 'PBS' },
                { label: '测控分系统', _tempId: 'ttc-sys', type: 'PBS' },
                { label: '数传分系统', _tempId: 'datatx-sys', type: 'PBS' },
                { label: '有效载荷', _tempId: 'payload-sys', type: 'PBS' },
              ],
            },
            {
              label: '接口设计',
              _tempId: 'interface-design',
              type: 'PBS',
              children: [
                { label: '机械接口', _tempId: 'mech-if', type: 'DATA' },
                { label: '电气接口', _tempId: 'elec-if', type: 'DATA' },
                { label: '信息接口', _tempId: 'info-if', type: 'DATA' },
              ],
            },
            {
              label: '设计评审',
              _tempId: 'design-review',
              type: 'PBS',
              children: [
                { label: '初样评审', _tempId: 'prototype-review', type: 'TASK' },
                { label: '正样评审', _tempId: 'flight-review', type: 'TASK' },
              ],
            },
          ],
        },
        edges: [
          { sourceRef: 'mission-req', targetRef: 'overall-design', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'overall-design', targetRef: 'subsystem-design', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'subsystem-design', targetRef: 'interface-design', kind: 'dependency', dependencyType: 'SS' },
          { sourceRef: 'prototype-review', targetRef: 'flight-review', kind: 'dependency', dependencyType: 'FS' },
        ],
      },
      defaultClassification: 'confidential',
      requiredFields: ['owner', 'dueDate'],
      status: TemplateStatus.PUBLISHED,
      isPublic: true,
    },

    // === 场景二：型号测试管理 ===
    {
      id: 'tpl-sat-test',
      name: '型号测试管理',
      description: '卫星研制全级别测试管理模板，覆盖单机、分系统、整星各级测试及发射场测试',
      categoryId: 'cat-aerospace',
      structure: {
        rootNode: {
          label: 'XX卫星型号测试',
          _tempId: 'test-root',
          type: 'PBS',
          children: [
            {
              label: '测试策划',
              _tempId: 'test-planning',
              type: 'PBS',
              children: [
                { label: '测试大纲', _tempId: 'test-outline', type: 'DATA' },
                { label: '测试资源计划', _tempId: 'test-resource', type: 'TASK' },
                { label: '测试风险识别', _tempId: 'test-risk', type: 'TASK' },
              ],
            },
            {
              label: '单机级测试',
              _tempId: 'unit-level',
              type: 'PBS',
              children: [
                { label: '敏感器测试', _tempId: 'sensor-test', type: 'TASK' },
                { label: '执行机构测试', _tempId: 'actuator-test', type: 'TASK' },
                { label: '电源单机测试', _tempId: 'power-unit-test', type: 'TASK' },
              ],
            },
            {
              label: '分系统级测试',
              _tempId: 'subsys-level',
              type: 'PBS',
              children: [
                { label: '姿控分系统联试', _tempId: 'adcs-test', type: 'TASK' },
                { label: '电源分系统测试', _tempId: 'power-sys-test', type: 'TASK' },
                { label: '测控分系统测试', _tempId: 'ttc-test', type: 'TASK' },
              ],
            },
            {
              label: '整星级测试',
              _tempId: 'satellite-level',
              type: 'PBS',
              children: [
                { label: '电性能综合测试', _tempId: 'elec-perf-test', type: 'TASK' },
                {
                  label: '力学环境试验',
                  _tempId: 'mech-env',
                  type: 'PBS',
                  children: [
                    { label: '正弦扫频', _tempId: 'sine-sweep', type: 'TASK' },
                    { label: '随机振动', _tempId: 'random-vib', type: 'TASK' },
                    { label: '冲击试验', _tempId: 'shock-test', type: 'TASK' },
                  ],
                },
                {
                  label: '热环境试验',
                  _tempId: 'thermal-env',
                  type: 'PBS',
                  children: [
                    { label: '热平衡试验', _tempId: 'thermal-balance', type: 'TASK' },
                    { label: '热真空试验', _tempId: 'thermal-vacuum', type: 'TASK' },
                  ],
                },
                { label: 'EMC试验', _tempId: 'emc-test', type: 'TASK' },
              ],
            },
            {
              label: '发射场测试',
              _tempId: 'launch-site',
              type: 'PBS',
              children: [
                { label: '电测', _tempId: 'launch-elec', type: 'TASK' },
                { label: '加注', _tempId: 'fueling', type: 'TASK' },
                { label: '射前准备', _tempId: 'pre-launch', type: 'TASK' },
              ],
            },
          ],
        },
        edges: [
          { sourceRef: 'test-outline', targetRef: 'unit-level', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'unit-level', targetRef: 'subsys-level', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'subsys-level', targetRef: 'satellite-level', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'satellite-level', targetRef: 'launch-site', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'sine-sweep', targetRef: 'random-vib', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'random-vib', targetRef: 'shock-test', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'thermal-balance', targetRef: 'thermal-vacuum', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'launch-elec', targetRef: 'fueling', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'fueling', targetRef: 'pre-launch', kind: 'dependency', dependencyType: 'FS' },
        ],
      },
      defaultClassification: 'confidential',
      requiredFields: ['executor', 'dueDate'],
      status: TemplateStatus.PUBLISHED,
      isPublic: true,
    },

    // === 场景三：故障归零与知识沉淀 ===
    {
      id: 'tpl-fault-zero',
      name: '故障归零与知识沉淀',
      description: '航天产品故障归零专用模板，覆盖故障定位、原因分析、措施验证、举一反三、知识沉淀全流程',
      categoryId: 'cat-aerospace',
      structure: {
        rootNode: {
          label: 'XX故障归零',
          _tempId: 'fault-root',
          type: 'PBS',
          children: [
            {
              label: '故障现象',
              _tempId: 'fault-symptom',
              type: 'PBS',
              children: [
                { label: '发现时间与环境', _tempId: 'discovery-context' },
                { label: '故障描述', _tempId: 'fault-desc', type: 'DATA' },
                { label: '影响范围评估', _tempId: 'impact-assess' },
              ],
            },
            {
              label: '故障定位',
              _tempId: 'fault-locate',
              type: 'PBS',
              children: [
                { label: '现象复现', _tempId: 'reproduce', type: 'TASK' },
                { label: '数据分析', _tempId: 'data-analysis', type: 'TASK' },
                { label: '故障树构建', _tempId: 'fault-tree', type: 'DATA' },
              ],
            },
            {
              label: '原因分析',
              _tempId: 'root-cause',
              type: 'PBS',
              children: [
                { label: '设计缺陷分析', _tempId: 'design-defect' },
                { label: '工艺原因分析', _tempId: 'process-cause' },
                { label: '使用不当分析', _tempId: 'misuse-cause' },
                { label: '根本原因结论', _tempId: 'root-conclusion', type: 'DATA' },
              ],
            },
            {
              label: '归零措施',
              _tempId: 'zero-measures',
              type: 'PBS',
              children: [
                { label: '技术归零措施', _tempId: 'tech-zero', type: 'TASK' },
                { label: '管理归零措施', _tempId: 'mgmt-zero', type: 'TASK' },
              ],
            },
            {
              label: '措施验证',
              _tempId: 'verification',
              type: 'PBS',
              children: [
                { label: '验证方案', _tempId: 'verify-plan', type: 'DATA' },
                { label: '验证实施', _tempId: 'verify-exec', type: 'TASK' },
                { label: '验证结论', _tempId: 'verify-conclusion' },
              ],
            },
            {
              label: '举一反三',
              _tempId: 'extend-check',
              type: 'PBS',
              children: [
                { label: '同类产品排查', _tempId: 'similar-check', type: 'TASK' },
                { label: '类似问题预防', _tempId: 'prevention' },
              ],
            },
            {
              label: '归档沉淀',
              _tempId: 'archive',
              type: 'PBS',
              children: [
                { label: '归零报告', _tempId: 'zero-report', type: 'DATA' },
                { label: '知识库更新', _tempId: 'kb-update', type: 'TASK' },
              ],
            },
          ],
        },
        edges: [
          { sourceRef: 'fault-symptom', targetRef: 'fault-locate', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'fault-locate', targetRef: 'root-cause', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'root-cause', targetRef: 'zero-measures', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'zero-measures', targetRef: 'verification', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'verification', targetRef: 'extend-check', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'extend-check', targetRef: 'archive', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'tech-zero', targetRef: 'verify-exec', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'mgmt-zero', targetRef: 'verify-exec', kind: 'dependency', dependencyType: 'FS' },
        ],
      },
      defaultClassification: 'confidential',
      requiredFields: ['owner', 'dueDate'],
      status: TemplateStatus.PUBLISHED,
      isPublic: true,
    },

    // === 场景四：多方协同与供应链管理 ===
    {
      id: 'tpl-supply-chain',
      name: '多方协同与供应链管理',
      description: '卫星配套单位协同管理模板，支持任务下发、进度跟踪、交付验收、质量保证',
      categoryId: 'cat-aerospace',
      structure: {
        rootNode: {
          label: 'XX卫星供应链管理',
          _tempId: 'supply-root',
          type: 'PBS',
          children: [
            {
              label: '配套策划',
              _tempId: 'supply-planning',
              type: 'PBS',
              children: [
                { label: '配套清单', _tempId: 'supply-list', type: 'DATA' },
                { label: '供应商选择', _tempId: 'supplier-select', type: 'TASK' },
                { label: '进度计划', _tempId: 'schedule-plan', type: 'DATA' },
              ],
            },
            {
              label: '关键单机配套',
              _tempId: 'key-units',
              type: 'PBS',
              children: [
                {
                  label: '单机A配套',
                  _tempId: 'unit-a',
                  type: 'PBS',
                  children: [
                    { label: '技术协调', _tempId: 'unit-a-coord', type: 'TASK' },
                    { label: '进度跟踪', _tempId: 'unit-a-track', type: 'TASK' },
                    { label: '交付验收', _tempId: 'unit-a-accept', type: 'TASK' },
                  ],
                },
                {
                  label: '单机B配套',
                  _tempId: 'unit-b',
                  type: 'PBS',
                  children: [
                    { label: '技术协调', _tempId: 'unit-b-coord', type: 'TASK' },
                    { label: '进度跟踪', _tempId: 'unit-b-track', type: 'TASK' },
                    { label: '交付验收', _tempId: 'unit-b-accept', type: 'TASK' },
                  ],
                },
                {
                  label: '单机C配套',
                  _tempId: 'unit-c',
                  type: 'PBS',
                  children: [
                    { label: '技术协调', _tempId: 'unit-c-coord', type: 'TASK' },
                    { label: '进度跟踪', _tempId: 'unit-c-track', type: 'TASK' },
                    { label: '交付验收', _tempId: 'unit-c-accept', type: 'TASK' },
                  ],
                },
              ],
            },
            {
              label: '软件配套',
              _tempId: 'sw-supply',
              type: 'PBS',
              children: [
                { label: '星载软件', _tempId: 'onboard-sw', type: 'TASK' },
                { label: '地面软件', _tempId: 'ground-sw', type: 'TASK' },
              ],
            },
            {
              label: '质量保证',
              _tempId: 'quality-assurance',
              type: 'PBS',
              children: [
                { label: '供应商审核', _tempId: 'supplier-audit', type: 'TASK' },
                { label: '过程监督', _tempId: 'process-monitor', type: 'TASK' },
                { label: '不合格品控制', _tempId: 'ncr-control', type: 'TASK' },
              ],
            },
            {
              label: '交付管理',
              _tempId: 'delivery-mgmt',
              type: 'PBS',
              children: [
                { label: '交付物清单', _tempId: 'delivery-list', type: 'DATA' },
                { label: '技术文件验收', _tempId: 'doc-accept', type: 'TASK' },
                { label: '实物验收', _tempId: 'hardware-accept', type: 'TASK' },
              ],
            },
          ],
        },
        edges: [
          { sourceRef: 'supply-list', targetRef: 'supplier-select', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'supplier-select', targetRef: 'key-units', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'unit-a-coord', targetRef: 'unit-a-track', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'unit-a-track', targetRef: 'unit-a-accept', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'unit-b-coord', targetRef: 'unit-b-track', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'unit-b-track', targetRef: 'unit-b-accept', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'unit-c-coord', targetRef: 'unit-c-track', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'unit-c-track', targetRef: 'unit-c-accept', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'doc-accept', targetRef: 'hardware-accept', kind: 'dependency', dependencyType: 'FS' },
        ],
      },
      defaultClassification: 'internal',
      requiredFields: ['executor', 'dueDate'],
      status: TemplateStatus.PUBLISHED,
      isPublic: true,
    },

    // === 场景五：星载软件研发 ===
    {
      id: 'tpl-sw-dev',
      name: '星载软件研发',
      description: '卫星星载/地面软件全生命周期研发模板，覆盖需求、设计、编码、测试、配置管理和鉴定',
      categoryId: 'cat-aerospace',
      structure: {
        rootNode: {
          label: '星载软件研发',
          _tempId: 'sw-root',
          type: 'PBS',
          children: [
            {
              label: '需求阶段',
              _tempId: 'req-phase',
              type: 'PBS',
              children: [
                { label: '软件需求规格', _tempId: 'sw-srs', type: 'REQUIREMENT' },
                { label: '需求分析报告', _tempId: 'req-report', type: 'DATA' },
                { label: '需求评审', _tempId: 'req-review', type: 'TASK' },
              ],
            },
            {
              label: '设计阶段',
              _tempId: 'design-phase',
              type: 'PBS',
              children: [
                { label: '概要设计', _tempId: 'high-design', type: 'DATA' },
                { label: '详细设计', _tempId: 'detail-design', type: 'DATA' },
                { label: '设计评审', _tempId: 'design-rev', type: 'TASK' },
              ],
            },
            {
              label: '编码阶段',
              _tempId: 'code-phase',
              type: 'PBS',
              children: [
                { label: '代码仓库', _tempId: 'code-repo', type: 'APP' },
                { label: '代码审查', _tempId: 'code-review', type: 'TASK' },
                { label: '静态分析', _tempId: 'static-analysis', type: 'TASK' },
              ],
            },
            {
              label: '测试阶段',
              _tempId: 'test-phase',
              type: 'PBS',
              children: [
                { label: '单元测试', _tempId: 'unit-test', type: 'TASK' },
                { label: '集成测试', _tempId: 'integration-test', type: 'TASK' },
                { label: '系统测试', _tempId: 'system-test', type: 'TASK' },
                { label: '测试报告', _tempId: 'test-report', type: 'DATA' },
              ],
            },
            {
              label: '配置管理',
              _tempId: 'config-mgmt',
              type: 'PBS',
              children: [
                { label: '基线管理', _tempId: 'baseline-mgmt' },
                { label: '变更控制', _tempId: 'change-control', type: 'TASK' },
                { label: '版本发布', _tempId: 'release' },
              ],
            },
            {
              label: '软件鉴定',
              _tempId: 'sw-qual',
              type: 'PBS',
              children: [
                { label: '鉴定测试', _tempId: 'qual-test', type: 'TASK' },
                { label: '鉴定报告', _tempId: 'qual-report', type: 'DATA' },
                { label: '软件归档', _tempId: 'sw-archive', type: 'TASK' },
              ],
            },
          ],
        },
        edges: [
          { sourceRef: 'sw-srs', targetRef: 'req-review', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'req-review', targetRef: 'design-phase', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'design-rev', targetRef: 'code-phase', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'code-review', targetRef: 'test-phase', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'unit-test', targetRef: 'integration-test', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'integration-test', targetRef: 'system-test', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'system-test', targetRef: 'qual-test', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'qual-test', targetRef: 'sw-archive', kind: 'dependency', dependencyType: 'FS' },
        ],
      },
      defaultClassification: 'confidential',
      requiredFields: ['owner', 'dueDate'],
      status: TemplateStatus.PUBLISHED,
      isPublic: true,
    },

    // === 场景六：AIT流程管理 ===
    {
      id: 'tpl-ait-mgmt',
      name: 'AIT流程管理',
      description: '卫星总装、集成、测试（AIT）全流程管理模板，支持工序依赖管理和质量关口审批',
      categoryId: 'cat-aerospace',
      structure: {
        rootNode: {
          label: 'AIT流程管理',
          _tempId: 'ait-root',
          type: 'PBS',
          children: [
            {
              label: '总装阶段',
              _tempId: 'assembly-phase',
              type: 'PBS',
              children: [
                { label: '部组件接收', _tempId: 'component-receive', type: 'TASK' },
                {
                  label: '分系统总装',
                  _tempId: 'subsys-assembly',
                  type: 'PBS',
                  children: [
                    { label: '结构分系统总装', _tempId: 'struct-asm', type: 'TASK' },
                    { label: '电源分系统总装', _tempId: 'power-asm', type: 'TASK' },
                    { label: '姿控分系统总装', _tempId: 'adcs-asm', type: 'TASK' },
                  ],
                },
                { label: '整星总装', _tempId: 'satellite-asm', type: 'TASK' },
                { label: '总装质量检验', _tempId: 'asm-qc', type: 'TASK' },
              ],
            },
            {
              label: '集成阶段',
              _tempId: 'integration-phase',
              type: 'PBS',
              children: [
                { label: '电缆网集成', _tempId: 'cable-integration', type: 'TASK' },
                { label: '分系统集成', _tempId: 'subsys-integration', type: 'TASK' },
                { label: '整星集成', _tempId: 'sat-integration', type: 'TASK' },
              ],
            },
            {
              label: '测试阶段',
              _tempId: 'test-phase-ait',
              type: 'PBS',
              children: [
                { label: '电性能测试', _tempId: 'elec-test', type: 'TASK' },
                { label: '力学试验', _tempId: 'mech-test', type: 'TASK' },
                { label: '热试验', _tempId: 'thermal-test', type: 'TASK' },
              ],
            },
            {
              label: '质量关口',
              _tempId: 'quality-gates',
              type: 'PBS',
              children: [
                { label: '总装评审', _tempId: 'asm-review', type: 'TASK' },
                { label: '出厂评审', _tempId: 'factory-review', type: 'TASK' },
                { label: '发射场转运评审', _tempId: 'transport-review', type: 'TASK' },
              ],
            },
            {
              label: 'AIT资源',
              _tempId: 'ait-resources',
              type: 'PBS',
              children: [
                { label: '工艺文件', _tempId: 'process-docs', type: 'DATA' },
                { label: '测试设备', _tempId: 'test-equipment', type: 'DATA' },
                { label: '人员资质', _tempId: 'personnel-qual', type: 'DATA' },
              ],
            },
          ],
        },
        edges: [
          { sourceRef: 'component-receive', targetRef: 'subsys-assembly', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'struct-asm', targetRef: 'satellite-asm', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'power-asm', targetRef: 'satellite-asm', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'adcs-asm', targetRef: 'satellite-asm', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'satellite-asm', targetRef: 'asm-qc', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'asm-qc', targetRef: 'asm-review', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'asm-review', targetRef: 'integration-phase', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'cable-integration', targetRef: 'subsys-integration', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'subsys-integration', targetRef: 'sat-integration', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'sat-integration', targetRef: 'test-phase-ait', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'elec-test', targetRef: 'mech-test', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'mech-test', targetRef: 'thermal-test', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'thermal-test', targetRef: 'factory-review', kind: 'dependency', dependencyType: 'FS' },
          { sourceRef: 'factory-review', targetRef: 'transport-review', kind: 'dependency', dependencyType: 'FS' },
        ],
      },
      defaultClassification: 'confidential',
      requiredFields: ['executor', 'dueDate'],
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
