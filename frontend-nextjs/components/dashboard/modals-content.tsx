// Modal components for Turnos and Estadísticas
// This file contains the JSX for the modals to be inserted into auditorias-seguimiento.tsx

export const TurnosModalContent = `
      {/* Turnos Modal */}
      {showSlotsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 p-2 rounded-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Turnos Disponibles</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Consulta la disponibilidad de turnos por fecha</p>
                </div>
              </div>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                onClick={() => setShowSlotsModal(false)}
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Date Selector */}
            <div className="p-5 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seleccionar fecha:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Legend */}
            <div className="p-5 bg-blue-50 dark:bg-blue-900/20 border-b dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Leyenda de disponibilidad:</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                  <span className="dark:text-gray-300">5-10 cupos disponibles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                  <span className="dark:text-gray-300">3-4 cupos disponibles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
                  <span className="dark:text-gray-300">1-2 cupos disponibles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                  <span className="dark:text-gray-300">Turno completo (bloqueado)</span>
                </div>
              </div>
            </div>

            {/* Slots List */}
            <div className="flex-1 overflow-y-auto p-5">
              {loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-12 h-12 animate-spin text-purple-600" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando turnos...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>No hay turnos disponibles para esta fecha.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableSlots.map((slot: any) => {
                    const available = 10 - slot.count
                    const isBlocked = available <= 0
                    return (
                      <div
                        key={slot.time}
                        className={\`p-4 rounded-lg border-2 transition-all \${getSlotColor(slot.count)} \${isBlocked ? 'opacity-60' : 'hover:shadow-md'}\`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold">{slot.time}</span>
                          {isBlocked && <X className="w-5 h-5" />}
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pactadas:</span>
                            <span className="font-semibold">{slot.count}/10</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Disponibles:</span>
                            <span className="font-bold">{Math.max(0, available)}</span>
                          </div>
                        </div>
                        {isBlocked && (
                          <div className="mt-2 text-xs font-semibold text-center">COMPLETO</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Total de turnos:</span> {availableSlots.length}
                <span className="ml-4 font-semibold">Auditorías pactadas:</span> {availableSlots.reduce((sum: number, s: any) => sum + s.count, 0)}
              </div>
              <button
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
                onClick={() => setShowSlotsModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
`

export const EstadisticasModalContent = `
      {/* Estadísticas Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Estadísticas de Contactación</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Afiliados contactados por obra social anterior</p>
                </div>
              </div>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                onClick={() => setShowStatsModal(false)}
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Date Selector */}
            <div className="p-5 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seleccionar fecha:</label>
              <input
                type="date"
                value={statsDate}
                onChange={(e) => handleStatsDateChange(e.target.value)}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Stats List */}
            <div className="flex-1 overflow-y-auto p-5">
              {loadingStats ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-12 h-12 animate-spin text-indigo-600" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando estadísticas...</span>
                </div>
              ) : salesStats.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="font-medium">No hay contactaciones registradas para esta fecha.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesStats.map((stat: any, index: number) => {
                    const total = salesStats.reduce((sum: number, s: any) => sum + s.count, 0)
                    const percentage = ((stat.count / total) * 100).toFixed(1)
                    const colors = ['#4F46E5', '#7C3AED', '#2563EB', '#6B7280']
                    return (
                      <div
                        key={stat.obraSocial}
                        className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 border-l-4 hover:shadow-md transition"
                        style={{ borderLeftColor: colors[index % colors.length] }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <span className={\`font-semibold text-base \${getObraVendidaClass(stat.obraSocial)} px-3 py-1 rounded-full inline-block\`}>
                                {stat.obraSocial}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stat.count}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">contactaciones</div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: \`\${percentage}%\` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-right">{percentage}% del total</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Total contactaciones:</span> {salesStats.reduce((sum: number, s: any) => sum + s.count, 0)}
                <span className="ml-4 font-semibold">Obras sociales:</span> {salesStats.length}
              </div>
              <button
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                onClick={() => setShowStatsModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
`
