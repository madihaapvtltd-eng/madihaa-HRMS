import json
from collections import Counter

# Read consolidated leave data
with open('consolidated_past_leaves.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Get all unique leave types
all_leave_types = set()
for employee in data:
    for leave in employee['leaves']:
        all_leave_types.add(leave['leave_type'])

# Generate summary with leave type counts for each employee
summary = []
for employee in data:
    emp_num = employee['employee_number']
    name = employee['name']
    leaves = employee['leaves']
    
    # Count leaves by type
    leave_counts = Counter(leave['leave_type'] for leave in leaves)
    
    # Create employee record with all leave types as separate fields
    emp_record = {
        'employee_number': emp_num,
        'name': name,
        'total_leaves': len(leaves)
    }
    
    # Add each leave type as a separate field
    for leave_type in sorted(all_leave_types):
        emp_record[leave_type] = leave_counts.get(leave_type, 0)
    
    summary.append(emp_record)

# Write summary to file
with open('leave_type_summary.json', 'w', encoding='utf-8') as f:
    json.dump(summary, f, indent=2)

print(f"Generated leave type summary for {len(summary)} employees")
