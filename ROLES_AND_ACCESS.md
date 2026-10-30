# Roles and Access Control

This document explains the role-based access control (RBAC) system for the HRMS application.

## Overview

The system uses a hierarchical permission model with 5 user roles. Each role has specific permissions that determine what features and actions they can access.

## User Roles

### 1. Super Admin
The highest level of access with full control over the entire system.

**Access Level:** Full System Access

**Permissions:**
- **User Management:** Full CRUD (Create, Read, Update, Delete) on all users
- **Employee Management:** Full CRUD on all employee records
- **Attendance:** View all, edit, approve adjustments
- **Leave Management:** View all, approve/reject, import from Excel, delete
- **Payroll:** Full management (create, edit, approve, process)
- **Overtime:** View all, approve/reject
- **Performance:** View all, manage reviews
- **Recruitment:** Full management, approve requisitions
- **Training:** Full management, approve courses
- **Accommodation:** View, manage, assign accommodations
- **Reports:** View all reports, export data
- **Settings:** Manage system settings

**Use Case:** System administrators who need complete control over all aspects of the HRMS.

---

### 2. HR Manager
Manages HR operations with broad access across most modules.

**Access Level:** High - HR Operations

**Permissions:**
- **User Management:** View users, create new users
- **Employee Management:** Full CRUD, view all employees
- **Attendance:** View all attendance, approve adjustment requests
- **Leave Management:** View all leaves, approve/reject requests, import from Excel, delete records
- **Payroll:** Full management (create, edit, approve, process payroll)
- **Overtime:** View all overtime, approve/reject requests
- **Performance:** View all performance data, manage reviews
- **Recruitment:** Full management, approve job requisitions
- **Training:** Full management, approve training courses
- **Accommodation:** View, manage, assign accommodations
- **Reports:** View reports, export data

**Use Case:** HR professionals who manage day-to-day HR operations, payroll processing, and employee lifecycle management.

---

### 3. Department Manager
Manages a specific department with access to department-level data.

**Access Level:** Medium - Department Level

**Permissions:**
- **Employee Management:** View, create, edit employees (within their department)
- **Attendance:** View department attendance, approve adjustment requests
- **Leave Management:** View department leaves, approve/reject requests
- **Payroll:** View department payroll (read-only)
- **Overtime:** View department overtime, approve/reject requests
- **Performance:** View and review department performance
- **Recruitment:** View and manage department recruitment
- **Training:** View and approve department training
- **Accommodation:** View accommodations (read-only)
- **Reports:** View reports (read-only)

**Use Case:** Department heads who need to manage their team's attendance, leave, overtime, and performance reviews.

---

### 4. Supervisor
Manages a team within a department with team-level access.

**Access Level:** Low - Team Level

**Permissions:**
- **Employee Management:** View employees (read-only)
- **Attendance:** View team attendance
- **Leave Management:** View team leaves, approve team leave requests
- **Overtime:** View team overtime, approve team overtime requests
- **Performance:** View and review team performance

**Use Case:** Team leads or supervisors who need to approve leave and overtime requests for their direct reports.

---

### 5. Employee
Regular employees with view-only access to their own information.

**Access Level:** Minimal - Self-View Only

**Permissions:**
- **Employee Management:** View own profile (read-only)
- **Attendance:** View own attendance (read-only)
- **Leave Management:** View own leaves (read-only)
- **Overtime:** View own overtime (read-only)
- **Performance:** View own performance (read-only)
- **Training:** View available training courses (read-only)

**Use Case:** Regular employees who need to view their own information but cannot submit requests or make changes.

---

## Permission Matrix

