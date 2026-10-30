import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Employee, StaffEquipment as StaffEquipmentType, EquipmentItem } from '../../types';

interface StaffEquipmentProps {
  employee?: Partial<Employee>;
  onNext: (data: Partial<Employee>) => void;
  onPrev: () => void;
  onCancel: () => void;
  onSave?: (data: Partial<Employee>) => Promise<void>;
}

export const StaffEquipment = ({ employee, onNext, onPrev, onCancel, onSave }: StaffEquipmentProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<StaffEquipmentType>({});

  useEffect(() => {
    if (employee?.staffEquipment) {
      setFormData(employee.staffEquipment);
    }
  }, [employee]);

  const handleChange = (category: keyof StaffEquipmentType, field: keyof EquipmentItem, value: string | Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
        name: category === 'uniform' ? 'Uniform' :
               category === 'rainCoat' ? 'Rain Coat' :
               category === 'keys' ? 'Keys' :
               category === 'mobile' ? 'Mobile' :
               category === 'simCard' ? 'SIM Card' : '',
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ staffEquipment: formData });
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave({ staffEquipment: formData });
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {employee?.fullName || employee?.firstName && employee?.lastName 
            ? `${employee.firstName} ${employee.lastName}`
            : 'Employee Details'}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Uniform */}
        <div className="p-4 bg-secondary-50 rounded-lg">
          <h3 className="font-semibold text-secondary-900 mb-3">Uniform</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Size</label>
              <Input
                type="text"
                value={formData.uniform?.size || ''}
                onChange={(e) => handleChange('uniform', 'size', e.target.value)}
                placeholder="L, XL, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Quantity</label>
              <Input
                type="text"
                value={formData.uniform?.quantity || ''}
                onChange={(e) => handleChange('uniform', 'quantity', e.target.value)}
                placeholder="2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Last Issued Date</label>
              <Input
                type="date"
                value={formData.uniform?.lastIssuedDate ? formData.uniform.lastIssuedDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('uniform', 'lastIssuedDate', e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>

        {/* Rain Coat */}
        <div className="p-4 bg-secondary-50 rounded-lg">
          <h3 className="font-semibold text-secondary-900 mb-3">Rain Coat</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Size</label>
              <Input
                type="text"
                value={formData.rainCoat?.size || ''}
                onChange={(e) => handleChange('rainCoat', 'size', e.target.value)}
                placeholder="L, XL, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Quantity</label>
              <Input
                type="text"
                value={formData.rainCoat?.quantity || ''}
                onChange={(e) => handleChange('rainCoat', 'quantity', e.target.value)}
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Last Issued Date</label>
              <Input
                type="date"
                value={formData.rainCoat?.lastIssuedDate ? formData.rainCoat.lastIssuedDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('rainCoat', 'lastIssuedDate', e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>

        {/* Keys */}
        <div className="p-4 bg-secondary-50 rounded-lg">
          <h3 className="font-semibold text-secondary-900 mb-3">Keys</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Quantity</label>
              <Input
                type="text"
                value={formData.keys?.quantity || ''}
                onChange={(e) => handleChange('keys', 'quantity', e.target.value)}
                placeholder="2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Last Issued Date</label>
              <Input
                type="date"
                value={formData.keys?.lastIssuedDate ? formData.keys.lastIssuedDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('keys', 'lastIssuedDate', e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="p-4 bg-secondary-50 rounded-lg">
          <h3 className="font-semibold text-secondary-900 mb-3">Mobile</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Model/Number</label>
              <Input
                type="text"
                value={formData.mobile?.name || ''}
                onChange={(e) => handleChange('mobile', 'name', e.target.value)}
                placeholder="iPhone 12, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Quantity</label>
              <Input
                type="text"
                value={formData.mobile?.quantity || ''}
                onChange={(e) => handleChange('mobile', 'quantity', e.target.value)}
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Last Issued Date</label>
              <Input
                type="date"
                value={formData.mobile?.lastIssuedDate ? formData.mobile.lastIssuedDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('mobile', 'lastIssuedDate', e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>

        {/* SIM Card */}
        <div className="p-4 bg-secondary-50 rounded-lg">
          <h3 className="font-semibold text-secondary-900 mb-3">SIM Card</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Number</label>
              <Input
                type="text"
                value={formData.simCard?.name || ''}
                onChange={(e) => handleChange('simCard', 'name', e.target.value)}
                placeholder="9123456"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Quantity</label>
              <Input
                type="text"
                value={formData.simCard?.quantity || ''}
                onChange={(e) => handleChange('simCard', 'quantity', e.target.value)}
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Last Issued Date</label>
              <Input
                type="date"
                value={formData.simCard?.lastIssuedDate ? formData.simCard.lastIssuedDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('simCard', 'lastIssuedDate', e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onPrev}>
            Previous
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <div className="flex gap-2">
          {onSave && (
            <Button type="button" variant="secondary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
          )}
          <Button type="submit">
            Next
          </Button>
        </div>
      </div>
    </form>
  );
};
