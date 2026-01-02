'use client';

/**
 * 图谱列表页面
 * 显示当前用户的所有图谱，支持创建和删除操作
 * Story 5.1: 添加从模板创建功能
 */

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlusCircle, Folder, Trash2, Clock, Boxes, GitBranch, LayoutTemplate } from 'lucide-react';
import { useGraphs } from '@/hooks/useGraphs';
import { TemplateLibraryDialog } from '@/components/TemplateLibrary';
import type { CreateFromTemplateResponse } from '@cdm/types';

function GraphsListContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = searchParams.get('userId') || 'test1';

    const { graphs, isLoading, error, createGraph, deleteGraph } = useGraphs(userId);

    // Story 5.1: Template library dialog state
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

    // Story 5.1: Handle template selection - navigate to new graph
    const handleTemplateSelect = (result: CreateFromTemplateResponse) => {
        setTemplateDialogOpen(false);
        router.push(`/graph/${result.graphId}?userId=${userId}`);
    };

    const handleCreateGraph = async () => {
        try {
            const newGraph = await createGraph();
            router.push(`/graph/${newGraph.id}?userId=${userId}`);
        } catch (err) {
            console.error('Failed to create graph:', err);
            alert('创建图谱失败');
        }
    };

    const handleOpenGraph = (graphId: string) => {
        router.push(`/graph/${graphId}?userId=${userId}`);
    };

    const handleDeleteGraph = async (graphId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('确定要删除这个图谱吗？此操作不可恢复。')) {
            return;
        }
        try {
            await deleteGraph(graphId);
        } catch (err) {
            console.error('Failed to delete graph:', err);
            alert('删除图谱失败');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">加载图谱列表...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <p className="text-red-500">加载失败: {error.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        重试
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white/70 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                我的图谱
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                用户：<span className="font-medium text-gray-700">{userId}</span>
                            </p>
                        </div>
                        {/* Story 5.1: Button group for graph creation */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setTemplateDialogOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-blue-200
                                           text-blue-600 rounded-xl hover:bg-blue-50 hover:border-blue-300
                                           transition-all shadow-sm hover:shadow-md"
                            >
                                <LayoutTemplate className="w-5 h-5" />
                                从模板创建
                            </button>
                            <button
                                onClick={handleCreateGraph}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 
                                           text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 
                                           transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
                            >
                                <PlusCircle className="w-5 h-5" />
                                创建空白图谱
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Empty State */}
                {graphs.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-16 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Folder className="w-10 h-10 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">
                            还没有图谱
                        </h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            创建你的第一个思维导图，开始组织和规划你的想法吧！
                        </p>
                        <button
                            onClick={handleCreateGraph}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600
                       text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 
                       transition-all shadow-lg shadow-blue-500/25"
                        >
                            <PlusCircle className="w-5 h-5" />
                            创建第一个图谱
                        </button>
                    </div>
                )}

                {/* Graph Grid */}
                {graphs.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {graphs.map((graph) => (
                            <div
                                key={graph.id}
                                onClick={() => handleOpenGraph(graph.id)}
                                className="group bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 cursor-pointer 
                         hover:shadow-xl hover:shadow-blue-200/50 transition-all duration-300
                         border-2 border-transparent hover:border-blue-200 relative overflow-hidden"
                            >
                                {/* Gradient overlay on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-indigo-50/0 
                              group-hover:from-blue-50/50 group-hover:to-indigo-50/50 transition-all duration-300" />

                                {/* Content */}
                                <div className="relative">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl 
                                  flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Folder className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteGraph(graph.id, e)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 
                               rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="删除图谱"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                        {graph.name}
                                    </h3>

                                    <p className="text-sm text-gray-500 mb-4">
                                        {graph.project.name}
                                    </p>

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{new Date(graph.updatedAt).toLocaleDateString('zh-CN')}</span>
                                        </div>
                                        {graph._count && (
                                            <>
                                                <div className="flex items-center gap-1">
                                                    <Boxes className="w-3.5 h-3.5" />
                                                    <span>{graph._count.nodes} 节点</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <GitBranch className="w-3.5 h-3.5" />
                                                    <span>{graph._count.edges} 连接</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Story 5.1: Template Library Dialog */}
            <TemplateLibraryDialog
                open={templateDialogOpen}
                onOpenChange={setTemplateDialogOpen}
                onSelect={handleTemplateSelect}
                userId={userId}
            />
        </div>
    );
}

export default function GraphsListPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">加载中...</p>
                </div>
            </div>
        }>
            <GraphsListContent />
        </Suspense>
    );
}
