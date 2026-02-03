import * as XLSX from 'xlsx';

/**
 * Normaliza nombres de columnas a claves consistentes
 */
const normalizeHeaders = (row) => {
    const normalized = {};
    for (const key in row) {
        const normKey = key.toString().trim().toUpperCase();
        normalized[normKey] = row[key];
    }
    return normalized;
};

/**
 * Limpia códigos para asegurar coincidencias (quita guiones, espacios, etc)
 */
const cleanCode = (code) => {
    if (code === null || code === undefined) return '';
    return String(code).replace(/[^a-zA-Z0-9]/g, '').replace(/^0+/, '');
};

/**
 * Inferir grupo basado en palabras clave (IA Heurística)
 */
const inferGroupByKeywords = (description) => {
    if (!description) return null;
    const desc = description.toUpperCase();

    if (desc.includes('DELUXE') || desc.includes('DLX')) return 'DELUXE';
    if (desc.includes('PREMIUM') || desc.includes('PRM')) return 'PREMIUM';
    if (desc.includes('MAB') || desc.includes('RH')) return 'MAB RH';

    if (desc.includes('TABLERO')) {
        if (desc.includes('ARENA') || desc.includes('CAPUCCINO') || desc.includes('ROBLE') || desc.includes('NOGAL') || desc.includes('CENIZA')) return 'PREMIUM';
        return 'MAB RH';
    }

    if (desc.includes('CANTO')) return 'MAB RH';
    if (desc.includes('GRAFFIT') || desc.includes('METALLO')) return 'DELUXE';

    return null;
};

/**
 * Procesador para Maestro SKU
 */
export const processSKUMaster = (data) => {
    const mapping = {};
    data.forEach(item => {
        const row = normalizeHeaders(item);

        // Buscar códigos (EAN, SKU, etc.)
        const codes = [
            row['CODIGO INTERNO MAB'],
            row['CÓDIGO DE ÍTEM / COMPRADOR'],
            row['EAN'],
            row['CODIGO'],
            row['SKU']
        ];

        // Buscar el Grupo de forma más agresiva
        let group = null;

        // 1. Columnas explícitas comunes
        const directGroup = row['GRUPO'] || row['CATEGORIA'] || row['CATEGORÍA'] || row['LINEA'] || row['FAMILIA'] || row['CLASIFICACION'];
        if (directGroup) {
            group = directGroup.toString().trim().toUpperCase();
        }

        // 2. Si no hay directo, buscar cualquier columna que contenga "GRUPO" o "CATEG"
        if (!group) {
            const keys = Object.keys(row);
            const groupKey = keys.find(k => k.includes('GRUPO') || k.includes('CATEG'));
            if (groupKey && row[groupKey]) {
                group = row[groupKey].toString().trim().toUpperCase();
            }
        }

        // 3. Fallback a Referencia si no es un código
        if (!group) {
            const ref = row['REFERENCIA'] || row['REF'];
            if (ref && isNaN(ref) && ref.length > 3) { // Asumir que si no es número es un grupo/familia
                group = ref.toString().trim().toUpperCase();
            }
        }

        // 4. Default
        if (!group) group = 'OTROS';

        const productData = {
            grupo: group,
            referencia: row['REFERENCIA'] || row['REF'],
            descripcion: row['DESCRIPCION'] || row['DESCRIPCIÓN'] || row['NOMBRE'] || row['PRODUCTO']
        };

        codes.forEach(c => {
            const clean = cleanCode(c);
            if (clean) mapping[clean] = productData;
        });
    });
    return mapping;
};

/**
 * Procesador para Inventario
 */
export const processInventory = (data) => {
    return data.map(item => {
        const row = normalizeHeaders(item);
        return {
            sku: row['EAN'] || row['CODIGO'] || row['CÓDIGO DE ÍTEM / COMPRADOR'] || row['CÓDIGO DE PRODUCTO / EAN'],
            producto: row['DESCRIPCIÓN DEL ÍTEM'] || row['DESCRIPCION'] || row['DESCRIPCIÓN DE PRODUCTO'],
            stock: parseFloat(row['SALDO FINAL'] || row['CANTIDAD'] || 0),
            tienda: row['ALMACEN'] || row['TIENDA'] || row['NOMBRE LUGAR'] || 'CENTRAL'
        };
    });
};

