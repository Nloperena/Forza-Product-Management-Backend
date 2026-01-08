import fs from 'fs';
import path from 'path';

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

function fixApplications() {
    console.log('🔧 Fixing applications lead-in sentences in JSON...');
    
    if (!fs.existsSync(JSON_FILE_PATH)) {
        console.error('❌ JSON file not found');
        return;
    }

    const data = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
    const root = data.forza_products_organized;
    let fixCount = 0;

    for (const brandKey in root) {
        if (brandKey === 'metadata') continue;
        const brand = root[brandKey];
        if (brand.products) {
            for (const industryKey in brand.products) {
                const industry = brand.products[industryKey];
                if (Array.isArray(industry.products)) {
                    industry.products.forEach((product: any) => {
                        if (Array.isArray(product.applications) && product.applications.length > 1) {
                            const newApps: string[] = [];
                            for (let i = 0; i < product.applications.length; i++) {
                                const current = product.applications[i].trim();
                                
                                // If this is a lead-in and there's a previous item, merge it backwards
                                const isLeadIn = current.toLowerCase() === 'this includes:' || 
                                               current.toLowerCase() === 'including:' ||
                                               current.toLowerCase() === 'this also bonds to:' ||
                                               current.toLowerCase() === 'compatible with:' ||
                                               current.toLowerCase() === 'compatible for following resins:' ||
                                               current.toLowerCase() === 'compatible with the following resins:' ||
                                               current.toLowerCase() === 'typical applications include:';
                                
                                if (isLeadIn && newApps.length > 0) {
                                    const prev = newApps.pop();
                                    newApps.push(`${prev} ${current}`);
                                    fixCount++;
                                } else {
                                    newApps.push(current);
                                }
                            }
                            product.applications = newApps;
                        }
                    });
                }
            }
        }
    }

    if (fixCount > 0) {
        fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(data, null, 2));
        console.log(`✅ Fixed ${fixCount} lead-in sentences in applications.`);
    } else {
        console.log('✅ No lead-in sentences found to fix.');
    }
}

fixApplications();

