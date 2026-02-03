import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para manejar la persistencia de datos (LOCAL ONLY)
 */
export const useDataPersistence = () => {
    const [skuMapping, setSkuMapping] = useState({});
    const [salesData, setSalesData] = useState([]);
    const [inventoryData, setInventoryData] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Cargar datos al iniciar
    useEffect(() => {
        try {
            const savedSku = localStorage.getItem('sku_map');
            const savedSales = localStorage.getItem('sales_data');
            const savedInv = localStorage.getItem('inv_data');

            if (savedSku) setSkuMapping(JSON.parse(savedSku));
            if (savedSales) {
                const parsedSales = JSON.parse(savedSales);
                if (Array.isArray(parsedSales)) {
                    setSalesData(parsedSales.map(s => ({ ...s, date: s.date ? new Date(s.date) : null })));
                }
            }
            if (savedInv) setInventoryData(JSON.parse(savedInv));
        } catch (e) {
            console.error("Error loading persisted data:", e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Guardar datos cuando cambien
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem('sku_map', JSON.stringify(skuMapping));
        localStorage.setItem('sales_data', JSON.stringify(salesData));
        localStorage.setItem('inv_data', JSON.stringify(inventoryData));
    }, [skuMapping, salesData, inventoryData, isLoaded]);

    const clearAllData = useCallback(() => {
        setSkuMapping({});
        setSalesData([]);
        setInventoryData([]);
        localStorage.removeItem('sku_map');
        localStorage.removeItem('sales_data');
        localStorage.removeItem('inv_data');
    }, []);

    const addSalesData = useCallback((newSales) => {
        setSalesData(prev => [...prev, ...newSales]);
    }, []);

    const updateSkuMapping = useCallback((newMapping) => {
        setSkuMapping(prev => ({ ...prev, ...newMapping }));
    }, []);

    const setInventory = useCallback((newInventory) => {
        setInventoryData(newInventory);
    }, []);

    return {
        skuMapping,
        salesData,
        inventoryData,
        isLoaded,
        updateSkuMapping,
        addSalesData,
        setInventory,
        clearAllData,
        setSkuMapping,
        setSalesData,
        setInventoryData
    };
};

export default useDataPersistence;
