/**
 * Story 4.3+: Comment Attachments
 * Story 10.5: Forward graphId for FileStorageService
 * Next.js API Route - Upload attachment proxy
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json(
                { error: 'User ID required' },
                { status: 401 }
            );
        }

        // Story 10.5: Get graphId from query parameter
        const graphId = request.nextUrl.searchParams.get('graphId');
        if (!graphId) {
            return NextResponse.json(
                { error: 'graphId is required' },
                { status: 400 }
            );
        }

        // Forward the multipart form data to the backend
        const formData = await request.formData();

        // Story 10.5: Forward graphId to backend as query parameter
        const backendUrl = `${API_BASE}/api/comments/attachments/upload?graphId=${encodeURIComponent(graphId)}`;

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'x-user-id': userId,
            },
            body: formData,
        });

        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
            ? await response.json()
            : { error: await response.text() };

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('[Attachment Upload] Error:', error);
        return NextResponse.json(
            { error: '上传失败' },
            { status: 500 }
        );
    }
}
