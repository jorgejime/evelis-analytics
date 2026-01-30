import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend
} from 'recharts';

const COLORS = ['#000000', '#666666', '#999999', '#cccccc', '#ff0000', '#333333'];

export const SalesBarChart = ({ data, title }) => (
    <div className="card" style={{ height: '500px' }}>
        <div className="label">{title}</div>
        <div className="title-underline"></div>
        <div style={{ flexGrow: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#eeeeee" />
                    <XAxis
                        dataKey="name"
                        stroke="#000000"
                        axisLine={true}
                        tickLine={true}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={10}
                        fontWeight={700}
                    />
                    <YAxis
                        stroke="#000000"
                        axisLine={true}
                        tickLine={true}
                        fontSize={10}
                        fontWeight={700}
                    />
                    <Tooltip
                        cursor={{ fill: '#f8f8f8' }}
                        contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: '0',
                            border: '2px solid #000000',
                            fontWeight: 700
                        }}
                    />
                    <Bar dataKey="value" fill="#000000" radius={0}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#000000' : '#666666'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

export const SalesPieChart = ({ data, title }) => (
    <div className="card" style={{ height: '500px' }}>
        <div className="label">{title}</div>
        <div className="title-underline"></div>
        <div style={{ flexGrow: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="45%"
                        innerRadius={0}
                        outerRadius={100}
                        dataKey="value"
                        stroke="#ffffff"
                        strokeWidth={2}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: '0',
                            border: '2px solid #000000',
                            fontWeight: 700
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
);
