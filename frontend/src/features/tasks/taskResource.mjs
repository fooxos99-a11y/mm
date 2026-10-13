export const resolveTaskResource = rawUrl => {
  let url;
  try {
    url = new URL(String(rawUrl || '').trim());
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null;

  const resource = { href: url.href, video: null };
  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
    resource.video = { kind: 'video', src: url.href };
    return resource;
  }

  const host = url.hostname.toLowerCase();
  let videoId = '';
  if (host === 'youtu.be') {
    videoId = url.pathname.split('/')[1];
  } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    videoId = url.pathname === '/watch'
      ? url.searchParams.get('v')
      : url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
  }
  if (/^[\w-]{11}$/.test(videoId || '')) {
    resource.video = { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` };
  }
  return resource;
};
