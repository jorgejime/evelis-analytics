/**
 * Pantalla de carga con animación premium
 */
const LoadingScreen = ({ message = 'Cargando datos...' }) => {
    return (
        <div className="loading-overlay">
            <div style={{ textAlign: 'center' }}>
                <div className="loading-spinner"></div>
                <p className="loading-text">{message}</p>
            </div>
        </div>
    );
};

export default LoadingScreen;
