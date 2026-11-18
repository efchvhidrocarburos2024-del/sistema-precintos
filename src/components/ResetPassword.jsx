import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function ResetPassword() {
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [msg, setMsg] = useState(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    // Supabase procesa el token en la URL automáticamente
    supabase.auth.getSession().then(({ data }) => setListo(!!data.session));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (nueva.length < 8) {
      setMsg({ tipo: "error", texto: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (nueva !== confirmar) {
      setMsg({ tipo: "error", texto: "Las contraseñas no coinciden." });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: nueva });

    if (error) {
      setMsg({ tipo: "error", texto: `Error: ${error.message}` });
    } else {
      setMsg({ tipo: "ok", texto: "✅ Contraseña actualizada. Redirigiendo..." });
      // Al recargar la página, App.jsx leerá que ya hay sesión y mostrará el Dashboard
      setTimeout(() => {
        window.location.href = '/'; 
      }, 2000);
    }
  }

  if (!listo) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
        <p>Verificando enlace...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center' }}>Crear nueva contraseña</h1>
        <input type="password" placeholder="Nueva contraseña" value={nueva} onChange={(e) => setNueva(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} />
        <input type="password" placeholder="Confirmar contraseña" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} />
        {msg && <p style={{ color: msg.tipo === "ok" ? "green" : "red", textAlign: 'center' }}>{msg.texto}</p>}
        <button type="submit" style={{ padding: '10px', backgroundColor: '#0B5FA5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar contraseña</button>
      </form>
    </div>
  );
}