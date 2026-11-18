import quillCss from 'quill/dist/quill.core.css?inline';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Preserve browser layout and shaping; painting individual glyphs breaks Arabic.
export function documentRaster(element, fontCss) {
  const copy = element.cloneNode(true);
  const originals = [element, ...element.querySelectorAll('*')];
  const copies = [copy, ...copy.querySelectorAll('*')];
  originals.forEach((node, index) => {
    const style = getComputedStyle(node);
    for (const property of style) copies[index].style.setProperty(property, style.getPropertyValue(property));
  });
  const bounds = element.getBoundingClientRect();
  Object.assign(copy.style, {
    position: 'relative', left: '0', top: '0', margin: '0', transform: 'none',
    width: `${bounds.width}px`, height: `${Math.ceil(bounds.height)}px`, overflow: 'visible',
  });
  const styles = document.createElement('style');
  styles.textContent = `${quillCss}\n${fontCss}`;
  copy.prepend(styles);
  return async (slice, scale = 1.5) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(bounds.width * scale));
    svg.setAttribute('height', String(slice.height * scale));
    const content = document.createElementNS(SVG_NS, 'foreignObject');
    content.setAttribute('width', String(bounds.width * scale));
    content.setAttribute('height', String(Math.ceil(bounds.height) * scale));
    content.setAttribute('y', String(-slice.start * scale));
    const page = copy.cloneNode(true);
    // CSS zoom also scales foreignObject text in WebKit, unlike SVG viewBox.
    page.style.zoom = String(scale);
    content.appendChild(page);
    svg.appendChild(content);
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(bounds.width * scale);
    canvas.height = Math.ceil(slice.height * scale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  };
}
