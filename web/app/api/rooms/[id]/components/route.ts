import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const components = await prisma.component.findMany({
      where: { roomId: id },
      include: {
        powerLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Last 5 readings for mini trend
        },
      },
    });

    return NextResponse.json(components);
  } catch (error) {
    console.error('Error fetching components:', error);
    return NextResponse.json(
      { error: 'Failed to fetch components' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, isActive, setting } = body;

    const component = await prisma.component.create({
      data: {
        name,
        type,
        isActive: isActive ?? false,
        setting: setting ?? null,
        roomId: id,
      },
    });

    return NextResponse.json(component);
  } catch (error) {
    console.error('Error creating component:', error);
    return NextResponse.json(
      { error: 'Failed to create component' },
      { status: 500 }
    );
  }
}
