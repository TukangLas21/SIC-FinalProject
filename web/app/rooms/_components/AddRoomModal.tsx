'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

type RoomModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RoomFormData) => Promise<void>;
};

export type RoomFormData = {
  name: string;
  description: string;
  bslLevel: string;
  targetPressure: number;
  targetTemp: number;
};

const BSL_PRESSURE_DEFAULTS: Record<string, number> = {
  BSL_1: 0,
  BSL_2: -5,
  BSL_3: -15,
  BSL_4: -30,
};

export default function AddRoomModal({ isOpen, onClose, onSave }: RoomModalProps) {
  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    description: '',
    bslLevel: 'BSL_1',
    targetPressure: 0,
    targetTemp: 24.0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBslChange = (newBslLevel: string) => {
    const suggestedPressure = BSL_PRESSURE_DEFAULTS[newBslLevel] ?? 0;
    setFormData({
      ...formData,
      bslLevel: newBslLevel,
      targetPressure: suggestedPressure,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        bslLevel: 'BSL_1',
        targetPressure: 0,
        targetTemp: 24.0,
      });
    } catch (error) {
      console.error('Error saving room:', error);
      alert('Failed to create room');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Add New Room
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Room Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="e.g., Microbiology Lab A"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Optional description..."
            />
          </div>

          {/* BSL Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              BSL Level <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.bslLevel}
              onChange={(e) => handleBslChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="BSL_1">BSL-1 (Basic) - 0 Pa</option>
              <option value="BSL_2">BSL-2 (Moderate) - -5 Pa</option>
              <option value="BSL_3">BSL-3 (High Risk) - -15 Pa</option>
              <option value="BSL_4">BSL-4 (Maximum Containment) - -30 Pa</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Auto-sets recommended target pressure
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Target Pressure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Target Pressure (Pa)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.targetPressure}
                onChange={(e) =>
                  setFormData({ ...formData, targetPressure: parseFloat(e.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Negative = containment
              </p>
            </div>

            {/* Target Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Target Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.targetTemp}
                onChange={(e) =>
                  setFormData({ ...formData, targetTemp: parseFloat(e.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 <strong>Tip:</strong> After creating the room, you can add components (fans, AC units, etc.) from the room detail page.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isSubmitting ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
