import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

const AUTH_TOKEN = 'TyTNJXAeponLTm';

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('auth');

    // if (authHeader !== AUTH_TOKEN) {
    //     return new NextResponse(null, { status: 404 });
    // }

    try {
        const body = await request.json();
        const { action, taskId, nextStatus } = body;

        if (!taskId) {
            return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
        }

        const taskRef = dbAdmin.collection('tasks').doc(taskId);

        if (action === 'delete') {
            await taskRef.delete();
            return NextResponse.json({ success: true, message: 'Task deleted' });
        }

        if (action === 'move') {
            if (!nextStatus) {
                return NextResponse.json({ error: 'nextStatus is required for move action' }, { status: 400 });
            }

            // Validating status
            const validColumns = ['todo', 'doing', 'done'];
            if (!validColumns.includes(nextStatus)) {
                return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            }

            await taskRef.update({
                kanban_column: nextStatus,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            return NextResponse.json({ success: true, message: `Task moved to ${nextStatus}` });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
