import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInstanceStatus, getInstanceInfo } from '@/lib/evolution-api';

export async function GET(request: Request) {
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

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug do estabelecimento é obrigatório' },
        { status: 400 }
      );
    }

    const instanceName = `ZapFlow-Agenda_${slug}`;
    
    // Get connection state
    const statusResult = await getInstanceStatus(instanceName);
    
    if (!statusResult.success) {
      return NextResponse.json({
        success: true,
        data: {
          instanceName,
          state: 'close',
          connected: false,
          profileName: null,
          profilePictureUrl: null,
        },
      });
    }

    // Evolution API returns { instance: { instanceName, state } }
    const instanceData = statusResult.data as { instance?: { state?: string } };
    const state = instanceData?.instance?.state || 'close';

    // If connected, get profile info
    let profileInfo = null;
    if (state === 'open') {
      const infoResult = await getInstanceInfo(instanceName);
      if (infoResult.success && infoResult.data) {
        const infoData = infoResult.data as { instance?: { profileName?: string; profilePictureUrl?: string; owner?: string } };
        profileInfo = {
          profileName: infoData.instance?.profileName,
          profilePictureUrl: infoData.instance?.profilePictureUrl,
          phoneNumber: infoData.instance?.owner,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        instanceName,
        state,
        connected: state === 'open',
        ...profileInfo,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
