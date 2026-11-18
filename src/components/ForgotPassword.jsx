import { useState } from "react";
import { supabase } from "../supabase";

export default function ForgotPassword({ setPantalla }) {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`, // Supabase usará esto para volver a tu app
    });

    setEnviado(true);
    setCargando(false);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'Arial' }}>
      <div style={{ width: '350px', padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        
        <h2 style={{ textAlign: 'center', color: '#0B5FA5', marginBottom: '10px' }}>Recuperar Contraseña</h2>
        
        {enviado ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'green', fontSize: '14px', marginBottom: '20px' }}>
              ✅ Si el correo <strong>{email}</strong> está registrado, recibirás un enlace en los próximos minutos.
            </p>
            <p style={{ color: '#666', fontSize: '12px' }}>Revisa también tu bandeja de Spam.</p>
            <button 
              onClick={() => setPantalla('')} 
              style={{ marginTop: '20px', padding: '10px', background: '#0B5FA5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
            >
              Volver al Login
            </button>
          </div>
        ) : (
          <>
            <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }} 
              />
              <button 
                type="submit" 
                disabled={cargando} 
                style={{ padding: '12px', background: '#0B5FA5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {cargando ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button 
                type="button" 
                onClick={() => setPantalla('')} 
                style={{ background: 'none', border: 'none', color: '#0B5FA5', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
              >
                Volver al Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}