import fs from 'fs';
import path from 'path';

const CSV_FILE_PATH = 'c:\\Users\\NicoL\\Downloads\\Untitled spreadsheet - Prod Attr for Website DB Jan 1 2025(Randy Review Jan 4) (1).csv';
const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

function parseCSV(): any[] {
    const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const rows: any[] = [];
    let inQuotes = false;
    let currentCell = '';
    let currentRow: string[] = [];

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            currentRow.push(currentCell.trim());
            if (currentRow.length > 1) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.length > 1) rows.push(currentRow);
    }

    if (rows.length === 0) return [];

    const headers = rows[0];
    const dataRows = rows.slice(1);

    return dataRows.map(row => {
        const obj: any = {};
        headers.forEach((header: string, i: number) => {
            if (header) obj[header] = row[i] || '';
        });
        return obj;
    });
}

const data = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
const csvRows = parseCSV();
const root = data.forza_products_organized;

const jsonIds = new Set();
for (const brandKey in root) {
    if (brandKey === 'metadata') continue;
    const brand = root[brandKey];
    if (brand.products) {
        for (const industryKey in brand.products) {
            const industry = brand.products[industryKey];
            if (Array.isArray(industry.products)) {
                industry.products.forEach((p: any) => {
                    jsonIds.add(p.product_id);
                });
            }
        }
    }
}

console.log(`📊 Products in JSON: ${jsonIds.size}`);

let csvValidCount = 0;
let csvMissingCount = 0;
const missingIds: string[] = [];

csvRows.forEach(row => {
    const id = row['Product ID']?.trim();
    if (!id || id === '???' || id === 'Product ID') return;
    
    csvValidCount++;
    if (!jsonIds.has(id)) {
        csvMissingCount++;
        missingIds.push(id);
    }
});

console.log(`📊 Products in CSV: ${csvValidCount}`);
console.log(`📊 Products in CSV but MISSING in JSON: ${csvMissingCount}`);
console.log(`   Items: ${missingIds.join(', ')}`);

