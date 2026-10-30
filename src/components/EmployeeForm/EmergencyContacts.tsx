import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Trash2 } from 'lucide-react';
import type { EmergencyContact } from '../../types';

interface EmergencyContactsProps {
  contacts?: EmergencyContact[];
  employee?: { fullName?: string; firstName?: string; lastName?: string };
  onNext: (data: EmergencyContact[]) => void;
  onPrev: () => void;
  onSave?: () => Promise<void>;
}

export const EmergencyContacts = ({ contacts = [], employee, onNext, onPrev, onSave }: EmergencyContactsProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(contacts);
  const [formData, setFormData] = useState<EmergencyContact>({
    name: '',
    relationship: '',
    phone: '',
    email: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addContact = () => {
    setEmergencyContacts([...emergencyContacts, formData]);
    setFormData({
      name: '',
      relationship: '',
      phone: '',
      email: '',
    });
  };

  const removeContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(emergencyContacts);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {employee?.fullName || employee?.firstName && employee?.lastName 
            ? `${employee.firstName} ${employee.lastName}`
            : 'Employee Details'}
        </h2>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-secondary-900">Emergency Contacts</h2>
        <p className="text-secondary-600 mt-1">Add emergency contact information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Add Contact Form */}
        <div className="border border-secondary-200 rounded-lg p-6 space-y-4 bg-secondary-50">
          <h3 className="text-lg font-semibold text-secondary-900">Add Emergency Contact</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter contact name"
            />
            <select
              name="relationship"
              value={formData.relationship}
              onChange={handleChange}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Relationship</option>
              <option value="Parent">Parent</option>
              <option value="Spouse">Spouse</option>
              <option value="Child">Child</option>
              <option value="Sibling">Sibling</option>
              <option value="Friend">Friend</option>
              <option value="Other">Other</option>
            </select>
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="Enter email address"
            />
          </div>

          <Button type="button" variant="secondary" onClick={addContact} className="w-full">
            Add Contact
          </Button>
        </div>

        {/* Contacts List */}
        {emergencyContacts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-secondary-900">Emergency Contacts on File</h3>
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="border border-secondary-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-secondary-900">{contact.name}</p>
                  <p className="text-sm text-secondary-600">{contact.relationship}</p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 text-sm">
                    <a href={`tel:${contact.phone}`} className="text-primary-600 hover:text-primary-700">
                      {contact.phone}
                    </a>
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="text-primary-600 hover:text-primary-700">
                        {contact.email}
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeContact(index)}
                  className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end pt-4 border-t border-secondary-200">
          <Button variant="secondary" onClick={onPrev}>
            Previous
          </Button>
          {onSave && (
            <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
          <Button type="submit">
            Next: Employment History
          </Button>
        </div>
      </form>
    </div>
  );
};
