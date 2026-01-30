import * as XLSX from 'xlsx';
import fs from 'fs';

const files = [
    'INVENTARIO-12-01-2026.xlsx',
    'Ventas 2025.xlsx',
    'VENTAS- 02-01-2026.xlsx',
    'sku sodimac con grupos.xlsx'
];

console.log('--- ANÁLISIS DE ENCABEZADOS EXCEL ---\n');

files.forEach(file => {
    try {
        if (!fs.existsSync(file)) {
            console.log(`[!] Archivo no encontrado: ${file}`);
            return;
        }
        
        const buf = fs.readFileSync(file);
        const wb = XLSX.read(buf, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        
        // Leer rango y encontrar encabezados
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Buscar primera fila con datos significativos (heurística simple)
        let headers = [];
        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
            const row = rawData[i];
            if (row && row.length > 2) {
                headers = row;
                break;
            }
        }
        
        console.log(`ARCHIVO: ${file}`);
        console.log(`COLUMNAS DETECTADAS: ${headers.join(', ')}`);
        console.log('-----------------------------------');
        
    } catch (e) {
        console.error(`Error leyendo ${file}:`, e.message);
    }
});
