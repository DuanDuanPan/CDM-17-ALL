/**
 * Story 4.3+: Comment Attachments
 * Next.js API Route - Download/Delete attachment proxy
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = request.headers.get('x-user-id') || 'anonymous';

        const response = await fetch(`${API_BASE}/api/comments/attachments/${id}`, {
            headers: {
                'x-user-id': userId,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: errorText || '文件不存在' },
                { status: response.status }
            );
        }

        // Forward the file response with proper headers
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const contentDisposition = response.headers.get('content-disposition');
        const contentLength = response.headers.get('content-length');

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        if (contentDisposition) {
            headers.set('Content-Disposition', contentDisposition);
        }
        if (contentLength) {
            headers.set('Content-Length', contentLength);
        }

        return new NextResponse(response.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('[Attachment Download] Error:', error);
        return NextResponse.json(
            { error: '下载失败' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID required' },
                { status: 401 }
            );
        }

        const response = await fetch(`${API_BASE}/api/comments/attachments/${id}`, {
            method: 'DELETE',
            headers: {
                'x-user-id': userId,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[Attachment Delete] Error:', error);
        return NextResponse.json(
            { error: '删除失败' },
            { status: 500 }
        );
    }
}
