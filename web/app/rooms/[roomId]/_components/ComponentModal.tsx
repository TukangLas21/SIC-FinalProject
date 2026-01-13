'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

type ComponentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ComponentFormData) => Promise<void>;
  existingComponent?: {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    setting: number | null;
  } | null;
};

export type ComponentFormData = {
  name: string;
  type: string;
  isActive: boolean;
  setting: number | null;
  hasPowerMonitor: boolean;
  powerMonitorName?: string;
};

const COMPONENT_TYPES = [
  { value: 'EXHAUST_FAN', label: 'Exhaust Fan' },
  { value: 'INTAKE_FAN', label: 'Intake Fan' },
  { value: 'AC_UNIT', label: 'AC Unit' },
  { value: 'DOOR_SENSOR', label: 'Door Sensor' },
  { value: 'LIGHTING', label: 'Lighting' },
  { value: 'OTHER', label: 'Other' },
];

export default function ComponentModal({
  isOpen,
  onClose,
  onSave,
  existingComponent,
}: ComponentModalProps) {
  const [formData, setFormData] = useState<ComponentFormData>({
    name: existingComponent?.name || '',
    type: existingComponent?.type || 'EXHAUST_FAN',
    isActive: existingComponent?.isActive || false,
    setting: existingComponent?.setting || null,
    hasPowerMonitor: false,
    powerMonitorName: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        type: 'EXHAUST_FAN',
        isActive: false,
        setting: null,
        hasPowerMonitor: false,
        powerMonitorName: '',
      });
    } catch (error) {
      console.error('Error saving component:', error);
      alert('Failed to save component');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            {existingComponent ? 'Edit Component' : 'Add New Component'}
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
          {/* Component Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Component Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="e.g., Main Exhaust Fan"
            />
          </div>

          {/* Component Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Component Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {COMPONENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Component is Active
            </label>
          </div>

          {/* Setting (Speed/Temp) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Setting (Speed % / Temperature °C)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.setting ?? ''}
              onChange={(e) => setFormData({ ...formData, setting: e.target.value ? parseFloat(e.target.value) : null })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="e.g., 75 (for 75% speed)"
            />
          </div>

          {/* Power Monitor Checkbox */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasPowerMonitor"
                checked={formData.hasPowerMonitor}
                onChange={(e) => setFormData({ ...formData, hasPowerMonitor: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="hasPowerMonitor" className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Add Supporting Hardware (Power Monitor)
              </label>
            </div>

            {/* Power Monitor Fields (conditional) */}
            {formData.hasPowerMonitor && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-blue-900 dark:text-blue-100">
                  Power Monitor Name/ID
                </label>
                <input
                  type="text"
                  value={formData.powerMonitorName}
                  onChange={(e) => setFormData({ ...formData, powerMonitorName: e.target.value })}
                  required={formData.hasPowerMonitor}
                  className="mt-1 w-full rounded-lg border border-blue-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-100"
                  placeholder="e.g., PWR-MON-001"
                />
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                  Note: Power usage will be displayed inside this component's card
                </p>
              </div>
            )}
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
              {isSubmitting ? 'Saving...' : existingComponent ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
