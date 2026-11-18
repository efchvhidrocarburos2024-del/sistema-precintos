import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Card, Input, Boton } from "./ui";

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
        <p style={{ color: 'var(--text-light)' }}>Verificando enlace...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <Card>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', color: 'var(--text-dark)', margin: 0 }}>
            Crear nueva contraseña
          </h1>

          <Input
            type="password"
            placeholder="Nueva contraseña"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            required
            label={null}
          />

          <Input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
            label={null}
          />

          {msg && (
            <p style={{
              color: msg.tipo === "ok" ? 'var(--success-green, #16A34A)' : 'var(--danger-red, #DC2626)',
              textAlign: 'center',
              margin: 0,
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {msg.texto}
            </p>
          )}

          <Boton tipo="submit" variante="primary">
            Guardar contraseña
          </Boton>
        </form>
      </Card>
    </div>
  );
}