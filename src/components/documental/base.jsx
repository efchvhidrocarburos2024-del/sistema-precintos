// ============================================================================
//  SIGMO · Repositorio Documental · Lenguaje visual compartido
//  Paleta derivada del petróleo: navy/teal dominante, cyan·ámbar·lima·magenta
//  como acentos de plena croma. Ningún gris por defecto.
// ============================================================================
import { useEffect, useId } from 'react'
import { PALETA, mezclarHex, infoTipo, formatearBytes, haceCuanto } from './constantes'

export function Estilos() {
  return (
    <style>{`
.rd-app{
  --ink:${PALETA.tinta}; --deep:${PALETA.profundo}; --pri:${PALETA.primario};
  --cyan:${PALETA.cyan}; --teal:${PALETA.teal}; --amber:${PALETA.ambar};
  --lime:${PALETA.lima}; --mag:${PALETA.magenta}; --vio:${PALETA.violeta};
  --ok:${PALETA.exito}; --warn:${PALETA.alerta}; --bad:${PALETA.rojo}; --info:${PALETA.info};
  --warm:${PALETA.calido}; --cool:${PALETA.frio}; --surf:${PALETA.superficie};
  --line:${PALETA.borde}; --tx:${PALETA.texto}; --soft:${PALETA.suave};
  --track:#E3EBF2;
  position:relative; min-height:100vh; color:var(--tx); color-scheme:light;
  font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased;
  background:
    radial-gradient(1100px 620px at 8% -8%, ${mezclarHex(PALETA.cyan, .17)}, transparent 62%),
    radial-gradient(900px 560px at 96% 4%, ${mezclarHex(PALETA.ambar, .14)}, transparent 60%),
    radial-gradient(1000px 700px at 52% 108%, ${mezclarHex(PALETA.violeta, .13)}, transparent 64%),
    linear-gradient(178deg,#F7FAFC 0%, var(--cool) 46%, var(--warm) 100%);
  overflow-x:hidden;
}
.rd-app *{box-sizing:border-box}
.rd-app button,.rd-app input,.rd-app select,.rd-app textarea{font-family:inherit}
.rd-app :focus-visible{outline:2.5px solid var(--cyan);outline-offset:2px;border-radius:6px}

/* ── scrollbar en el lenguaje del arte ───────────────────────────────── */
.rd-app ::-webkit-scrollbar{width:11px;height:11px}
.rd-app ::-webkit-scrollbar-track{background:var(--track);border-radius:9px}
.rd-app ::-webkit-scrollbar-thumb{
  background:linear-gradient(180deg,var(--pri),var(--teal));
  border-radius:9px;border:2px solid var(--track);transition:.2s}
.rd-app ::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,var(--cyan),var(--pri))}
.rd-app ::-webkit-scrollbar-thumb:active{background:linear-gradient(180deg,var(--amber),var(--mag))}
.rd-app ::-webkit-scrollbar-corner{background:var(--track)}
.rd-app *{scrollbar-width:thin;scrollbar-color:var(--pri) var(--track)}
.rd-drawer-body,.rd-modal{overscroll-behavior:contain}

/* ── fondo vivo ──────────────────────────────────────────────────────── */
.rd-grano{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.3;mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.42'/%3E%3C/svg%3E")}
.rd-orbe{position:fixed;border-radius:50%;filter:blur(74px);pointer-events:none;z-index:0;opacity:.4;
  animation:rd-flota 22s ease-in-out infinite;will-change:transform}
.rd-orbe.a{width:380px;height:380px;top:-90px;left:-70px;background:${mezclarHex(PALETA.cyan, .55)}}
.rd-orbe.b{width:320px;height:320px;bottom:-80px;right:-60px;background:${mezclarHex(PALETA.ambar, .45)};animation-delay:-7s}
.rd-orbe.c{width:300px;height:300px;top:44%;left:56%;background:${mezclarHex(PALETA.magenta, .3)};animation-delay:-13s}
@keyframes rd-flota{
  0%,100%{transform:translate3d(0,0,0) scale(1)}
  33%{transform:translate3d(38px,-26px,0) scale(1.09)}
  66%{transform:translate3d(-26px,30px,0) scale(.94)}}

@keyframes rd-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes rd-in{from{opacity:0}to{opacity:1}}
@keyframes rd-pop{0%{opacity:0;transform:scale(.94)}60%{transform:scale(1.015)}100%{opacity:1;transform:scale(1)}}
@keyframes rd-slide{from{transform:translateX(102%)}to{transform:none}}
@keyframes rd-shim{100%{background-position:200% 0}}
@keyframes rd-gir{to{transform:rotate(360deg)}}
@keyframes rd-lat{0%,100%{opacity:1}50%{opacity:.42}}

/* ── cabecera ────────────────────────────────────────────────────────── */
.rd-top{position:sticky;top:0;z-index:40;backdrop-filter:blur(16px);
  background:linear-gradient(100deg,${mezclarHex(PALETA.tinta, .97)},${mezclarHex(PALETA.profundo, .95)} 52%,${mezclarHex(PALETA.teal, .93)});
  border-bottom:1px solid ${mezclarHex(PALETA.cyan, .3)};
  box-shadow:0 12px 34px -20px ${mezclarHex(PALETA.tinta, .9)}}
.rd-top-in{max-width:1560px;margin:0 auto;padding:14px 22px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.rd-marca{display:flex;align-items:center;gap:13px;min-width:0}
.rd-sello{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:23px;flex:none;
  background:linear-gradient(140deg,var(--cyan),var(--pri) 58%,var(--vio));
  box-shadow:0 8px 22px -8px ${mezclarHex(PALETA.cyan, .9)}, inset 0 1px 0 rgba(255,255,255,.4)}
.rd-volver{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.24);color:#EAF4FA;
  padding:7px 13px;border-radius:9px;cursor:pointer;font-size:12.5px;font-weight:700;transition:.18s;white-space:nowrap}
.rd-volver:hover{background:rgba(255,255,255,.2);transform:translateX(-2px)}
.rd-medidor{min-width:184px}
.rd-medidor-bar{height:7px;border-radius:99px;background:rgba(255,255,255,.16);overflow:hidden;margin-top:5px}
.rd-medidor-fill{height:100%;border-radius:99px;
  background:linear-gradient(90deg,var(--lime),var(--cyan) 55%,var(--amber));
  transition:width .6s cubic-bezier(.22,1,.36,1)}

/* ── estructura ──────────────────────────────────────────────────────── */
.rd-cuerpo{position:relative;z-index:1;max-width:1560px;margin:0 auto;padding:20px 22px 64px;
  display:grid;grid-template-columns:236px 1fr;gap:20px;align-items:start}
@media(max-width:1080px){.rd-cuerpo{grid-template-columns:1fr;padding:16px 14px 56px}}

.rd-rail{position:sticky;top:92px;display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:18px;
  background:${mezclarHex('#FFFFFF', .82)};border:1px solid var(--line);backdrop-filter:blur(10px);
  box-shadow:0 18px 40px -32px ${mezclarHex(PALETA.tinta, .8)}}
@media(max-width:1080px){.rd-rail{position:static;flex-direction:row;overflow-x:auto;padding:8px;gap:8px}}
.rd-nav{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:12px;border:1px solid transparent;
  background:none;cursor:pointer;font-size:13.5px;font-weight:700;color:var(--soft);text-align:left;width:100%;
  transition:.18s;white-space:nowrap}
.rd-nav:hover{background:${mezclarHex(PALETA.cyan, .1)};color:var(--pri);border-color:${mezclarHex(PALETA.cyan, .3)}}
.rd-nav.on{background:linear-gradient(100deg,var(--pri),var(--teal));color:#fff;border-color:transparent;
  box-shadow:0 10px 24px -14px ${mezclarHex(PALETA.primario, .95)}}
.rd-nav .n{margin-left:auto;font-size:11px;font-weight:800;padding:2px 8px;border-radius:99px;background:${mezclarHex(PALETA.tinta, .08)}}
.rd-nav.on .n{background:rgba(255,255,255,.24)}
@media(max-width:1080px){.rd-nav{width:auto}.rd-nav .n{margin-left:4px}}

.rd-panel{background:var(--surf);border:1px solid var(--line);border-radius:18px;
  box-shadow:0 22px 48px -40px ${mezclarHex(PALETA.tinta, .9)};
  animation:rd-up .4s cubic-bezier(.22,1,.36,1) both}
.rd-panel-c{padding:20px}
.rd-tit{margin:0;font-size:19px;font-weight:900;letter-spacing:-.3px;color:var(--ink);display:flex;align-items:center;gap:9px}
.rd-sub{margin:5px 0 0;font-size:12.5px;color:var(--soft);line-height:1.55}

/* ── controles ───────────────────────────────────────────────────────── */
.rd-barra{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;padding:15px;border-radius:15px;
  background:linear-gradient(120deg,${mezclarHex(PALETA.frio, .95)},${mezclarHex(PALETA.calido, .9)});
  border:1px solid var(--line)}
.rd-campo{display:flex;flex-direction:column;gap:5px;min-width:0}
.rd-lab{font-size:10.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--soft)}
.rd-in,.rd-sel{width:100%;padding:9px 11px;border-radius:10px;border:1.5px solid var(--line);
  background:#fff;font-size:13px;color:var(--tx);transition:.16s;outline:none}
.rd-in:focus,.rd-sel:focus{border-color:var(--cyan);box-shadow:0 0 0 3.5px ${mezclarHex(PALETA.cyan, .18)}}
.rd-in:disabled,.rd-sel:disabled{background:#F2F6F9;color:#93A8B8;cursor:not-allowed}
.rd-sel{cursor:pointer;font-weight:600}
.rd-in::placeholder{color:#9BB0C0}
.rd-rango{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:99px;
  background:linear-gradient(90deg,var(--pri),var(--cyan));outline:none;cursor:pointer}
.rd-rango::-webkit-slider-thumb{-webkit-appearance:none;width:17px;height:17px;border-radius:50%;
  background:#fff;border:3px solid var(--pri);cursor:grab;box-shadow:0 2px 7px rgba(6,42,61,.3)}
.rd-rango::-webkit-slider-thumb:active{cursor:grabbing;border-color:var(--amber)}
.rd-rango::-moz-range-thumb{width:17px;height:17px;border-radius:50%;background:#fff;border:3px solid var(--pri);cursor:grab}

.rd-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 15px;border-radius:10px;
  border:1.5px solid transparent;font-size:13px;font-weight:800;cursor:pointer;transition:.17s;
  white-space:nowrap;line-height:1.25}
.rd-btn:disabled{opacity:.5;cursor:not-allowed}
.rd-btn:not(:disabled):hover{transform:translateY(-1.5px)}
.rd-btn:not(:disabled):active{transform:translateY(0)}
.rd-b-pri{background:linear-gradient(100deg,var(--pri),var(--teal));color:#fff;
  box-shadow:0 10px 22px -12px ${mezclarHex(PALETA.primario, .95)}}
.rd-b-ok{background:linear-gradient(100deg,#059669,var(--ok));color:#fff;
  box-shadow:0 10px 22px -12px ${mezclarHex(PALETA.exito, .9)}}
.rd-b-warn{background:linear-gradient(100deg,#D97706,var(--amber));color:#fff}
.rd-b-bad{background:linear-gradient(100deg,#DC2626,#F43F5E);color:#fff}
.rd-b-gh{background:#fff;border-color:var(--line);color:var(--pri)}
.rd-b-gh:not(:disabled):hover{border-color:var(--cyan);background:${mezclarHex(PALETA.cyan, .07)}}
.rd-b-sm{padding:6px 11px;font-size:11.5px;border-radius:8px}
.rd-b-ico{padding:7px 9px;font-size:14px;border-radius:9px}

.rd-seg{display:inline-flex;padding:3px;gap:3px;border-radius:11px;background:${mezclarHex(PALETA.tinta, .07)};border:1px solid var(--line)}
.rd-seg button{border:none;background:none;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:800;
  color:var(--soft);cursor:pointer;transition:.16s}
.rd-seg button.on{background:#fff;color:var(--pri);box-shadow:0 3px 9px -4px ${mezclarHex(PALETA.tinta, .6)}}

.rd-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-size:11.5px;
  font-weight:800;border:1.5px solid var(--line);background:#fff;color:var(--soft);cursor:pointer;
  transition:.16s;white-space:nowrap}
.rd-chip:hover{transform:translateY(-1px)}
.rd-tag{display:inline-flex;align-items:center;gap:4px;padding:2.5px 9px;border-radius:7px;font-size:10.5px;
  font-weight:700;background:${mezclarHex(PALETA.teal, .1)};color:var(--teal);border:1px solid ${mezclarHex(PALETA.teal, .2)}}

/* ── tarjetas y filas ────────────────────────────────────────────────── */
.rd-grid{display:grid;gap:14px}
.rd-card{position:relative;background:#fff;border:1.5px solid var(--line);border-radius:15px;padding:15px;
  cursor:pointer;transition:transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s,border-color .2s;
  animation:rd-up .34s both;overflow:hidden;text-align:left}
.rd-card::before{content:'';position:absolute;inset:0 auto 0 0;width:4px;background:var(--cc,var(--pri));opacity:.85}
.rd-card:hover{transform:translateY(-4px);box-shadow:0 22px 40px -26px ${mezclarHex(PALETA.tinta, .8)};border-color:var(--cc,var(--cyan))}
.rd-card.sel{border-color:var(--pri);box-shadow:0 0 0 3px ${mezclarHex(PALETA.primario, .16)}}
.rd-card-ico{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-size:20px;flex:none}
.rd-estrella{position:absolute;top:11px;right:11px;font-size:15px;filter:drop-shadow(0 2px 4px rgba(245,158,11,.5))}

.rd-fila{display:grid;align-items:center;gap:12px;padding:11px 14px;
  border-bottom:1px solid ${mezclarHex(PALETA.borde, .8)};cursor:pointer;transition:.15s;background:#fff;
  text-align:left;width:100%;border-left:3px solid transparent}
.rd-fila:hover{background:${mezclarHex(PALETA.cyan, .06)};border-left-color:var(--cc,var(--cyan))}
.rd-fila.sel{background:${mezclarHex(PALETA.primario, .08)};border-left-color:var(--pri)}

.rd-check{width:17px;height:17px;border-radius:5px;border:2px solid var(--line);background:#fff;cursor:pointer;
  display:grid;place-items:center;flex:none;transition:.15s;padding:0}
.rd-check.on{background:var(--pri);border-color:var(--pri);color:#fff;font-size:11px}
.rd-check:hover{border-color:var(--cyan)}

.rd-lote{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:11px 15px;border-radius:13px;
  background:linear-gradient(100deg,var(--ink),var(--deep));color:#EAF4FA;animation:rd-pop .24s both;
  box-shadow:0 16px 34px -22px ${mezclarHex(PALETA.tinta, .95)}}

.rd-vacio{padding:52px 24px;text-align:center;animation:rd-in .4s both}
.rd-vacio-ico{font-size:52px;margin-bottom:12px;filter:grayscale(.15)}
.rd-sk{border-radius:13px;background:linear-gradient(90deg,#E9EFF5 25%,#F5F9FC 50%,#E9EFF5 75%);
  background-size:200% 100%;animation:rd-shim 1.35s infinite}

/* ── capas superpuestas ──────────────────────────────────────────────── */
.rd-scrim{position:fixed;inset:0;z-index:70;background:${mezclarHex(PALETA.tinta, .5)};
  backdrop-filter:blur(4px);animation:rd-in .2s both}
.rd-drawer{position:fixed;top:0;right:0;bottom:0;width:min(560px,100%);z-index:71;background:var(--surf);
  box-shadow:-28px 0 60px -30px ${mezclarHex(PALETA.tinta, .9)};
  animation:rd-slide .32s cubic-bezier(.22,1,.36,1) both;display:flex;flex-direction:column}
.rd-drawer-top{padding:17px 20px;background:linear-gradient(110deg,var(--ink),var(--deep) 60%,var(--teal));color:#fff;flex:none}
.rd-drawer-body{flex:1;overflow-y:auto;padding:18px 20px 26px}
.rd-modal{position:fixed;z-index:80;top:50%;left:50%;transform:translate(-50%,-50%);
  width:min(500px,calc(100% - 28px));background:#fff;border-radius:18px;padding:24px;
  box-shadow:0 34px 70px -30px ${mezclarHex(PALETA.tinta, .95)};animation:rd-pop .26s both;
  max-height:88vh;overflow-y:auto}

.rd-drop{border:2.5px dashed ${mezclarHex(PALETA.primario, .4)};border-radius:17px;padding:36px 22px;
  text-align:center;cursor:pointer;transition:.2s;
  background:linear-gradient(140deg,${mezclarHex(PALETA.cyan, .05)},${mezclarHex(PALETA.ambar, .05)})}
.rd-drop:hover,.rd-drop.on{border-color:var(--cyan);transform:scale(1.006);
  background:linear-gradient(140deg,${mezclarHex(PALETA.cyan, .13)},${mezclarHex(PALETA.ambar, .1)})}

.rd-linea-tiempo{position:relative;padding-left:24px}
.rd-linea-tiempo::before{content:'';position:absolute;left:6px;top:6px;bottom:6px;width:2px;
  background:linear-gradient(180deg,var(--cyan),var(--pri),transparent)}
.rd-punto{position:absolute;left:0;top:5px;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--pri)}
.rd-punto.first{border-color:var(--lime);box-shadow:0 0 0 4px ${mezclarHex(PALETA.lima, .2)}}

.rd-kpi{position:relative;overflow:hidden;border-radius:16px;padding:17px;color:#fff;animation:rd-up .4s both}
.rd-kpi::after{content:'';position:absolute;right:-26px;top:-26px;width:104px;height:104px;border-radius:50%;background:rgba(255,255,255,.13)}
.rd-kpi-v{font-size:29px;font-weight:900;letter-spacing:-1px;line-height:1.05;margin:6px 0 2px;position:relative}
.rd-kpi-l{font-size:10.5px;font-weight:800;letter-spacing:.9px;text-transform:uppercase;opacity:.9;position:relative}
.rd-kpi-s{font-size:11.5px;opacity:.85;position:relative}

.rd-toast{display:flex;align-items:center;gap:11px;padding:12px 14px;border-radius:13px;
  background:linear-gradient(100deg,var(--ink),var(--deep));color:#EAF4FA;
  box-shadow:0 20px 42px -20px rgba(6,42,61,.95);border:1px solid ${mezclarHex(PALETA.cyan, .35)};
  max-width:430px;font-size:13px;font-weight:600}
.rd-toast-in{animation:rd-pop .24s both}
.rd-toast-out{opacity:0;transition:.2s}
.rd-toast-txt{flex:1}
.rd-toast-btn{background:linear-gradient(100deg,var(--amber),#D97706);border:none;color:#fff;
  padding:6px 12px;border-radius:8px;font-weight:800;cursor:pointer;font-size:12px}
.rd-toast-x{background:none;border:none;color:#8FB4C8;cursor:pointer;font-size:13px;padding:2px 4px}

.rd-tabla{width:100%;border-collapse:collapse;font-size:12.5px}
.rd-tabla thead th{background:linear-gradient(100deg,var(--ink),var(--deep));color:#DCEAF3;padding:11px 12px;
  text-align:left;font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;font-weight:800;position:sticky;top:0;z-index:2}
.rd-tabla tbody td{padding:10px 12px;border-bottom:1px solid ${mezclarHex(PALETA.borde, .7)}}
.rd-tabla tbody tr:hover{background:${mezclarHex(PALETA.cyan, .05)}}

.rd-aviso{display:flex;gap:11px;align-items:flex-start;padding:12px 15px;border-radius:13px;font-size:12.5px;line-height:1.55}
.rd-spin{width:15px;height:15px;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;
  border-radius:50%;animation:rd-gir .7s linear infinite;display:inline-block;flex:none}
.rd-prev{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:linear-gradient(160deg,#FBFDFE,#EFF5F9)}
.rd-cat-card{position:relative;border-radius:16px;padding:16px;background:#fff;border:1.5px solid var(--line);
  transition:.2s;cursor:grab;animation:rd-up .34s both}
.rd-cat-card:hover{transform:translateY(-3px);box-shadow:0 20px 38px -28px ${mezclarHex(PALETA.tinta, .85)}}
.rd-cat-card.drag{opacity:.42;transform:scale(.97)}
.rd-cat-card.over{border-color:var(--cyan);box-shadow:0 0 0 3px ${mezclarHex(PALETA.cyan, .2)}}
.rd-sw{width:34px;height:20px;border-radius:99px;border:none;cursor:pointer;position:relative;transition:.2s;padding:0;flex:none}
.rd-sw span{position:absolute;top:2.5px;width:15px;height:15px;border-radius:50%;background:#fff;
  transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.rd-barra-prog{height:8px;border-radius:99px;background:var(--track);overflow:hidden;border:1px solid var(--line)}
.rd-barra-prog i{display:block;height:100%;border-radius:99px;transition:width .45s cubic-bezier(.22,1,.36,1)}

@media(prefers-reduced-motion:reduce){
  .rd-app *,.rd-app *::before,.rd-app *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  .rd-orbe{animation:none!important}
}
`}</style>
  )
}

