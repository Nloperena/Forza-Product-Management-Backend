import * as fs from 'fs';
import * as path from 'path';

const CSV_FILE_PATH = 'c:/Users/NicoL/Downloads/Prod Attr for Website DB Jan 1 2025(Nico! Use This Tab! ) (2).csv';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i+1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function scanCsv() {
  const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  // Handle multiline CSV rows
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i+1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else if (char === '\r' && !inQuotes) {
    } else {
      currentField += char;
    }
  }

  console.log('--- Marine/Composite Analysis ---');
  for (const row of rows) {
    const industry = row[2];
    const pid = row[4];
    const size = row[9];
    const name = row[5];
    
    if (industry === 'Marine' || industry === 'Composites') {
      console.log(`[${industry}] ${pid}: ${name} | Size: ${size?.replace(/\n/g, ' ')}`);
    }
  }
}

scanCsv().catch(console.error);






