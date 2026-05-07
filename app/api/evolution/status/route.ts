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
    const establishmentId = searchParams.get('establishmentId');

    if (!establishmentId) {
      return NextResponse.json(
        { success: false, error: 'ID do estabelecimento é obrigatório' },
        { status: 400 }
      );
    }

    const instanceName = `zapflow-${establishmentId}`;
    
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

    // If connected, get profile info
    let profileInfo = null;
    if (statusResult.data?.state === 'open') {
      const infoResult = await getInstanceInfo(instanceName);
      if (infoResult.success && infoResult.data) {
        const instanceData = infoResult.data as { instance?: { profileName?: string; profilePictureUrl?: string; owner?: string } };
        profileInfo = {
          profileName: instanceData.instance?.profileName,
          profilePictureUrl: instanceData.instance?.profilePictureUrl,
          phoneNumber: instanceData.instance?.owner,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        instanceName,
        state: statusResult.data?.state || 'close',
        connected: statusResult.data?.state === 'open',
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
