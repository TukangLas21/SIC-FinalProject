import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST - Control component via Python IoT service
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive, setting } = body;

    // Get Python service URL from env
    const serviceUrl = process.env.IOT_SERVICE_URL || 'http://localhost:8000';
    
    // Forward control command to Python FastAPI service
    const response = await fetch(
      `${serviceUrl}/api/component/${id}/control?isActive=${isActive}${setting !== null && setting !== undefined ? `&setting=${setting}` : ''}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`IoT service returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Command sent to hardware',
      data,
    });
  } catch (error) {
    console.error('Error controlling component:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send control command',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
