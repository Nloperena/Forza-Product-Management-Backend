import * as fs from 'fs';
import * as path from 'path';

interface CsvProduct {
  '#': string;
  'Product ID': string;
  'OK?': string;
  'On New Site Now': string;
  'On Old Site': string;
  'Industry': string;
  'Family': string;
  'Product Name': string;
  'Chemistry': string;
  'Applications': string;
  'Benefits': string;
  'Size': string;
  'Color': string;
  'Cleanup': string;
  'Recommended Equipment': string;
  'TDS Data Table': string;
  'Need 3D Image Now': string;
}

interface JsonProduct {
  product_id: string;
  name: string;
  full_name: string;
  description: string;
  brand: string;
  industry: string;
  chemistry?: string;
  benefits: string[];
  applications: string[];
  sizing: string[];
  color?: string;
  cleanup?: string;
  recommended_equipment?: string;
}

interface ComparisonResult {
  csvTotal: number;
  jsonTotal: number;
  csvProducts: Map<string, CsvProduct>;
  jsonProducts: Map<string, JsonProduct>;
  inCsvNotInJson: string[];
  inJsonNotInCsv: string[];
  fieldMismatches: Array<{
    productId: string;
    field: string;
    csvValue: string;
    jsonValue: string;
  }>;
}

function parseCsvContent(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }
    
    if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }
    
    if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      // End of row (but only if not in quotes)
      if (char === '\r' && nextChar === '\n') {
        i += 2;
      } else {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.some(field => field.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      continue;
    }
    
    currentField += char;
    i++;
  }
  
  // Add last field and row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(field => field.trim().length > 0)) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

function loadCsvProducts(csvPath: string): Map<string, CsvProduct> {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsvContent(csvContent);
  
  if (rows.length === 0) {
    return new Map();
  }
  
  // First row is header
  const header = rows[0].map(col => col.trim());
  const headerMap = new Map<number, string>();
  header.forEach((col, index) => {
    headerMap.set(index, col);
  });
  
  const products = new Map<string, CsvProduct>();
  
  // Parse data rows
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (values.length === 0) continue;
    
    const record: any = {};
    headerMap.forEach((colName, index) => {
      record[colName] = (values[index] || '').trim();
    });
    
    const productId = record['Product ID']?.trim();
    
    // Skip rows without Product ID or that are section headers
    if (!productId || 
        productId === 'PHASE 2' || 
        productId === 'PHASE 3' || 
        productId === 'IGNORE THESE' || 
        productId === '#' ||
        productId.startsWith('PHASE') ||
        productId === '' ||
        productId === 'Product ID') {
      continue;
    }
    
    products.set(productId, record as CsvProduct);
  }
  
  return products;
}

function loadJsonProducts(jsonPath: string): Map<string, JsonProduct> {
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(jsonContent);
  
  const products = new Map<string, JsonProduct>();
  
  // Navigate the nested structure: forza_products_organized -> brand -> products -> industry -> products
  const organizedData = data.forza_products_organized || data;
  
  for (const key of Object.keys(organizedData)) {
    if (key === 'metadata') continue;
    
    const brandData = organizedData[key];
    if (!brandData || !brandData.products) continue;
    
    for (const industryKey of Object.keys(brandData.products)) {
      const industryData = brandData.products[industryKey];
      if (!industryData || !industryData.products) continue;
      
      if (Array.isArray(industryData.products)) {
        for (const product of industryData.products) {
          if (product.product_id) {
            products.set(product.product_id, product);
          }
        }
      }
    }
  }
  
  return products;
}

function normalizeText(text: string | undefined): string {
  if (!text) return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeArray(arr: string[] | undefined): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(item => normalizeText(item)).filter(item => item.length > 0);
}

function normalizeCsvList(text: string | undefined): string[] {
  if (!text) return [];
  // Split by newlines, bullets, or asterisks
  return text
    .split(/\n|•|\*|,/)
    .map(item => normalizeText(item))
    .filter(item => item.length > 0);
}

