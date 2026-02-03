import { X, Search, Calendar, Store, Tag } from 'lucide-react';

/**
 * Panel de filtros deslizable con filtros avanzados
 */
const FilterPanel = ({
    filters,
    setFilters,
    availableStores = [],
    availableGroups = [],
    isOpen,
    onClose
}) => {
    if (!isOpen) return null;

    const toggleItem = (list, item, key) => {
        const newList = list.includes(item)
            ? list.filter(i => i !== item)
            : [...list, item];
        setFilters({ ...filters, [key]: newList });
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            stores: [],
            groups: [],
            dateStart: '',
            dateEnd: ''
        });
    };

    const hasActiveFilters = filters.search ||
        filters.stores.length > 0 ||
        filters.groups.length > 0 ||
        filters.dateStart ||
        filters.dateEnd;

    return (
        <div className="filter-sidebar-overlay" onClick={onClose}>
            <div className="filter-sidebar" onClick={(e) => e.stopPropagation()}>
                <div className="filter-header">
                    <h3 className="filter-title">Filtros Avanzados</h3>
                    <button onClick={onClose} className="close-btn" aria-label="Cerrar filtros">
                        <X size={20} />
                    </button>
                </div>

                <div className="filter-content">
                    {/* Búsqueda por texto */}
                    <div className="filter-section">
                        <label className="filter-label">
                            <Search size={14} style={{ marginRight: '0.5rem' }} />
                            Buscar Producto
                        </label>
                        <div className="search-input-wrapper">
                            <Search size={16} className="search-icon" />
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="Nombre, SKU o descripción..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Tiendas */}
                    {availableStores.length > 0 && (
                        <div className="filter-section">
                            <div className="filter-section-header">
                                <label className="filter-label">
                                    <Store size={14} style={{ marginRight: '0.5rem' }} />
                                    Tiendas
                                    {filters.stores.length > 0 && (
                                        <span style={{
                                            marginLeft: '0.5rem',
                                            background: 'var(--brand-primary)',
                                            color: 'white',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '100px',
                                            fontSize: '0.65rem',
                                            fontWeight: 700
                                        }}>
                                            {filters.stores.length}
                                        </span>
                                    )}
                                </label>
                                {filters.stores.length > 0 && (
                                    <button
                                        className="filter-text-btn"
                                        onClick={() => setFilters({ ...filters, stores: [] })}
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                            <div className="filter-options-grid">
                                {availableStores.slice(0, 20).map(store => (
                                    <button
                                        key={store}
                                        className={`filter-option ${filters.stores.includes(store) ? 'active' : ''}`}
                                        onClick={() => toggleItem(filters.stores, store, 'stores')}
                                    >
                                        {store}
                                    </button>
                                ))}
                                {availableStores.length > 20 && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                        padding: '0.5rem'
                                    }}>
                                        +{availableStores.length - 20} más
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Categorías / Grupos */}
                    {availableGroups.length > 0 && (
                        <div className="filter-section">
                            <div className="filter-section-header">
                                <label className="filter-label">
                                    <Tag size={14} style={{ marginRight: '0.5rem' }} />
                                    Categorías
                                    {filters.groups.length > 0 && (
                                        <span style={{
                                            marginLeft: '0.5rem',
                                            background: 'var(--brand-primary)',
                                            color: 'white',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '100px',
                                            fontSize: '0.65rem',
                                            fontWeight: 700
                                        }}>
                                            {filters.groups.length}
                                        </span>
                                    )}
                                </label>
                                {filters.groups.length > 0 && (
                                    <button
                                        className="filter-text-btn"
                                        onClick={() => setFilters({ ...filters, groups: [] })}
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                            <div className="filter-options-grid">
                                {availableGroups.map(group => (
                                    <button
                                        key={group}
                                        className={`filter-option ${filters.groups.includes(group) ? 'active' : ''}`}
                                        onClick={() => toggleItem(filters.groups, group, 'groups')}
                                    >
                                        {group}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rango de Fechas */}
                    <div className="filter-section">
                        <label className="filter-label">
                            <Calendar size={14} style={{ marginRight: '0.5rem' }} />
                            Rango de Fechas
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '0.25rem',
                                    display: 'block'
                                }}>
                                    Desde
                                </label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    style={{ paddingLeft: '0.875rem' }}
                                    value={filters.dateStart || ''}
                                    onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '0.25rem',
                                    display: 'block'
                                }}>
                                    Hasta
                                </label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    style={{ paddingLeft: '0.875rem' }}
                                    value={filters.dateEnd || ''}
                                    onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="filter-footer">
                    {hasActiveFilters && (
                        <button
                            className="action-btn"
                            style={{ width: '100%', justifyContent: 'center', marginBottom: '0.75rem' }}
                            onClick={clearFilters}
                        >
                            Limpiar todos los filtros
                        </button>
                    )}
                    <button
                        className="action-btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={onClose}
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;