export function Fondo() {
  return (
    <>
      <div className="rd-grano" aria-hidden />
      <div className="rd-orbe a" aria-hidden />
      <div className="rd-orbe b" aria-hidden />
      <div className="rd-orbe c" aria-hidden />
    </>
  )
}

export function Boton({ variante = 'pri', tamano, children, icono, type = 'button', ...props }) {
  const cls = ['rd-btn', `rd-b-${variante}`, tamano === 'sm' ? 'rd-b-sm' : '', tamano === 'ico' ? 'rd-b-ico' : '']
    .filter(Boolean).join(' ')
  return <button type={type} className={cls} {...props}>{icono}{children}</button>
}

export function Insignia({ color = PALETA.primario, children, solido = false, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99,
      fontSize: 10.5, fontWeight: 800, letterSpacing: .3, whiteSpace: 'nowrap',
      background: solido ? color : mezclarHex(color, .12),
      color: solido ? '#fff' : color,
      border: `1px solid ${solido ? color : mezclarHex(color, .3)}`,
      ...style,
    }}>{children}</span>
  )
}

export function IconoTipo({ tipo, tam = 42 }) {
  const t = infoTipo(tipo)
  return (
    <div className="rd-card-ico" title={t.etiqueta} style={{
      width: tam, height: tam, fontSize: tam * .48,
      background: mezclarHex(t.color, .13), border: `1.5px solid ${mezclarHex(t.color, .28)}`,
    }}>{t.icono}</div>
  )
}