function compareProducts(csvProducts: Map<string, CsvProduct>, jsonProducts: Map<string, JsonProduct>): ComparisonResult {
  const result: ComparisonResult = {
    csvTotal: csvProducts.size,
    jsonTotal: jsonProducts.size,
    csvProducts,
    jsonProducts,
    inCsvNotInJson: [],
    inJsonNotInCsv: [],
    fieldMismatches: [],
  };

  // Find products in CSV but not in JSON
  for (const productId of csvProducts.keys()) {
    if (!jsonProducts.has(productId)) {
      result.inCsvNotInJson.push(productId);
    }
  }

  // Find products in JSON but not in CSV
  for (const productId of jsonProducts.keys()) {
    if (!csvProducts.has(productId)) {
      result.inJsonNotInCsv.push(productId);
    }
  }

  // Compare common products
  for (const productId of csvProducts.keys()) {
    if (!jsonProducts.has(productId)) continue;
    
    const csvProduct = csvProducts.get(productId)!;
    const jsonProduct = jsonProducts.get(productId)!;

    // Compare Chemistry
    const csvChemistry = normalizeText(csvProduct.Chemistry);
    const jsonChemistry = normalizeText(jsonProduct.chemistry);
    if (csvChemistry && jsonChemistry && csvChemistry !== jsonChemistry && csvChemistry !== '???' && jsonChemistry !== 'na') {
      result.fieldMismatches.push({
        productId,
        field: 'Chemistry',
        csvValue: csvProduct.Chemistry,
        jsonValue: jsonProduct.chemistry || '',
      });
    }

    // Compare Product Name (simplified - just check if they're similar)
    const csvName = normalizeText(csvProduct['Product Name']);
    const jsonName = normalizeText(jsonProduct.name);
    if (csvName && jsonName && !jsonName.includes(csvName.split(' ')[0]) && !csvName.includes(jsonName.split(' ')[0])) {
      // Only flag if they're significantly different
      if (Math.abs(csvName.length - jsonName.length) > 10) {
        result.fieldMismatches.push({
          productId,
          field: 'Product Name',
          csvValue: csvProduct['Product Name'],
          jsonValue: jsonProduct.name,
        });
      }
    }

    // Compare Industry
    const csvIndustry = normalizeText(csvProduct.Industry);
    const jsonIndustry = normalizeText(jsonProduct.industry);
    if (csvIndustry && jsonIndustry && !jsonIndustry.includes(csvIndustry) && !csvIndustry.includes(jsonIndustry)) {
      // Map CSV industries to JSON format
      const industryMap: Record<string, string> = {
        'composites': 'composites_industry',
        'construction': 'construction_industry',
        'industrial': 'industrial_industry',
        'insulation': 'insulation_industry',
        'marine': 'marine_industry',
        'transportation': 'transportation_industry',
      };
      const mappedIndustry = industryMap[csvIndustry] || csvIndustry;
      if (mappedIndustry !== jsonIndustry) {
        result.fieldMismatches.push({
          productId,
          field: 'Industry',
          csvValue: csvProduct.Industry,
          jsonValue: jsonProduct.industry,
        });
      }
    }

    // Compare Color
    const csvColor = normalizeText(csvProduct.Color);
    const jsonColor = normalizeText(jsonProduct.color);
    if (csvColor && jsonColor && csvColor !== jsonColor) {
      result.fieldMismatches.push({
        productId,
        field: 'Color',
        csvValue: csvProduct.Color,
        jsonValue: jsonProduct.color || '',
      });
    }

    // Compare Cleanup
    const csvCleanup = normalizeText(csvProduct.Cleanup);
    const jsonCleanup = normalizeText(jsonProduct.cleanup);
    if (csvCleanup && jsonCleanup && csvCleanup !== jsonCleanup) {
      result.fieldMismatches.push({
        productId,
        field: 'Cleanup',
        csvValue: csvProduct.Cleanup,
        jsonValue: jsonProduct.cleanup || '',
      });
    }

    // Compare Recommended Equipment
    const csvEquipment = normalizeText(csvProduct['Recommended Equipment']);
    const jsonEquipment = normalizeText(jsonProduct.recommended_equipment);
    if (csvEquipment && jsonEquipment && csvEquipment !== jsonEquipment) {
      result.fieldMismatches.push({
        productId,
        field: 'Recommended Equipment',
        csvValue: csvProduct['Recommended Equipment'],
        jsonValue: jsonProduct.recommended_equipment || '',
      });
    }
  }

  return result;
}

function formatFieldValue(value: string, maxLength: number = 200): string {
  if (!value) return '(empty)';
  if (value.length <= maxLength) return value;
  return value.substring(0, maxLength) + '...';
}

