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

function analyzeChemistry() {
    console.log('🧪 Analyzing Chemistry data...');
    
    if (!fs.existsSync(JSON_FILE_PATH)) {
        console.error('❌ JSON file not found');
        return;
    }

    const data = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
    const csvRows = parseCSV();
    const root = data.forza_products_organized;

    const jsonProductsMap = new Map();
    const emptyChemistryJson: string[] = [];
    for (const brandKey in root) {
        if (brandKey === 'metadata') continue;
        const brand = root[brandKey];
        if (brand.products) {
            for (const industryKey in brand.products) {
                const industry = brand.products[industryKey];
                if (Array.isArray(industry.products)) {
                    industry.products.forEach((p: any) => {
                        jsonProductsMap.set(p.product_id, p);
                        if (!p.chemistry || p.chemistry === '???' || p.chemistry === '') {
                            emptyChemistryJson.push(p.product_id);
                        }
                    });
                }
            }
        }
    }

    console.log(`📊 Found ${jsonProductsMap.size} products in JSON`);
    console.log(`📊 Found ${emptyChemistryJson.length} products in JSON with NO Chemistry`);
    console.log(`📊 Found ${csvRows.length} rows in CSV`);

    let diffCount = 0;
    let missingInJson = 0;
    let matchCount = 0;
    let updatedEmptyCount = 0;
    let csvHasChemCount = 0;
    const missingList: string[] = [];

    csvRows.forEach(row => {
        const productId = row['Product ID']?.trim();
        if (!productId || productId === '???' || productId === 'Product ID') return;

        const csvChemistry = row['Chemistry']?.trim();
        if (!csvChemistry || csvChemistry === '???') return;
        
        csvHasChemCount++;

        const product = jsonProductsMap.get(productId);
        if (!product) {
            missingInJson++;
            missingList.push(`${productId} (${csvChemistry})`);
            return;
        }

        // Clean values for comparison
        const cleanCsvChem = csvChemistry || '';
        const cleanJsonChem = product.chemistry || '';

        if (cleanJsonChem.toLowerCase().trim() !== cleanCsvChem.toLowerCase().trim()) {
            if (!cleanJsonChem) {
                updatedEmptyCount++;
            }
            console.log(`Difference for ${productId}:`);
            console.log(`  CSV: "${cleanCsvChem}"`);
            console.log(`  JSON: "${cleanJsonChem || '[EMPTY]'}"`);
            diffCount++;
        } else {
            matchCount++;
        }
    });

    console.log(`\n✅ Exact Matches: ${matchCount}`);
    console.log(`❌ Differences: ${diffCount} (including ${updatedEmptyCount} previously empty)`);
    console.log(`❓ Products in CSV with Chemistry but MISSING in JSON: ${missingInJson}`);
    console.log(`📊 Total products in CSV with a real Chemistry: ${csvHasChemCount}`);
}

analyzeChemistry();
