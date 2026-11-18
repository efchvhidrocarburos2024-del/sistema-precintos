import { useState } from "react";
import { supabase } from "../supabase";

export default function CambiarPassword() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [msg, setMsg] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (nueva.length < 8) {
      setMsg({ tipo: "error", texto: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (nueva !== confirmar) {
      setMsg({ tipo: "error", texto: "Las contraseñas nuevas no coinciden." });
      return;
    }

    setCargando(true);

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;

    if (!email) {
      setMsg({ tipo: "error", texto: "No se pudo identificar el usuario." });
      setCargando(false);
      return;
    }

    // 1. Verificar contraseña actual
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: actual,
    });

    if (signInError) {
      setMsg({ tipo: "error", texto: "La contraseña actual es incorrecta." });
      setCargando(false);
      return;
    }

    // 2. Actualizar a la nueva
    const { error: updateError } = await supabase.auth.updateUser({ password: nueva });

    if (updateError) {
      setMsg({ tipo: "error", texto: `Error: ${updateError.message}` });
    } else {
      setMsg({ tipo: "ok", texto: "✅ Contraseña actualizada correctamente." });
      setActual(""); setNueva(""); setConfirmar("");
    }
    setCargando(false);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '50px', fontFamily: 'Arial' }}>
      <div style={{ width: '400px', padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h2 style={{ textAlign: 'center', color: '#0B5FA5', marginBottom: '20px' }}>Mi Perfil</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '20px' }}>Actualiza tu contraseña de acceso</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="password" 
            placeholder="Contraseña actual" 
            value={actual} 
            onChange={(e) => setActual(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
          <input 
            type="password" 
            placeholder="Nueva contraseña (mín. 8 caracteres)" 
            value={nueva} 
            onChange={(e) => setNueva(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
          <input 
            type="password" 
            placeholder="Confirmar nueva contraseña" 
            value={confirmar} 
            onChange={(e) => setConfirmar(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
          <button 
            type="submit" 
            disabled={cargando} 
            style={{ padding: '12px', background: '#0B5FA5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {cargando ? 'Guardando...' : 'Actualizar Contraseña'}
          </button>
        </form>

        {msg && (
          <p style={{ color: msg.tipo === "ok" ? "green" : "red", textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>
            {msg.texto}
          </p>
        )}
      </div>
    </div>
  );
}