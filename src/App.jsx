import { useState, useRef, useMemo } from 'react';
import {
    BarChart3, LayoutDashboard, Upload, Trash2, FileSpreadsheet,
    Package, ChevronRight, Sun, Moon, Filter, Download,
    TrendingUp, AlertTriangle, CheckCircle2, Database
} from 'lucide-react';

// Componentes
import SummaryCard from './components/SummaryCard';
import DataTable from './components/DataTable';
import DropZone from './components/DropZone';
import LoadingScreen from './components/LoadingScreen';
import FilterPanel from './components/FilterPanel';
import { SalesBarChart, SalesAreaChart, SalesPieChart } from './components/SalesCharts';

// Hooks
import useTheme from './hooks/useTheme';
import useDataPersistence from './hooks/useDataPersistence';

// Servicios
import {
    readExcel, processSKUMaster, processSales, processInventory,
    generatePivotData, exportToExcel
} from './services/dataService';

// Constantes
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const NAV_TABS = [
    { id: 'summary', label: 'Vista General', icon: LayoutDashboard },
    { id: 'matrix', label: 'Venta Mensual', icon: FileSpreadsheet },
    { id: 'colors', label: 'Venta por Color', icon: BarChart3 },
    { id: 'inventory', label: 'Medidas Stock', icon: Package },
];

