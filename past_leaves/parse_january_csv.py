import json
from datetime import datetime

# Read the file and split by form feed character
data = []
with open('Male Foreigners Staff -  Jan.csv', 'r', encoding='utf-8') as f:
    content = f.read()

# Split by form feed character
rows = [row.split('\f') for row in content.split('\n') if row.strip()]

# Find the header row (contains "User ID")
header_row = None
for i, row in enumerate(rows):
    if row and 'User ID' in row:
        header_row = i
        break

if header_row is None:
    print("Could not find header row")
    print(f"First few rows: {rows[:3]}")
    exit(1)

# Parse data rows
for row in rows[header_row + 1:]:
    if not row or len(row) < 3:
        continue
    
    emp_id = row[0].strip()
    name = row[1].strip()
    
    if not emp_id or emp_id == 'User ID':
        continue
    
    # The CSV has alternating IN/OUT columns for each day
    # Day 1: columns 2-3, Day 2: columns 4-5, etc.
    # Leave codes appear in IN column
    for day in range(31):
        in_col = 2 + (day * 2)
        if in_col >= len(row):
            break
        
        in_value = row[in_col].strip() if in_col < len(row) else ''
        
        # Check for leave codes
        leave_type = None
        if in_value in ['AL', 'EL', 'SICK', 'SP', 'FL', 'OFF']:
            leave_type = in_value
        elif in_value == '1':
            continue  # Skip invalid entries
        elif not in_value:
            continue  # Skip empty
        
        if leave_type:
            date = datetime(2026, 1, day + 1).strftime('%Y-%m-%d')
            
            # Map leave types
            leave_type_desc = ''
            if leave_type == 'AL':
                leave_type_desc = 'Annual Leave'
            elif leave_type == 'EL':
                leave_type_desc = 'Emergency Leave'
            elif leave_type == 'SICK':
                leave_type_desc = 'Sick Leave'
            elif leave_type == 'SP':
                leave_type_desc = 'Special Leave'
            elif leave_type == 'FL':
                leave_type_desc = 'Family Leave'
            elif leave_type == 'OFF':
                leave_type_desc = 'Off Day'
            
            data.append({
                'employee_id': emp_id,
                'employee_name': name,
                'date': date,
                'leave_type': leave_type,
                'leave_type_description': leave_type_desc
            })

# Write to JSON
with open('employee_leaves_january_2026.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Extracted {len(data)} leave records from January CSV")
