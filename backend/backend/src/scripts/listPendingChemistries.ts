import fs from 'fs';
import path from 'path';

const CSV_FILE_PATH = 'c:\\Users\\NicoL\\Downloads\\Untitled spreadsheet - Prod Attr for Website DB Jan 1 2025(Randy Review Jan 4) (1).csv';

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

const csvRows = parseCSV();

console.log('Product ID | Chemistry | Status | On New Site Now');
console.log('-----------|-----------|--------|-----------------');
csvRows.forEach(row => {
    const id = row['Product ID']?.trim();
    if (!id || id === '???' || id === 'Product ID') return;
    
    const status = row['OK?']?.trim() || '';
    const onNewSite = row['On New Site Now']?.trim() || '';
    const chemistry = row['Chemistry']?.trim();

    if ((status.includes('ADD') || status.includes('Phase')) && chemistry && chemistry !== '???') {
        console.log(`${id} | ${chemistry} | ${status} | ${onNewSite}`);
    }
});

