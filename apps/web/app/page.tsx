'use client';

/**
 * 首页 - Landing Page
 * 
 * 功能：
 * 1. 获取 userId 参数（默认 test1）
 * 2. 检查用户是否有图谱
 * 3. 如果有图谱 -> 重定向到图谱列表
 * 4. 如果没有图谱 -> 自动创建第一个图谱并直接进入（一键快速开始）
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Folder, Sparkles } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || 'test1';

  const [status, setStatus] = useState<'loading' | 'creating' | 'redirecting'>('loading');
  const [message, setMessage] = useState('正在加载...');

  useEffect(() => {
    async function initializeUserGraphs() {
      try {
        // 1. 获取用户的图谱列表
        setMessage('正在检查图谱...');
        const response = await fetch(`${API_BASE_URL}/api/graphs?userId=${userId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch graphs');
        }

        const graphs = await response.json();

        // 2. 如果有图谱，重定向到列表页
        if (graphs.length > 0) {
          setStatus('redirecting');
          setMessage('正在跳转到图谱列表...');
          router.push(`/graphs?userId=${userId}`);
          return;
        }

        // 3. 如果没有图谱，自动创建第一个（一键快速开始）
        setStatus('creating');
        setMessage('正在为您创建第一个图谱...');

        const createResponse = await fetch(`${API_BASE_URL}/api/graphs?userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '我的第一个图谱' }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create graph');
        }

        const newGraph = await createResponse.json();

        // 4. 直接进入新创建的图谱
        setStatus('redirecting');
        setMessage('正在进入图谱编辑器...');
        router.push(`/graph/${newGraph.id}?userId=${userId}`);

      } catch (error) {
        console.error('Failed to initialize:', error);
        setMessage('加载失败，请刷新页面重试');
      }
    }

    initializeUserGraphs();
  }, [router, userId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        {/* Logo/Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl 
                        flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
            <Folder className="w-12 h-12 text-white" />
          </div>
          {status === 'creating' && (
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 
                          rounded-full flex items-center justify-center animate-bounce">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Loading spinner */}
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
        </div>

        {/* Status message */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {status === 'loading' && '欢迎回来'}
          {status === 'creating' && '正在初始化'}
          {status === 'redirecting' && '准备就绪'}
        </h2>
        <p className="text-gray-500">{message}</p>

        {/* User info */}
        <div className="mt-8 px-4 py-2 bg-white/50 rounded-full inline-block">
          <span className="text-sm text-gray-500">
            用户：<span className="font-medium text-gray-700">{userId}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

