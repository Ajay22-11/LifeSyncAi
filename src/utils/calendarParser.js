import * as XLSX from 'xlsx';

/**
 * Parse a college calendar Excel file and return an array of day entries.
 * Handles: single sheet with all months, multiple sheets per month,
 * merged cells, and various column layouts.
 */
export async function parseCalendarExcel(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);

  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const dayAbbrevs = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  let allEntries = [];

  const getCellValue = (sheet, r, c) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = sheet[addr];
    return cell ? cell.v : null;
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet['!ref']) continue;

    const range = XLSX.utils.decode_range(sheet['!ref']);
    const totalRows = range.e.r + 1;
    const totalCols = range.e.c + 1;

    let currentMonth = -1;
    let currentYear = -1;

    for (let r = 0; r < totalRows; r++) {
      const rowCells = [];
      for (let c = 0; c < Math.min(totalCols, 25); c++) {
        rowCells.push(getCellValue(sheet, r, c));
      }

      const nonNullCells = rowCells.filter(v => v !== null);
      const rowText = nonNullCells.map(v => v.toString()).join(' ');
      const rowLower = rowText.toLowerCase();

      // Detect month header
      let foundMonth = -1;
      for (let mi = 0; mi < monthNames.length; mi++) {
        if (rowLower.includes(monthNames[mi])) { foundMonth = mi; break; }
      }
      const yearMatch = rowText.match(/20\d{2}/);

      if (foundMonth >= 0 && yearMatch) {
        currentMonth = foundMonth;
        currentYear = parseInt(yearMatch[0]);
      } else if (foundMonth >= 0 && currentYear > 0) {
        currentMonth = foundMonth;
      }

      if (currentMonth < 0 || currentYear < 0) continue;

      // Find day number and day name in ALL columns
      let dayNum = -1, dayName = '', dayNumCol = -1, dayNameCol = -1;

      for (let c = 0; c < rowCells.length; c++) {
        const val = rowCells[c];
        if (val === null) continue;

        if (dayNum < 0) {
          const num = typeof val === 'number' ? val : parseInt(val);
          if (!isNaN(num) && num >= 1 && num <= 31 && val.toString().trim() === num.toString()) {
            dayNum = num; dayNumCol = c;
          }
        }
        if (!dayName) {
          const str = val.toString().trim().toUpperCase();
          if (dayAbbrevs.some(d => str.startsWith(d))) {
            dayName = str.slice(0, 3); dayNameCol = c;
          }
        }
      }

      if (dayNum < 0) continue;
      if (foundMonth >= 0) continue; // Skip month-header rows

      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      const fullDate = `${currentYear}-${mm}-${dd}`;
      const testDate = new Date(fullDate + 'T00:00:00');
      if (isNaN(testDate.getTime()) || testDate.getDate() !== dayNum) continue;

      // Analyze remaining columns
      let hasWorkingDayNum = false, workingDayNum = '';
      let descTexts = [];

      for (let c = 0; c < rowCells.length; c++) {
        if (c === dayNumCol || c === dayNameCol) continue;
        const val = rowCells[c];
        if (val === null || val === '') continue;
        const str = val.toString().trim();
        if (str === '') continue;
        const num = typeof val === 'number' ? val : parseInt(val);

        if (!isNaN(num) && str === num.toString()) {
          if (num > 31) { hasWorkingDayNum = true; workingDayNum = num.toString(); }
          continue;
        }
        if (str.length > 1 && !dayAbbrevs.some(d => str.toUpperCase() === d)) {
          descTexts.push(str);
        }
      }

      const desc = descTexts.join(' ').trim();
      const descLower = desc.toLowerCase();

      const containsHoliday = descLower.includes('holiday');
      const isSunday = dayName === 'SUN';
      const isSaturday = dayName === 'SAT';

      let isHoliday;
      if (containsHoliday) isHoliday = true;
      else if (hasWorkingDayNum) isHoliday = false;
      else if (isSunday) isHoliday = true;
      else if (isSaturday && desc === '') isHoliday = true;
      else if (desc !== '' && !descLower.includes('working day') && !descLower.includes('examination') && !descLower.includes('commencement') && !descLower.includes('subject')) isHoliday = true;
      else isHoliday = false;

      const isCollegeDay = !isHoliday;

      let statusText = '';
      if (desc) statusText = desc;
      else if (isCollegeDay && workingDayNum) statusText = `Working Day #${workingDayNum}`;
      else if (isSunday) statusText = 'Sunday';
      else if (isSaturday && isHoliday) statusText = 'Saturday';
      else statusText = isCollegeDay ? 'College Day' : 'Holiday';

      allEntries.push({ date: fullDate, isCollegeDay, originalStatus: statusText, dayName });
    }
  }

  // Deduplicate and sort
  allEntries.sort((a, b) => a.date.localeCompare(b.date));
  const uniqueMap = new Map();
  allEntries.forEach(e => uniqueMap.set(e.date, e));
  return Array.from(uniqueMap.values());
}
