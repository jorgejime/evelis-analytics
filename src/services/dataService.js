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
    // Eliminar guiones, espacios y ceros a la izquierda para normalizar
    return String(code).replace(/[^a-zA-Z0-9]/g, '').replace(/^0+/, '');
};

/**
 * Inferir grupo basado en palabras clave (IA Heurística)
 */
const inferGroupByKeywords = (description) => {
    if (!description) return null;
    const desc = description.toUpperCase();

    // Reglas basadas en el catálogo histórico del cliente
    if (desc.includes('DELUXE') || desc.includes('DLX')) return 'DELUXE';
    if (desc.includes('PREMIUM') || desc.includes('PRM')) return 'PREMIUM';
    if (desc.includes('MAB') || desc.includes('RH')) return 'MAB RH';

    // Reglas por tipo de producto/material (Inferencia de IA)
    if (desc.includes('TABLERO')) {
        // En este catálogo, los tableros de colores madera/textura suelen ser PREMIUM
        if (desc.includes('ARENA') || desc.includes('CAPUCCINO') || desc.includes('ROBLE') || desc.includes('NOGAL') || desc.includes('CENIZA')) return 'PREMIUM';
        return 'MAB RH';
    }

    if (desc.includes('CANTO')) return 'MAB RH';
    if (desc.includes('GRAFFIT') || desc.includes('METALLO')) return 'DELUXE';

    return null;
};

/**
 * Procesador para Maestro SKU
 * Crea múltiples entradas en el mapa para asegurar que se encuentre el producto
 * por cualquiera de sus códigos (MAB, Comprador, EAN).
 */
export const processSKUMaster = (data) => {
    const mapping = {};
    data.forEach(item => {
        const row = normalizeHeaders(item);

        // Extraer todos los posibles identificadores
        const codes = [
            row['CODIGO INTERNO MAB'],
            row['CÓDIGO DE ÍTEM / COMPRADOR'],
            row['EAN'],
            row['CODIGO']
        ];

        const productData = {
            // Priorizar REFERENCIA porque suele contener DELUXE/PREMIUM, mientras que GRUPO es la categoría técnica (TABLERO)
            grupo: (row['REFERENCIA'] || row['GRUPO'] || row['LINEA'] || row['CATEGORIA'] || 'OTROS').toString().trim().toUpperCase(),
            referencia: row['REFERENCIA'] || row['REF'],
            descripcion: row['DESCRIPCION'] || row['DESCRIPCIÓN'] || row['NOMBRE']
        };

        // Indexar por cada código encontrado
        codes.forEach(c => {
            const clean = cleanCode(c);
            if (clean) {
                mapping[clean] = productData;
            }
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
 * Utiliza el SKU Manager para enriquecer datos.
 * Prioriza códigos específicos de producto sobre "EAN" genérico.
 */
export const processSales = (data, skuMapping = {}) => {
    return data.map(item => {
        const row = normalizeHeaders(item);

        // Buscar el código de producto más específico primero
        // En los reportes de ventas, "EAN" a veces es el de la tienda, por eso priorizamos otros.
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

        // Intentar encontrar match con cualquiera de los códigos candidatos
        for (const rawCode of candidateCodes) {
            const clean = cleanCode(rawCode);
            if (clean && skuMapping[clean]) {
                mapped = skuMapping[clean];
                finalSku = rawCode; // Usamos el código que hizo match como SKU principal
                break;
            }
        }

        // Si no hubo match, usamos el primer código disponible como SKU
        if (!finalSku) {
            finalSku = candidateCodes.find(c => c) || 'UNKNOWN';
        }

        const finalProductDescription = row['DESCRIPCIÓN DEL ÍTEM'] || row['DESCRIPCION'] || row['DESCRIPCIÓN'] || mapped.descripcion;
        const initialGroup = mapped.grupo || (row['GRUPO'] || row['LINEA'] || row['CATEGORIA'] || 'OTROS').toString().trim().toUpperCase();

        // IA Heurística: Si el grupo es genérico, intentar inferir por palabras clave en la descripción
        let finalGroup = initialGroup;
        if (initialGroup === 'OTROS' || initialGroup === 'OTRO' || initialGroup === 'TABLERO' || initialGroup === 'CANTO') {
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
        // Intentar parsear fecha string DD-MM-YYYY
        const parts = serial.split(/[-/]/);
        if (parts.length === 3) {
            const d = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            const y = parseInt(parts[2]);
            return new Date(y, m, d);
        }
        return new Date(serial);
    }
    // Excel serial date handling
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

                // Búsqueda inteligente de encabezados
                let bestHeaderRowIndex = 0;
                let maxKeywordsFound = 0;
                const keywords = ['EAN', 'SKU', 'CANTIDAD', 'DESCRIPCION', 'FECHA', 'TIENDA', 'GRUPO', 'SALDO', 'VENDIDA', 'LUGAR', 'ITEM'];

                for (let i = 0; i < Math.min(rawData.length, 25); i++) {
                    const row = rawData[i];
                    if (!row || row.length === 0) continue;

                    const rowStr = row.map(c => String(c).toUpperCase()).join(' ');
                    let matches = 0;
                    keywords.forEach(k => {
                        if (rowStr.includes(k)) matches++;
                    });

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

        if (mName !== 'Desconocido') {
            pivot[rVal][mName] += item.cantidad;
        }
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