export function Interruptor({ activo, onChange, etiqueta }) {
  return (
    <button type="button" onClick={() => onChange(!activo)} title={etiqueta}
      aria-pressed={activo} aria-label={etiqueta}
      className="rd-sw" style={{ background: activo ? PALETA.exito : '#C6D3DE' }}>
      <span style={{ left: activo ? 16 : 2.5 }} />
    </button>
  )
}

export function Casilla({ marcada, onChange, titulo }) {
  return (
    <button type="button" title={titulo} aria-pressed={marcada} aria-label={titulo}
      className={`rd-check ${marcada ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onChange(!marcada) }}>
      {marcada ? '✓' : ''}
    </button>
  )
}

export function Segmentado({ opciones, valor, onChange, ariaLabel }) {
  return (
    <div className="rd-seg" role="group" aria-label={ariaLabel}>
      {opciones.map(o => (
        <button key={o.v} type="button" className={valor === o.v ? 'on' : ''}
          onClick={() => onChange(o.v)} title={o.t}>{o.icono ? `${o.icono} ` : ''}{o.t}</button>
      ))}
    </div>
  )
}

export function Barra({ valor = 0, max = 100, color = PALETA.primario, alto = 8 }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0
  return (
    <div className="rd-barra-prog" style={{ height: alto }} role="progressbar"
      aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color},${mezclarHex(color, .55)})` }} />
    </div>
  )
}

