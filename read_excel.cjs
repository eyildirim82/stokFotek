const XLSX = require('xlsx');

try {
    const workbook = XLSX.readFile('c:\\Users\\erkan\\stok\\27.02.26 SAYIM.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Show first 20 rows with all columns
    console.log('Sample data (first 20 rows):');
    data.slice(0, 20).forEach((row, i) => {
        console.log(`Row ${i}:`, row);
    });
} catch (error) {
    console.error('Error reading Excel:', error.message);
    process.exit(1);
}
