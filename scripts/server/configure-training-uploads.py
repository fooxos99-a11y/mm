"""Configure this site's Nginx upload limits, preserving a rollback copy."""
import argparse
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from datetime import datetime, timezone


def configured_site(source):
    if not re.search(r'server_name\s+[^;]*\blicense-qb\.us\b', source):
        raise ValueError('Expected Momars server_name was not found')
    if '/var/www/momars-app/' not in source:
        raise ValueError('Expected Momars deployment path was not found')
    source = re.sub(
        r'(?m)^[ \t]*(?:client_max_body_size|client_body_timeout|fastcgi_read_timeout)\s+[^;]+;[ \t]*(?:#.*)?(?:\n|$)',
        '', source,
    )

    def server_limits(match):
        indent = match.group(1) + '    '
        return match.group(0) + '\n' + '\n'.join(indent + line for line in [
            'client_max_body_size 1024M;',
            'client_body_timeout 600s;',
            'fastcgi_read_timeout 600s;',
        ])

    result, count = re.subn(r'(?m)^([ \t]*)server\s*\{[ \t]*(?:#.*)?$', server_limits, source)
    if not count:
        raise ValueError('No supported Nginx server blocks were found')
    return result


def atomic_write(target, content, metadata):
    descriptor, temporary = tempfile.mkstemp(prefix='.momars-upload-', dir=target.parent)
    try:
        with os.fdopen(descriptor, 'w') as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, stat.S_IMODE(metadata.st_mode))
        os.chown(temporary, metadata.st_uid, metadata.st_gid)
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if args.apply and os.geteuid() != 0:
        os.execvp('sudo', ['sudo', '-n', '--', 'python3', str(Path(__file__).resolve()), '--apply'])
    target = Path('/etc/nginx/sites-enabled/license-qb.us').resolve(strict=True)
    if not target.is_relative_to(Path('/etc/nginx')) or not target.is_file():
        raise ValueError('The site must resolve to a file within /etc/nginx')
    original = target.read_text()
    replacement = configured_site(original)
    if not args.apply:
        print('Momars site found; upload configuration can be applied.')
        return
    if original == replacement:
        print('Nginx upload limits already match the required settings.')
        return
    metadata = target.stat()
    backup_dir = Path('/var/backups') / ('momars-uploads-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup_dir.mkdir(mode=0o700)
    shutil.copy2(target, backup_dir / 'nginx-site.conf')
    try:
        atomic_write(target, replacement, metadata)
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    except Exception:
        atomic_write(target, original, metadata)
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
        raise
    print('Nginx upload limits applied; backup:', backup_dir)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Upload configuration failed:', error, file=sys.stderr)
        sys.exit(1)
