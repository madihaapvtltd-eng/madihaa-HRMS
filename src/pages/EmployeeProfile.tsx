import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmployeeFormWizard } from '../components/EmployeeForm';
import { createEmployee, updateEmployee, getEmployeeById } from '../lib/employees';
import { updateBed, createAssignment } from '../lib/accommodation';
import type { Employee } from '../types';

interface EmployeeProfilePageProps {
  isEditing?: boolean;
}

export const EmployeeProfilePage = ({ isEditing = false }: EmployeeProfilePageProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const loadEmployee = async () => {
      if (!id) {
        setError('No employee ID provided.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const fetchedEmployee = await getEmployeeById(id);
        if (!fetchedEmployee) {
          setError('Employee not found.');
        } else {
          setEmployee(fetchedEmployee);
        }
      } catch (err) {
        setError('Failed to load employee details.');
        console.error('Error loading employee:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [id, isEditing]);

  const handleSave = async (employeeData: Partial<Employee>) => {
    try {
      setError(null);
      
      // Handle accommodation assignment
      const newAccommodation = employeeData.accommodation;
      const oldAccommodation = employee?.accommodation;
      
      // If accommodation changed
      if (newAccommodation !== oldAccommodation) {
        // Clear old accommodation if exists
        if (oldAccommodation?.bedId) {
          await updateBed(oldAccommodation.bedId, {
            assignedEmployeeId: undefined,
            assignedEmployeeName: undefined,
            assignedDate: undefined,
            status: 'available'
          });
          // Note: We're not deleting the assignment record here as we don't have the assignment ID
          // In production, you'd want to track the assignment ID
        }
        
        // Assign new accommodation if exists
        if (newAccommodation?.bedId) {
          await updateBed(newAccommodation.bedId, {
            assignedEmployeeId: employeeData.id || employee?.id,
            assignedEmployeeName: employeeData.fullName || employee?.fullName,
            assignedDate: new Date(),
            status: 'occupied'
          });
          
          await createAssignment({
            employeeId: employeeData.id || employee?.id || '',
            employeeName: employeeData.fullName || employee?.fullName || '',
            bedId: newAccommodation.bedId,
            roomId: newAccommodation.roomId || '',
            floorId: newAccommodation.floorId || '',
            accommodationId: newAccommodation.accommodationId || '',
            assignedDate: new Date()
          });
        }
      }
      
      if (isEditing && employee?.id) {
        await updateEmployee(employee.id, employeeData);
      } else {
        await createEmployee(employeeData);
      }
      navigate('/employees');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save employee';
      setError(errorMsg);
      console.error('Error saving employee:', err);
      throw err;
    }
  };

  const handleCancel = () => {
    navigate('/employees');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary-50 px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        <EmployeeFormWizard
          employee={employee || undefined}
          onSave={handleSave}
          onCancel={() => navigate('/employees')}
          isEditing={isEditing}
        />
      </div>
    </div>
  );
};
