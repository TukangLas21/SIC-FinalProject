'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Zap, Gauge } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type DashboardStats = {
  totalRooms: number;
  activeComponents: number;
  systemStatus: 'SYSTEM_SAFE' | 'ANOMALY_DETECTED';
  avgPressure: number;
  totalPowerUsage: number;
  timestamp: string;
};

type TrendData = {
  pressureTrends: Array<{ time: string; value: number }>;
  powerTrends: Array<{ time: string; value: number }>;
  timestamp: string;
};

export default function Dashboard() {
  // Fetch dashboard stats (polls every 2s)
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await axios.get('/api/dashboard/stats');
      return response.data;
    },
  });

  // Fetch trend data
  const { data: trends, isLoading: trendsLoading } = useQuery<TrendData>({
    queryKey: ['dashboard-trends'],
    queryFn: async () => {
      const response = await axios.get('/api/dashboard/trends');
      return response.data;
    },
  });

  const isSystemSafe = stats?.systemStatus === 'SYSTEM_SAFE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          System Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Real-time monitoring of BSL lab environments
        </p>
      </div>

      {/* Global System Status */}
      <div
        className={`rounded-lg border p-6 ${
          isSystemSafe
            ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
            : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
        }`}
      >
        <div className="flex items-center gap-3">
          {isSystemSafe ? (
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          )}
          <div>
            <h2
              className={`text-2xl font-semibold ${
                isSystemSafe
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}
            >
              {statsLoading ? 'Loading...' : isSystemSafe ? 'System Safe' : 'Anomaly Detected'}
            </h2>
            <p
              className={`text-sm ${
                isSystemSafe
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}
            >
              {isSystemSafe
                ? 'All systems operating within normal parameters'
                : 'Immediate attention required - check room details'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Rooms"
          value={statsLoading ? '...' : stats?.totalRooms.toString() ?? '0'}
          icon={<Gauge className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Active Components"
          value={statsLoading ? '...' : stats?.activeComponents.toString() ?? '0'}
          icon={<Zap className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          title="Avg Lab Pressure"
          value={statsLoading ? '...' : `${stats?.avgPressure ?? 0} Pa`}
          icon={<Gauge className="h-5 w-5" />}
          color="cyan"
        />
        <StatCard
          title="Total Power Usage"
          value={statsLoading ? '...' : `${stats?.totalPowerUsage ?? 0} W`}
          icon={<Zap className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Power Usage Trend */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Power Usage Trend (Last Hour)
          </h3>
          {trendsLoading ? (
            <div className="flex h-64 items-center justify-center text-gray-500">
              Loading chart...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends?.powerTrends ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="#9CA3AF"
                />
                <YAxis stroke="#9CA3AF" label={{ value: 'Watts', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  labelFormatter={(time) => new Date(time as string).toLocaleTimeString()}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name="Power (W)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pressure Trend */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Average Lab Pressure (Last Hour)
          </h3>
          {trendsLoading ? (
            <div className="flex h-64 items-center justify-center text-gray-500">
              Loading chart...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends?.pressureTrends ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="#9CA3AF"
                />
                <YAxis stroke="#9CA3AF" label={{ value: 'Pascals', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  labelFormatter={(time) => new Date(time as string).toLocaleTimeString()}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  name="Pressure (Pa)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable StatCard component
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'cyan' | 'amber';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
    cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
