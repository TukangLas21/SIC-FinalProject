import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        components: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true,
            setting: true
          }
        },
        _count: {
          select: {
            components: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get latest sensor data for each room
    const roomsWithStatus = await Promise.all(
      rooms.map(async (room: any) => {
        const latestSensor = await prisma.sensorLog.findFirst({
          where: { roomId: room.id },
          orderBy: { createdAt: 'desc' },
          select: {
            pressure: true,
            temperature: true,
            anomalyStatus: true
          }
        });

        return {
          ...room,
          currentPressure: latestSensor?.pressure ?? null,
          currentTemp: latestSensor?.temperature ?? null,
          anomalyStatus: latestSensor?.anomalyStatus ?? 'NORMAL'
        };
      })
    );

    return NextResponse.json(roomsWithStatus);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}
