import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET all airflow connections
export async function GET() {
  try {
    const connections = await prisma.airflowConnection.findMany({
      include: {
        sourceRoom: {
          select: {
            id: true,
            name: true,
          },
        },
        targetRoom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(connections);
  } catch (error) {
    console.error('Error fetching airflow connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch airflow connections' },
      { status: 500 }
    );
  }
}

// POST - Create new airflow connection
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceRoomId, targetRoomId, flowType, flowRate, isActive } = body;

    // Validate that rooms exist
    const sourceRoom = await prisma.room.findUnique({
      where: { id: sourceRoomId },
    });
    const targetRoom = await prisma.room.findUnique({
      where: { id: targetRoomId },
    });

    if (!sourceRoom || !targetRoom) {
      return NextResponse.json(
        { error: 'Source or target room not found' },
        { status: 404 }
      );
    }

    // Check if connection already exists
    const existing = await prisma.airflowConnection.findFirst({
      where: {
        sourceRoomId,
        targetRoomId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Connection already exists between these rooms' },
        { status: 400 }
      );
    }

    const connection = await prisma.airflowConnection.create({
      data: {
        sourceRoomId,
        targetRoomId,
        flowType: flowType || 'TRANSFER',
        flowRate: flowRate || null,
        isActive: isActive ?? true,
      },
      include: {
        sourceRoom: true,
        targetRoom: true,
      },
    });

    return NextResponse.json(connection);
  } catch (error) {
    console.error('Error creating airflow connection:', error);
    return NextResponse.json(
      { error: 'Failed to create airflow connection' },
      { status: 500 }
    );
  }
}
