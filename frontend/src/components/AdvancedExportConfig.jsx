// Componente separado para la configuración avanzada (por claridad)
import React from "react";

export default function AdvancedExportConfig({
    supervisorConfigs,
    supervisors,
    obrasSocialesDisponibles,
    handleAddSupervisor,
    handleRemoveSupervisor,
    handleUpdateSupervisorField,
    handleAddObraSocial,
    handleUpdateObraSocial,
    handleRemoveObraSocial
}) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Configuración por Supervisor</h3>
                <button
                    onClick={handleAddSupervisor}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
                >
                    ➕ Agregar Supervisor
                </button>
            </div>

            {supervisorConfigs.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 text-sm">
                        No hay supervisores configurados. Haz clic en "Agregar Supervisor" para comenzar.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {supervisorConfigs.map((config, index) => {
                        const selectedSupervisor = supervisors.find(s => s._id === config.supervisorId);
                        const totalAfiliados = config.obraSocialDistribution.reduce((sum, os) => sum + (os.cantidad || 0), 0);
                        
                        return (
                            <div key={index} className="p-6 border-2 border-gray-200 rounded-xl bg-white shadow-sm">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-md font-semibold text-gray-700">
                                        Supervisor #{index + 1}
                                    </h4>
                                    <button
                                        onClick={() => handleRemoveSupervisor(index)}
                                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </div>

                                {/* Selector de Supervisor */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Seleccionar Supervisor
                                    </label>
                                    <select
                                        value={config.supervisorId}
                                        onChange={(e) => handleUpdateSupervisorField(index, 'supervisorId', e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">-- Seleccione --</option>
                                        {supervisors.map(sup => (
                                            <option key={sup._id} value={sup._id}>
                                                {sup.nombre || sup.name || sup.email} (Equipo: {sup.numeroEquipo || 'N/A'})
                                            </option>
                                        ))}
                                    </select>
                                    {selectedSupervisor && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            ✅ {selectedSupervisor.nombre || selectedSupervisor.name}
                                        </p>
                                    )}
                                </div>

                                {/* Cantidad de Afiliados */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cantidad Total de Afiliados
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10000"
                                        value={config.affiliatesPerFile}
                                        onChange={(e) => handleUpdateSupervisorField(index, 'affiliatesPerFile', parseInt(e.target.value) || 0)}
                                        className="w-full md:w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    />
                                    <p className="text-xs text-gray-600 mt-1">
                                        {totalAfiliados > config.affiliatesPerFile && (
                                            <span className="text-red-600 font-semibold">
                                                ⚠️ La suma de obras sociales ({totalAfiliados}) supera el total ({config.affiliatesPerFile})
                                            </span>
                                        )}
                                        {totalAfiliados < config.affiliatesPerFile && (
                                            <span className="text-yellow-600 font-semibold">
                                                ⚠️ Faltan {config.affiliatesPerFile - totalAfiliados} afiliados por distribuir
                                            </span>
                                        )}
                                        {totalAfiliados === config.affiliatesPerFile && totalAfiliados > 0 && (
                                            <span className="text-green-600 font-semibold">
                                                ✅ Distribución completa
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Distribución de Obras Sociales */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Distribución por Obra Social
                                        </label>
                                        <button
                                            onClick={() => handleAddObraSocial(index)}
                                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-medium"
                                        >
                                            ➕ Agregar Obra Social
                                        </button>
                                    </div>

                                    {config.obraSocialDistribution.length === 0 ? (
                                        <div className="text-center py-4 bg-gray-50 rounded border border-dashed border-gray-300">
                                            <p className="text-xs text-gray-500">Sin obras sociales configuradas</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {config.obraSocialDistribution.map((os, osIndex) => (
                                                <div key={osIndex} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                    <select
                                                        value={os.obraSocial}
                                                        onChange={(e) => handleUpdateObraSocial(index, osIndex, 'obraSocial', e.target.value)}
                                                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                                                    >
                                                        <option value="">-- Obra Social --</option>
                                                        {!obrasSocialesDisponibles || obrasSocialesDisponibles.length === 0 ? (
                                                            <option value="" disabled>Cargando obras sociales...</option>
                                                        ) : (
                                                            obrasSocialesDisponibles.map(obra => (
                                                                <option key={obra.name} value={obra.name}>
                                                                    {obra.name} ({obra.count} disponibles)
                                                                </option>
                                                            ))
                                                        )}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={config.affiliatesPerFile}
                                                        placeholder="Cantidad"
                                                        value={os.cantidad}
                                                        onChange={(e) => handleUpdateObraSocial(index, osIndex, 'cantidad', parseInt(e.target.value) || 0)}
                                                        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveObraSocial(index, osIndex)}
                                                        className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
