// Keep fixed overlays inside the visual viewport, including the mobile keyboard.
export function observeOverlayViewport(element) {
  const viewport = window.visualViewport;
  const update = () => {
    element.style.setProperty('--overlay-height', `${viewport?.height || window.innerHeight}px`);
    element.style.setProperty('--overlay-top', `${viewport?.offsetTop || 0}px`);
  };
  update();
  window.addEventListener('resize', update);
  viewport?.addEventListener('resize', update);
  viewport?.addEventListener('scroll', update);
  return () => {
    window.removeEventListener('resize', update);
    viewport?.removeEventListener('resize', update);
    viewport?.removeEventListener('scroll', update);
  };
}
