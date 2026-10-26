#!/usr/bin/env bash
set -euo pipefail

[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]] || { echo 'The pinned PDF runtime requires Linux x86_64.' >&2; exit 78; }
destination="${1:-runtime}"
archive="$(mktemp)"
trap 'rm -f -- "$archive"' EXIT
curl --fail --location --retry 3 --proto '=https' \
  'https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2-bin-linux-x86_64.zip' -o "$archive"
printf '%s  %s\n' 'db367d897829f22c4198ce1094143c9d467bd6ee7dfabc44ba6f02056b24f8b1' "$archive" | sha256sum --check --status
mkdir -p "$destination/qpdf"
python3 - "$archive" "$destination/qpdf" <<'PY'
import pathlib, stat, sys, zipfile
root = pathlib.Path(sys.argv[2]).resolve()
with zipfile.ZipFile(sys.argv[1]) as archive:
    for entry in archive.infolist():
        path = (root / entry.filename).resolve()
        if not path.is_relative_to(root):
            raise RuntimeError('Unexpected PDF runtime path')
        path.parent.mkdir(parents=True, exist_ok=True)
        if entry.is_dir():
            path.mkdir(exist_ok=True)
        elif stat.S_ISLNK(entry.external_attr >> 16):
            target = archive.read(entry).decode()
            if not (path.parent / target).resolve().is_relative_to(root):
                raise RuntimeError('Unexpected PDF runtime link')
            if not path.exists():
                path.symlink_to(target)
        else:
            path.write_bytes(archive.read(entry))
            path.chmod((entry.external_attr >> 16) & 0o777 or 0o644)
PY
cat > "$destination/qpdf-runner" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
runtime="$(cd -- "$(dirname -- "$0")" && pwd)"
export LD_LIBRARY_PATH="$runtime/qpdf/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec "$runtime/qpdf/bin/qpdf" "$@"
SH
chmod 755 "$destination/qpdf-runner" "$destination/qpdf/bin/qpdf"
"$destination/qpdf-runner" --version