function generateDetailedReport(result: ComparisonResult, outputPath: string): void {
  const lines: string[] = [];
  
  lines.push('='.repeat(100));
  lines.push('DETAILED JSON vs CSV COMPARISON REPORT');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('='.repeat(100));
  lines.push('');

  // Executive Summary
  lines.push('EXECUTIVE SUMMARY');
  lines.push('-'.repeat(100));
  lines.push(`Total Products in CSV:        ${result.csvTotal}`);
  lines.push(`Total Products in JSON:       ${result.jsonTotal}`);
  lines.push(`Products in CSV only:         ${result.inCsvNotInJson.length}`);
  lines.push(`Products in JSON only:        ${result.inJsonNotInCsv.length}`);
  lines.push(`Common Products:              ${result.csvTotal - result.inCsvNotInJson.length}`);
  lines.push(`Field Mismatches:            ${result.fieldMismatches.length}`);
  const commonProducts = result.csvTotal - result.inCsvNotInJson.length;
  const matchPercentage = result.csvTotal > 0 
    ? ((commonProducts - result.fieldMismatches.length) / result.csvTotal * 100).toFixed(1)
    : '0';
  lines.push(`Perfect Matches:              ${commonProducts - result.fieldMismatches.length}`);
  lines.push(`Match Percentage:            ${matchPercentage}%`);
  lines.push('');

  // Products in CSV but not in JSON
  if (result.inCsvNotInJson.length > 0) {
    lines.push('='.repeat(100));
    lines.push(`PRODUCTS IN CSV BUT NOT IN JSON (${result.inCsvNotInJson.length})`);
    lines.push('='.repeat(100));
    lines.push('');
    
    for (const productId of result.inCsvNotInJson.sort()) {
      const csvProduct = result.csvProducts.get(productId)!;
      lines.push(`Product ID: ${productId}`);
      lines.push(`  Name:        ${csvProduct['Product Name'] || '(empty)'}`);
      lines.push(`  Industry:    ${csvProduct.Industry || '(empty)'}`);
      lines.push(`  Family:      ${csvProduct.Family || '(empty)'}`);
      lines.push(`  Chemistry:   ${csvProduct.Chemistry || '(empty)'}`);
      lines.push(`  OK Status:   ${csvProduct['OK?'] || '(empty)'}`);
      lines.push(`  On New Site: ${csvProduct['On New Site Now'] || '(empty)'}`);
      lines.push(`  On Old Site: ${csvProduct['On Old Site'] || '(empty)'}`);
      lines.push(`  Applications: ${formatFieldValue(csvProduct.Applications || '', 150)}`);
      lines.push(`  Benefits:    ${formatFieldValue(csvProduct.Benefits || '', 150)}`);
      lines.push(`  Size:        ${formatFieldValue(csvProduct.Size || '', 150)}`);
      lines.push(`  Color:       ${csvProduct.Color || '(empty)'}`);
      lines.push('');
    }
  }

  // Products in JSON but not in CSV
  if (result.inJsonNotInCsv.length > 0) {
    lines.push('='.repeat(100));
    lines.push(`PRODUCTS IN JSON BUT NOT IN CSV (${result.inJsonNotInCsv.length})`);
    lines.push('='.repeat(100));
    lines.push('');
    
    for (const productId of result.inJsonNotInCsv.sort()) {
      const jsonProduct = result.jsonProducts.get(productId)!;
      lines.push(`Product ID: ${productId}`);
      lines.push(`  Name:        ${jsonProduct.name || '(empty)'}`);
      lines.push(`  Full Name:   ${jsonProduct.full_name || '(empty)'}`);
      lines.push(`  Industry:    ${jsonProduct.industry || '(empty)'}`);
      lines.push(`  Brand:       ${jsonProduct.brand || '(empty)'}`);
      lines.push(`  Chemistry:   ${jsonProduct.chemistry || '(empty)'}`);
      lines.push(`  Description: ${formatFieldValue(jsonProduct.description || '', 150)}`);
      lines.push(`  Applications: ${jsonProduct.applications.length} items`);
      lines.push(`  Benefits:    ${jsonProduct.benefits.length} items`);
      lines.push(`  Sizing:      ${jsonProduct.sizing.length} items`);
      lines.push('');
    }
  }

  // Field Mismatches - Detailed
  if (result.fieldMismatches.length > 0) {
    lines.push('='.repeat(100));
    lines.push(`FIELD MISMATCHES (${result.fieldMismatches.length})`);
    lines.push('='.repeat(100));
    lines.push('');

    const grouped = new Map<string, Array<typeof result.fieldMismatches[0]>>();
    for (const mismatch of result.fieldMismatches) {
      if (!grouped.has(mismatch.field)) {
        grouped.set(mismatch.field, []);
      }
      grouped.get(mismatch.field)!.push(mismatch);
    }

    for (const [field, mismatches] of Array.from(grouped.entries()).sort()) {
      lines.push(`\n${field.toUpperCase()} MISMATCHES (${mismatches.length})`);
      lines.push('-'.repeat(100));
      
      for (const mismatch of mismatches.sort((a, b) => a.productId.localeCompare(b.productId))) {
        const csvProduct = result.csvProducts.get(mismatch.productId);
        const jsonProduct = result.jsonProducts.get(mismatch.productId);
        
        lines.push(`\nProduct ID: ${mismatch.productId}`);
        lines.push(`  Product Name: ${csvProduct?.['Product Name'] || jsonProduct?.name || 'N/A'}`);
        lines.push(`  CSV Value:`);
        lines.push(`    ${mismatch.csvValue.split('\n').join('\n    ')}`);
        lines.push(`  JSON Value:`);
        lines.push(`    ${mismatch.jsonValue.split('\n').join('\n    ')}`);
        
        // Show additional context for this product
        if (csvProduct) {
          lines.push(`  CSV Context:`);
          lines.push(`    Industry: ${csvProduct.Industry || '(empty)'}`);
          lines.push(`    Family:  ${csvProduct.Family || '(empty)'}`);
        }
        if (jsonProduct) {
          lines.push(`  JSON Context:`);
          lines.push(`    Industry: ${jsonProduct.industry || '(empty)'}`);
          lines.push(`    Brand:    ${jsonProduct.brand || '(empty)'}`);
        }
      }
      lines.push('');
    }
  }

  // Product-by-Product Comparison
  lines.push('='.repeat(100));
  lines.push('PRODUCT-BY-PRODUCT COMPARISON');
  lines.push('='.repeat(100));
  lines.push('');

  const allProductIds = new Set([
    ...result.csvProducts.keys(),
    ...result.jsonProducts.keys()
  ]);

  const sortedProductIds = Array.from(allProductIds).sort();
  
  for (const productId of sortedProductIds) {
    const csvProduct = result.csvProducts.get(productId);
    const jsonProduct = result.jsonProducts.get(productId);
    
    if (!csvProduct && !jsonProduct) continue;
    
    lines.push(`\n${'='.repeat(100)}`);
    lines.push(`PRODUCT: ${productId}`);
    lines.push('='.repeat(100));
    
    if (csvProduct && jsonProduct) {
      lines.push('STATUS: ✅ Exists in both CSV and JSON');
      
      // Compare each field
      const fieldsToCompare = [
        { csv: 'Product Name', json: 'name', label: 'Product Name' },
        { csv: 'Industry', json: 'industry', label: 'Industry' },
        { csv: 'Family', json: 'brand', label: 'Family/Brand' },
        { csv: 'Chemistry', json: 'chemistry', label: 'Chemistry' },
        { csv: 'Color', json: 'color', label: 'Color' },
        { csv: 'Cleanup', json: 'cleanup', label: 'Cleanup' },
        { csv: 'Recommended Equipment', json: 'recommended_equipment', label: 'Recommended Equipment' },
      ];
      
      for (const field of fieldsToCompare) {
        const csvVal = csvProduct[field.csv as keyof CsvProduct] || '';
        const jsonVal = jsonProduct[field.json as keyof JsonProduct] || '';
        const csvNorm = normalizeText(csvVal.toString());
        const jsonNorm = normalizeText(jsonVal.toString());
        
        if (csvNorm !== jsonNorm && (csvNorm || jsonNorm)) {
          lines.push(`\n  ⚠️  ${field.label}:`);
          lines.push(`     CSV:  ${formatFieldValue(csvVal.toString(), 100)}`);
          lines.push(`     JSON: ${formatFieldValue(jsonVal.toString(), 100)}`);
        }
      }
      
      // Compare Applications
      const csvApps = normalizeCsvList(csvProduct.Applications);
      const jsonApps = normalizeArray(jsonProduct.applications);
      if (csvApps.length !== jsonApps.length || 
          !csvApps.every((app, i) => jsonApps[i] === app)) {
        lines.push(`\n  ⚠️  Applications:`);
        lines.push(`     CSV (${csvApps.length} items):`);
        csvApps.slice(0, 5).forEach(app => lines.push(`       - ${app}`));
        if (csvApps.length > 5) lines.push(`       ... and ${csvApps.length - 5} more`);
        lines.push(`     JSON (${jsonApps.length} items):`);
        jsonApps.slice(0, 5).forEach(app => lines.push(`       - ${app}`));
        if (jsonApps.length > 5) lines.push(`       ... and ${jsonApps.length - 5} more`);
      }
      
      // Compare Benefits
      const csvBenefits = normalizeCsvList(csvProduct.Benefits);
      const jsonBenefits = normalizeArray(jsonProduct.benefits);
      if (csvBenefits.length !== jsonBenefits.length || 
          !csvBenefits.every((ben, i) => jsonBenefits[i] === ben)) {
        lines.push(`\n  ⚠️  Benefits:`);
        lines.push(`     CSV (${csvBenefits.length} items):`);
        csvBenefits.slice(0, 5).forEach(ben => lines.push(`       - ${ben}`));
        if (csvBenefits.length > 5) lines.push(`       ... and ${csvBenefits.length - 5} more`);
        lines.push(`     JSON (${jsonBenefits.length} items):`);
        jsonBenefits.slice(0, 5).forEach(ben => lines.push(`       - ${ben}`));
        if (jsonBenefits.length > 5) lines.push(`       ... and ${jsonBenefits.length - 5} more`);
      }
      
      // Compare Size
      const csvSize = normalizeCsvList(csvProduct.Size);
      const jsonSize = normalizeArray(jsonProduct.sizing);
      if (csvSize.length !== jsonSize.length || 
          !csvSize.every((size, i) => jsonSize[i] === size)) {
        lines.push(`\n  ⚠️  Size/Sizing:`);
        lines.push(`     CSV (${csvSize.length} items):`);
        csvSize.forEach(size => lines.push(`       - ${size}`));
        lines.push(`     JSON (${jsonSize.length} items):`);
        jsonSize.forEach(size => lines.push(`       - ${size}`));
      }
      
    } else if (csvProduct && !jsonProduct) {
      lines.push('STATUS: ❌ Only in CSV');
      lines.push(`  Name: ${csvProduct['Product Name'] || '(empty)'}`);
      lines.push(`  Industry: ${csvProduct.Industry || '(empty)'}`);
      lines.push(`  Family: ${csvProduct.Family || '(empty)'}`);
    } else if (!csvProduct && jsonProduct) {
      lines.push('STATUS: ❌ Only in JSON');
      lines.push(`  Name: ${jsonProduct.name || '(empty)'}`);
      lines.push(`  Industry: ${jsonProduct.industry || '(empty)'}`);
      lines.push(`  Brand: ${jsonProduct.brand || '(empty)'}`);
    }
  }

  // Write to file
  const reportContent = lines.join('\n');
  fs.writeFileSync(outputPath, reportContent, 'utf-8');
  console.log(`\n✅ Detailed report saved to: ${outputPath}`);
}

