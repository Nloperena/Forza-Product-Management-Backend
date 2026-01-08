import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/products.db');
const JSON_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

async function quickSeed() {
  console.log('🚀 Quick seeding database from JSON...');
  
  const db = new sqlite3.Database(DB_PATH);
  
  // Load JSON
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  const root = jsonData.forza_products_organized;
  
  // Extract all products
  const products: any[] = [];
  for (const brandKey in root) {
    if (brandKey === 'metadata') continue;
    const brand = root[brandKey];
    if (brand.products) {
      for (const industryKey in brand.products) {
        const industry = brand.products[industryKey];
        if (Array.isArray(industry.products)) {
          products.push(...industry.products);
        }
      }
    }
  }
  
  console.log(`📊 Found ${products.length} products`);
  
  // Promisify db operations
  const run = (sql: string, params: any[] = []): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };
  
  try {
    // Clear existing
    await run('DELETE FROM products');
    console.log('✅ Cleared existing products');
    
    // Insert each product
    let count = 0;
    for (const p of products) {
      const sql = `
        INSERT INTO products (
          product_id, name, full_name, description, brand, industry,
          chemistry, url, image, benefits, applications, technical, sizing,
          color, cleanup, recommended_equipment, published, benefits_count, last_edited
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await run(sql, [
        p.product_id,
        p.name,
        p.full_name || p.name,
        p.description || '',
        p.brand,
        p.industry,
        p.chemistry || '',
        p.url || '',
        p.image || '',
        JSON.stringify(p.benefits || []),
        JSON.stringify(p.applications || []),
        JSON.stringify(p.technical || []),
        JSON.stringify(p.sizing || []),
        p.color || '',
        p.cleanup || '',
        p.recommended_equipment || '',
        p.published ? 1 : 0,
        p.benefits?.length || 0,
        p.last_edited || new Date().toISOString()
      ]);
      
      count++;
      if (count % 50 === 0) {
        console.log(`✅ Inserted ${count}/${products.length}`);
      }
    }
    
    console.log(`🎉 Done! Inserted ${count} products`);
    
  } finally {
    db.close();
  }
}

quickSeed().catch(console.error);

