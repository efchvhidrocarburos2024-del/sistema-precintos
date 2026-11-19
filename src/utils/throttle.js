/**
 * Limita la ejecución de una función a 1 vez por `limit` milisegundos.
 * Evita el re-render constante en eventos de alta frecuencia (mousemove, scroll, etc.)
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};