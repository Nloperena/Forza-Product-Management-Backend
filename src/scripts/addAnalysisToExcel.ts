import * as XLSX from 'xlsx';
import path from 'path';

const excelFilePath = path.join(__dirname, '../../products_export_2025-11-19.xlsx');

// Read the existing Excel file
const workbook = XLSX.readFile(excelFilePath);

// Create analysis data
const deletionData = [
  ['Product ID', 'Product Name', 'Category', 'Industry', 'Chemistry', 'Status', 'Reason'],
  ['oa75', 'OA75 – TROWELLABLE FLOORING ADHESIVE', 'BOND', 'Industrial', 'Solvent Base', '❌ DELETE', 'Not in new mockups folder'],
  ['oa99', 'OA99 – BONDING PUTTY', 'BOND', 'Industrial', 'Polyurethane (PU)', '❌ DELETE', 'Not in new mockups folder'],
  ['i1000', 'I1000 – LOW-MEDIUM VISCOSITY LAMINATING ADHESIVE', 'BOND', 'Industrial', 'Epoxy', '❌ DELETE', 'Not in new mockups folder'],
  ['r529', 'R529 – STRUCTURAL ANCHORING EPOXY', 'BOND', 'Industrial', 'Epoxy', '❌ DELETE', 'Not in new mockups folder'],
  ['fc-car', 'FC-CAR – CITRUS-BASED ADHESIVE REMOVER / CLEANER', 'BOND', 'Industrial', 'Solvent Base', '❌ DELETE', 'Not in new mockups folder'],
  ['cc503-aa', 'CC503 AA – LOW VOC, CA COMPLIANT, MULTI-PURPOSE ADHESIVE', 'BOND', 'Construction', 'Solvent Base', '⚠️ MERGE with CC503', 'Merge with CC503'],
  ['c-w6106', 'C-W6106 – HPL LAMINATING ADHESIVE', 'BOND', 'Construction', 'Solvent Base', '⚠️ CHECK (mockups show C-W61606)', 'Verify if same product or typo'],
  ['os61-adhesive', 'OS61 – HIGH PERFORMANCE SEMI SELF-LEVELING ADHESIVE / SEALANT', 'SEAL', 'Construction', 'Silicone', '⚠️ MERGE with OS61', 'Merge with OS61'],
  ['ic946--ca-compliant-pressure-sensitive-contact-adhesive', '(Long variant name)', 'BOND', 'Industrial', '-', '⚠️ MERGE with IC946', 'Merge with IC946'],
  ['os45', 'OS45 – ACRYLIC ADHESIVE CAULK', 'SEAL', 'Industrial', 'MS', '❌ DELETE', 'Not in new mockups folder'],
  ['os55', 'OS55 – BUTYL ADHESIVE CAULK', 'SEAL', 'Industrial', 'MS', '❌ DELETE', 'Not in new mockups folder'],
  ['t461', 'T461 – HOT MELT TRANSFER TAPE', 'TAPE', 'Industrial', 'Acrylic (incl. PSA)', '❌ DELETE', 'Not in new mockups folder'],
  ['t500', 'T500 – BUTYL ADHESIVE TAPE', 'TAPE', 'Industrial', 'Acrylic (incl. PSA)', '❌ DELETE', 'Not in new mockups folder'],
  ['t464', 'T464 – TRANSFER TAPE', 'TAPE', 'Construction', 'Acrylic (incl. PSA)', '❌ DELETE', 'Not in new mockups folder'],
  ['t-t246', 'T-T246 – High Bond Acrylic Double-Sided Tape', 'TAPE', 'Industrial', '-', '❌ DELETE', 'Not in new mockups folder'],
  ['mc739', 'MC739 – MIST SPRAY ADHESIVE FOR FIBERGLASS INFUSION MOLDING', 'BOND', 'Industrial', 'Water Base', '❌ DELETE', 'Not in new mockups folder'],
];

const mergeData = [
  ['Source Product ID', 'Target Product ID', 'Action'],
  ['cc503-aa', 'cc503', 'Merge product data, update all references, delete source'],
  ['os61-adhesive', 'os61', 'Merge product data, update all references, delete source'],
  ['ic946--ca-compliant-pressure-sensitive-contact-adhesive', 'ic946', 'Merge product data, update all references, delete source'],
];

const verificationData = [
  ['JSON Product ID', 'Mockup Product ID', 'Action'],
  ['c-w6106', 'c-w61606', 'Verify if same product (typo) or different variants'],
  ['tac850', 'tac850gr', 'Verify if TAC850GR is replacement or variant of TAC850'],
];

const summaryData = [
  ['Metric', 'Count'],
  ['Total products in JSON', 146],
  ['Products in new mockups', 129],
  ['Products to delete (immediate)', 12],
  ['Products to merge (duplicates)', 3],
  ['Products requiring verification', 2],
  ['Total cleanup', 17],
];

// Create worksheets
const deletionSheet = XLSX.utils.aoa_to_sheet(deletionData);
const mergeSheet = XLSX.utils.aoa_to_sheet(mergeData);
const verificationSheet = XLSX.utils.aoa_to_sheet(verificationData);
const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

// Set column widths
deletionSheet['!cols'] = [
  { wch: 50 }, // Product ID
  { wch: 60 }, // Product Name
  { wch: 15 }, // Category
  { wch: 20 }, // Industry
  { wch: 25 }, // Chemistry
  { wch: 30 }, // Status
  { wch: 40 }, // Reason
];

mergeSheet['!cols'] = [
  { wch: 50 }, // Source Product ID
  { wch: 20 }, // Target Product ID
  { wch: 60 }, // Action
];

verificationSheet['!cols'] = [
  { wch: 30 }, // JSON Product ID
  { wch: 30 }, // Mockup Product ID
  { wch: 60 }, // Action
];

summarySheet['!cols'] = [
  { wch: 40 }, // Metric
  { wch: 15 }, // Count
];

// Add sheets to workbook
XLSX.utils.book_append_sheet(workbook, deletionSheet, 'Products to Delete');
XLSX.utils.book_append_sheet(workbook, mergeSheet, 'Products to Merge');
XLSX.utils.book_append_sheet(workbook, verificationSheet, 'Verification Required');
XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

// Write the file
XLSX.writeFile(workbook, excelFilePath);

console.log('✅ Analysis report added to Excel file successfully!');
console.log(`📄 File location: ${excelFilePath}`);
console.log('📊 Added sheets:');
console.log('   - Products to Delete');
console.log('   - Products to Merge');
console.log('   - Verification Required');
console.log('   - Summary');







