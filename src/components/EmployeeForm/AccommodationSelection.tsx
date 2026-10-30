import { useState, useEffect } from 'react';
import { Building2, Bed as BedIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { getAccommodations } from '../../lib/accommodation';
import type { EmployeeAccommodation } from '../../types';

interface AccommodationSelectionProps {
  accommodation?: EmployeeAccommodation;
  employee?: { fullName?: string; firstName?: string; lastName?: string };
  onNext: (accommodation: EmployeeAccommodation | undefined) => void;
  onPrev?: () => void;
  onCancel: () => void;
  onSave?: () => void;
}

export const AccommodationSelection = ({ accommodation, employee, onNext, onPrev, onCancel, onSave }: AccommodationSelectionProps) => {
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccommodation, setSelectedAccommodation] = useState<string | undefined>(accommodation?.accommodationId);
  const [selectedFloor, setSelectedFloor] = useState<string | undefined>(accommodation?.floorId);
  const [selectedRoom, setSelectedRoom] = useState<string | undefined>(accommodation?.roomId);
  const [selectedBed, setSelectedBed] = useState<string | undefined>(accommodation?.bedId);
  const [accommodationItems, setAccommodationItems] = useState(accommodation?.accommodationItems || {});

  useEffect(() => {
    loadAccommodations();
  }, []);

  const loadAccommodations = async () => {
    try {
      setLoading(true);
      const data = await getAccommodations();
      setAccommodations(data);
    } catch (error) {
      console.error('Error loading accommodations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!selectedAccommodation) {
      // Skip accommodation and submit
      onNext(undefined);
      return;
    }

    const accommodationData = accommodations.find(a => a.id === selectedAccommodation);
    let floorData = accommodationData?.floors.find((f: any) => f.id === selectedFloor);
    let roomData = floorData?.rooms.find((r: any) => r.id === selectedRoom);
    let bedData = roomData?.beds.find((b: any) => b.id === selectedBed);

    if (!bedData) {
      // Skip accommodation and submit
      onNext(undefined);
      return;
    }

    onNext({
      accommodationId: selectedAccommodation,
      accommodationName: accommodationData?.name,
      floorId: selectedFloor,
      floorName: floorData?.name,
      roomId: selectedRoom,
      roomNumber: roomData?.roomNumber,
      bedId: selectedBed,
      bedNumber: bedData?.bedNumber,
      bedPosition: bedData?.position,
      assignedDate: accommodation?.assignedDate || new Date(),
      accommodationItems: accommodationItems
    });
  };

  const handleSkip = () => {
    onNext(undefined);
  };

  const handleClear = () => {
    setSelectedAccommodation(undefined);
    setSelectedFloor(undefined);
    setSelectedRoom(undefined);
    setSelectedBed(undefined);
  };

  const handleItemChange = (item: 'bed' | 'mattress' | 'bedsheet' | 'pillow' | 'pillowCover', field: 'quantity' | 'lastIssuedDate', value: string) => {
    setAccommodationItems(prev => ({
      ...prev,
      [item]: {
        ...prev[item],
        [field]: field === 'lastIssuedDate' && value ? new Date(value) : null
      }
    }));
  };

  const selectedAccommodationData = accommodations.find(a => a.id === selectedAccommodation);
  const selectedFloorData = selectedAccommodationData?.floors.find((f: any) => f.id === selectedFloor);
  const selectedRoomData = selectedFloorData?.rooms.find((r: any) => r.id === selectedRoom);
  const selectedBedData = selectedRoomData?.beds.find((b: any) => b.id === selectedBed);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {employee?.fullName || employee?.firstName && employee?.lastName 
            ? `${employee.firstName} ${employee.lastName}`
            : 'Employee Details'}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <Building2 className="w-8 h-8 text-primary-600" />
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Accommodation</h2>
          <p className="text-secondary-600">Assign accommodation to this employee (optional)</p>
        </div>
      </div>

      <div className="space-y-4">
        {accommodations.length === 0 ? (
          <div className="p-6 bg-secondary-50 rounded-lg text-center">
            <Building2 className="w-12 h-12 mx-auto text-secondary-400 mb-2" />
            <p className="text-secondary-600">No accommodations available</p>
            <p className="text-sm text-secondary-500">Please add accommodations in the Accommodation module first</p>
          </div>
        ) : (
          <>
            {/* Accommodation Selection */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Accommodation</label>
              <select
                value={selectedAccommodation || ''}
                onChange={(e) => {
                  setSelectedAccommodation(e.target.value || undefined);
                  setSelectedFloor(undefined);
                  setSelectedRoom(undefined);
                  setSelectedBed(undefined);
                }}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No accommodation</option>
                {accommodations.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} - {acc.location}
                  </option>
                ))}
              </select>
            </div>

            {/* Floor Selection */}
            {selectedAccommodation && selectedAccommodationData && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Floor</label>
                <select
                  value={selectedFloor || ''}
                  onChange={(e) => {
                    setSelectedFloor(e.target.value || undefined);
                    setSelectedRoom(undefined);
                    setSelectedBed(undefined);
                  }}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select floor</option>
                  {selectedAccommodationData.floors.map((floor: any) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Room Selection */}
            {selectedFloor && selectedFloorData && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Room</label>
                <select
                  value={selectedRoom || ''}
                  onChange={(e) => {
                    setSelectedRoom(e.target.value || undefined);
                    setSelectedBed(undefined);
                  }}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select room</option>
                  {selectedFloorData.rooms.map((room: any) => (
                    <option key={room.id} value={room.id}>
                      Room {room.roomNumber} ({room.roomType}) - {room.beds?.length || 0} beds
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Bed Selection */}
            {selectedRoom && selectedRoomData && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Bed</label>
                <select
                  value={selectedBed || ''}
                  onChange={(e) => setSelectedBed(e.target.value || undefined)}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select bed</option>
                  {selectedRoomData.beds
                    .filter((bed: any) => bed.status === 'available')
                    .map((bed: any) => (
                      <option key={bed.id} value={bed.id}>
                        Bed {bed.bedNumber} ({bed.position})
                      </option>
                    ))}
                  {selectedRoomData.beds.filter((b: any) => b.status !== 'available').length > 0 && (
                    <option disabled>--- Occupied Beds ---</option>
                  )}
                  {selectedRoomData.beds
                    .filter((bed: any) => bed.status !== 'available')
                    .map((bed: any) => (
                      <option key={bed.id} value={bed.id} disabled>
                        Bed {bed.bedNumber} ({bed.position}) - {bed.assignedEmployeeName}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Accommodation Items */}
            <div className="space-y-4 pt-4 border-t border-secondary-200">
              <h3 className="font-semibold text-secondary-900">Accommodation Items</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3 bg-secondary-50 rounded-lg">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Bed</label>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-secondary-600 mb-1">Quantity</label>
                        <input
                          type="text"
                          value={accommodationItems.bed?.quantity || ''}
                          onChange={(e) => handleItemChange('bed', 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-secondary-600 mb-1">Last Issued Date</label>
                        <input
                          type="date"
                          value={accommodationItems.bed?.lastIssuedDate ? accommodationItems.bed.lastIssuedDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => handleItemChange('bed', 'lastIssuedDate', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-secondary-50 rounded-lg">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Mattress</label>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-secondary-600 mb-1">Quantity</label>
                        <input
                          type="text"
                          value={accommodationItems.mattress?.quantity || ''}
                          onChange={(e) => handleItemChange('mattress', 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-secondary-600 mb-1">Last Issued Date</label>
                        <input
                          type="date"
                          value={accommodationItems.mattress?.lastIssuedDate ? accommodationItems.mattress.lastIssuedDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => handleItemChange('mattress', 'lastIssuedDate', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-secondary-50 rounded-lg">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Bedsheet</label>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-secondary-600 mb-1">Quantity</label>
                        <input
                          type="text"
                          value={accommodationItems.bedsheet?.quantity || ''}
                          onChange={(e) => handleItemChange('bedsheet', 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-secondary-600 mb-1">Last Issued Date</label>
                        <input
                          type="date"
                          value={accommodationItems.bedsheet?.lastIssuedDate ? accommodationItems.bedsheet.lastIssuedDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => handleItemChange('bedsheet', 'lastIssuedDate', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-secondary-50 rounded-lg">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Pillow</label>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-secondary-600 mb-1">Quantity</label>
                        <input
                          type="text"
                          value={accommodationItems.pillow?.quantity || ''}
                          onChange={(e) => handleItemChange('pillow', 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-secondary-600 mb-1">Last Issued Date</label>
                        <input
                          type="date"
                          value={accommodationItems.pillow?.lastIssuedDate ? accommodationItems.pillow.lastIssuedDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => handleItemChange('pillow', 'lastIssuedDate', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-secondary-50 rounded-lg">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Pillow Cover</label>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-secondary-600 mb-1">Quantity</label>
                        <input
                          type="text"
                          value={accommodationItems.pillowCover?.quantity || ''}
                          onChange={(e) => handleItemChange('pillowCover', 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-secondary-600 mb-1">Last Issued Date</label>
                        <input
                          type="date"
                          value={accommodationItems.pillowCover?.lastIssuedDate ? accommodationItems.pillowCover.lastIssuedDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => handleItemChange('pillowCover', 'lastIssuedDate', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {/* Selected Accommodation Summary */}
            {selectedBedData && (
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <BedIcon className="w-5 h-5 text-primary-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-primary-900">{selectedAccommodationData.name}</p>
                    <p className="text-sm text-primary-700">
                      {selectedFloorData?.name} - Room {selectedRoomData?.roomNumber} - Bed {selectedBedData.bedNumber} ({selectedBedData.position})
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleClear}>
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-secondary-200">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          {onPrev && (
            <Button variant="secondary" onClick={onPrev}>
              Previous
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onSave && (
            <Button variant="secondary" onClick={onSave}>
              Save
            </Button>
          )}
          <Button variant="secondary" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleNext}>
            Save & Complete
          </Button>
        </div>
      </div>
    </div>
  );
};
