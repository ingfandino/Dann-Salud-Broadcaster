// ===================================================================
// CÓDIGO COMPLETO PARA LA NUEVA SECCIÓN DE CONFIGURACIÓN
// Reemplazar en: frontend/src/pages/AffiliateDatabase.jsx
// Desde línea 646 hasta línea 717
// ===================================================================

{activeTab === "config" && (
    <motion.div key="config" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
        <h2 className="text-xl font-bold mb-4">Configuración de Envíos Programados</h2>
        
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
                ℹ️ Los archivos <strong>XLSX (Excel)</strong> se generarán automáticamente cada día a la hora indicada.
            </p>
        </div>

        <div className="space-y-6">
            {/* Selector de tipo de envío */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
                <label className="block text-sm font-semibold mb-3">
                    Tipo de Envío
                </label>
                <div className="flex gap-4">
                    <button
                        onClick={() => setExportConfig(prev => ({ ...prev, sendType: "masivo" }))}
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                            exportConfig.sendType === "masivo"
                                ? "border-blue-600 bg-blue-50"
                                : "border-gray-300 hover:border-gray-400"
                        }`}
                    >
                        <div className="text-2xl mb-2">📤</div>
                        <div className="font-semibold">Envío Masivo</div>
                        <div className="text-xs text-gray-600 mt-1">
                            Misma configuración para todos los supervisores
                        </div>
                    </button>
                    <button
                        onClick={() => setExportConfig(prev => ({ ...prev, sendType: "avanzado" }))}
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                            exportConfig.sendType === "avanzado"
                                ? "border-purple-600 bg-purple-50"
                                : "border-gray-300 hover:border-gray-400"
                        }`}
                    >
                        <div className="text-2xl mb-2">⚙️</div>
                        <div className="font-semibold">Envío Avanzado</div>
                        <div className="text-xs text-gray-600 mt-1">
                            Configuración individual por supervisor
                        </div>
                    </button>
                </div>
            </div>

            {/* CONFIGURACIÓN MASIVA */}
            {exportConfig.sendType === "masivo" && (
                <>
                    <div>
                        <label className="block text-sm font-semibold mb-2">
                            Cantidad de afiliados por archivo
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10000"
                            value={exportConfig.affiliatesPerFile}
                            onChange={(e) => setExportConfig(prev => ({
                                ...prev,
                                affiliatesPerFile: parseInt(e.target.value)
                            }))}
                            className="w-full md:w-64 border rounded px-3 py-2"
                        />
                    </div>

                    {/* Distribución por Obra Social */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-semibold">
                                Distribución por Obra Social (opcional)
                            </label>
                            <button
                                onClick={() => {
                                    setExportConfig(prev => ({
                                        ...prev,
                                        obraSocialDistribution: [
                                            ...prev.obraSocialDistribution,
                                            { obraSocial: "", cantidad: 0 }
                                        ]
                                    }));
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                                ➕ Agregar Obra Social
                            </button>
                        </div>

                        {exportConfig.obraSocialDistribution.length === 0 ? (
                            <p className="text-sm text-gray-600 text-center py-2">
                                Sin distribución específica - Los afiliados se asignarán aleatoriamente
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {exportConfig.obraSocialDistribution.map((dist, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded">
                                        <select
                                            value={dist.obraSocial}
                                            onChange={(e) => {
                                                const newDist = [...exportConfig.obraSocialDistribution];
                                                newDist[idx].obraSocial = e.target.value;
                                                setExportConfig(prev => ({
                                                    ...prev,
                                                    obraSocialDistribution: newDist
                                                }));
                                            }}
                                            className="flex-1 border rounded px-2 py-1"
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="OSDE">OSDE</option>
                                            <option value="Medifé">Medifé</option>
                                            <option value="Binimed">Binimed</option>
                                            <option value="IOMA">IOMA</option>
                                            <option value="OSPM">OSPM</option>
                                            <option value="*">🔀 Aleatorio (resto)</option>
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            value={dist.cantidad}
                                            onChange={(e) => {
                                                const newDist = [...exportConfig.obraSocialDistribution];
                                                newDist[idx].cantidad = parseInt(e.target.value);
                                                setExportConfig(prev => ({
                                                    ...prev,
                                                    obraSocialDistribution: newDist
                                                }));
                                            }}
                                            placeholder="Cantidad"
                                            className="w-24 border rounded px-2 py-1"
                                        />
                                        <button
                                            onClick={() => {
                                                const newDist = exportConfig.obraSocialDistribution.filter((_, i) => i !== idx);
                                                setExportConfig(prev => ({
                                                    ...prev,
                                                    obraSocialDistribution: newDist
                                                }));
                                            }}
                                            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                        >
                                            ❌
                                        </button>
                                    </div>
                                ))}

                                {/* Validación de suma */}
                                {(() => {
                                    const total = exportConfig.obraSocialDistribution.reduce((sum, d) => sum + (d.cantidad || 0), 0);
                                    return total !== exportConfig.affiliatesPerFile ? (
                                        <p className="text-sm text-red-600 mt-2">
                                            ⚠️ La suma ({total}) debe coincidir con el total ({exportConfig.affiliatesPerFile})
                                        </p>
                                    ) : (
                                        <p className="text-sm text-green-600 mt-2">
                                            ✅ Distribución correcta
                                        </p>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* CONFIGURACIÓN AVANZADA */}
            {exportConfig.sendType === "avanzado" && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="text-md font-semibold mb-3">Configuración por Supervisor</h3>
                    
                    {supervisors.length === 0 ? (
                        <p className="text-sm text-gray-600 text-center py-4">
                            No hay supervisores disponibles
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {supervisors.map((supervisor) => {
                                const supConfig = exportConfig.supervisorConfigs.find(
                                    sc => sc.supervisorId === supervisor._id
                                ) || { supervisorId: supervisor._id, affiliatesPerFile: 100, obraSocialDistribution: [] };
                                
                                const configIndex = exportConfig.supervisorConfigs.findIndex(
                                    sc => sc.supervisorId === supervisor._id
                                );

                                return (
                                    <div key={supervisor._id} className="bg-white p-4 rounded-lg border-2 border-gray-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h4 className="font-semibold text-gray-800">{supervisor.nombre}</h4>
                                                <p className="text-xs text-gray-500">{supervisor.email}</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={configIndex >= 0}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setExportConfig(prev => ({
                                                            ...prev,
                                                            supervisorConfigs: [
                                                                ...prev.supervisorConfigs,
                                                                {
                                                                    supervisorId: supervisor._id,
                                                                    affiliatesPerFile: 100,
                                                                    obraSocialDistribution: []
                                                                }
                                                            ]
                                                        }));
                                                    } else {
                                                        setExportConfig(prev => ({
                                                            ...prev,
                                                            supervisorConfigs: prev.supervisorConfigs.filter(
                                                                sc => sc.supervisorId !== supervisor._id
                                                            )
                                                        }));
                                                    }
                                                }}
                                                className="w-5 h-5"
                                            />
                                        </div>

                                        {configIndex >= 0 && (
                                            <div className="space-y-3 mt-3 pt-3 border-t">
                                                <div>
                                                    <label className="block text-xs font-semibold mb-1">
                                                        Cantidad de afiliados
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={supConfig.affiliatesPerFile}
                                                        onChange={(e) => {
                                                            const newConfigs = [...exportConfig.supervisorConfigs];
                                                            newConfigs[configIndex].affiliatesPerFile = parseInt(e.target.value);
                                                            setExportConfig(prev => ({
                                                                ...prev,
                                                                supervisorConfigs: newConfigs
                                                            }));
                                                        }}
                                                        className="w-full border rounded px-2 py-1"
                                                    />
                                                </div>

                                                {/* Distribución de obras sociales por supervisor */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-xs font-semibold">
                                                            Distribución de OS
                                                        </label>
                                                        <button
                                                            onClick={() => {
                                                                const newConfigs = [...exportConfig.supervisorConfigs];
                                                                newConfigs[configIndex].obraSocialDistribution = [
                                                                    ...newConfigs[configIndex].obraSocialDistribution,
                                                                    { obraSocial: "", cantidad: 0 }
                                                                ];
                                                                setExportConfig(prev => ({
                                                                    ...prev,
                                                                    supervisorConfigs: newConfigs
                                                                }));
                                                            }}
                                                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                                        >
                                                            ➕ OS
                                                        </button>
                                                    </div>

                                                    {supConfig.obraSocialDistribution.length === 0 ? (
                                                        <p className="text-xs text-gray-500">Sin distribución (aleatorio)</p>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {supConfig.obraSocialDistribution.map((dist, distIdx) => (
                                                                <div key={distIdx} className="flex gap-1">
                                                                    <select
                                                                        value={dist.obraSocial}
                                                                        onChange={(e) => {
                                                                            const newConfigs = [...exportConfig.supervisorConfigs];
                                                                            newConfigs[configIndex].obraSocialDistribution[distIdx].obraSocial = e.target.value;
                                                                            setExportConfig(prev => ({
                                                                                ...prev,
                                                                                supervisorConfigs: newConfigs
                                                                            }));
                                                                        }}
                                                                        className="flex-1 border rounded px-1 py-1 text-xs"
                                                                    >
                                                                        <option value="">Seleccionar...</option>
                                                                        <option value="OSDE">OSDE</option>
                                                                        <option value="Medifé">Medifé</option>
                                                                        <option value="Binimed">Binimed</option>
                                                                        <option value="*">🔀 Aleatorio</option>
                                                                    </select>
                                                                    <input
                                                                        type="number"
                                                                        value={dist.cantidad}
                                                                        onChange={(e) => {
                                                                            const newConfigs = [...exportConfig.supervisorConfigs];
                                                                            newConfigs[configIndex].obraSocialDistribution[distIdx].cantidad = parseInt(e.target.value);
                                                                            setExportConfig(prev => ({
                                                                                ...prev,
                                                                                supervisorConfigs: newConfigs
                                                                            }));
                                                                        }}
                                                                        className="w-16 border rounded px-1 py-1 text-xs"
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            const newConfigs = [...exportConfig.supervisorConfigs];
                                                                            newConfigs[configIndex].obraSocialDistribution = newConfigs[configIndex].obraSocialDistribution.filter((_, i) => i !== distIdx);
                                                                            setExportConfig(prev => ({
                                                                                ...prev,
                                                                                supervisorConfigs: newConfigs
                                                                            }));
                                                                        }}
                                                                        className="px-1 bg-red-600 text-white rounded text-xs"
                                                                    >
                                                                        ❌
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Hora de envío */}
            <div>
                <label className="block text-sm font-semibold mb-2">
                    Hora de envío diario (HH:mm)
                </label>
                <input
                    type="time"
                    value={exportConfig.scheduledTime}
                    onChange={(e) => setExportConfig(prev => ({
                        ...prev,
                        scheduledTime: e.target.value
                    }))}
                    className="w-full md:w-64 border rounded px-3 py-2"
                />
            </div>

            {/* Configuración actual */}
            {currentConfig && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-900 mb-2">✅ Configuración Actual</h3>
                    <ul className="text-sm text-green-800 space-y-1">
                        <li>• Tipo: <strong>{currentConfig.sendType === "masivo" ? "Envío Masivo" : "Envío Avanzado"}</strong></li>
                        {currentConfig.sendType === "masivo" && (
                            <li>• {currentConfig.affiliatesPerFile} afiliados por archivo</li>
                        )}
                        {currentConfig.sendType === "avanzado" && (
                            <li>• {currentConfig.supervisorConfigs?.length || 0} supervisores configurados</li>
                        )}
                        <li>• Envío diario a las {currentConfig.scheduledTime}</li>
                        {currentConfig.lastExecuted && (
                            <li>• Última ejecución: {new Date(currentConfig.lastExecuted).toLocaleString("es-AR")}</li>
                        )}
                    </ul>
                </div>
            )}

            <button
                onClick={handleSaveExportConfig}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
                {loading ? "Guardando..." : "💾 Guardar Configuración"}
            </button>
        </div>
    </motion.div>
)}
