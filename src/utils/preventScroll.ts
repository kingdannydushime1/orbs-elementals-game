export function preventScroll() {
  const handler = (e: KeyboardEvent | TouchEvent) => {
    if (e instanceof KeyboardEvent) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    }
  };
  window.addEventListener('keydown', handler);
  window.addEventListener('touchmove', (e: TouchEvent) => e.preventDefault(), { passive: false });
  return () => {
    window.removeEventListener('keydown', handler);
  };
}
