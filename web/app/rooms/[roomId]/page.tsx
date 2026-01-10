'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  Zap,
  Power,
  Thermometer,
  Wind,
  Droplets,
} from 'lucide-react';
import ComponentModal, { ComponentFormData } from './_components/ComponentModal';

type Room = {
  id: string;
  name: string;
  description: string | null;
  bslLevel: string;
  targetPressure: number;
  targetTemp: number;
  latestSensor: {
    pressure: number;
    temperature: number;
    humidity: number;
    co2Level: number | null;
    anomalyStatus: string | null;
    createdAt: string;
  } | null;
  components: Array<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    setting: number | null;
    powerLogs: Array<{
      voltage: number;
      current: number;
      power: number;
      createdAt: string;
    }>;
  }>;
};

const BSL_PRESSURE_DEFAULTS: Record<string, number> = {
  BSL_1: 0,
  BSL_2: -5,
  BSL_3: -15,
  BSL_4: -30,
};

export default function RoomDetailPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);
  const [bslLevel, setBslLevel] = useState('');
  const [targetPressure, setTargetPressure] = useState('');
  const [targetTemp, setTargetTemp] = useState('');

  // Fetch room data
  const { data: room, isLoading } = useQuery<Room>({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const response = await axios.get(`/api/rooms/${roomId}`);
      return response.data;
    },
    refetchInterval: 2000, // Poll every 2s
  });

  // Initialize form values when room data loads
  useState(() => {
    if (room) {
      setBslLevel(room.bslLevel);
      setTargetPressure(room.targetPressure.toString());
      setTargetTemp(room.targetTemp.toString());
    }
  });

  // Update room mutation
  const updateRoomMutation = useMutation({
    mutationFn: async (data: { bslLevel?: string; targetPressure?: number; targetTemp?: number }) => {
      const response = await axios.patch(`/api/rooms/${roomId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    },
  });

  // Create component mutation
  const createComponentMutation = useMutation({
    mutationFn: async (data: ComponentFormData) => {
      const response = await axios.post(`/api/rooms/${roomId}/components`, {
        name: data.name,
        type: data.type,
        isActive: data.isActive,
        setting: data.setting,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    },
  });

  // Update component mutation
  const updateComponentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ComponentFormData> }) => {
      const response = await axios.patch(`/api/components/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    },
  });

  // Delete component mutation
  const deleteComponentMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/components/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    },
  });

  const handleSaveComponent = async (data: ComponentFormData) => {
    if (editingComponent) {
      await updateComponentMutation.mutateAsync({ id: editingComponent.id, data });
    } else {
      await createComponentMutation.mutateAsync(data);
    }
    setEditingComponent(null);
  };

  const handleBslChange = (newBslLevel: string) => {
    setBslLevel(newBslLevel);
    // Auto-suggest pressure based on BSL level
    const suggestedPressure = BSL_PRESSURE_DEFAULTS[newBslLevel] ?? 0;
    setTargetPressure(suggestedPressure.toString());
  };

  const handleUpdateRoom = () => {
    updateRoomMutation.mutate({
      bslLevel,
      targetPressure: parseFloat(targetPressure),
      targetTemp: parseFloat(targetTemp),
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading room details...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-red-500">Room not found</div>
      </div>
    );
  }

  const hasAnomaly = room.latestSensor?.anomalyStatus && room.latestSensor.anomalyStatus !== 'NORMAL';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/rooms"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{room.name}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {room.description || 'No description'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasAnomaly ? (
              <>
                <AlertCircle className="h-6 w-6 text-red-600" />
                <span className="text-lg font-semibold text-red-600">Anomaly Detected</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span className="text-lg font-semibold text-green-600">System Normal</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Current Sensor Readings */}
      {room.latestSensor && (
        <div className="grid gap-4 md:grid-cols-4">
          <SensorCard
            icon={<Thermometer className="h-5 w-5 text-orange-600" />}
            label="Temperature"
            value={`${room.latestSensor.temperature.toFixed(1)}°C`}
            target={`Target: ${room.targetTemp}°C`}
          />
          <SensorCard
            icon={<Wind className="h-5 w-5 text-cyan-600" />}
            label="Pressure"
            value={`${room.latestSensor.pressure.toFixed(1)} Pa`}
            target={`Target: ${room.targetPressure} Pa`}
          />
          <SensorCard
            icon={<Droplets className="h-5 w-5 text-blue-600" />}
            label="Humidity"
            value={`${room.latestSensor.humidity.toFixed(1)}%`}
          />
          <SensorCard
            icon={<Wind className="h-5 w-5 text-gray-600" />}
            label="CO₂ Level"
            value={room.latestSensor.co2Level ? `${room.latestSensor.co2Level.toFixed(0)} PPM` : 'N/A'}
          />
        </div>
      )}

      {/* BSL Configuration Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">BSL Configuration</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              BSL Level
            </label>
            <select
              value={bslLevel}
              onChange={(e) => handleBslChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="BSL_1">BSL-1 (Basic)</option>
              <option value="BSL_2">BSL-2 (Moderate)</option>
              <option value="BSL_3">BSL-3 (High Risk)</option>
              <option value="BSL_4">BSL-4 (Maximum Containment)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Auto-adjusts target pressure
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target Pressure (Pa)
            </label>
            <input
              type="number"
              step="0.1"
              value={targetPressure}
              onChange={(e) => setTargetPressure(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Negative = safer containment
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target Temperature (°C)
            </label>
            <input
              type="number"
              step="0.1"
              value={targetTemp}
              onChange={(e) => setTargetTemp(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
        <button
          onClick={handleUpdateRoom}
          disabled={updateRoomMutation.isPending}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {updateRoomMutation.isPending ? 'Updating...' : 'Update Configuration'}
        </button>
      </div>

      {/* Components Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Components</h2>
          <button
            onClick={() => {
              setEditingComponent(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Component
          </button>
        </div>

        {/* Component Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {room.components.map((component) => (
            <ComponentCard
              key={component.id}
              component={component}
              onEdit={() => {
                setEditingComponent(component);
                setIsModalOpen(true);
              }}
              onDelete={() => {
                if (confirm(`Delete ${component.name}?`)) {
                  deleteComponentMutation.mutate(component.id);
                }
              }}
            />
          ))}
        </div>

        {room.components.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            No components yet. Click "Add Component" to get started.
          </div>
        )}
      </div>

      {/* Component Modal */}
      <ComponentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingComponent(null);
        }}
        onSave={handleSaveComponent}
        existingComponent={editingComponent}
      />
    </div>
  );
}