function App() {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('summary');
    const [expandedStore, setExpandedStore] = useState(null);
    const [selectedYear, setSelectedYear] = useState('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        stores: [],
        groups: [],
        dateStart: '',
        dateEnd: ''
    });

    const { theme, toggleTheme } = useTheme();
    const {
        skuMapping, salesData, inventoryData,
        updateSkuMapping, addSalesData, setInventory, clearAllData
    } = useDataPersistence();

    const reportRef = useRef(null);

    const handleSmartUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setLoading(true);

        try {
            let currentMapping = { ...skuMapping };

            for (const file of files) {
                const raw = await readExcel(file);
                if (!raw || raw.length === 0) continue;
                const keys = Object.keys(raw[0]).join(' ').toUpperCase();

                if ((keys.includes('ITEM') || keys.includes('CODIGO INTERNO MAB') || keys.includes('EAN')) &&
                    (keys.includes('GRUPO') || keys.includes('REFERENCIA'))) {
                    const newMapping = processSKUMaster(raw);
                    currentMapping = { ...currentMapping, ...newMapping };
                    updateSkuMapping(newMapping);
                }
            }

            for (const file of files) {
                const raw = await readExcel(file);
                if (!raw || raw.length === 0) continue;
                const keys = Object.keys(raw[0]).join(' ').toUpperCase();

                if (keys.includes('CANTIDAD') || keys.includes('TIENDA') || keys.includes('ALMACÉN') || keys.includes('LUGAR')) {
                    if (keys.includes('FECHA') || keys.includes('CANTIDAD VENDIDA')) {
                        const processed = processSales(raw, currentMapping);
                        addSalesData(processed);
                    } else if (keys.includes('SALDO') || keys.includes('BODEGA') || keys.includes('NOMBRE LUGAR') ||
                        (keys.includes('CANTIDAD') && !keys.includes('VENDIDA'))) {
                        const processed = processInventory(raw);
                        setInventory(processed);
                    }
                }
            }
        } catch (err) {
            console.error('Error procesando archivos:', err);
            alert('Error procesando archivos: ' + err.message);
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleClearAll = () => {
        if (confirm('¿Estás seguro de que deseas borrar todos los datos del sistema?')) {
            clearAllData();
            window.location.reload();
        }
    };

    const availableYears = useMemo(() =>
        [...new Set(salesData.map(s => s.date?.getFullYear()).filter(Boolean))].sort((a, b) => b - a),
        [salesData]
    );

    const filteredSalesData = useMemo(() => {
        let data = salesData;
        if (selectedYear !== 'all') data = data.filter(s => s.date?.getFullYear().toString() === selectedYear);
        if (filters.search) {
            const search = filters.search.toLowerCase();
            data = data.filter(s => s.producto?.toLowerCase().includes(search) || s.sku?.toLowerCase().includes(search));
        }
        if (filters.stores.length > 0) data = data.filter(s => filters.stores.includes(s.tienda));
        if (filters.groups.length > 0) data = data.filter(s => filters.groups.includes(s.grupo));
        if (filters.dateStart) data = data.filter(s => s.date >= new Date(filters.dateStart));
        if (filters.dateEnd) data = data.filter(s => s.date <= new Date(filters.dateEnd));
        return data;
    }, [salesData, selectedYear, filters]);

    const availableStores = useMemo(() => [...new Set(salesData.map(s => s.tienda).filter(Boolean))].sort(), [salesData]);
    const availableGroups = useMemo(() => [...new Set(salesData.map(s => s.grupo).filter(Boolean))].sort(), [salesData]);
    const pivotTiendaMes = useMemo(() => generatePivotData(filteredSalesData, 'tienda'), [filteredSalesData]);

    const categorySummary = useMemo(() => {
        const result = {};
        const allGroups = new Set();
        filteredSalesData.forEach(s => {
            const t = s.tienda || 'Otros';
            let g = (s.grupo || 'OTROS').trim().toUpperCase();
            if (g.includes('MAB')) g = 'MAB RH';
            else if (g.includes('DELUXE')) g = 'DELUXE';
            else if (g.includes('PREMIUM')) g = 'PREMIUM';
            else if (g === 'OTROS' || g === 'OTRO') g = 'SIN CLASIFICAR';
            allGroups.add(g);
            if (!result[t]) result[t] = { tienda: t, total: 0, breakdowns: {} };
            if (!result[t].breakdowns[g]) result[t].breakdowns[g] = 0;
            result[t].breakdowns[g] += s.cantidad;
            result[t].total += s.cantidad;
        });
        const priority = ['DELUXE', 'PREMIUM', 'MAB RH'];
        const sortedGroups = [...allGroups].sort((a, b) => {
            const iA = priority.indexOf(a), iB = priority.indexOf(b);
            if (iA !== -1 && iB !== -1) return iA - iB;
            if (iA !== -1) return -1;
            if (iB !== -1) return 1;
            return a.localeCompare(b);
        });
        return { data: Object.values(result).sort((a, b) => b.total - a.total), groups: sortedGroups };
    }, [filteredSalesData]);

    const inventoryAnalysis = useMemo(() => {
        return inventoryData.map(inv => {
            const productSales = filteredSalesData.filter(s => s.sku === inv.sku);
            const total = productSales.reduce((a, b) => a + b.cantidad, 0);
            const avg = total / 12 || 0;
            const coverage = avg > 0 ? (inv.stock / avg).toFixed(1) : '∞';
            return { ...inv, avg, coverage };
        });
    }, [inventoryData, filteredSalesData]);

    const chartData = useMemo(() => {
        const monthlyData = MONTHS.map((month, idx) => ({
            name: MONTHS_SHORT[idx],
            value: filteredSalesData.filter(s => s.date?.getMonth() === idx).reduce((a, b) => a + b.cantidad, 0)
        }));
        const storeData = pivotTiendaMes.slice(0, 8).map(s => ({ name: s.name, value: s.total }));
        const groupData = categorySummary.groups.map(g => ({
            name: g,
            value: categorySummary.data.reduce((acc, store) => acc + (store.breakdowns[g] || 0), 0)
        }));
        return { monthlyData, storeData, groupData };
    }, [filteredSalesData, pivotTiendaMes, categorySummary]);

    const summaryMetrics = useMemo(() => ({
        totalUnits: filteredSalesData.reduce((a, b) => a + b.cantidad, 0),
        criticalStock: inventoryData.filter(i => i.stock < 5).length,
        activeSKUs: new Set(filteredSalesData.map(s => s.sku)).size,
        totalStores: new Set(filteredSalesData.map(s => s.tienda)).size
    }), [filteredSalesData, inventoryData]);

    const matrixColumns = useMemo(() => [
        { header: 'Punto de Venta', accessor: 'name', key: 'store' },
        ...MONTHS.map((m, idx) => ({ header: MONTHS_SHORT[idx], key: m, align: 'right', render: (row) => (row[m] || 0).toLocaleString() })),
        { header: 'TOTAL', key: 'total', align: 'right', cellStyle: { fontWeight: 800, color: 'var(--brand-primary)' }, render: (row) => row.total.toLocaleString() }
    ], []);

    const inventoryColumns = useMemo(() => [
        { header: 'Producto', accessor: 'producto', key: 'producto' },
        { header: 'Stock Actual', accessor: 'stock', key: 'stock', align: 'right', cellStyle: { fontWeight: 700 } },
        { header: 'Promedio Vta', key: 'avg', align: 'right', render: (row) => row.avg.toFixed(1) },
        { header: 'Meses Cobertura', key: 'coverage', align: 'right', render: (row) => row.coverage },
        {
            header: 'Acción', key: 'action', render: (row) => {
                const isCritical = parseFloat(row.coverage) < 1;
                return <span className={`badge ${isCritical ? 'badge-danger' : 'badge-success'}`}>{isCritical ? 'PEDIR URGENTE' : 'ÓPTIMO'}</span>;
            }
        }
    ], []);

    return (
        <div className="dashboard-container">
            {loading && <LoadingScreen message="Procesando archivos..." />}
            <aside className="nav-sidebar">
                <div className="sidebar-brand">
                    <h1>EVELIS ANALYTICS</h1>
                    <p>Sistema de Control de Ventas</p>
                </div>
                <nav style={{ flexGrow: 1 }}>
                    {NAV_TABS.map(tab => (
                        <button key={tab.id} className={`nav-link ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            <tab.icon size={18} /> {tab.label}
                        </button>
                    ))}
                </nav>
                <div className="nav-footer">
                    <button className="nav-link danger" onClick={handleClearAll}>
                        <Trash2 size={18} /> Borrar Todo
                    </button>
                </div>
            </aside>
            <main>
                <header className="main-header">
                    <div className="header-title">
                        <h2>Panel de Control</h2>
                        <p>Sistema de reportes inteligente • {salesData.length.toLocaleString()} registros</p>
                    </div>
                    <div className="header-actions">
                        {availableYears.length > 0 && (
                            <div className="year-selector">
                                <label>AÑO:</label>
                                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                                    <option value="all">TODOS</option>
                                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                            </div>
                        )}
                        {salesData.length > 0 && (
                            <button className="action-btn btn-icon" onClick={() => setIsFilterOpen(true)} title="Filtros avanzados">
                                <Filter size={18} />
                            </button>
                        )}
                        <button className="theme-toggle" onClick={toggleTheme} title="Cambiar tema">
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        <input type="file" multiple id="smart-picker" hidden onChange={handleSmartUpload} accept=".xlsx,.xls,.csv" />
                        <button className="action-btn btn-primary" onClick={() => document.getElementById('smart-picker')?.click()}>
                            <Upload size={16} /> Cargar Excel
                        </button>
                        <button className="action-btn" onClick={() => window.print()}>
                            <Download size={16} /> Imprimir
                        </button>
                    </div>
                </header>
                <div className="content-body">
                    {salesData.length === 0 ? (
                        <DropZone onFileSelect={handleSmartUpload} inputId="smart-picker" />
                    ) : (
                        <div ref={reportRef}>
                            {activeTab === 'summary' && (
                                <>
                                    <div className="summary-grid">
                                        <SummaryCard title="Total Unidades" value={summaryMetrics.totalUnits} icon={TrendingUp} variant="primary" subtitle="Unidades vendidas" />
                                        <SummaryCard title="Cobertura Crítica" value={summaryMetrics.criticalStock} icon={AlertTriangle} variant="danger" subtitle="Stock bajo" />
                                        <SummaryCard title="SKUs Activos" value={summaryMetrics.activeSKUs} icon={CheckCircle2} variant="success" subtitle="Productos únicos" />
                                        <SummaryCard title="Tiendas Activas" value={summaryMetrics.totalStores} icon={Database} variant="warning" subtitle="Puntos de venta" />
                                    </div>
                                    <div className="chart-grid">
                                        <SalesAreaChart data={chartData.monthlyData} title="Tendencia de Ventas Mensual" />
                                        <SalesPieChart data={chartData.groupData} title="Distribución por Categoría" />
                                    </div>
                                    <SalesBarChart data={chartData.storeData} title="Top Tiendas por Volumen de Venta" />
                                    <div className="report-card">
                                        <div className="report-header">
                                            <h3 className="report-title">Resumen por Tienda y Línea</h3>
                                            <button className="action-btn" onClick={() => {
                                                exportToExcel(categorySummary.data.map(row => {
                                                    const obj = { Tienda: row.tienda };
                                                    categorySummary.groups.forEach(g => obj[g] = row.breakdowns[g] || 0);
                                                    obj.TOTAL = row.total;
                                                    return obj;
                                                }), 'resumen_tienda_linea.xlsx');
                                            }}>
                                                <Download size={16} /> Exportar
                                            </button>
                                        </div>
                                        <div className="data-table-container">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th className="sticky-col">Tienda</th>
                                                        {categorySummary.groups.map(g => <th key={g} style={{ textAlign: 'right' }}>{g}</th>)}
                                                        <th style={{ textAlign: 'right' }}>TOTAL</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {categorySummary.data.map((row, i) => (
                                                        <tr key={i}>
                                                            <td className="sticky-col">{row.tienda}</td>
                                                            {categorySummary.groups.map(g => (
                                                                <td key={g} style={{ textAlign: 'right' }}>{(row.breakdowns[g] || 0).toLocaleString()}</td>
                                                            ))}
                                                            <td style={{ textAlign: 'right', fontWeight: 800 }}>{row.total.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                            {activeTab === 'matrix' && <DataTable title="Venta Mensual Consolidada" columns={matrixColumns} data={pivotTiendaMes} exportFileName="venta_mensual" />}
                            {activeTab === 'colors' && (
                                <div className="report-card">
                                    <div className="report-header"><h3 className="report-title">Detalle Color por Tienda</h3></div>
                                    {pivotTiendaMes.map(store => (
                                        <div key={store.name} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                            <div className={`collapsible-header ${expandedStore === store.name ? 'expanded' : ''}`} onClick={() => setExpandedStore(expandedStore === store.name ? null : store.name)}>
                                                <ChevronRight size={14} /> <span>{store.name}</span>
                                                <span style={{ marginLeft: 'auto', color: 'var(--brand-primary)', fontWeight: 700 }}>{store.total.toLocaleString()} uds</span>
                                            </div>
                                            {expandedStore === store.name && (
                                                <div className="collapsible-content">
                                                    <table style={{ fontSize: '0.8rem' }}>
                                                        <thead><tr><th>Color</th>{MONTHS.map(m => <th key={m} style={{ textAlign: 'right' }}>{MONTHS_SHORT[MONTHS.indexOf(m)]}</th>)}<th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                                                        <tbody>
                                                            {generatePivotData(filteredSalesData.filter(s => s.tienda === store.name), 'producto').map((p, j) => (
                                                                <tr key={j}><td style={{ fontWeight: 500 }}>{p.name}</td>{MONTHS.map(m => <td key={m} style={{ textAlign: 'right' }}>{p[m] || 0}</td>)}<td style={{ textAlign: 'right', fontWeight: 700 }}>{p.total}</td></tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'inventory' && <DataTable title="Toma de Medidas: Control de Stock" columns={inventoryColumns} data={inventoryAnalysis} exportFileName="control_stock" emptyMessage="No hay datos de inventario cargados" />}
                        </div>
                    )}
                </div>
            </main>
            <FilterPanel filters={filters} setFilters={setFilters} availableStores={availableStores} availableGroups={availableGroups} isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
        </div>
    );
}

export default App;
