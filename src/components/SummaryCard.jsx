import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Tarjeta de resumen con diseño glassmórfico premium
 * Soporta variantes: primary, success, warning, danger
 */
const SummaryCard = ({
    title,
    value,
    icon: Icon,
    variant = 'primary',
    trend = null,
    trendValue = null,
    subtitle = null
}) => {
    return (
        <div className={`summary-card ${variant}`}>
            <div className="summary-card-label">{title}</div>
            <div className="summary-card-value">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>

            {(trend !== null || subtitle) && (
                <div className={`summary-card-trend ${trend === 'up' ? 'up' : trend === 'down' ? 'down' : ''}`}>
                    {trend === 'up' && <TrendingUp size={14} />}
                    {trend === 'down' && <TrendingDown size={14} />}
                    {trendValue && <span>{trendValue}</span>}
                    {subtitle && <span style={{ color: 'var(--text-muted)' }}>{subtitle}</span>}
                </div>
            )}

            {Icon && (
                <div className="summary-card-icon">
                    <Icon size={24} />
                </div>
            )}
        </div>
    );
};

export default SummaryCard;
