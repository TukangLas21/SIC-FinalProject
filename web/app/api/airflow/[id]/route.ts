import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// DELETE - Remove airflow connection
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.airflowConnection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting airflow connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete airflow connection' },
      { status: 500 }
    );
  }
}

// PATCH - Update airflow connection
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { flowType, flowRate, isActive } = body;

    const connection = await prisma.airflowConnection.update({
      where: { id },
      data: {
        ...(flowType && { flowType }),
        ...(flowRate !== undefined && { flowRate }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        sourceRoom: true,
        targetRoom: true,
      },
    });

    return NextResponse.json(connection);
  } catch (error) {
    console.error('Error updating airflow connection:', error);
    return NextResponse.json(
      { error: 'Failed to update airflow connection' },
      { status: 500 }
    );
  }
}