export function Cargando({ texto = 'Cargando…', claro = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, justifyContent: 'center', padding: '26px 0' }}>
      <span className="rd-spin" style={claro ? undefined : { borderColor: mezclarHex(PALETA.primario, .28), borderTopColor: PALETA.primario }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: claro ? '#EAF4FA' : PALETA.suave }}>{texto}</span>
    </div>
  )
}

export function Vacio({ icono = '🗂️', titulo, texto, accion }) {
  return (
    <div className="rd-vacio">
      <div className="rd-vacio-ico">{icono}</div>
      <h3 style={{ margin: '0 0 7px', fontSize: 17, fontWeight: 900, color: PALETA.tinta }}>{titulo}</h3>
      <p style={{ margin: '0 auto 16px', maxWidth: 430, fontSize: 13, color: PALETA.suave, lineHeight: 1.6 }}>{texto}</p>
      {accion}
    </div>
  )
}

export function Esqueleto({ filas = 6, alto = 158 }) {
  return (
    <div className="rd-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(268px,1fr))' }}>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="rd-sk" style={{ height: alto, animationDelay: `${i * .07}s` }} />
      ))}
    </div>
  )
}

export function Modal({ abierto, onCerrar, titulo, icono = '⚠️', children, ancho = 500 }) {
  const id = useId()
  useEffect(() => {
    if (!abierto) return
    const esc = (e) => { if (e.key === 'Escape') onCerrar?.() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [abierto, onCerrar])
  if (!abierto) return null
  return (
    <>
      <div className="rd-scrim" onClick={onCerrar} />
      <div className="rd-modal" style={{ width: `min(${ancho}px, calc(100% - 28px))` }}
        role="dialog" aria-modal="true" aria-labelledby={id}>
        <h3 id={id} style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 900, color: PALETA.tinta, display: 'flex', gap: 9, alignItems: 'center' }}>
          <span aria-hidden>{icono}</span>{titulo}
        </h3>
        {children}
      </div>
    </>
  )
}