// Sensor Card Component
function SensorCard({
  icon,
  label,
  value,
  target,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  target?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
      {target && <p className="mt-1 text-xs text-gray-500">{target}</p>}
    </div>
  );
}

// Component Card Component
function ComponentCard({
  component,
  onEdit,
  onDelete,
}: {
  component: Room['components'][0];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const latestPower = component.powerLogs[0];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50">{component.name}</h3>
          <p className="text-xs text-gray-500">{component.type.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {/* Status */}
        <div className="flex items-center gap-2">
          <Power className={`h-4 w-4 ${component.isActive ? 'text-green-600' : 'text-gray-400'}`} />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {component.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Setting */}
        {component.setting !== null && (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Setting: <span className="font-medium">{component.setting}</span>
            {component.type.includes('FAN') ? '%' : '°C'}
          </div>
        )}

        {/* Live Power Usage (if power logs exist) */}
        {latestPower && (
          <div className="mt-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-950">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-semibold">Power Monitor</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-amber-700 dark:text-amber-300">Power</div>
                <div className="font-semibold text-amber-900 dark:text-amber-100">
                  {latestPower.power.toFixed(1)}W
                </div>
              </div>
              <div>
                <div className="text-amber-700 dark:text-amber-300">Voltage</div>
                <div className="font-semibold text-amber-900 dark:text-amber-100">
                  {latestPower.voltage.toFixed(1)}V
                </div>
              </div>
              <div>
                <div className="text-amber-700 dark:text-amber-300">Current</div>
                <div className="font-semibold text-amber-900 dark:text-amber-100">
                  {latestPower.current.toFixed(2)}A
                </div>
              </div>
            </div>
            <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Last reading: {new Date(latestPower.createdAt).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
