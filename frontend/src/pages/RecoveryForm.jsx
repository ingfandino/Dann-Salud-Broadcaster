import React, { useState } from "react";
import apiClient from "../services/api";
import { toast } from "react-toastify";

export default function RecoveryForm() {
    const [form, setForm] = useState({ nombre: "", cuil: "", telefono: "", obraSocialVendida: "Binimed", fecha: "", hora: "", datosExtra: "" });
    const [loading, setLoading] = useState(false);
    const OBRAS_VENDIDAS = ["Binimed", "Meplife", "Medicenter"];

    const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const payload = {
                nombre: form.nombre,
                cuil: form.cuil,
                telefono: form.telefono,
                obraSocialVendida: form.obraSocialVendida,
                scheduledAt: form.fecha && form.hora ? `${form.fecha}T${form.hora}:00` : undefined,
                datosExtra: form.datosExtra,
            };
            await apiClient.post("/recovery", payload);
            toast.success("Registro creado en Recuperación y reventas");
            setForm({ nombre: "", cuil: "", telefono: "", obraSocialVendida: "Binimed", fecha: "", hora: "", datosExtra: "" });
        } catch (err) {
            toast.error("No se pudo crear el registro");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4">
            <h2 className="text-2xl font-semibold mb-4">Nueva reventa / renovación</h2>
            <form onSubmit={onSubmit} className="space-y-4 bg-white p-4 rounded shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                    <div>
                        <label className="block text-sm">Nombre</label>
                        <input
                            className="w-full p-2 border rounded"
                            placeholder="Nombre"
                            name="nombre"
                            value={form.nombre}
                            onChange={onChange}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm">CUIL</label>
                        <input
                            className="w-full p-2 border rounded"
                            placeholder="CUIL"
                            name="cuil"
                            value={form.cuil}
                            onChange={onChange}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm">Teléfono</label>
                        <input
                            className="w-full p-2 border rounded"
                            placeholder="Teléfono"
                            name="telefono"
                            value={form.telefono}
                            onChange={onChange}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm">Obra social vendida</label>
                        <select
                            className="w-full p-2 border rounded"
                            name="obraSocialVendida"
                            value={form.obraSocialVendida}
                            onChange={onChange}
                            required
                        >
                            {OBRAS_VENDIDAS.map(o => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm">Fecha (día)</label>
                        <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full p-2 border rounded"
                            name="fecha"
                            value={form.fecha}
                            onChange={onChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm">Hora (turno)</label>
                        <input
                            type="time"
                            className="w-full p-2 border rounded"
                            name="hora"
                            value={form.hora}
                            onChange={onChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm">Datos extra (opcional)</label>
                        <textarea
                            className="w-full p-2 border rounded min-h-[70px]"
                            placeholder="Observaciones..."
                            name="datosExtra"
                            value={form.datosExtra}
                            onChange={onChange}
                        />
                    </div>
                    
                </div>
                <div className="pt-2">
                    <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                        {loading ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </form>
        </div>
    );
}

