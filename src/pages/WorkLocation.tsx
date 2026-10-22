import { useState, useEffect } from 'react';
import { Plus, MapPin, Users, Trash2, Edit2, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { 
  type WorkLocation, 
  getAllWorkLocations, 
  getWorkLocation,
  createWorkLocation, 
  updateWorkLocation, 
  deleteWorkLocation,
  assignStaffToWorkLocation 
} from '../lib/workLocation';
import { getEmployees } from '../lib/employees';

export const WorkLocationPage = () => {
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WorkLocation | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<WorkLocation | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkSelectedStaff, setBulkSelectedStaff] = useState<string[]>([]);
  const [bulkSelectedLocation, setBulkSelectedLocation] = useState<string>('');
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    assignedStaff: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [locationsData, employeesData] = await Promise.all([
        getAllWorkLocations(),
        getEmployees()
      ]);
      setWorkLocations(locationsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLocation?.id) {
        await updateWorkLocation(editingLocation.id, formData);
      } else {
        await createWorkLocation(formData);
      }
      setShowModal(false);
      setEditingLocation(null);
      setFormData({ name: '', description: '', address: '', assignedStaff: [] });
      loadData();
    } catch (error) {
      console.error('Error saving work location:', error);
      alert('Failed to save work location');
    }
  };

  const handleEdit = (location: WorkLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description || '',
      address: location.address || '',
      assignedStaff: location.assignedStaff || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work location?')) return;
    try {
      await deleteWorkLocation(id);
      loadData();
    } catch (error) {
      console.error('Error deleting work location:', error);
      alert('Failed to delete work location');
    }
  };

  const handleAssignStaff = async (location: WorkLocation) => {
    setSelectedLocation(location);
    setSelectedStaff(location.assignedStaff || []);
    setSearchTerm('');
    setShowAssignModal(true);
  };

  const handleStaffAssignment = async () => {
    if (!selectedLocation?.id) return;
    try {
      await assignStaffToWorkLocation(selectedLocation.id, selectedStaff);
      setShowAssignModal(false);
      setSelectedLocation(null);
      setSelectedStaff([]);
      setSearchTerm('');
      loadData();
    } catch (error) {
      console.error('Error assigning staff:', error);
      alert('Failed to assign staff');
    }
  };

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.fullName?.toLowerCase().includes(searchLower) ||
      emp.employeeId?.toLowerCase().includes(searchLower)
    );
  });

  const getEmployeeAssignedLocation = (empId: string) => {
    return workLocations.find(loc => 
      loc.id !== selectedLocation?.id && 
      loc.assignedStaff?.includes(empId)
    );
  };

  const getUnassignedStaff = () => {
    return employees.filter(emp => 
      !workLocations.some(loc => loc.assignedStaff?.includes(emp.id))
    );
  };

  const getFilteredUnassignedStaff = () => {
    const unassigned = getUnassignedStaff();
    const searchLower = bulkSearchTerm.toLowerCase();
    return unassigned.filter(emp => 
      emp.fullName?.toLowerCase().includes(searchLower) ||
      emp.employeeId?.toLowerCase().includes(searchLower)
    );
  };

  const handleBulkAssign = async () => {
    if (!bulkSelectedLocation || bulkSelectedStaff.length === 0) {
      alert('Please select a work location and at least one staff member');
      return;
    }
    try {
      const location = await getWorkLocation(bulkSelectedLocation);
      if (location) {
        const currentStaff = location.assignedStaff || [];
        const updatedStaff = [...currentStaff, ...bulkSelectedStaff];
        await assignStaffToWorkLocation(bulkSelectedLocation, updatedStaff);
        setShowBulkAssignModal(false);
        setBulkSelectedStaff([]);
        setBulkSelectedLocation('');
        setBulkSearchTerm('');
        loadData();
      }
    } catch (error) {
      console.error('Error assigning staff:', error);
      alert('Failed to assign staff');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-secondary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Work Locations</h1>
          <p className="text-secondary-600 mt-1">Manage work locations and staff assignments</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingLocation(null); setFormData({ name: '', description: '', address: '', assignedStaff: [] }); setShowModal(true); }}>
            <Plus className="w-5 h-5 mr-2" />
            Add Work Location
          </Button>
          <Button variant="secondary" onClick={() => { setShowBulkAssignModal(true); setBulkSelectedStaff([]); setBulkSelectedLocation(''); setBulkSearchTerm(''); }}>
            <Users className="w-5 h-5 mr-2" />
            Assign Employee
          </Button>
        </div>
      </div>

      {/* Work Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workLocations.map((location) => (
          <Card key={location.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900">{location.name}</h3>
                  {location.address && (
                    <p className="text-sm text-secondary-600">{location.address}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(location)}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-secondary-600" />
                </button>
                <button
                  onClick={() => handleDelete(location.id!)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {location.description && (
                <p className="text-sm text-secondary-600 mb-4">{location.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-secondary-600">
                  <Users className="w-4 h-4" />
                  <span>{location.assignedStaff?.length || 0} staff assigned</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAssignStaff(location)}
                >
                  Assign Staff
                </Button>
              </div>
              {location.assignedStaff && location.assignedStaff.length > 0 && (
                <div className="mt-4 pt-4 border-t border-secondary-200">
                  <p className="text-xs text-secondary-500 mb-2">Assigned Staff:</p>
                  <div className="flex flex-wrap gap-2">
                    {location.assignedStaff.slice(0, 3).map((staffId) => {
                      const emp = employees.find(e => e.id === staffId);
                      return emp ? (
                        <span key={staffId} className="text-xs bg-secondary-100 text-secondary-700 px-2 py-1 rounded">
                          {emp.fullName}
                        </span>
                      ) : null;
                    })}
                    {location.assignedStaff.length > 3 && (
                      <span className="text-xs bg-secondary-100 text-secondary-700 px-2 py-1 rounded">
                        +{location.assignedStaff.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-secondary-900">
                  {editingLocation ? 'Edit Work Location' : 'Add Work Location'}
                </h2>
                <button
                  onClick={() => { setShowModal(false); setEditingLocation(null); }}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-secondary-600" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter location name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Enter description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter address"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setShowModal(false); setEditingLocation(null); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingLocation ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assign Staff Modal */}
      {showAssignModal && selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-secondary-900">
                    Assign Staff to {selectedLocation.name}
                  </h2>
                  <p className="text-sm text-secondary-600 mt-1">
                    {selectedStaff.length} staff selected
                  </p>
                </div>
                <button
                  onClick={() => { setShowAssignModal(false); setSelectedLocation(null); setSelectedStaff([]); setSearchTerm(''); }}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-secondary-600" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or employee ID..."
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="space-y-2">
                {filteredEmployees.map((employee) => {
                  const assignedLocation = getEmployeeAssignedLocation(employee.id);
                  const isDisabled = !!assignedLocation;
                  
                  return (
                    <label
                      key={employee.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isDisabled
                          ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                          : selectedStaff.includes(employee.id)
                          ? 'bg-primary-50 border-2 border-primary-500 cursor-pointer'
                          : 'bg-secondary-50 border-2 border-transparent hover:bg-secondary-100 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStaff.includes(employee.id)}
                        onChange={() => !isDisabled && toggleStaffSelection(employee.id)}
                        disabled={isDisabled}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-secondary-900">{employee.fullName}</p>
                        <p className="text-xs text-secondary-600">{employee.employeeId}</p>
                        {isDisabled && (
                          <p className="text-xs text-red-600 mt-1">
                            Already assigned to {assignedLocation?.name}
                          </p>
                        )}
                      </div>
                      {employee.department && (
                        <span className="text-xs bg-secondary-200 text-secondary-700 px-2 py-1 rounded">
                          {employee.department}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </CardContent>
            <CardContent className="border-t border-secondary-200 pt-4">
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => { setShowAssignModal(false); setSelectedLocation(null); setSelectedStaff([]); setSearchTerm(''); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleStaffAssignment} className="flex-1">
                  Save Assignments
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-secondary-900">
                    Assign Unassigned Staff
                  </h2>
                  <p className="text-sm text-secondary-600 mt-1">
                    {bulkSelectedStaff.length} staff selected
                  </p>
                </div>
                <button
                  onClick={() => { setShowBulkAssignModal(false); setBulkSelectedStaff([]); setBulkSelectedLocation(''); setBulkSearchTerm(''); }}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-secondary-600" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Select Work Location *
                </label>
                <select
                  value={bulkSelectedLocation}
                  onChange={(e) => setBulkSelectedLocation(e.target.value)}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a location...</option>
                  {workLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  value={bulkSearchTerm}
                  onChange={(e) => setBulkSearchTerm(e.target.value)}
                  placeholder="Search by name or employee ID..."
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="space-y-2">
                {getFilteredUnassignedStaff().map((employee) => (
                  <label
                    key={employee.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      bulkSelectedStaff.includes(employee.id)
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : 'bg-secondary-50 border-2 border-transparent hover:bg-secondary-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={bulkSelectedStaff.includes(employee.id)}
                      onChange={() => {
                        setBulkSelectedStaff(prev => 
                          prev.includes(employee.id)
                            ? prev.filter(id => id !== employee.id)
                            : [...prev, employee.id]
                        );
                      }}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-secondary-900">{employee.fullName}</p>
                      <p className="text-xs text-secondary-600">{employee.employeeId}</p>
                    </div>
                    {employee.department && (
                      <span className="text-xs bg-secondary-200 text-secondary-700 px-2 py-1 rounded">
                        {employee.department}
                      </span>
                    )}
                  </label>
                ))}
                {getFilteredUnassignedStaff().length === 0 && (
                  <p className="text-center text-secondary-600 py-8">
                    No unassigned staff found
                  </p>
                )}
              </div>
            </CardContent>
            <CardContent className="border-t border-secondary-200 pt-4">
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => { setShowBulkAssignModal(false); setBulkSelectedStaff([]); setBulkSelectedLocation(''); setBulkSearchTerm(''); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleBulkAssign} className="flex-1">
                  Assign Staff
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
