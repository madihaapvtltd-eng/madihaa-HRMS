import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, RefreshCw, Download, ArrowRight, ArrowLeft, Upload, MapPin, Edit2, Save, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { getAttendanceStats, getTodayAttendanceForEmployee, checkIn, checkOut, requestAttendanceAdjustment } from '../lib/attendance';
import { useAuth } from '../contexts/AuthContext';
import { getEmployees } from '../lib/employees';
import { getAllWorkLocations } from '../lib/workLocation';
import { addDoc, collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import * as XLSX from 'xlsx';

export const Attendance = () => {
  const { user } = useAuth();
  const [todayStats, setTodayStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    earlyDeparture: 0,
    onLeave: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceToday, setAttendanceToday] = useState<any | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentCheckIn, setAdjustmentCheckIn] = useState('');
  const [adjustmentCheckOut, setAdjustmentCheckOut] = useState('');
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);
  const [adjustmentSuccess, setAdjustmentSuccess] = useState('');
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [workLocations, setWorkLocations] = useState<any[]>([]);
  const [missingStaff, setMissingStaff] = useState<any[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editedFirstPunch, setEditedFirstPunch] = useState('');
  const [editedLastPunch, setEditedLastPunch] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTodayStats = useCallback(async () => {
    try {
      const stats = await getAttendanceStats(new Date());
      setTodayStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const loadTodayAttendance = useCallback(async () => {
    if (!user?.employeeId) return;
    try {
      const record = await getTodayAttendanceForEmployee(user.employeeId);
      setAttendanceToday(record);
      setIsCheckedIn(Boolean(record?.checkInTime && !record?.checkOutTime));
    } catch (error) {
      console.error('Error loading today attendance:', error);
    }
  }, [user]);

  useEffect(() => {
    loadTodayStats();
    loadTodayAttendance();
    loadEmployeesAndLocations();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [loadTodayStats, loadTodayAttendance]);

  const loadEmployeesAndLocations = async () => {
    try {
      const [empData, locData] = await Promise.all([
        getEmployees(),
        getAllWorkLocations()
      ]);
      setEmployees(empData);
      setWorkLocations(locData);
    } catch (error) {
      console.error('Error loading employees and locations:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!user?.employeeId) {
      alert('Employee ID not found');
      return;
    }
    
    try {
      setLoading(true);
      await checkIn(user.employeeId, 'web');
      setIsCheckedIn(true);
      await Promise.all([loadTodayStats(), loadTodayAttendance()]);
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendanceToday?.id) {
      alert('No attendance record found for today.');
      return;
    }
    try {
      setLoading(true);
      await checkOut(attendanceToday.id, 'web');
      setIsCheckedIn(false);
      await Promise.all([loadTodayStats(), loadTodayAttendance()]);
    } catch (error) {
      console.error('Error checking out:', error);
      alert('Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const submitAdjustmentRequest = async () => {
    if (!user?.employeeId) return;
    if (!adjustmentReason) {
      alert('Please provide a reason for the adjustment.');
      return;
    }

    setAdjustmentSubmitting(true);
    try {
      const adjustment: any = {
        employeeId: user.employeeId,
        date: new Date(),
        reason: adjustmentReason,
      };
      if (adjustmentCheckIn) {
        adjustment.requestedCheckIn = new Date(`${new Date().toDateString()} ${adjustmentCheckIn}`);
      }
      if (adjustmentCheckOut) {
        adjustment.requestedCheckOut = new Date(`${new Date().toDateString()} ${adjustmentCheckOut}`);
      }
      await requestAttendanceAdjustment(adjustment);
      setAdjustmentSuccess('Attendance adjustment request submitted.');
      setAdjustmentReason('');
      setAdjustmentCheckIn('');
      setAdjustmentCheckOut('');
    } catch (error) {
      console.error('Error submitting adjustment request:', error);
      alert('Failed to submit adjustment request');
    } finally {
      setAdjustmentSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoadingAttendance(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });
        
        // Process attendance data to group by employee and find first/last punch
        const { attendanceRecords, missingStaff } = processAttendanceData(jsonData);
        setAttendanceData(attendanceRecords);
        setMissingStaff(missingStaff);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Failed to parse Excel file');
      } finally {
        setLoadingAttendance(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processAttendanceData = (rawData: any[]) => {
    const employeeMap = new Map<string, any>();
    const punchedEmployeeIds = new Set<string>();
    
    rawData.forEach((row: any) => {
      const empId = row['User No.'];
      if (!empId) return;
      
      const dateStr = row['Date/Time'];
      // Parse date string in format DD/MM/YYYY HH:mm:ss
      const punchDate = parseExcelDateString(dateStr);
      
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          empId,
          name: row['Name'],
          department: row['Department'],
          punches: [],
          firstPunch: punchDate,
          lastPunch: punchDate,
          totalPunches: 0,
          isLate: false
        });
      }
      
      const empData = employeeMap.get(empId);
      empData.punches.push(punchDate);
      empData.totalPunches++;
      
      if (punchDate < empData.firstPunch) {
        empData.firstPunch = punchDate;
      }
      if (punchDate > empData.lastPunch) {
        empData.lastPunch = punchDate;
      }
    });
    
    // Check if first punch is late based on department and day of week, and match with work location
    employeeMap.forEach((empData) => {
      // Match employee with work location first
      const employee = employees.find(emp => 
        emp.employeeId === empData.empId || 
        emp.fullName?.toLowerCase() === empData.name?.toLowerCase()
      );
      
      if (employee) {
        punchedEmployeeIds.add(employee.id);
        // Find work location for this employee
        const location = workLocations.find(loc => 
          loc.assignedStaff?.includes(employee.id)
        );
        empData.workLocation = location?.name || 'Unassigned';
        empData.workLocationId = location?.id;
        empData.employeeId = employee.id;
        
        // Check if first punch is late based on work location rules
        if (empData.firstPunch && empData.workLocationId) {
          const firstPunchDate = new Date(empData.firstPunch);
          const hours = firstPunchDate.getHours();
          const minutes = firstPunchDate.getMinutes();
          const dayOfWeek = firstPunchDate.getDay(); // 0 = Sunday, 6 = Saturday
          
          // Get work location for this employee
          const location = workLocations.find(loc => loc.id === empData.workLocationId);
          
          // Define late threshold based on work location rules
          let lateHour = 8;
          let lateMinute = 30; // Default: 8:30 AM

          if (location) {
            let threshold;
            if (dayOfWeek >= 0 && dayOfWeek <= 4) {
              // Sunday to Thursday
              threshold = location.lateThresholdSundayToThursday;
            } else if (dayOfWeek === 5) {
              // Friday
              threshold = location.lateThresholdFriday;
            } else {
              // Saturday
              threshold = location.lateThresholdSaturday;
            }
            
            if (threshold) {
              const [thresholdHour, thresholdMinute] = threshold.split(':').map(Number);
              if (!isNaN(thresholdHour) && !isNaN(thresholdMinute)) {
                lateHour = thresholdHour;
                lateMinute = thresholdMinute;
              }
            }
          }

          // Check if time is after the late threshold
          if (hours > lateHour || (hours === lateHour && minutes > lateMinute)) {
            empData.isLate = true;
          }
        }
      } else {
        empData.workLocation = 'Not Found';
        empData.workLocationId = null;
        empData.employeeId = null;
      }
    });
    
    // Find missing staff (employees assigned to work locations who didn't punch)
    const missingStaff = employees
      .filter(emp => {
        // Only active employees assigned to a work location
        if (emp.status !== 'active') return false;
        const hasLocation = workLocations.some(loc => loc.assignedStaff?.includes(emp.id));
        if (!hasLocation) return false;
        // Didn't punch today
        return !punchedEmployeeIds.has(emp.id);
      })
      .map(emp => {
        const location = workLocations.find(loc => loc.assignedStaff?.includes(emp.id));
        return {
          empId: emp.employeeId,
          name: emp.fullName,
          department: emp.department || 'N/A',
          workLocation: location?.name || 'Unassigned',
          workLocationId: location?.id,
          employeeId: emp.id,
          isMissing: true,
          firstPunch: null,
          lastPunch: null,
          totalPunches: 0
        };
      });
    
    const attendanceRecords = Array.from(employeeMap.values());
    return { attendanceRecords, missingStaff };
  };

  const parseExcelDateString = (dateStr: string): Date => {
    // Parse format: MM/DD/YY HH:mm (e.g., "10/18/26 8:26")
    const parts = dateStr.split(' ');
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    
    const month = parseInt(dateParts[0]) - 1; // JavaScript months are 0-indexed
    const day = parseInt(dateParts[1]);
    const year = parseInt(dateParts[2]) + 2000; // Convert 2-digit year to 4-digit
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    
    return new Date(year, month, day, hours, minutes);
  };

  const handleEditRow = (empId: string, firstPunch: Date | null, lastPunch: Date | null) => {
    setEditingRow(empId);
    setEditedFirstPunch(firstPunch ? new Date(firstPunch).toLocaleString('en-GB', { hour12: false }) : '');
    setEditedLastPunch(lastPunch ? new Date(lastPunch).toLocaleString('en-GB', { hour12: false }) : '');
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditedFirstPunch('');
    setEditedLastPunch('');
  };

  const handleSaveRow = async (emp: any) => {
    if (!emp.employeeId) {
      alert('Employee ID not found');
      return;
    }

    try {
      setSaving(true);
      
      // Parse the edited dates
      const firstPunchDate = editedFirstPunch ? new Date(editedFirstPunch) : emp.firstPunch;
      const lastPunchDate = editedLastPunch ? new Date(editedLastPunch) : emp.lastPunch;

      // Check if attendance record exists for this employee on this date
      const attendanceDate = emp.firstPunch ? new Date(emp.firstPunch) : new Date();
      const startOfDay = new Date(attendanceDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(attendanceDate);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'attendance'),
        where('employeeId', '==', emp.employeeId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Create new attendance record
        await addDoc(collection(db, 'attendance'), {
          employeeId: emp.employeeId,
          date: Timestamp.fromDate(attendanceDate),
          checkInTime: firstPunchDate ? Timestamp.fromDate(firstPunchDate) : null,
          checkOutTime: lastPunchDate ? Timestamp.fromDate(lastPunchDate) : null,
          checkInMethod: 'web',
          status: 'present',
          lateArrival: emp.isLate || false,
        });
      } else {
        // Update existing attendance record
        const docId = querySnapshot.docs[0].id;
        await updateDoc(doc(db, 'attendance', docId), {
          checkInTime: firstPunchDate ? Timestamp.fromDate(firstPunchDate) : null,
          checkOutTime: lastPunchDate ? Timestamp.fromDate(lastPunchDate) : null,
          lateArrival: emp.isLate || false,
        });
      }

      // Update local state
      setAttendanceData(prevData =>
        prevData.map(item =>
          item.empId === emp.empId
            ? { ...item, firstPunch: firstPunchDate, lastPunch: lastPunchDate }
            : item
        )
      );

      setEditingRow(null);
      setEditedFirstPunch('');
      setEditedLastPunch('');
      alert('Attendance saved successfully');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Attendance</h1>
          <p className="text-secondary-600 mt-1">Track employee attendance</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileUpload}
            className="hidden"
            id="attendance-upload"
          />
          <Button variant="secondary" onClick={() => document.getElementById('attendance-upload')?.click()}>
            <Upload className="w-5 h-5 mr-2" />
            Upload Attendance
          </Button>
          <Button variant="secondary" onClick={() => Promise.all([loadTodayStats(), loadTodayAttendance()])}>
            <RefreshCw className="w-5 h-5 mr-2" />
            Refresh
          </Button>
          <Button variant="secondary">
            <Download className="w-5 h-5 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Current Time Card */}
      <Card className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-primary-100 text-sm">Current Time</p>
              <p className="text-4xl font-bold mt-1">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </p>
              <p className="text-primary-100 mt-1">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              {!isCheckedIn ? (
                <Button
                  onClick={handleCheckIn}
                  loading={loading}
                  className="bg-white text-primary-600 hover:bg-primary-50"
                  size="lg"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Check In
                </Button>
              ) : (
                <Button
                  onClick={handleCheckOut}
                  loading={loading}
                  className="bg-white text-primary-600 hover:bg-primary-50"
                  size="lg"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Check Out
                </Button>
              )}
            </div>
          </div>
          {attendanceToday && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-secondary-600">Checked In At</p>
                  <p className="text-xl font-bold text-secondary-900">
                    {attendanceToday.checkInTime ? new Date(attendanceToday.checkInTime).toLocaleTimeString() : 'N/A'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-secondary-600">Checked Out At</p>
                  <p className="text-xl font-bold text-secondary-900">
                    {attendanceToday.checkOutTime ? new Date(attendanceToday.checkOutTime).toLocaleTimeString() : 'Pending'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-secondary-600">Status</p>
                  <p className="text-xl font-bold text-secondary-900 capitalize">{attendanceToday.status}</p>
                </CardContent>
              </Card>
            </div>
          )}
          <Card className="mt-4">
            <CardHeader>
              <h2 className="text-lg font-semibold text-secondary-900">Attendance Adjustment Request</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Requested Check-in</label>
                  <input
                    type="time"
                    value={adjustmentCheckIn}
                    onChange={(e) => setAdjustmentCheckIn(e.target.value)}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Requested Check-out</label>
                  <input
                    type="time"
                    value={adjustmentCheckOut}
                    onChange={(e) => setAdjustmentCheckOut(e.target.value)}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="Enter adjustment reason"
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              {adjustmentSuccess && (
                <div className="mt-4 text-sm text-green-600">{adjustmentSuccess}</div>
              )}
              <div className="mt-4">
                <Button onClick={submitAdjustmentRequest} loading={adjustmentSubmitting}>
                  Submit Attendance Adjustment
                </Button>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-600">Total</p>
                <p className="text-2xl font-bold text-secondary-900">{todayStats.total}</p>
              </div>
              <div className="p-2 bg-secondary-100 rounded-lg">
                <Calendar className="w-5 h-5 text-secondary-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{todayStats.present}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{todayStats.absent}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-600">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{todayStats.late}</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-600">On Leave</p>
                <p className="text-2xl font-bold text-blue-600">{todayStats.onLeave}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity / Attendance Data */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-secondary-900">
            {attendanceData.length > 0 ? 'Attendance Data from Excel' : 'Today\'s Activity'}
          </h2>
        </CardHeader>
        <CardContent>
          {loadingAttendance ? (
            <div className="text-center py-12 text-secondary-600">
              Loading attendance data...
            </div>
          ) : attendanceData.length > 0 ? (
            <div className="space-y-6">
              {/* Missing Staff Section */}
              {missingStaff.length > 0 && (
                <div className="border-2 border-red-200 rounded-lg overflow-hidden bg-red-50">
                  <div className="bg-red-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-red-600" />
                      <h3 className="font-semibold text-red-900">Missing Staff</h3>
                    </div>
                    <span className="text-sm text-red-700 font-medium">{missingStaff.length} employees</span>
                  </div>
                  
                  {/* Mobile Cards - Missing Staff */}
                  <div className="sm:hidden space-y-3 p-4">
                    {missingStaff.map((emp: any, index: number) => (
                      <div key={index} className="bg-white rounded-lg shadow p-4 border border-red-200">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-bold text-red-900 text-sm">{emp.name}</div>
                            <div className="text-xs text-red-700">{emp.empId}</div>
                          </div>
                          <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-semibold">No Punch</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-red-600">Department:</span>
                            <span className="font-medium">{emp.department}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600">Location:</span>
                            <span className="font-medium">{emp.workLocation}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table - Missing Staff */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-red-200 bg-red-50">
                          <th className="text-left py-3 px-4 text-sm font-medium text-red-700">Employee ID</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-red-700">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-red-700">Department</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-red-700">Work Location</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-red-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missingStaff.map((emp: any, index: number) => (
                          <tr key={index} className="border-b border-red-100 hover:bg-red-100">
                            <td className="py-3 px-4 text-sm text-red-900">{emp.empId}</td>
                            <td className="py-3 px-4 text-sm text-red-900">{emp.name}</td>
                            <td className="py-3 px-4 text-sm text-red-900">{emp.department}</td>
                            <td className="py-3 px-4 text-sm text-red-900">{emp.workLocation}</td>
                            <td className="py-3 px-4 text-sm">
                              <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-semibold">No Punch</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Group by Work Location */}
              {(() => {
                const groupedByLocation = attendanceData.reduce((acc, emp) => {
                  const location = emp.workLocation || 'Unassigned';
                  if (!acc[location]) {
                    acc[location] = [];
                  }
                  acc[location].push(emp);
                  return acc;
                }, {} as Record<string, any[]>);

                return Object.entries(groupedByLocation).map(([location, emps]) => (
                  <div key={location} className="border border-secondary-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary-600" />
                        <h3 className="font-semibold text-primary-900">{location}</h3>
                      </div>
                      <span className="text-sm text-primary-700 font-medium">{(emps as any[]).length} employees</span>
                    </div>
                    
                    {/* Mobile Cards - Work Location */}
                    <div className="sm:hidden space-y-3 p-4">
                      {(emps as any[]).map((emp: any, index: number) => (
                        <div key={index} className={`bg-white rounded-lg shadow p-4 border ${emp.isLate ? 'border-red-300 bg-red-50' : 'border-secondary-200'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-bold text-secondary-900 text-sm">{emp.name}</div>
                              <div className="text-xs text-secondary-500">{emp.empId}</div>
                            </div>
                            {emp.isLate && (
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">Late</span>
                            )}
                          </div>
                          <div className="space-y-2 text-sm mb-4">
                            <div className="flex justify-between">
                              <span className="text-secondary-600">Department:</span>
                              <span className="font-medium">{emp.department}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary-600">First Punch:</span>
                              <span className={`font-medium ${emp.isLate ? 'text-red-600' : ''}`}>
                                {editingRow === emp.empId ? (
                                  <input
                                    type="text"
                                    value={editedFirstPunch}
                                    onChange={(e) => setEditedFirstPunch(e.target.value)}
                                    className="w-full px-2 py-1 border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                                    placeholder="DD/MM/YYYY HH:mm"
                                  />
                                ) : (
                                  emp.firstPunch ? new Date(emp.firstPunch).toLocaleString() : 'N/A'
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary-600">Last Punch:</span>
                              <span className="font-medium">
                                {editingRow === emp.empId ? (
                                  <input
                                    type="text"
                                    value={editedLastPunch}
                                    onChange={(e) => setEditedLastPunch(e.target.value)}
                                    className="w-full px-2 py-1 border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                                    placeholder="DD/MM/YYYY HH:mm"
                                  />
                                ) : (
                                  emp.lastPunch ? new Date(emp.lastPunch).toLocaleString() : 'N/A'
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary-600">Total Punches:</span>
                              <span className="font-medium">{emp.totalPunches || 0}</span>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            {editingRow === emp.empId ? (
                              <>
                                <button
                                  onClick={() => handleSaveRow(emp.empId)}
                                  disabled={saving}
                                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"
                                >
                                  <Save className="w-4 h-4" />
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-2 bg-secondary-600 text-white rounded-lg text-sm flex items-center gap-1"
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleEditRow(emp.empId, emp.firstPunch, emp.lastPunch)}
                                className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-1"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table - Work Location */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-secondary-200 bg-secondary-50">
                            <th className="text-left py-3 px-4 text-sm font-medium text-secondary-700">Employee ID</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-secondary-700">Name</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-secondary-700">Department</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-secondary-700">First Punch</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-secondary-700">Last Punch</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-secondary-700">Total Punches</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-secondary-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(emps as any[]).map((emp: any, index: number) => (
                            <tr 
                              key={index} 
                              className={`border-b border-secondary-100 hover:bg-secondary-50 ${emp.isLate ? 'bg-red-50' : ''}`}
                            >
                              <td className="py-3 px-4 text-sm text-secondary-900">{emp.empId}</td>
                              <td className="py-3 px-4 text-sm text-secondary-900">{emp.name}</td>
                              <td className="py-3 px-4 text-sm text-secondary-900">{emp.department}</td>
                              <td className={`py-3 px-4 text-sm ${emp.isLate ? 'text-red-600 font-semibold' : 'text-secondary-900'}`}>
                                {editingRow === emp.empId ? (
                                  <input
                                    type="text"
                                    value={editedFirstPunch}
                                    onChange={(e) => setEditedFirstPunch(e.target.value)}
                                    className="w-full px-2 py-1 border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="DD/MM/YYYY HH:mm"
                                  />
                                ) : (
                                  <>
                                    {emp.firstPunch ? new Date(emp.firstPunch).toLocaleString() : 'N/A'}
                                    {emp.isLate && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Late</span>}
                                  </>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-secondary-900">
                                {editingRow === emp.empId ? (
                                  <input
                                    type="text"
                                    value={editedLastPunch}
                                    onChange={(e) => setEditedLastPunch(e.target.value)}
                                    className="w-full px-2 py-1 border border-secondary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="DD/MM/YYYY HH:mm"
                                  />
                                ) : (
                                  emp.lastPunch ? new Date(emp.lastPunch).toLocaleString() : 'N/A'
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-secondary-900">{emp.totalPunches}</td>
                              <td className="py-3 px-4 text-sm">
                                {editingRow === emp.empId ? (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleSaveRow(emp)}
                                      loading={saving}
                                    >
                                      <Save className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleEditRow(emp.empId, emp.firstPunch, emp.lastPunch)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="text-center py-12 text-secondary-600">
              No activity data available. Upload an Excel file to view attendance data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