| Module | Action | Super Admin | HR Manager | Dept Manager | Supervisor | Employee |
|--------|--------|-------------|------------|--------------|------------|----------|
| **Users** | View | ✓ | ✓ | ✗ | ✗ | ✗ |
| | Create | ✓ | ✓ | ✗ | ✗ | ✗ |
| | Edit | ✓ | ✗ | ✗ | ✗ | ✗ |
| | Delete | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Employees** | View | ✓ | ✓ | ✓ (dept) | ✓ | ✓ (self) |
| | Create | ✓ | ✓ | ✓ (dept) | ✗ | ✗ |
| | Edit | ✓ | ✓ | ✓ (dept) | ✗ | ✗ |
| | Delete | ✓ | ✓ | ✗ | ✗ | ✗ |
| | View All | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Attendance** | View | ✓ | ✓ | ✓ (dept) | ✓ (team) | ✓ (self) |
| | View All | ✓ | ✓ | ✗ | ✗ | ✗ |
| | Edit | ✓ | ✗ | ✗ | ✗ | ✗ |
| | Adjust | ✓ | ✗ | ✗ | ✗ | ✗ |
| | Approve Adjustments | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Leave** | View | ✓ | ✓ | ✓ (dept) | ✓ (team) | ✓ (self) |
| | View All | ✓ | ✓ | ✓ | ✓ | ✗ |
| | Request | ✓ | ✗ | ✗ | ✗ | ✗ |
| | Cancel Own | ✓ | ✗ | ✗ | ✗ | ✗ |
| | Cancel Any | ✓ | ✗ | ✗ | ✗ | ✗ |
| | Approve | ✓ | ✓ | ✓ | ✓ | ✗ |
| | Reject | ✓ | ✓ | ✓ | ✗ | ✗ |
| | Import | ✓ | ✓ | ✗ | ✗ | ✗ |
| | Delete | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Payroll** | View | ✓ | ✓ | ✓ (dept) | ✗ | ✗ |
| | View All | ✓ | ✓ | ✗ | ✗ | ✗ |
| | Create | ✓ | ✓ | ✗ | ✗ | ✗ |
| | Edit | ✓ | ✓ | ✗ | ✗ | ✗ |
| | Approve | ✓ | ✓ | ✗ | ✗ | ✗ |
| | Process | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Overtime** | View | ✓ | ✓ | ✓ (dept) | ✓ (team) | ✓ (self) |
| | View All | ✓ | ✓ | ✓ | ✓ | ✗ |
| | Request | ✓ | ✗ | ✗ | ✗ | ✗ |
| | Approve | ✓ | ✓ | ✓ | ✓ | ✗ |
| | Reject | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Performance** | View | ✓ | ✓ | ✓ (dept) | ✓ (team) | ✓ (self) |
| | View All | ✓ | ✓ | ✗ | ✗ | ✗ |
| | Review | ✓ | ✗ | ✗ | ✓ | ✗ |
| | Manage | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Recruitment** | View | ✓ | ✓ | ✓ (dept) | ✗ | ✗ |
| | Manage | ✓ | ✓ | ✓ (dept) | ✗ | ✗ |
| | Approve | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Training** | View | ✓ | ✓ | ✓ (dept) | ✗ | ✓ |
| | Manage | ✓ | ✓ | ✗ | ✗ | ✗ |
| | Approve | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Accommodation** | View | ✓ | ✓ | ✓ | ✗ | ✗ |
| | Manage | ✓ | ✓ | ✗ | ✗ | ✗ |
| | Assign | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Reports** | View | ✓ | ✓ | ✓ | ✗ | ✗ |
| | Export | ✓ | ✓ | ✗ | ✗ | ✗ |
| | All | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Settings** | Manage | ✓ | ✗ | ✗ | ✗ | ✗ |

## Key Concepts

### Department vs Team Access
- **Department Manager**: Can view and manage all employees within their assigned department
- **Supervisor**: Can view and manage their direct team members (subset of department)

### Approval Workflows
- **Leave Requests**: Employees cannot submit requests. HR Manager, Department Manager, and Supervisor can approve based on their scope.
- **Overtime Requests**: Similar approval hierarchy as leave requests.
- **Recruitment**: HR Manager and Department Manager can approve job requisitions.

### View-Only Restrictions
- **Employee Role**: Strictly view-only. Cannot submit any requests or make changes.
- **Department Manager**: Read-only access to payroll and accommodation data.

## Implementation Notes

The permission system is implemented in `src/lib/permissions.ts` with the following helper functions:

- `hasPermission(role, permission)`: Check if a role has a specific permission
- `hasAnyPermission(role, permissions)`: Check if a role has any of the specified permissions
- `hasAllPermissions(role, permissions)`: Check if a role has all of the specified permissions

These functions should be used in components to conditionally render UI elements based on user permissions.