/**
 * Procesador para Ventas
 */
export const processSales = (data, skuMapping = {}) => {
    return data.map(item => {
        const row = normalizeHeaders(item);
        const candidateCodes = [
            row['CÓDIGO DE ÍTEM / COMPRADOR'],
            row['CÓDIGO EAN DEL ITEM'],
            row['CODIGO INTERNO MAB'],
            row['EAN'],
            row['SKU'],
            row['REF'],
            row['REFERENCIA'],
            row['MATERIAL'],
            row['CÓDIGO']
        ];

        let mapped = {};
        let finalSku = '';

        for (const rawCode of candidateCodes) {
            const clean = cleanCode(rawCode);
            if (clean && skuMapping[clean]) {
                mapped = skuMapping[clean];
                finalSku = rawCode;
                break;
            }
        }

        if (!finalSku) finalSku = candidateCodes.find(c => c) || 'UNKNOWN';

        const finalProductDescription = row['DESCRIPCIÓN DEL ÍTEM'] || row['DESCRIPCION'] || row['DESCRIPCIÓN'] || mapped.descripcion;
        const initialGroup = mapped.grupo || (row['GRUPO'] || row['LINEA'] || row['CATEGORIA'] || 'OTROS').toString().trim().toUpperCase();

        let finalGroup = initialGroup;
        if (['OTROS', 'OTRO', 'TABLERO', 'CANTO'].includes(initialGroup)) {
            const inferred = inferGroupByKeywords(finalProductDescription);
            if (inferred) finalGroup = inferred;
        }

        return {
            date: excelDateToJSDate(row['FECHA'] || row['FECHA FINAL'] || row['FECHA INICIAL']),
            tienda: row['TIENDA'] || row['DESCRIPCIÓN'] || row['DESCRIPCIÓN DEL ÍTEM'] || row['NOMBRE LUGAR'] || row['ALMACEN'],
            producto: finalProductDescription,
            cantidad: parseFloat(row['CANTIDAD VENDIDA'] || row['CANTIDAD'] || row['VENTA'] || row['CANT'] || 0),
            grupo: finalGroup,
            sku: finalSku
        };
    }).filter(s => s.cantidad !== 0);
};

const excelDateToJSDate = (serial) => {
    if (!serial) return null;
    if (serial instanceof Date) return serial;
    if (typeof serial === 'string') {
        const parts = serial.split(/[-/]/);
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(serial);
    }
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    return new Date(utc_value * 1000);
};

export const readExcel = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                let bestHeaderRowIndex = 0;
                let maxKeywordsFound = 0;
                const keywords = ['EAN', 'SKU', 'CANTIDAD', 'DESCRIPCION', 'FECHA', 'TIENDA', 'GRUPO', 'SALDO'];

                for (let i = 0; i < Math.min(rawData.length, 25); i++) {
                    const row = rawData[i];
                    if (!row || row.length === 0) continue;
                    const rowStr = row.map(c => String(c).toUpperCase()).join(' ');
                    let matches = 0;
                    keywords.forEach(k => { if (rowStr.includes(k)) matches++; });
                    if (matches > maxKeywordsFound) {
                        maxKeywordsFound = matches;
                        bestHeaderRowIndex = i;
                    }
                }
                resolve(XLSX.utils.sheet_to_json(worksheet, { range: bestHeaderRowIndex }));
            } catch (error) { reject(error); }
        };
        reader.readAsArrayBuffer(file);
    });
};

export const generatePivotData = (data, rowKey) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const pivot = {};
    data.forEach(item => {
        const rVal = item[rowKey] || 'Sin Clasificar';
        const mIdx = item.date ? item.date.getMonth() : -1;
        const mName = mIdx !== -1 ? months[mIdx] : 'Desconocido';
        if (!pivot[rVal]) {
            pivot[rVal] = { name: rVal, total: 0 };
            months.forEach(m => pivot[rVal][m] = 0);
        }
        if (mName !== 'Desconocido') pivot[rVal][mName] += item.cantidad;
        pivot[rVal].total += item.cantidad;
    });
    return Object.values(pivot).sort((a, b) => b.total - a.total);
};

export const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, filename);
};
