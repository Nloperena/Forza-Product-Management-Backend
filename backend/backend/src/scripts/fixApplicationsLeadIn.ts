import fs from 'fs';
import path from 'path';

// List of potential JSON files to fix
const JSON_PATHS = [
    path.join(__dirname, '../../data/forza_products_organized.json'),
    path.join(__dirname, '../../../data/forza_products_organized.json'),
    path.join(__dirname, '../../../../data/forza_products_organized.json'),
    path.join(process.cwd(), 'data/forza_products_organized.json'),
    path.join(process.cwd(), 'backend/data/forza_products_organized.json'),
    path.join(process.cwd(), 'backend/backend/data/forza_products_organized.json'),
];

function fixApplications() {
    console.log('🔧 Fixing applications lead-in and lowercase continuations in JSON files...');
    
    // Unique paths only
    const uniquePaths = Array.from(new Set(JSON_PATHS)).filter(p => fs.existsSync(p));
    console.log(`📂 Found ${uniquePaths.length} JSON files to process.`);

    let totalFixCount = 0;

    for (const jsonPath of uniquePaths) {
        console.log(`📄 Processing: ${jsonPath}`);
        const content = fs.readFileSync(jsonPath, 'utf-8');
        const data = JSON.parse(content);
        const root = data.forza_products_organized;
        let fileFixCount = 0;

        if (!root) {
            console.log('⚠️  No forza_products_organized root found in this file.');
            continue;
        }

        for (const brandKey in root) {
            if (brandKey === 'metadata') continue;
            const brand = root[brandKey];
            if (brand.products) {
                for (const industryKey in brand.products) {
                    const industry = brand.products[industryKey];
                    if (Array.isArray(industry.products)) {
                        industry.products.forEach((product: any) => {
                            // Clean description if it starts with a bullet
                            if (product.description && typeof product.description === 'string') {
                                const bulletPattern = /^[*•\u00B7\u2022\u2023\u2043\u204C\u204D\u2219\u25CB\u25CF\u25D8\u25E6-]\s*/;
                                if (bulletPattern.test(product.description)) {
                                    product.description = product.description.replace(bulletPattern, '').trim();
                                    fileFixCount++;
                                }
                            }

                            if (Array.isArray(product.applications) && product.applications.length > 1) {
                                const newApps: string[] = [];
                                for (let i = 0; i < product.applications.length; i++) {
                                    const current = product.applications[i].trim();
                                    
                                    const lowerCurrent = current.toLowerCase();
                                    const isLeadIn = lowerCurrent === 'this includes:' || 
                                                   lowerCurrent === 'including:' ||
                                                   lowerCurrent === 'this also bonds to:' ||
                                                   lowerCurrent === 'compatible with:' ||
                                                   lowerCurrent === 'compatible for following resins:' ||
                                                   lowerCurrent === 'compatible with the following resins:' ||
                                                   lowerCurrent === 'typical applications include:';
                                    
                                    const firstChar = current.charAt(0);
                                    const isLowercaseContinuation = firstChar === firstChar.toLowerCase() && 
                                                                  firstChar !== firstChar.toUpperCase() && 
                                                                  newApps.length > 0;
                                    
                                    if ((isLeadIn || isLowercaseContinuation) && newApps.length > 0) {
                                        const prev = newApps.pop()!;
                                        const joiner = prev.endsWith('-') ? '' : ' ';
                                        newApps.push(`${prev}${joiner}${current}`);
                                        fileFixCount++;
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

        if (fileFixCount > 0) {
            fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
            console.log(`   ✅ Fixed ${fileFixCount} items.`);
            totalFixCount += fileFixCount;
        } else {
            console.log('   ✅ No items to fix.');
        }
    }

    console.log(`\n🎉 Finished! Total items fixed across all files: ${totalFixCount}`);
}

fixApplications();
