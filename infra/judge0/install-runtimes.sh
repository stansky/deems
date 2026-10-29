#!/bin/sh
# Low-disk equivalent of Dockerfile, on the dedicated guest only.
set -eu
test "$(id -u)" = 0
cd /opt/deems-runtime-build
printf '%s\n' \
  '48cc0e21e048790e54c0cf5749c2725005313d652651c40b7a21feb9697aaf75  node-runtime.tar.xz' \
  'ce4f6d0a6cfdb3bed6e44c2f9affd85943c76a42e25ad3a259002f31d6fb8a20  python-runtime.tar.gz' | sha256sum -c -
runtime_workdir=$(mktemp -d /opt/deems-runtime-build/stage.XXXXXX)
runtime_container=$(docker create judge0/judge0:1.13.1@sha256:6b5d6a66aa19a8e878a52ea3c6a560afc1086734d96e2885b561fd5c6018f082)
cleanup() {
  docker rm "$runtime_container" >/dev/null 2>&1 || true
  rm -rf "$runtime_workdir"
}
trap cleanup EXIT
mkdir "$runtime_workdir/node" "$runtime_workdir/python"
tar -xJf node-runtime.tar.xz -C "$runtime_workdir/node" --strip-components=1
tar -xzf python-runtime.tar.gz -C "$runtime_workdir/python" --strip-components=1
docker cp "$runtime_workdir/node" "$runtime_container:/usr/local/deems-node"
docker cp "$runtime_workdir/python" "$runtime_container:/usr/local/deems-python"
docker cp "$runtime_container:/api/db/languages/active.rb" "$runtime_workdir/active.rb"
python3 - "$runtime_workdir/active.rb" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text()
for old,new in [('Node.js 12.14.0','Node.js 24.22.2'),('/usr/local/node-12.14.0/bin/node','/usr/local/deems-node/bin/node'),('Python (3.8.1)','Python (3.12.16)'),('/usr/local/python-3.8.1/bin/python3','/usr/local/deems-python/bin/python3')]:
    assert old in s, 'Upstream language definitions changed'
    s=s.replace(old,new)
p.write_text(s)
PY
docker cp "$runtime_workdir/active.rb" "$runtime_container:/api/db/languages/active.rb"
# This clean container was never started and has no secret mounts or environment.
docker commit "$runtime_container" deems-judge0:20261029
docker run --rm --network none --entrypoint /usr/local/deems-node/bin/node deems-judge0:20261029 --version
docker run --rm --network none --entrypoint /usr/local/deems-python/bin/python3 deems-judge0:20261029 --version
