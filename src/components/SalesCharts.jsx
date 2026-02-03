import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

// Paleta de colores moderna con gradientes
const GRADIENT_COLORS = [
    { start: '#6366f1', end: '#8b5cf6' },
    { start: '#10b981', end: '#34d399' },
    { start: '#f59e0b', end: '#fbbf24' },
    { start: '#ef4444', end: '#f87171' },
    { start: '#3b82f6', end: '#60a5fa' },
    { start: '#ec4899', end: '#f472b6' },
];

const SOLID_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

// Tooltip personalizado con estilo glassmórfico
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            }}>
                <p style={{
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '6px',
                    fontSize: '0.85rem'
                }}>
                    {label}
                </p>
                {payload.map((entry, index) => (
                    <p key={index} style={{
                        color: entry.color,
                        fontSize: '0.9rem',
                        fontWeight: 600
                    }}>
                        {entry.name}: {entry.value?.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

/**
 * Gráfico de Barras Moderno
 */
export const SalesBarChart = ({ data, title, dataKey = 'value', nameKey = 'name' }) => (
    <div className="report-card">
        <div className="report-header">
            <h3 className="report-title">{title}</h3>
        </div>
        <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <defs>
                        {GRADIENT_COLORS.map((color, index) => (
                            <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color.start} stopOpacity={1} />
                                <stop offset="100%" stopColor={color.end} stopOpacity={0.8} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                    <XAxis
                        dataKey={nameKey}
                        stroke="#64748b"
                        axisLine={false}
                        tickLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={11}
                        fontWeight={500}
                    />
                    <YAxis
                        stroke="#64748b"
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        fontWeight={500}
                        tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                    <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} maxBarSize={60}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`url(#barGradient${index % GRADIENT_COLORS.length})`} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

/**
 * Gráfico de Líneas para Tendencias
 */
export const SalesLineChart = ({ data, title, lines = [{ dataKey: 'value', name: 'Valor', color: '#6366f1' }] }) => (
    <div className="report-card">
        <div className="report-header">
            <h3 className="report-title">{title}</h3>
        </div>
        <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                        {lines.map((line, index) => (
                            <linearGradient key={index} id={`lineGradient${index}`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={line.color} stopOpacity={1} />
                                <stop offset="100%" stopColor={SOLID_COLORS[(index + 1) % SOLID_COLORS.length]} stopOpacity={1} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        fontWeight={500}
                    />
                    <YAxis
                        stroke="#64748b"
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        fontWeight={500}
                        tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span style={{ color: '#475569', fontWeight: 500 }}>{value}</span>}
                    />
                    {lines.map((line, index) => (
                        <Line
                            key={index}
                            type="monotone"
                            dataKey={line.dataKey}
                            name={line.name}
                            stroke={`url(#lineGradient${index})`}
                            strokeWidth={3}
                            dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
);

/**
 * Gráfico de Área con Gradiente
 */
export const SalesAreaChart = ({ data, title, dataKey = 'value', color = '#6366f1' }) => (
    <div className="report-card">
        <div className="report-header">
            <h3 className="report-title">{title}</h3>
        </div>
        <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        fontWeight={500}
                    />
                    <YAxis
                        stroke="#64748b"
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        fontWeight={500}
                        tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2}
                        fill="url(#areaGradient)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

/**
 * Gráfico de Pastel Moderno
 */
export const SalesPieChart = ({ data, title, dataKey = 'value', nameKey = 'name' }) => (
    <div className="report-card">
        <div className="report-header">
            <h3 className="report-title">{title}</h3>
        </div>
        <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <defs>
                        {GRADIENT_COLORS.map((color, index) => (
                            <linearGradient key={index} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={color.start} stopOpacity={1} />
                                <stop offset="100%" stopColor={color.end} stopOpacity={0.8} />
                            </linearGradient>
                        ))}
                    </defs>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={120}
                        dataKey={dataKey}
                        nameKey={nameKey}
                        stroke="rgba(255, 255, 255, 0.8)"
                        strokeWidth={3}
                        paddingAngle={2}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`url(#pieGradient${index % GRADIENT_COLORS.length})`} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                            paddingTop: '20px',
                            fontSize: '12px',
                            fontWeight: 500
                        }}
                        formatter={(value) => <span style={{ color: '#475569' }}>{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
);

/**
 * Gráfico de Barras Comparativo (múltiples series)
 */
export const ComparisonBarChart = ({ data, title, bars = [] }) => (
    <div className="report-card">
        <div className="report-header">
            <h3 className="report-title">{title}</h3>
        </div>
        <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        axisLine={false}
                        tickLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={11}
                        fontWeight={500}
                    />
                    <YAxis
                        stroke="#64748b"
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        fontWeight={500}
                        tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                    <Legend
                        wrapperStyle={{ paddingTop: '10px' }}
                        formatter={(value) => <span style={{ color: '#475569', fontWeight: 500 }}>{value}</span>}
                    />
                    {bars.map((bar, index) => (
                        <Bar
                            key={index}
                            dataKey={bar.dataKey}
                            name={bar.name}
                            fill={SOLID_COLORS[index % SOLID_COLORS.length]}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
);
