import fs from 'fs';
import path from 'path';

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

async function renameApplicationsToInstructions() {
  try {
    console.log('🔄 Reading JSON file...');
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    
    // Parse JSON
    const data = JSON.parse(fileContent);
    
    // Count how many "applications" we'll rename
    let count = 0;
    
    // Recursive function to rename "applications" to "instructions"
    function renameKey(obj: any): void {
      if (Array.isArray(obj)) {
        obj.forEach(item => renameKey(item));
      } else if (obj !== null && typeof obj === 'object') {
        // Check if this object has an "applications" key
        if ('applications' in obj) {
          obj.instructions = obj.applications;
          delete obj.applications;
          count++;
        }
        // Recursively process all properties
        Object.keys(obj).forEach(key => {
          renameKey(obj[key]);
        });
      }
    }
    
    console.log('🔄 Renaming "applications" to "instructions"...');
    renameKey(data);
    
    console.log(`✅ Found and renamed ${count} "applications" attributes`);
    
    // Write back to file
    console.log('💾 Writing updated JSON to file...');
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    console.log('✅ Successfully renamed all "applications" to "instructions"!');
    console.log(`📊 Total attributes renamed: ${count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
  
  try {
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    let count = 0;
    
    function countApplications(obj: any): void {
      if (Array.isArray(obj)) {
        obj.forEach(item => countApplications(item));
      } else if (obj !== null && typeof obj === 'object') {
        if ('applications' in obj) {
          count++;
        }
        Object.keys(obj).forEach(key => {
          countApplications(obj[key]);
        });
      }
    }
    
    countApplications(data);
    
    console.log(`📊 Found ${count} "applications" attributes that would be renamed to "instructions"`);
    console.log('\n💡 Run without --dry-run to apply changes');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
} else {
  renameApplicationsToInstructions();
}

