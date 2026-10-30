import json

# Read the October 2026 leave file
with open('employee_leaves_october_2026.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Transform to match the old structure (group by employee)
consolidated = {}

for record in data:
    emp_id = record['employee_id']
    name = record['employee_name']
    leave_type = record['leave_type']
    date = record['date']
    
    if emp_id not in consolidated:
        consolidated[emp_id] = {
            'employee_number': emp_id,
            'name': name,
            'leaves': []
        }
    
    consolidated[emp_id]['leaves'].append({
        'leave_type': leave_type,
        'date': date
    })

# Convert to list
consolidated_list = list(consolidated.values())

# Write to october_past_leaves.json
with open('october_past_leaves.json', 'w', encoding='utf-8') as f:
    json.dump(consolidated_list, f, indent=2)

print(f"Transformed {len(consolidated_list)} employees from October 2026")
