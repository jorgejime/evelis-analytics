import { Upload, FileSpreadsheet } from 'lucide-react';

/**
 * Zona de arrastre para cargar archivos Excel
 */
const DropZone = ({ onFileSelect, inputId = 'file-picker' }) => {
    const handleClick = () => {
        document.getElementById(inputId)?.click();
    };

    return (
        <div className="dropzone" onClick={handleClick}>
            <div className="dropzone-icon">
                <Upload size={36} />
            </div>
            <h3 className="dropzone-title">No hay archivos cargados</h3>
            <p className="dropzone-subtitle">
                Arrastra tus archivos Excel aquí o haz clic para seleccionar
            </p>
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'center',
                marginTop: '1.5rem',
                flexWrap: 'wrap'
            }}>
                {['SKU Master', 'Ventas', 'Inventario'].map(tipo => (
                    <span key={tipo} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 0.75rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '100px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'var(--brand-primary)'
                    }}>
                        <FileSpreadsheet size={14} />
                        {tipo}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default DropZone;
