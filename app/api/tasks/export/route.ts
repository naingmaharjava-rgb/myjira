import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

const AUTH_TOKEN = 'TyTNJXAeponLTm';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('auth');

    // if (authHeader !== AUTH_TOKEN) {
    //     return new NextResponse(null, { status: 404 });
    // }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // todo, doing, or done

    if (!status) {
        return NextResponse.json({ error: 'Status parameter is required' }, { status: 400 });
    }

    try {
        const snapshot = await dbAdmin.collection('tasks')
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
