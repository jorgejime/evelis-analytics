import { Download } from 'lucide-react';
import { exportToExcel } from '../services/dataService';

/**
 * Tabla de datos reutilizable con exportación a Excel
 */
const DataTable = ({
    title,
    columns,
    data,
    exportFileName = 'export',
    showExport = true,
    stickyFirstColumn = true,
    emptyMessage = 'No hay datos disponibles'
}) => {
    const handleExport = () => {
        const exportData = data.map(row => {
            const obj = {};
            columns.forEach(col => {
                obj[col.header] = col.accessor ? row[col.accessor] : col.render ? col.render(row) : '';
            });
            return obj;
        });
        exportToExcel(exportData, `${exportFileName}.xlsx`);
    };

    return (
        <div className="report-card">
            <div className="report-header">
                <h3 className="report-title">{title}</h3>
                {showExport && data.length > 0 && (
                    <button className="action-btn" onClick={handleExport}>
                        <Download size={16} />
                        Exportar
                    </button>
                )}
            </div>
            <div className="data-table-container">
                {data.length === 0 ? (
                    <div style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)'
                    }}>
                        {emptyMessage}
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                {columns.map((col, index) => (
                                    <th
                                        key={col.key || index}
                                        className={index === 0 && stickyFirstColumn ? 'sticky-col' : ''}
                                        style={{ textAlign: col.align || 'left', ...col.headerStyle }}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {columns.map((col, colIndex) => (
                                        <td
                                            key={col.key || colIndex}
                                            className={colIndex === 0 && stickyFirstColumn ? 'sticky-col' : ''}
                                            style={{ textAlign: col.align || 'left', ...col.cellStyle }}
                                        >
                                            {col.render ? col.render(row, rowIndex) : row[col.accessor]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default DataTable;