function printComparison(result: ComparisonResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('JSON vs CSV COMPARISON REPORT');
  console.log('='.repeat(80) + '\n');

  console.log('📊 PRODUCT COUNTS:');
  console.log(`   CSV Products:  ${result.csvTotal}`);
  console.log(`   JSON Products: ${result.jsonTotal}`);
  console.log(`   Difference:    ${Math.abs(result.csvTotal - result.jsonTotal)}\n`);

  if (result.inCsvNotInJson.length > 0) {
    console.log(`⚠️  PRODUCTS IN CSV BUT NOT IN JSON (${result.inCsvNotInJson.length}):`);
    result.inCsvNotInJson.slice(0, 20).forEach(productId => {
      const csvProduct = result.csvProducts.get(productId);
      console.log(`   - ${productId}: ${csvProduct?.['Product Name'] || 'N/A'}`);
    });
    if (result.inCsvNotInJson.length > 20) {
      console.log(`   ... and ${result.inCsvNotInJson.length - 20} more`);
    }
    console.log();
  }

  if (result.inJsonNotInCsv.length > 0) {
    console.log(`⚠️  PRODUCTS IN JSON BUT NOT IN CSV (${result.inJsonNotInCsv.length}):`);
    result.inJsonNotInCsv.slice(0, 20).forEach(productId => {
      const jsonProduct = result.jsonProducts.get(productId);
      console.log(`   - ${productId}: ${jsonProduct?.name || 'N/A'}`);
    });
    if (result.inJsonNotInCsv.length > 20) {
      console.log(`   ... and ${result.inJsonNotInCsv.length - 20} more`);
    }
    console.log();
  }

  if (result.fieldMismatches.length > 0) {
    console.log(`⚠️  FIELD MISMATCHES (${result.fieldMismatches.length}):`);
    const grouped = new Map<string, Array<typeof result.fieldMismatches[0]>>();
    for (const mismatch of result.fieldMismatches) {
      if (!grouped.has(mismatch.field)) {
        grouped.set(mismatch.field, []);
      }
      grouped.get(mismatch.field)!.push(mismatch);
    }
    
    for (const [field, mismatches] of grouped.entries()) {
      console.log(`\n   ${field} (${mismatches.length} mismatches):`);
      mismatches.slice(0, 10).forEach(m => {
        console.log(`      ${m.productId}:`);
        console.log(`         CSV:  ${m.csvValue.substring(0, 60)}${m.csvValue.length > 60 ? '...' : ''}`);
        console.log(`         JSON: ${m.jsonValue.substring(0, 60)}${m.jsonValue.length > 60 ? '...' : ''}`);
      });
      if (mismatches.length > 10) {
        console.log(`      ... and ${mismatches.length - 10} more`);
      }
    }
    console.log();
  }

  // Summary
  const commonProducts = result.csvTotal - result.inCsvNotInJson.length;
  const matchPercentage = result.csvTotal > 0 
    ? ((commonProducts - result.fieldMismatches.length) / result.csvTotal * 100).toFixed(1)
    : '0';

  console.log('📈 SUMMARY:');
  console.log(`   Common Products:     ${commonProducts}`);
  console.log(`   Perfect Matches:     ${commonProducts - result.fieldMismatches.length}`);
  console.log(`   Match Percentage:    ${matchPercentage}%`);
  console.log(`   Products to Review:  ${result.inCsvNotInJson.length + result.inJsonNotInCsv.length + result.fieldMismatches.length}`);
  console.log('\n' + '='.repeat(80) + '\n');
}

