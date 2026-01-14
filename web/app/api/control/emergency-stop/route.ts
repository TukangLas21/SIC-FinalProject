import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST - Emergency stop all components
export async function POST() {
  try {
    const serviceUrl = process.env.IOT_SERVICE_URL || 'http://localhost:8000';
    
    const response = await fetch(`${serviceUrl}/api/system/emergency-stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`IoT service returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Emergency stop signal sent',
      data,
    });
  } catch (error) {
    console.error('Error sending emergency stop:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send emergency stop',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
