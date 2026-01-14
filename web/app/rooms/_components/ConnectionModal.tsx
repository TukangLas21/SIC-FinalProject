'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export type ConnectionFormData = {
  sourceRoomId: string;
  targetRoomId: string;
  flowType: 'INTAKE' | 'EXHAUST' | 'TRANSFER';
  flowRate: number | null;
  isActive: boolean;
};

type ConnectionModalProps = {
  isOpen: boolean;
  sourceRoomName: string;
  targetRoomName: string;
  onClose: () => void;
  onSave: (data: Omit<ConnectionFormData, 'sourceRoomId' | 'targetRoomId'>) => void;
};

export default function ConnectionModal({
  isOpen,
  sourceRoomName,
  targetRoomName,
  onClose,
  onSave,
}: ConnectionModalProps) {
  const [flowType, setFlowType] = useState<'INTAKE' | 'EXHAUST' | 'TRANSFER'>('TRANSFER');
  const [flowRate, setFlowRate] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      flowType,
      flowRate: flowRate ? parseFloat(flowRate) : null,
      isActive,
    });

    // Reset form
    setFlowType('TRANSFER');
    setFlowRate('');
    setIsActive(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
            Configure Airflow Connection
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-300">
          <strong>From:</strong> {sourceRoomName} → <strong>To:</strong> {targetRoomName}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Flow Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Flow Type *
            </label>
            <select
              value={flowType}
              onChange={(e) => setFlowType(e.target.value as any)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              required
            >
              <option value="INTAKE">INTAKE - Fresh air supply</option>
              <option value="EXHAUST">EXHAUST - Air extraction</option>
              <option value="TRANSFER">TRANSFER - Room-to-room</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {flowType === 'INTAKE' && '🟢 Green solid line'}
              {flowType === 'EXHAUST' && '🔴 Red solid line'}
              {flowType === 'TRANSFER' && '🟣 Purple dashed line'}
            </p>
          </div>

          {/* Flow Rate */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Flow Rate (CFM)
              <span className="ml-1 text-xs font-normal text-gray-500">Optional</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={flowRate}
              onChange={(e) => setFlowRate(e.target.value)}
              placeholder="e.g., 500"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Cubic Feet per Minute - leave empty if unknown
            </p>
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
              Connection is active (visible on graph)
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Connection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
