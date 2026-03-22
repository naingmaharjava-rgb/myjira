import { NextRequest, NextResponse } from 'next/server';
import { getDbAdmin } from '@/lib/firebase-admin';

// Never statically render — always run at request time so env vars are available
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // todo, doing, or done

    if (!status) {
        return NextResponse.json({ error: 'Status parameter is required' }, { status: 400 });
    }

    try {
        const db = getDbAdmin();
        const snapshot = await db.collection('tasks')
            .where('kanban_column', '==', status)
            .get();

        const tasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json(tasks);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
