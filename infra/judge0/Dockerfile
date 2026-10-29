FROM judge0/judge0:1.13.1@sha256:6b5d6a66aa19a8e878a52ea3c6a560afc1086734d96e2885b561fd5c6018f082
USER root
# Verified upstream archives, fetched before the guest's outbound network is closed.
COPY node-runtime.tar.xz python-runtime.tar.gz /tmp/
RUN printf '%s\n' \
      '48cc0e21e048790e54c0cf5749c2725005313d652651c40b7a21feb9697aaf75  /tmp/node-runtime.tar.xz' \
      'ce4f6d0a6cfdb3bed6e44c2f9affd85943c76a42e25ad3a259002f31d6fb8a20  /tmp/python-runtime.tar.gz' | sha256sum -c - \
    && mkdir -p /usr/local/deems-node /usr/local/deems-python \
    && tar -xJf /tmp/node-runtime.tar.xz -C /usr/local/deems-node --strip-components=1 \
    && tar -xzf /tmp/python-runtime.tar.gz -C /usr/local/deems-python --strip-components=1 \
    && rm /tmp/node-runtime.tar.xz /tmp/python-runtime.tar.gz \
    && /usr/local/deems-node/bin/node --version \
    && /usr/local/deems-python/bin/python3 --version
# Judge0 reseeds language definitions on startup. Update both the label and command.
RUN /usr/local/python-3.8.1/bin/python3 -c 'from pathlib import Path; p=Path("/api/db/languages/active.rb"); s=p.read_text(); s=s.replace("Node.js 12.14.0","Node.js 24.22.2").replace("/usr/local/node-12.14.0/bin/node","/usr/local/deems-node/bin/node").replace("Python (3.8.1)","Python (3.12.16)").replace("/usr/local/python-3.8.1/bin/python3","/usr/local/deems-python/bin/python3"); p.write_text(s)'
USER judge0
