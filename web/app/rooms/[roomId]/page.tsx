'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RoomDetailPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/rooms"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-50">
          Room Details
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Room ID: {roomId}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
        <p className="text-gray-500">
          Room detail view coming soon! This will show detailed sensor readings, component controls, and historical data.
        </p>
      </div>
    </div>
  );
}