async function main() {
  // Try multiple possible CSV paths
  const possibleCsvPaths = [
    'c:/Users/NicoL/Downloads/Untitled spreadsheet - Prod Attr for Website DB Jan 1 2025(Randy Review Jan 4) (1).csv',
    path.join(__dirname, '../../../../c:/Users/NicoL/Downloads/Untitled spreadsheet - Prod Attr for Website DB Jan 1 2025(Randy Review Jan 4) (1).csv'),
    process.argv[2], // Allow CSV path as command line argument
  ].filter(Boolean);

  let csvPath = '';
  for (const possiblePath of possibleCsvPaths) {
    if (possiblePath && fs.existsSync(possiblePath)) {
      csvPath = possiblePath;
      break;
    }
  }

  const jsonPath = path.join(__dirname, '../../data/forza_products_organized.json');

  console.log('🔍 Loading data...');
  console.log(`   CSV: ${csvPath}`);
  console.log(`   JSON: ${jsonPath}\n`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON file not found: ${jsonPath}`);
    process.exit(1);
  }

  const csvProducts = loadCsvProducts(csvPath);
  const jsonProducts = loadJsonProducts(jsonPath);

  console.log(`✅ Loaded ${csvProducts.size} products from CSV`);
  console.log(`✅ Loaded ${jsonProducts.size} products from JSON\n`);

  const result = compareProducts(csvProducts, jsonProducts);
  printComparison(result);
  
  // Generate detailed report
  const reportPath = path.join(__dirname, '../../comparison-report.txt');
  generateDetailedReport(result, reportPath);
  console.log(`\n📄 Detailed report generated: ${reportPath}`);
}

main().catch(console.error);