export function Confirmar({ estado, onCerrar }) {
  if (!estado) return null
  return (
    <Modal abierto onCerrar={onCerrar} titulo={estado.titulo} icono={estado.icono || '⚠️'}>
      <p style={{ margin: '0 0 18px', fontSize: 13.5, color: PALETA.suave, lineHeight: 1.65 }}>{estado.mensaje}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Boton variante="gh" onClick={onCerrar}>Cancelar</Boton>
        <Boton variante={estado.variante || 'bad'} onClick={() => { estado.onConfirmar(); onCerrar() }}>
          {estado.textoConfirmar || 'Confirmar'}
        </Boton>
      </div>
    </Modal>
  )
}

export function MetaLinea({ etiqueta, valor }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0',
      borderBottom: `1px dashed ${mezclarHex(PALETA.borde, .9)}`, fontSize: 12.5,
    }}>
      <span style={{ color: PALETA.suave, fontWeight: 600 }}>{etiqueta}</span>
      <span style={{ color: PALETA.texto, fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{valor}</span>
    </div>
  )
}

export function ResumenArchivo({ doc }) {
  return (
    <span style={{ fontSize: 11, color: PALETA.suave, fontWeight: 600 }}>
      {infoTipo(doc.tipo).etiqueta} · {formatearBytes(doc.tamano_bytes)} · {haceCuanto(doc.created_at)}
    </span>
  )
}