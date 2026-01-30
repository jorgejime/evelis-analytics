const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
    'Ventas 2025.xlsx',
    'VENTAS- 02-01-2026.xlsx',
    'INVENTARIO-12-01-2026.xlsx',
    'sku sodimac con grupos.xlsx'
];

const results = {};

files.forEach(file => {
    try {
        const workbook = XLSX.readFile(path.join(__dirname, file));
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        let headerRowIndex = 0;
        while (headerRowIndex < data.length && (!data[headerRowIndex] || data[headerRowIndex].filter(x => x !== null && x !== '').length < 3)) {
            headerRowIndex++;
        }

        results[file] = {
            sheetName,
            headers: data[headerRowIndex] || [],
            sample1: data[headerRowIndex + 1] || [],
            sample2: data[headerRowIndex + 2] || []
        };
    } catch (error) {
        results[file] = { error: error.message };
    }
});

fs.writeFileSync('inspection_results.json', JSON.stringify(results, null, 2));
console.log('Results written to inspection_results.json');
