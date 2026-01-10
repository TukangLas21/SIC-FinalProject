'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AlertCircle, CheckCircle2, Wind, Thermometer } from 'lucide-react';

type Room = {
  id: string;
  name: string;
  description: string | null;
  bslLevel: string;
  targetPressure: number;
  targetTemp: number;
  currentPressure: number | null;
  currentTemp: number | null;
  anomalyStatus: string;
  components: Array<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    setting: number | null;
  }>;
  _count: {
    components: number;
  };
};

export default function RoomsPage() {
  const router = useRouter();

  // Fetch rooms data
  const { data: rooms, isLoading } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await axios.get('/api/rooms');
      return response.data;
    },
  });

  // Generate nodes and edges for React Flow
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!rooms || rooms.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create a grid layout for rooms
    const columns = Math.ceil(Math.sqrt(rooms.length));
    const nodeWidth = 280;
    const nodeHeight = 200;
    const horizontalSpacing = 100;
    const verticalSpacing = 150;

    rooms.forEach((room, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      const hasAnomaly = !!(room.anomalyStatus && room.anomalyStatus !== 'NORMAL');
      const hasIntakeFan = room.components.some(c => c.type === 'INTAKE_FAN' && c.isActive);
      const hasExhaustFan = room.components.some(c => c.type === 'EXHAUST_FAN' && c.isActive);

      nodes.push({
        id: room.id,
        type: 'default',
        position: {
          x: col * (nodeWidth + horizontalSpacing),
          y: row * (nodeHeight + verticalSpacing),
        },
        data: {
          label: (
            <RoomNode
              room={room}
              hasAnomaly={hasAnomaly}
              hasIntakeFan={hasIntakeFan}
              hasExhaustFan={hasExhaustFan}
            />
          ),
        },
        style: {
          background: hasAnomaly ? '#FEE2E2' : '#F0F9FF',
          border: `2px solid ${hasAnomaly ? '#DC2626' : '#3B82F6'}`,
          borderRadius: '12px',
          width: nodeWidth,
          padding: 0,
        },
      });

      // Create edges representing airflow
      // Intake -> Room
      if (hasIntakeFan) {
        edges.push({
          id: `intake-${room.id}`,
          source: 'air-source',
          target: room.id,
          label: 'Intake',
          animated: true,
          style: { stroke: '#10B981', strokeWidth: 2 },
          type: 'smoothstep',
        });
      }

      // Room -> Exhaust
      if (hasExhaustFan) {
        edges.push({
          id: `exhaust-${room.id}`,
          source: room.id,
          target: 'air-exhaust',
          label: 'Exhaust',
          animated: true,
          style: { stroke: '#EF4444', strokeWidth: 2 },
          type: 'smoothstep',
        });
      }
    });

    // Add virtual "Air Source" and "Exhaust" nodes
    nodes.push({
      id: 'air-source',
      type: 'input',
      position: { x: -300, y: (nodes.length / columns / 2) * (nodeHeight + verticalSpacing) },
      data: { label: '🌬️ Fresh Air Source' },
      style: {
        background: '#D1FAE5',
        border: '2px solid #10B981',
        borderRadius: '8px',
        fontWeight: 'bold',
      },
    });

    nodes.push({
      id: 'air-exhaust',
      type: 'output',
      position: {
        x: columns * (nodeWidth + horizontalSpacing) + 100,
        y: (nodes.length / columns / 2) * (nodeHeight + verticalSpacing),
      },
      data: { label: '💨 Exhaust Output' },
      style: {
        background: '#FEE2E2',
        border: '2px solid #EF4444',
        borderRadius: '8px',
        fontWeight: 'bold',
      },
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [rooms]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id !== 'air-source' && node.id !== 'air-exhaust') {
        router.push(`/rooms/${node.id}`);
      }
    },
    [router]
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading rooms...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Room Network</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Click on any room node to view details. Edges represent airflow direction.
        </p>
      </div>

      <div className="h-[calc(100vh-200px)] rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#9CA3AF" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.id === 'air-source') return '#10B981';
              if (node.id === 'air-exhaust') return '#EF4444';
              const borderStr = typeof node.style?.border === 'string' ? node.style.border : '';
              return borderStr.includes('#DC2626') ? '#FEE2E2' : '#3B82F6';
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

// Room Node Component
function RoomNode({
  room,
  hasAnomaly,
  hasIntakeFan,
  hasExhaustFan,
}: {
  room: Room;
  hasAnomaly: boolean;
  hasIntakeFan: boolean;
  hasExhaustFan: boolean;
}) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{room.name}</h3>
          <p className="text-xs text-gray-500">{room.bslLevel.replace('_', '-')}</p>
        </div>
        {hasAnomaly ? (
          <AlertCircle className="h-5 w-5 text-red-600" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Thermometer className="h-4 w-4 text-blue-600" />
          <span className="text-gray-700">
            {room.currentTemp ? `${room.currentTemp.toFixed(1)}°C` : 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Wind className="h-4 w-4 text-cyan-600" />
          <span className="text-gray-700">
            {room.currentPressure ? `${room.currentPressure.toFixed(1)} Pa` : 'N/A'}
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {hasIntakeFan && (
          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
            Intake
          </span>
        )}
        {hasExhaustFan && (
          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
            Exhaust
          </span>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-500">
        {room._count.components} component(s)
      </div>
    </div>
  );
}
