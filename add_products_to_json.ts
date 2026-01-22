import * as fs from 'fs';
import * as path from 'path';

const productData = [
  {
    "product_id": "R160",
    "name": "R160 - Two-Part 5-Minute Epoxy",
    "description": "Used in applications that benefit from a tenacious bond with wood, concrete, fiberglass, and most thermoset plastics.",
    "brand": "forza_bond",
    "industry": "industrial_industry",
    "chemistry": "Epoxy",
    "url": "https://forzabuilt.com/product/r160/",
    "image": "https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images-web-optimized/Industrial/R160 2 part.webp",
    "benefits": [
      "1:1 ratio, easy mixing or dispensing",
      "3 minute work life, 8 minute handling strength",
      "60 to 250 F service temperature",
      "Resistant to water, salt, vehicle fuels and fluids, and many other substances"
    ],
    "applications": [
      "Used in applications that benefit from a tenacious bond with wood, concrete, fiberglass, and most thermoset plastics.",
      "Carpet tack strip to concrete, metal, wood, and various other floor surfaces.",
      "Bonds metal balusters in wood hand rails"
    ],
    "technical": [
      { "property": "Appearance", "value": "Clear or Blue" },
      { "property": "Handling Time", "value": "10", "unit": "minutes" },
      { "property": "Mix Ratio", "value": "1:1", "unit": "by volume" },
      { "property": "Work Life", "value": "3", "unit": "minutes" },
      { "property": "Service Temperature", "value": "-60 to 250", "unit": "F" },
      { "property": "VOC", "value": "569", "unit": "g/L" },
      { "property": "Cure Type", "value": "Very fast cure" },
      { "property": "Resistance", "value": "Water, salt, vehicle fuels and fluids" }
    ],
    "sizing": [
      "280 ml Cartridge",
      "5 Gallon",
      "55 Gallon Drum",
      "50 ml Cartridge"
    ],
    "published": true,
    "full_name": "R160 - Two-Part 5-Minute Epoxy"
  },
  {
    "product_id": "R221",
    "name": "R221 - Two-Part 1:1 Modified Epoxy Adhesive",
    "description": "Ideal for applications requiring the structural bonding of metals and other various materials in panel assembly.",
    "brand": "forza_bond",
    "industry": "industrial_industry",
    "chemistry": "Modified Epoxy",
    "url": "https://forzabuilt.com/product/r221/",
    "image": "https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images-web-optimized/Industrial/R221 2 part.webp",
    "benefits": [
      "1:1 ratio, easy mixing/ dispensing",
      "Minimal surface preparation required",
      "75 F to 400 F service temp",
      "Retains flexible bond line, out performs most brittle two part adhesives",
      "Light stable and UV resistant",
      "Paintable",
      "0 VOC",
      "Generates no heat",
      "100% solids no shrinking"
    ],
    "applications": [
      "Ideal for applications requiring the structural bonding of metals and other various materials in panel assembly.",
      "Suitable for structural bonding where a flexible bond line is desired.",
      "Wood, Ceramics, Composites, Concrete, and FRP, and combinations of these materials"
    ],
    "technical": [
      { "property": "Appearance", "value": "Two-part epoxy system" },
      { "property": "Mix Ratio", "value": "1:1", "unit": "by volume" },
      { "property": "Pot Life", "value": "45-60", "unit": "minutes" },
      { "property": "Cure Time", "value": "24", "unit": "hours" },
      { "property": "Temperature Range", "value": "-40 to 180", "unit": "F" },
      { "property": "Tensile Strength", "value": "3200+", "unit": "psi" },
      { "property": "Shear Strength", "value": "2800+", "unit": "psi" },
      { "property": "Package Size", "value": "Industrial", "unit": "drum" }
    ],
    "sizing": [
      "400 ml Cartridge",
      "5 Gallon Pail",
      "52 Gallon Drum"
    ],
    "published": true,
    "full_name": "R221 - Two-Part 1:1 Modified Epoxy Adhesive"
  },
  {
    "product_id": "R519",
    "name": "R519 - Two-Part Methacrylate Adhesive",
    "description": "Ideal for applications requiring the bonding of engineered thermoplastics, thermosets, composites, and metal structural elements in any combination.",
    "brand": "forza_bond",
    "industry": "industrial_industry",
    "chemistry": "Methacrylate/MMA",
    "url": "https://forzabuilt.com/product/r519/",
    "image": "https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images-web-optimized/Industrial/R519 2 part.webp",
    "benefits": [
      "Excellent bonding to a wide variety of substrates",
      "1:1 ratio - easy mixing or dispensing",
      "Minimal surface preparation required",
      "Excellent bond strength",
      "Forms tough, high strength, high impact resistant bonds",
      "Resists most common industrial cleaners, fuels, lubricants and environmental conditions",
      "Impact and weather resistant",
      "Retains bond strength in boiling water, salt water, salt fog, kerosene, gasoline, diesel fuel, antifreeze, hydraulic fluids and cutting oils"
    ],
    "applications": [
      "Ideal for applications requiring the bonding of engineered thermoplastics, thermosets, composites, and metal structural elements in any combination.",
      "Ideally suited to bond a wide variety of rubber materials and a vast range of metals without the need for surface preparation.",
      "Highly effective in applications requiring bonding composites and bonding other substrates"
    ],
    "technical": [
      { "property": "Appearance", "value": "Two-part modified epoxy system" },
      { "property": "Mix Ratio", "value": "1:1", "unit": "by volume" },
      { "property": "Pot Life", "value": "50-70", "unit": "minutes" },
      { "property": "Cure Time", "value": "24-48", "unit": "hours" },
      { "property": "Temperature Range", "value": "-40 to 160", "unit": "F" },
      { "property": "Tensile Strength", "value": "3000+", "unit": "psi" },
      { "property": "Elongation", "value": "Enhanced" },
      { "property": "Package Size", "value": "Industrial", "unit": "drum" }
    ],
    "sizing": [
      "50 ml Cartridge",
      "400 ml Cartridge",
      "5 Gallon",
      "52 Gallon Drum"
    ],
    "published": true,
    "full_name": "R519 - Two-Part Methacrylate Adhesive"
  }
];

const jsonFiles = [
  'backend/backend/data/forza_products_organized.json',
  'backend/data/forza_products_organized.json',
  'data/forza_products_organized.json'
];

for (const filePath of jsonFiles) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ Skip: ${fullPath} not found`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const data = JSON.parse(content);

  const targetArr = data.forza_products_organized.forza_bond.products.industrial_industry.products;
  
  let addedCount = 0;
  for (const newProd of productData) {
    if (!targetArr.find(p => p.product_id === newProd.product_id)) {
      targetArr.push(newProd);
      addedCount++;
    }
  }

  if (addedCount > 0) {
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Added ${addedCount} products to ${filePath}`);
  } else {
    console.log(`ℹ️ Products already exist in ${filePath}`);
  }
}








