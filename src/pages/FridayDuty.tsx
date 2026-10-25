import React, { useState, useEffect, useCallback } from 'react';
import { Save, Printer } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { getEmployees } from '../lib/employees';
import { getAllWorkLocations } from '../lib/workLocation';
import { getLeaveRequests } from '../lib/leave';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { WorkLocation } from '../types';

interface Employee {
  id: string;
  empId: string;
  fullName: string;
  department: string;
  designation?: string;
}

interface FridayScheduleEntry {
  status: 'On' | 'Off' | 'Holiday';
  remarks: string;
}

interface FridayScheduleData {
  [dateString: string]: {
    [empId: string]: FridayScheduleEntry;
  };
}

export const FridayDuty = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [scheduleData, setScheduleData] = useState<FridayScheduleData>({});
  const [currentFridays, setCurrentFridays] = useState<Date[]>([]);
  const [selectedWorkLocation, setSelectedWorkLocation] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Group employees by work location
  const employeesByWorkLocation = useCallback(() => {
    const grouped: { [key: string]: Employee[] } = {};
    
    // Initialize with all work locations
    workLocations.forEach(loc => {
      if (loc.name) {
        grouped[loc.name] = [];
      }
    });
    
    // Add employees to their assigned work locations
    employees.forEach(emp => {
      // Find the work location this employee is assigned to
      const workLocation = workLocations.find(loc => loc.assignedStaff?.includes(emp.id));
      if (workLocation && workLocation.name) {
        grouped[workLocation.name].push(emp);
      } else {
        // Unassigned employees
        if (!grouped['Unassigned']) grouped['Unassigned'] = [];
        grouped['Unassigned'].push(emp);
      }
    });
    
    // Remove empty work locations
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0) {
        delete grouped[key];
      }
    });
    
    return grouped as Record<string, Employee[]>;
  }, [employees, workLocations]);

  // Filter employees by selected work location
  const filteredGroupedEmployees = useCallback(() => {
    const grouped = employeesByWorkLocation();
    if (selectedWorkLocation === 'all') {
      return grouped;
    }
    return { [selectedWorkLocation]: grouped[selectedWorkLocation] || [] };
  }, [employeesByWorkLocation, selectedWorkLocation]);

  // Calculate past 4 Fridays and next Friday from current date
  const getFridays = useCallback(() => {
    const fridays: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the most recent Friday (could be today if today is Friday)
    let current = new Date(today);
    const dayOfWeek = current.getDay();
    
    // If today is Friday, start from today
    if (dayOfWeek === 5) {
      // Keep current as is
    } else {
      // Go back to the most recent Friday
      const daysSinceFriday = (dayOfWeek - 5 + 7) % 7;
      current.setDate(current.getDate() - daysSinceFriday);
    }
    
    // Get past 4 Fridays (going backwards)
    for (let i = 3; i >= 0; i--) {
      const pastFriday = new Date(current);
      pastFriday.setDate(current.getDate() - (i * 7));
      fridays.push(pastFriday);
    }
    
    // Get next Friday
    const nextFriday = new Date(current);
    nextFriday.setDate(current.getDate() + 7);
    fridays.push(nextFriday);
    
    // Sort chronologically
    return fridays.sort((a, b) => a.getTime() - b.getTime());
  }, []);

  // Load employees and work locations
  useEffect(() => {
    const loadData = async () => {
      try {
        const [empData, locData, leaveData] = await Promise.all([
          getEmployees(),
          getAllWorkLocations(),
          getLeaveRequests()
        ]);
        const formattedEmployees = empData.map(emp => ({
          id: emp.id,
          empId: emp.employeeId,
          fullName: emp.fullName,
          department: emp.department || 'Unassigned',
          designation: emp.designation
        }));
        setEmployees(formattedEmployees);
        setWorkLocations(locData);
        setLeaveRequests(leaveData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load schedule data from Firebase
  useEffect(() => {
    const loadScheduleData = async () => {
      try {
        const scheduleDoc = await getDoc(doc(db, 'friday_schedules', 'current'));
        if (scheduleDoc.exists()) {
          setScheduleData(scheduleDoc.data() as FridayScheduleData);
        }
      } catch (error) {
        console.error('Error loading schedule data:', error);
      }
    };
    loadScheduleData();
  }, []);

  // Update Fridays when data loads
  useEffect(() => {
    if (employees.length === 0 || leaveRequests.length === 0) return;
    
    const fridays = getFridays();
    setCurrentFridays(fridays);
    
    // Auto-populate schedule data based on leave requests
    const updatedScheduleData: FridayScheduleData = { ...scheduleData };
    
    fridays.forEach(friday => {
      const dateString = getDateString(friday);
      
      employees.forEach(emp => {
        // Check if employee has leave on this Friday
        const hasLeave = leaveRequests.some(leave => {
          if (leave.employeeId !== emp.id) return false;
          
          const leaveStart = new Date(leave.startDate);
          const leaveEnd = new Date(leave.endDate);
          leaveStart.setHours(0, 0, 0, 0);
          leaveEnd.setHours(23, 59, 59, 999);
          
          return friday >= leaveStart && friday <= leaveEnd;
        });
        
        if (hasLeave) {
          const leaveRequest = leaveRequests.find(leave => {
            if (leave.employeeId !== emp.id) return false;
            
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);
            leaveStart.setHours(0, 0, 0, 0);
            leaveEnd.setHours(23, 59, 59, 999);
            
            return friday >= leaveStart && friday <= leaveEnd;
          });
          
          if (!updatedScheduleData[dateString]) updatedScheduleData[dateString] = {};
          if (!updatedScheduleData[dateString][emp.empId]) {
            updatedScheduleData[dateString][emp.empId] = { status: 'Off', remarks: '' };
          }
          updatedScheduleData[dateString][emp.empId].status = 'Off';
          updatedScheduleData[dateString][emp.empId].remarks = leaveRequest?.reason || 'Leave';
        }
      });
    });
    
    setScheduleData(updatedScheduleData);
  }, [getFridays, employees.length, leaveRequests.length]);

  const handleStatusChange = (dateString: string, empId: string, status: 'On' | 'Off' | 'Holiday') => {
    setScheduleData(prev => {
      const updated = { ...prev };
      if (!updated[dateString]) updated[dateString] = {};
      if (!updated[dateString][empId]) updated[dateString][empId] = { status: 'On', remarks: '' };
      updated[dateString][empId].status = status;
      return updated;
    });
  };

  const handleRemarksChange = (dateString: string, empId: string, remarks: string) => {
    setScheduleData(prev => {
      const updated = { ...prev };
      if (!updated[dateString]) updated[dateString] = {};
      if (!updated[dateString][empId]) updated[dateString][empId] = { status: 'On', remarks: '' };
      updated[dateString][empId].remarks = remarks;
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'friday_schedules', 'current'), scheduleData, { merge: true });
      alert('Schedule saved successfully!');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const getDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Calculate summary for a department on a specific date
  const calculateSummary = (departmentEmployees: Employee[], dateString: string) => {
    const counts: { [key: string]: number } = {};
    departmentEmployees.forEach(emp => {
      const entry = scheduleData[dateString]?.[emp.empId];
      const status = entry?.status || 'On';
      if (status === 'On') {
        const position = emp.designation || 'Unknown';
        counts[position] = (counts[position] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([pos, count]) => (
      <span key={pos} className="summary-item inline-block mr-3">
        <b>{pos}:</b> {count}
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const groupedEmployees = employeesByWorkLocation();

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.3cm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Hide sidebar, header, and navigation */
          aside, header, button, .space-y-6 > div:first-child {
            display: none !important;
          }
          
          /* Remove padding from main content */
          main {
            padding: 0 !important;
          }
          
          .space-y-6 {
            gap: 0 !important;
          }
          
          /* Fit table to page width */
          .overflow-x-auto {
            overflow: visible !important;
          }
          
          table {
            width: 100% !important;
            font-size: 8px !important;
            table-layout: fixed !important;
          }
          
          th, td {
            padding: 2px 4px !important;
            font-size: 8px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          
          /* Ensure sticky columns work in print */
          .sticky {
            position: static !important;
          }
          
          /* Page break before each work location */
          tbody {
            page-break-inside: avoid;
          }
          
          /* Ensure work location headers don't break */
          tr.bg-primary-50 {
            page-break-after: auto;
          }
          
          /* Reduce card padding */
          .Card, .CardContent {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Friday Duty Schedule</h1>
          <p className="text-secondary-600 mt-1">Manage Friday off-duty schedule for all employees</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={selectedWorkLocation}
            onChange={(e) => setSelectedWorkLocation(e.target.value)}
            className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Work Locations</option>
            {Object.keys(groupedEmployees).map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="w-5 h-5 mr-2" />
            Print PDF
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      </div>

      {/* Schedule Table */}
      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-secondary-300 px-4 py-2 bg-secondary-100 text-left font-semibold text-secondary-700 sticky left-0 bg-secondary-100 z-10">
                    Employee Name
                  </th>
                  {currentFridays.map((friday, index) => (
                    <th key={index} colSpan={2} className="border border-secondary-300 px-4 py-2 bg-secondary-100 text-center font-semibold text-secondary-700">
                      {formatDate(friday)}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="border border-secondary-300 px-4 py-2 bg-secondary-50 text-left font-medium text-secondary-600 sticky left-0 bg-secondary-50 z-10">
                    &nbsp;
                  </th>
                  {currentFridays.map((_, index) => (
                    <React.Fragment key={index}>
                      <th className="border border-secondary-300 px-4 py-2 bg-secondary-50 text-center font-medium text-secondary-600 w-24">
                        Status
                      </th>
                      <th className="border border-secondary-300 px-4 py-2 bg-secondary-50 text-center font-medium text-secondary-600">
                        Remarks
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(filteredGroupedEmployees()).map(([department, deptEmployees]) => (
                  <React.Fragment key={department}>
                    <tr className="bg-primary-50">
                      <td colSpan={1 + currentFridays.length * 2} className="border border-secondary-300 px-4 py-3 font-bold text-primary-900">
                        {department}
                      </td>
                    </tr>
                    {/* Summary Row */}
                    <tr className="bg-secondary-50">
                      <td className="border border-secondary-300 px-4 py-2 font-semibold text-secondary-900 sticky left-0 bg-secondary-50">
                        Summary
                      </td>
                      {currentFridays.map((friday, index) => {
                        const dateString = getDateString(friday);
                        return (
                          <td key={index} colSpan={2} className="border border-secondary-300 px-4 py-2 text-sm text-secondary-700">
                            {calculateSummary(deptEmployees, dateString)}
                          </td>
                        );
                      })}
                    </tr>
                    {/* Employee Rows */}
                    {deptEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-secondary-50">
                        <td className="border border-secondary-300 px-4 py-2 text-secondary-900 sticky left-0 bg-white">
                          {employee.fullName}
                        </td>
                        {currentFridays.map((friday, index) => {
                          const dateString = getDateString(friday);
                          const entry = scheduleData[dateString]?.[employee.empId];
                          const status = entry?.status || 'On';
                          const remarks = entry?.remarks || '';
                          return (
                            <React.Fragment key={index}>
                              <td className="border border-secondary-300 px-2 py-2">
                                <select
                                  value={status}
                                  onChange={(e) => handleStatusChange(dateString, employee.empId, e.target.value as 'On' | 'Off' | 'Holiday')}
                                  className="w-full px-2 py-1 border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                >
                                  <option value="On">On</option>
                                  <option value="Off">Off</option>
                                  <option value="Holiday">Holiday</option>
                                </select>
                              </td>
                              <td className="border border-secondary-300 px-2 py-2">
                                <input
                                  type="text"
                                  value={remarks}
                                  onChange={(e) => handleRemarksChange(dateString, employee.empId, e.target.value)}
                                  placeholder="Remarks..."
                                  className="w-full px-2 py-1 border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                />
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
