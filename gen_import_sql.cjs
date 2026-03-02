const XLSX = require('xlsx');
const fs = require('fs');

const org_id = 'd12bc5ff-975d-494e-9945-369efd4ad3e9';

try {
    const workbook = XLSX.readFile('c:\\Users\\erkan\\stok\\27.02.26 SAYIM.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const validRows = data.filter(row => row[1] && row[1] !== 'SKU');

    // Use a Map to aggregate stock for duplicate SKUs
    const aggregatedData = new Map();

    validRows.forEach(row => {
        const sku = String(row[1]).replace(/'/g, "''").trim();
        const stock = parseFloat(row[2]) || 0;

        if (aggregatedData.has(sku)) {
            aggregatedData.set(sku, aggregatedData.get(sku) + stock);
        } else {
            aggregatedData.set(sku, stock);
        }
    });

    const productValues = [];
    aggregatedData.forEach((stock, sku) => {
        productValues.push(`('${org_id}', '${sku}', '${sku}', ${stock}, 0)`);
    });

    const sql = `
    INSERT INTO products (organization_id, sku, name, current_stock, fixed_cost_usd)
    VALUES 
    ${productValues.join(',\n    ')}
    ON CONFLICT (organization_id, sku) DO UPDATE 
    SET current_stock = EXCLUDED.current_stock, updated_at = now();

    INSERT INTO transactions (organization_id, product_id, user_id, type, quantity, reason_code)
    SELECT organization_id, product_id, '00000000-0000-0000-0000-000000000000', 'ADJUST', current_stock, 'Initial Count from Excel'
    FROM products
    WHERE organization_id = '${org_id}';
  `;

    fs.writeFileSync('import_final.sql', sql, 'utf8');
    console.log(`Generated SQL for ${aggregatedData.size} unique products.`);
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
