import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createInstance, deleteInstance, logoutInstance, getInstanceInfo } from '@/lib/evolution-api';

// Create or get instance for establishment
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { slug } = await request.json();
    
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug do estabelecimento é obrigatório' },
        { status: 400 }
      );
    }

    const instanceName = `ZapFlow-Agenda_${slug}`;
    
    // Try to get existing instance first
    const existingInstance = await getInstanceInfo(instanceName);
    
    if (existingInstance.success && existingInstance.data) {
      return NextResponse.json({
        success: true,
        data: {
          instanceName,
          exists: true,
          ...existingInstance.data,
        },
      });
    }

    // Create new instance
    const result = await createInstance(instanceName);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        instanceName,
        exists: false,
        ...result.data,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

// Delete/logout instance
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const action = searchParams.get('action') || 'logout'; // logout or delete

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug do estabelecimento é obrigatório' },
        { status: 400 }
      );
    }

    const instanceName = `ZapFlow-Agenda_${slug}`;
    
    let result;
    if (action === 'delete') {
      result = await deleteInstance(instanceName);
    } else {
      result = await logoutInstance(instanceName);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
