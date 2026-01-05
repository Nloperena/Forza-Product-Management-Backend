import * as fs from 'fs';
import * as path from 'path';

const CSV_FILE_PATH = 'c:/Users/NicoL/Downloads/Prod Attr for Website DB Jan 1 2025(Nico! Use This Tab! ) (2).csv';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
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

async function scanCsvForMissing() {
  const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  const lines = csvContent.split('\n');
  
  console.log('PID,Name,Industry,Size');
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    const industry = parts[2];
    const pid = parts[4];
    const size = parts[9];
    
    if (industry === 'Marine' || industry === 'Composites') {
      console.log(`${pid},${parts[5]},${industry},${size.replace(/\n/g, ' ')}`);
    }
  }
}

scanCsvForMissing().catch(console.error);



