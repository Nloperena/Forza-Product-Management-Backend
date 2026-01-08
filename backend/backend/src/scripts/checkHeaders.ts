import fs from 'fs';
import path from 'path';

const CSV_FILE_PATH = 'c:\\Users\\NicoL\\Downloads\\Untitled spreadsheet - Prod Attr for Website DB Jan 1 2025(Randy Review Jan 4) (1).csv';

const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
const lines = content.split('\n');
console.log('Headers:', lines[0]);
console.log('Sample Row:', lines[1]);

