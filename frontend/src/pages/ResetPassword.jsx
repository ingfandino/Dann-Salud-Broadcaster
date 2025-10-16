// frontend/src/pages/ResetPassword.jsx

import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import apiClient from "../services/api";
import { toast } from "react-toastify";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Token inválido");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/auth/reset-password", { token, password });
      toast.success("Tu contraseña fue actualizada");
      navigate("/login");
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-indigo-100 via-white to-blue-100">
      <style>{`
        input[type='password']::-ms-reveal, input[type='password']::-ms-clear { display: none; }
      `}</style>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 0.5, scale: 1 }} transition={{ duration: 0.8 }} className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 blur-3xl" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 0.5, scale: 1 }} transition={{ duration: 0.8, delay: 0.1 }} className="pointer-events-none absolute bottom-[-6rem] right-[-6rem] h-80 w-80 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-stretch justify-center px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="hidden md:flex flex-col justify-center rounded-2xl bg-white/40 p-8 backdrop-blur-md ring-1 ring-black/5 shadow-xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white text-2xl">🔒</div>
              <div>
                <div className="text-xl font-extrabold text-gray-900">Restablecer contraseña</div>
                <div className="text-sm text-gray-600">Protege tu cuenta con una clave segura</div>
              </div>
            </div>
            <div className="space-y-3 text-gray-700">
              <div className="text-2xl font-semibold leading-snug">Define una nueva clave para tu ingreso</div>
              <ul className="text-sm leading-relaxed list-disc ml-5">
                <li>Mínimo 8 caracteres; combina letras y números.</li>
                <li>No compartas tu contraseña con nadie.</li>
              </ul>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center justify-center">
            <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white/80 p-6 shadow-2xl backdrop-blur-md ring-1 ring-black/5">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center">✅</div>
                <h2 className="text-lg font-bold">Nueva contraseña</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
                  <div className="relative">
                    <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full appearance-none rounded-lg border border-gray-300 bg-white/60 p-2.5 pr-10 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" required />
                    <button type="button" onClick={() => setShow(v => !v)} className="absolute inset-y-0 right-2 my-auto rounded px-2 text-sm text-gray-600 hover:text-gray-900">{show ? "Ocultar" : "Mostrar"}</button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar contraseña</label>
                  <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="w-full appearance-none rounded-lg border border-gray-300 bg-white/60 p-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" required />
                </div>
                <button type="submit" disabled={loading} className="mt-1 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 py-2.5 font-medium text-white shadow hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-60">
                  {loading ? "Guardando..." : "Actualizar contraseña"}
                </button>
              </div>
              <div className="mt-4 text-center text-sm text-gray-600">
                ¿Recordaste tu clave? {" "}
                <button type="button" onClick={() => navigate("/login")} className="text-indigo-600 hover:underline">Inicia sesión</button>
              </div>
            </motion.form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
