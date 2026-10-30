# Excel Upload Setup Guide

This guide explains how to upload Excel files for leave data import.

## Overview

The leave import system supports parsing Excel files with multiple sheets (e.g., separate sheets for male and female staffs). The system automatically detects the format and extracts leave data.

## Excel File Format

### Supported Formats

1. **Standard Format (Daily Attendance)**
   - Contains daily IN/OUT time columns
   - Each day has separate IN and OUT columns
   - Leave codes (OFF, MC, EL, AL, etc.) appear in daily columns
   - Example structure:
     ```
     S No | User ID | Name | IN | OUT | IN | OUT | ...
     1    | MAD0001 | John | 8:00| 17:00| OFF | OFF | ...
     ```

2. **Summary Format**
   - Contains leave type columns at the end
   - Shows numeric totals for each leave type per employee
   - Example structure:
     ```
     S No | User ID | Name | ... | OFF | MC | EL | AL | Total
     1    | MAD0001 | John | ... | 2   | 1  | 0  | 3  | 6
     ```

### Multiple Sheets

The system can parse Excel files with multiple sheets, such as:
- Male Local Staffs
- Female Local Staffs
- Any other staff categories

All sheets will be processed and combined into a single import list.

## Upload Process

### Step 1: Prepare Your Excel File

Ensure your Excel file follows one of the supported formats above. The file should have:
- A header row with "User ID" or "S NO" column
- Employee names in the "Name" column
- Either daily IN/OUT columns (standard format) or leave type totals (summary format)

### Step 2: Upload the File

1. Navigate to the Leave page
2. Click the "Upload Excel" button
3. Select your Excel file
4. The system will automatically:
   - Load all employees from the system
   - Parse all sheets in the Excel file
   - Detect the format (standard or summary)
   - Match employees by ID or name
   - Extract leave dates and types

### Step 3: Review and Import

1. The upload modal will show all parsed leave records
2. Review the data:
   - ✓ indicates the employee was matched in the system
   - ✗ indicates no match found (employee may need to be added)
3. You can:
   - Select/deselect individual records
   - Edit dates (for summary format entries)
   - Export to Markdown for offline review
4. Click "Import Selected Leaves" to import to the system

## Employee Matching

The system uses flexible matching to find employees:

1. **Exact ID Match**: Compares employee IDs directly (e.g., MAD0001)
2. **ID Containment**: Checks if one ID contains the other (e.g., MAD0653 vs AD0653)
3. **Name Match**: Compares full names
4. **Partial Name Match**: Checks if parts of the name match

If an employee is not matched (✗), you may need to:
- Add the employee to the system first
- Verify the employee ID in the Excel file matches the system

## Export to Markdown

You can export the parsed data to a Markdown file for review:
1. After uploading, click "Export to Markdown"
2. A `.md` file will be downloaded with a table of all parsed records
3. The file includes:
   - Employee ID
   - Name
   - Date
   - Leave Type
   - Mapped Type
   - Days
   - Match Status

## Troubleshooting

### Format Not Detected Correctly

If the system detects the wrong format:
- Check that your header row contains "User ID" or "S NO"
- Ensure data rows start after the header
- Verify leave codes are in the expected columns

### Employees Not Matching

If employees show as unmatched (✗):
- Verify the employee exists in the system
- Check for typos in employee ID or name
- The system tries multiple matching strategies, but exact matches work best

### No Data Parsed

If no data appears after upload:
- Check the console logs for errors
- Ensure the Excel file is not corrupted
- Verify the file has the expected structure

## Example Excel Files

### Standard Format Example

```
Attendance - JANUARY 2026 - Male Local Staffs
S No | User ID | Name | IN | OUT | IN | OUT | IN | OUT | ...
1    | MAD0001 | John | 8:00| 17:00| 8:00| 17:00| OFF | OFF | ...
2    | MAD0002 | Jane | OFF | OFF | 8:00| 17:00| 8:00| 17:00| ...
```

### Summary Format Example

```
Attendance - JANUARY 2026 - Male Local Staffs
S No | User ID | Name | ... | OFF | MC | EL | AL | SUS | FL | Total
1    | MAD0001 | John | ... | 2   | 1  | 0  | 3  | 0   | 0  | 6
2    | MAD0002 | Jane | ... | 1   | 0  | 2  | 0  | 1   | 0  | 4
```

## Leave Type Mapping

| Excel Code | Mapped Type |
|------------|-------------|
| AL         | Annual      |
| MC, S, SICK| Medical     |
| EL         | Emergency   |
| SP, SUS, NL| Unpaid      |
| FL         | Compassionate |
| OFF        | Off Day     |
| HD         | Duty        |
| AB         | Unpaid      |
