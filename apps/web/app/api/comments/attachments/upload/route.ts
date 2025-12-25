/**
 * Story 4.3+: Comment Attachments
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

        // Forward the multipart form data to the backend
        const formData = await request.formData();

        const response = await fetch(`${API_BASE}/api/comments/attachments/upload`, {
            method: 'POST',
            headers: {
                'x-user-id': userId,
            },
            body: formData,
        });

        const data = await response.json();

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
