import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const room = await prisma.room.findUnique({
      where: { id: params.id },
      include: {
        components: {
          include: {
            powerLogs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Get latest sensor reading
    const latestSensor = await prisma.sensorLog.findFirst({
      where: { roomId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      ...room,
      latestSensor,
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { bslLevel, targetPressure, targetTemp } = body;

    const room = await prisma.room.update({
      where: { id: params.id },
      data: {
        ...(bslLevel && { bslLevel }),
        ...(targetPressure !== undefined && { targetPressure }),
        ...(targetTemp !== undefined && { targetTemp }),
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    );
  }
}
