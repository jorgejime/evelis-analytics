const SummaryCard = ({ title, value, color }) => {
    return (
        <div className="report-card" style={{ padding: '1.25rem', marginBottom: 0 }}>
            <div className="label" style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                marginBottom: '0.25rem'
            }}>
                {title}
            </div>
            <div style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <div style={{ width: '4px', height: '24px', backgroundColor: color, borderRadius: '2px' }}></div>
                {value}
            </div>
        </div>
    );
};

export default SummaryCard;
