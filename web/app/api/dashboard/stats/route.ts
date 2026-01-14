import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get total rooms
    const totalRooms = await prisma.room.count();

    // Get active components count
    const activeComponents = await prisma.component.count({
      where: { isActive: true }
    });

    // Get latest sensor logs for all rooms to check anomalies
    const latestSensorLogs = await prisma.$queryRaw<Array<{
      roomId: string;
      temperature: number;
      humidity: number;
      anomalyStatus: string | null;
      createdAt: Date;
    }>>`
      SELECT DISTINCT ON (s."roomId")
        s."roomId",
        s.temperature,
        s.humidity,
        s."anomalyStatus",
        s."createdAt"
      FROM "SensorLog" s
      ORDER BY s."roomId", s."createdAt" DESC
    `;

    // Check if any anomalies detected
    const hasAnomaly = latestSensorLogs.some(
      (log: any) => log.anomalyStatus && log.anomalyStatus !== 'NORMAL'
    );

    // Calculate total power usage from last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentPowerLogs = await prisma.powerLog.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo }
      },
      select: {
        power: true
      }
    });

    const totalPowerUsage = recentPowerLogs.length > 0
      ? recentPowerLogs.reduce((sum: number, log: any) => sum + log.power, 0) / recentPowerLogs.length
      : 0;

    return NextResponse.json({
      totalRooms,
      activeComponents,
      systemStatus: hasAnomaly ? 'ANOMALY_DETECTED' : 'SYSTEM_SAFE',
      totalPowerUsage: Number(totalPowerUsage.toFixed(2)),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
