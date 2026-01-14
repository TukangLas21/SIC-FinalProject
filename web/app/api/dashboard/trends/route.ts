import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get temperature trends for the last hour (one data point every 5 minutes)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const temperatureTrends = await prisma.$queryRaw<Array<{
      time: Date;
      avgTemp: number;
    }>>`
      SELECT 
        DATE_TRUNC('minute', "createdAt") - 
        INTERVAL '1 minute' * (EXTRACT(minute FROM "createdAt")::int % 5) as time,
        AVG(temperature) as "avgTemp"
      FROM "SensorLog"
      WHERE "createdAt" >= ${oneHourAgo}
      GROUP BY time
      ORDER BY time ASC
      LIMIT 12
    `;

    // Get power trends for the last hour
    const powerTrends = await prisma.$queryRaw<Array<{
      time: Date;
      totalPower: number;
    }>>`
      SELECT 
        DATE_TRUNC('minute', "createdAt") - 
        INTERVAL '1 minute' * (EXTRACT(minute FROM "createdAt")::int % 5) as time,
        AVG(power) as "totalPower"
      FROM "PowerLog"
      WHERE "createdAt" >= ${oneHourAgo}
      GROUP BY time
      ORDER BY time ASC
      LIMIT 12
    `;

    return NextResponse.json({
      temperatureTrends: temperatureTrends.map((p: any) => ({
        time: p.time.toISOString(),
        value: Number(Number(p.avgTemp).toFixed(2))
      })),
      powerTrends: powerTrends.map((p: any) => ({
        time: p.time.toISOString(),
        value: Number(Number(p.totalPower).toFixed(2))
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard trends' },
      { status: 500 }
    );
  }
}
