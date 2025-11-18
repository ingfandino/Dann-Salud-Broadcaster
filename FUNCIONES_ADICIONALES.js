// ===================================================================
// FUNCIONES ADICIONALES A AGREGAR EN: frontend/src/pages/AffiliateDatabase.jsx
// Agregar después de las funciones existentes (aprox. línea 100-150)
// ===================================================================

// Cargar lista de supervisores
const loadSupervisors = async () => {
    try {
        const res = await apiClient.get("/users/admin/users", {
            params: { limit: 1000, search: "", sortBy: "nombre", order: "asc" }
        });
        const allUsers = res.data.users || [];
        const supervisorsList = allUsers.filter(u => u.role === "supervisor" && u.active);
        setSupervisors(supervisorsList);
    } catch (err) {
        logger.error("Error cargando supervisores:", err);
        toast.error("No se pudieron cargar los supervisores");
    }
};

// ===================================================================
// MODIFICAR LA FUNCIÓN loadExportConfig EXISTENTE
// Buscar la función loadExportConfig (aprox. línea 90-100) y reemplazarla con:
// ===================================================================

const loadExportConfig = async () => {
    try {
        const res = await apiClient.get("/affiliates/export-config");
        if (res.data.config) {
            setCurrentConfig(res.data.config);
            setExportConfig({
                sendType: res.data.config.sendType || "masivo",
                affiliatesPerFile: res.data.config.affiliatesPerFile || 100,
                obraSocialDistribution: res.data.config.obraSocialDistribution || [],
                supervisorConfigs: res.data.config.supervisorConfigs || [],
                scheduledTime: res.data.config.scheduledTime || "09:00",
                filters: res.data.config.filters || {}
            });
        }
    } catch (err) {
        logger.error("Error cargando configuración:", err);
    }
};

// ===================================================================
// MODIFICAR EL useEffect INICIAL
// Buscar el useEffect que llama a loadStats y loadExportConfig (aprox. línea 40-47)
// Agregar loadSupervisors():
// ===================================================================

useEffect(() => {
    // Supervisores no necesitan cargar stats ni config
    if (!isSupervisor) {
        loadStats();
        loadExportConfig();
        loadSupervisors(); // ← AGREGAR ESTA LÍNEA
    }
    // Todos cargan sus exportaciones
    if (isSupervisor) {
        loadExports();
    }
}, []);

// ===================================================================
// MODIFICAR LA FUNCIÓN handleSaveExportConfig
// Buscar handleSaveExportConfig (aprox. línea 208-220) y reemplazarla con:
// ===================================================================

const handleSaveExportConfig = async () => {
    try {
        setLoading(true);
        
        // Validación básica
        if (!exportConfig.scheduledTime) {
            toast.error("Falta la hora programada");
            return;
        }
        
        if (exportConfig.sendType === "masivo") {
            if (!exportConfig.affiliatesPerFile) {
                toast.error("Falta la cantidad de afiliados por archivo");
                return;
            }
            
            // Validar distribución si existe
            if (exportConfig.obraSocialDistribution.length > 0) {
                const total = exportConfig.obraSocialDistribution.reduce((sum, d) => sum + (d.cantidad || 0), 0);
                if (total !== exportConfig.affiliatesPerFile) {
                    toast.error(`La suma de la distribución (${total}) debe coincidir con el total (${exportConfig.affiliatesPerFile})`);
                    return;
                }
                
                // Validar que todas tengan obra social seleccionada
                const incomplete = exportConfig.obraSocialDistribution.some(d => !d.obraSocial || !d.cantidad);
                if (incomplete) {
                    toast.error("Todas las distribuciones deben tener obra social y cantidad");
                    return;
                }
            }
        } else if (exportConfig.sendType === "avanzado") {
            if (!exportConfig.supervisorConfigs || exportConfig.supervisorConfigs.length === 0) {
                toast.error("Debe configurar al menos un supervisor");
                return;
            }
            
            // Validar cada configuración de supervisor
            for (const supConfig of exportConfig.supervisorConfigs) {
                if (!supConfig.affiliatesPerFile) {
                    toast.error("Todos los supervisores deben tener cantidad de afiliados");
                    return;
                }
                
                // Validar distribución si existe
                if (supConfig.obraSocialDistribution && supConfig.obraSocialDistribution.length > 0) {
                    const total = supConfig.obraSocialDistribution.reduce((sum, d) => sum + (d.cantidad || 0), 0);
                    if (total !== supConfig.affiliatesPerFile) {
                        toast.error(`La distribución de un supervisor no coincide con su total`);
                        return;
                    }
                }
            }
        }
        
        await apiClient.post("/affiliates/export-config", exportConfig);
        toast.success("✅ Configuración guardada. Los envíos comenzarán mañana a la hora indicada.");
        loadExportConfig();
    } catch (err) {
        logger.error("Error guardando configuración:", err);
        toast.error(err.response?.data?.error || "Error guardando configuración");
    } finally {
        setLoading(false);
    }
};
