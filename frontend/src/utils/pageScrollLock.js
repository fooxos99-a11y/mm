let locks = 0;
let restore;

// Fixed-body locking keeps the background stationary without cancelling touch
// events on the independently scrollable dialog (including mobile Safari).
export function lockPageScroll() {
  if (locks++ === 0) {
    const body = document.body;
    const html = document.documentElement;
    const x = window.scrollX;
    const y = window.scrollY;
    const properties = ['position', 'top', 'left', 'right', 'width', 'overflow'];
    const saved = properties.map(name => [name, body.style.getPropertyValue(name), body.style.getPropertyPriority(name)]);
    const overflow = html.style.overflow;
    body.style.position = 'fixed';
    body.style.top = `${-y}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    restore = () => {
      for (const [name, value, priority] of saved) {
        if (value) body.style.setProperty(name, value, priority);
        else body.style.removeProperty(name);
      }
      html.style.overflow = overflow;
      const behavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      window.scrollTo(x, y);
      html.style.scrollBehavior = behavior;
    };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) { restore?.(); restore = undefined; }
  };
}
