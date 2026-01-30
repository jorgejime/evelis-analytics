import { useState, useEffect, useRef } from 'react';
import {
    BarChart3, LayoutDashboard, Database, Upload, Trash2,
    FileSpreadsheet, AlertTriangle, CheckCircle2, Download,
    Package, MapPin, ChevronRight, ChevronDown
} from 'lucide-react';
import {
    readExcel, processSKUMaster, processSales, processInventory,
    generatePivotData, exportToExcel
} from './services/dataService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Componente para tarjetas de resumen
const SummaryCard = ({ title, value, color }) => (
    <div className="report-card" style={{ padding: '1.25rem', marginBottom: 0 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{title}</div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: color, borderRadius: '2px' }}></div>
            {value}
        </div>
    </div>
);

function App() {
    const [skuMapping, setSkuMapping] = useState({});
    const [salesData, setSalesData] = useState([]);
    const [inventoryData, setInventoryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('summary');
    const [expandedStore, setExpandedStore] = useState(null);
    const [selectedYear, setSelectedYear] = useState('all');
    const reportRef = useRef(null);

    // Carga inicial y persistencia
    useEffect(() => {
        try {
            const savedSku = localStorage.getItem('sku_map');
            const savedSales = localStorage.getItem('sales_data');
            const savedInv = localStorage.getItem('inv_data');

            if (savedSku) setSkuMapping(JSON.parse(savedSku));
            if (savedSales) {
                const parsedSales = JSON.parse(savedSales);
                if (Array.isArray(parsedSales)) {
                    const revivedSales = parsedSales.map(s => ({
                        ...s,
                        date: s.date ? new Date(s.date) : null
                    }));
                    setSalesData(revivedSales);
                }
            }
            if (savedInv) setInventoryData(JSON.parse(savedInv));
        } catch (e) {
            console.error("Error loading persisted data", e);
        }
    }, []);

    useEffect(() => {
        if (salesData.length > 0) localStorage.setItem('sales_data', JSON.stringify(salesData));
        if (Object.keys(skuMapping).length > 0) localStorage.setItem('sku_map', JSON.stringify(skuMapping));
        if (inventoryData.length > 0) localStorage.setItem('inv_data', JSON.stringify(inventoryData));
    }, [skuMapping, salesData, inventoryData]);

    const handleSmartUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setLoading(true);

        try {
            let currentMapping = { ...skuMapping };

            // Primero procesar maestros de SKU si existen en el lote
            for (const file of files) {
                const raw = await readExcel(file);
                if (!raw || raw.length === 0) continue;
                const keys = Object.keys(raw[0]).join(' ').toUpperCase();

                if ((keys.includes('ITEM') || keys.includes('CODIGO INTERNO MAB') || keys.includes('EAN')) && (keys.includes('GRUPO') || keys.includes('REFERENCIA'))) {
                    const newMapping = processSKUMaster(raw);
                    currentMapping = { ...currentMapping, ...newMapping };
                    setSkuMapping(currentMapping);
                }
            }

            // Luego procesar ventas e inventario usando el mapeo actualizado
            for (const file of files) {
                const raw = await readExcel(file);
                if (!raw || raw.length === 0) continue;
                const keys = Object.keys(raw[0]).join(' ').toUpperCase();

                if (keys.includes('CANTIDAD') || keys.includes('TIENDA') || keys.includes('ALMACÉN') || keys.includes('LUGAR')) {
                    if (keys.includes('FECHA') || keys.includes('CANTIDAD VENDIDA')) {
                        const processed = processSales(raw, currentMapping);
                        setSalesData(prev => [...prev, ...processed]);
                    } else if (keys.includes('SALDO') || keys.includes('BODEGA') || keys.includes('NOMBRE LUGAR') || (keys.includes('CANTIDAD') && !keys.includes('VENDIDA'))) {
                        const processed = processInventory(raw);
                        setInventoryData(processed);
                    }
                }
            }
        } catch (err) {
            alert('Error procesando archivos: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const clearAll = () => {
        if (confirm('¿Deseas borrar todos los datos del sistema?')) {
            setSkuMapping({});
            setSalesData([]);
            setInventoryData([]);
            localStorage.clear();
            window.location.reload();
        }
    };

    // Listado de años disponibles para el filtro
    const availableYears = [...new Set(salesData.map(s => s.date ? s.date.getFullYear() : null).filter(y => y))].sort((a, b) => b - a);

    // Datos filtrados por año
    const filteredSalesData = selectedYear === 'all'
        ? salesData
        : salesData.filter(s => s.date && s.date.getFullYear().toString() === selectedYear);

    // Cálculos para reportes usando datos filtrados
    const pivotTiendaMes = generatePivotData(filteredSalesData, 'tienda');
    const pivotCategory = () => {
        const result = {};
        const allGroups = new Set();

        filteredSalesData.forEach(s => {
            const t = s.tienda || 'Otros';
            const g = (s.grupo || 'OTROS').trim().toUpperCase();

            // Mapeo de sinónimos para consolidar de forma más flexible
            let finalGroup = g;
            if (g.includes('MAB')) finalGroup = 'MAB RH';
            else if (g.includes('DELUXE')) finalGroup = 'DELUXE';
            else if (g.includes('PREMIUM')) finalGroup = 'PREMIUM';
            else if (g === 'OTROS' || g === 'OTRO') finalGroup = 'SIN CLASIFICAR';

            allGroups.add(finalGroup);

            if (!result[t]) {
                result[t] = { tienda: t, total: 0, breakdowns: {} };
            }

            if (!result[t].breakdowns[finalGroup]) {
                result[t].breakdowns[finalGroup] = 0;
            }

            result[t].breakdowns[finalGroup] += s.cantidad;
            result[t].total += s.cantidad;
        });

        // Ordenar grupos: primero los conocidos, luego el resto
        const priority = ['DELUXE', 'PREMIUM', 'MAB RH'];
        const sortedGroups = [...allGroups].sort((a, b) => {
            const indexA = priority.indexOf(a);
            const indexB = priority.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        return {
            data: Object.values(result).sort((a, b) => b.total - a.total),
            groups: sortedGroups
        };
    };

    const categorySummary = pivotCategory();

    const getInventoryAnalysis = () => {
        return inventoryData.map(inv => {
            const productSales = filteredSalesData.filter(s => s.sku === inv.sku);
            const total = productSales.reduce((a, b) => a + b.cantidad, 0);
            const avg = total / 12 || 0;
            const coverage = avg > 0 ? (inv.stock / avg).toFixed(1) : '∞';
            return { ...inv, avg, coverage };
        });
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="nav-sidebar">
                <div style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 800 }}>EVELIS ANALYTICS</h1>
                    <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>SISTEMA DE CONTROL DE VENTAS</p>
                </div>

                <nav style={{ flexGrow: 1 }}>
                    <button className={`nav-link ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
                        <LayoutDashboard size={18} /> Vista General
                    </button>
                    <button className={`nav-link ${activeTab === 'matrix' ? 'active' : ''}`} onClick={() => setActiveTab('matrix')}>
                        <FileSpreadsheet size={18} /> Venta Mensual
                    </button>
                    <button className={`nav-link ${activeTab === 'colors' ? 'active' : ''}`} onClick={() => setActiveTab('colors')}>
                        <BarChart3 size={18} /> Venta por Color
                    </button>
                    <button className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
                        <Package size={18} /> Medidas Stock
                    </button>
                </nav>

                <button className="nav-link" onClick={clearAll} style={{ color: '#ef4444', marginTop: 'auto' }}>
                    <Trash2 size={18} /> Borrar Todo
                </button>
            </aside>

            {/* Main Area */}
            <main style={{ flexGrow: 1, backgroundColor: '#f8fafc', height: '100vh', overflowY: 'auto' }}>
                <header className="main-header">
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{loading ? 'Cargando datos...' : 'Panel de Control'}</h2>
                        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Sistema de reportes inteligente</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {availableYears.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', padding: '0.25rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>AÑO:</span>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="all">TODOS</option>
                                    {availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <input type="file" multiple id="smart-picker" hidden onChange={handleSmartUpload} accept=".xlsx,.xls,.csv" />
                        <button className="action-btn btn-primary" onClick={() => document.getElementById('smart-picker').click()}>
                            <Upload size={16} /> Cargar Excel
                        </button>
                        <button className="action-btn" onClick={() => window.print()}>
                            <Download size={16} /> Imprimir
                        </button>
                    </div>
                </header>

                <div className="content-body">
                    {salesData.length === 0 && !loading ? (
                        <div className="dropzone" onClick={() => document.getElementById('smart-picker').click()}>
                            <Upload size={40} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No hay archivos cargados</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Sube tus reportes de VENTAS e INVENTARIO para ver los resultados.</p>
                        </div>
                    ) : (
                        <div ref={reportRef}>
                            {activeTab === 'summary' && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                        <SummaryCard title="Total Unidades" value={filteredSalesData.reduce((a, b) => a + b.cantidad, 0).toLocaleString()} color="#2563eb" />
                                        <SummaryCard title="Cobertura Crítica" value={inventoryData.filter(i => i.stock < 5).length} color="#ef4444" />
                                        <SummaryCard title="SKUs Activos" value={new Set(filteredSalesData.map(s => s.sku)).size} color="#10b981" />
                                    </div>

                                    <div className="report-card">
                                        <div className="report-header"><h3 className="report-title">Resumen por Tienda y Línea</h3></div>
                                        <div className="data-table-container">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th className="sticky-col">Tienda</th>
                                                        {categorySummary.groups.map(g => (
                                                            <th key={g} style={{ textAlign: 'right' }}>{g}</th>
                                                        ))}
                                                        <th style={{ textAlign: 'right' }}>TOTAL</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {categorySummary.data.map((row, i) => (
                                                        <tr key={i}>
                                                            <td className="sticky-col">{row.tienda}</td>
                                                            {categorySummary.groups.map(g => (
                                                                <td key={g} style={{ textAlign: 'right' }}>
                                                                    {(row.breakdowns[g] || 0).toLocaleString()}
                                                                </td>
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

                            {activeTab === 'matrix' && (
                                <div className="report-card">
                                    <div className="report-header"><h3 className="report-title">Venta Mensual Consolidada</h3></div>
                                    <div className="data-table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th className="sticky-col">Punto de Venta</th>
                                                    {MONTHS.map(m => <th key={m} style={{ textAlign: 'right' }}>{m.slice(0, 3)}</th>)}
                                                    <th style={{ textAlign: 'right' }}>TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pivotTiendaMes.map((row, i) => (
                                                    <tr key={i}>
                                                        <td className="sticky-col">{row.name}</td>
                                                        {MONTHS.map(m => <td key={m} style={{ textAlign: 'right' }}>{row[m] || 0}</td>)}
                                                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>{row.total}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'colors' && (
                                <div className="report-card">
                                    <div className="report-header"><h3 className="report-title">Detalle Color por Tienda</h3></div>
                                    {pivotTiendaMes.map(store => (
                                        <div key={store.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <div onClick={() => setExpandedStore(expandedStore === store.name ? null : store.name)}
                                                style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                                                {expandedStore === store.name ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                {store.name}
                                            </div>
                                            {expandedStore === store.name && (
                                                <div style={{ padding: '0 1rem 1rem 2.5rem' }}>
                                                    <table style={{ fontSize: '0.8rem' }}>
                                                        <thead>
                                                            <tr style={{ color: '#64748b' }}>
                                                                <th>Color</th>
                                                                {MONTHS.map(m => <th key={m} style={{ textAlign: 'right' }}>{m.slice(0, 3)}</th>)}
                                                                <th style={{ textAlign: 'right' }}>Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {generatePivotData(filteredSalesData.filter(s => s.tienda === store.name), 'producto').map((p, j) => (
                                                                <tr key={j}>
                                                                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                                                                    {MONTHS.map(m => <td key={m} style={{ textAlign: 'right' }}>{p[m] || 0}</td>)}
                                                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.total}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'inventory' && (
                                <div className="report-card">
                                    <div className="report-header"><h3 className="report-title">Toma de Medidas: Control de Stock</h3></div>
                                    <div className="data-table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Producto</th>
                                                    <th style={{ textAlign: 'right' }}>Stock Actual</th>
                                                    <th style={{ textAlign: 'right' }}>Promedio Vta</th>
                                                    <th style={{ textAlign: 'right' }}>Meses Cobertura</th>
                                                    <th>Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getInventoryAnalysis().map((row, i) => (
                                                    <tr key={i}>
                                                        <td>{row.producto}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.stock}</td>
                                                        <td style={{ textAlign: 'right' }}>{row.avg.toFixed(1)}</td>
                                                        <td style={{ textAlign: 'right' }}>{row.coverage}</td>
                                                        <td>
                                                            <span className={`badge ${parseFloat(row.coverage) < 1 ? 'badge-danger' : 'badge-success'}`}>
                                                                {parseFloat(row.coverage) < 1 ? 'PEDIR URGENTE' : 'OPTIMO'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;
