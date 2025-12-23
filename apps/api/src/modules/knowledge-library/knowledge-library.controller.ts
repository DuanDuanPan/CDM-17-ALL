/**
 * Story 2.8: Mock Knowledge Library Controller
 * Provides mock knowledge resource data for Task node knowledge linking
 * 
 * Note: This is a mock implementation. Real knowledge base integration is scheduled for Epic 5.
 */
import { Controller, Get, Query } from '@nestjs/common';
import type { KnowledgeReference } from '@cdm/types';

// Mock knowledge data - 卫星研发领域中文知识库 (hardcoded for MVP)
const MOCK_KNOWLEDGE: KnowledgeReference[] = [
    {
        id: 'kb_01',
        title: '小卫星总体设计规范',
        type: 'document',
        url: 'https://arxiv.org/pdf/2311.00262.pdf',
        summary: '小卫星系统总体设计要求与技术规范，包括质量、功率、尺寸约束'
    },
    {
        id: 'kb_02',
        title: '卫星热控系统设计手册',
        type: 'document',
        url: 'https://ntrs.nasa.gov/api/citations/20210000685/downloads/NASA-SP-8105-REV1.pdf',
        summary: '卫星热控制系统设计原理、热分析方法与被动/主动热控技术'
    },
    {
        id: 'kb_03',
        title: '姿态轨道控制系统(AOCS)技术指南',
        type: 'document',
        url: 'https://arxiv.org/pdf/2401.00892.pdf',
        summary: '卫星姿态确定与控制算法、敏感器配置与执行机构选型'
    },
    {
        id: 'kb_04',
        title: '星载软件开发标准ECSS-E-ST-40C',
        type: 'link',
        url: 'https://ecss.nl/standard/ecss-e-st-40c-software-general-requirements/',
        summary: '欧空局星载软件开发生命周期、质量保证与验证要求'
    },
    {
        id: 'kb_05',
        title: '卫星结构与机构设计规范',
        type: 'document',
        url: 'https://ntrs.nasa.gov/api/citations/19950022146/downloads/19950022146.pdf',
        summary: '卫星结构设计载荷分析、材料选型与展开机构设计要点'
    },
    {
        id: 'kb_06',
        title: '空间环境与辐射效应分析',
        type: 'document',
        url: 'https://arxiv.org/pdf/2303.11000.pdf',
        summary: '空间辐射环境建模、单粒子效应与总剂量效应防护设计'
    },
    {
        id: 'kb_07',
        title: '卫星电源分系统设计标准',
        type: 'document',
        url: 'https://ntrs.nasa.gov/api/citations/20180006860/downloads/20180006860.pdf',
        summary: '太阳电池阵、蓄电池组与电源控制器设计规范'
    },
    {
        id: 'kb_08',
        title: '星地链路设计与测控通信',
        type: 'link',
        url: 'https://public.ccsds.org/Pubs/413x0g3e2.pdf',
        summary: 'CCSDS标准、链路预算分析与遥测遥控协议设计'
    },
    {
        id: 'kb_09',
        title: '卫星可靠性与FMECA分析',
        type: 'document',
        url: 'https://ntrs.nasa.gov/api/citations/19930020471/downloads/19930020471.pdf',
        summary: '卫星系统可靠性设计、故障模式分析与冗余设计策略'
    },
    {
        id: 'kb_10',
        title: '商业航天法规与合规指南',
        type: 'link',
        url: 'https://www.itu.int/en/ITU-R/space/Pages/default.aspx',
        summary: 'ITU频谱协调、出口管制与商业发射许可证申请流程'
    },
    {
        id: 'kb_11',
        title: '卫星推进系统设计技术',
        type: 'document',
        url: 'https://arxiv.org/pdf/2308.15988.pdf',
        summary: '化学推进与电推进系统选型、推力器布局与燃料管理'
    },
    {
        id: 'kb_12',
        title: '星上数据处理与压缩算法',
        type: 'document',
        url: 'https://arxiv.org/pdf/2305.01254.pdf',
        summary: '遥感图像压缩、边缘计算与星上智能处理技术'
    },
];

@Controller('knowledge-library')
export class KnowledgeLibraryController {
    /**
     * GET /api/knowledge-library
     * Returns list of mock knowledge resources, optionally filtered by search query
     *
     * @param q - Optional search query (filters by title or summary)
     * @returns Array of matching knowledge references
     */
    @Get()
    searchKnowledge(@Query('q') q?: string): KnowledgeReference[] {
        if (!q || q.trim() === '') {
            return MOCK_KNOWLEDGE;
        }

        const query = q.toLowerCase().trim();

        return MOCK_KNOWLEDGE.filter(
            (item) =>
                item.title.toLowerCase().includes(query) ||
                (item.summary && item.summary.toLowerCase().includes(query)) ||
                item.type.toLowerCase().includes(query)
        );
    }
}
