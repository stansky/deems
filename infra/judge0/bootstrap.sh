#!/bin/sh
# Run on a new, dedicated Ubuntu 22.04 x86_64 server only.
set -eu
test "$(id -u)" = 0
test "$(uname -m)" = x86_64
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl --fail --silent --show-error https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
printf '%s\n' 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu jammy stable' > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
printf '%s\n' 'GRUB_CMDLINE_LINUX="$GRUB_CMDLINE_LINUX systemd.unified_cgroup_hierarchy=0"' > /etc/default/grub.d/99-deems-runner.cfg
update-grub
install -m 0700 -d /opt/deems-runner
# Deploy the reviewed compose, Caddy and generated secret config after reboot.
# No app credentials or personal files belong on this server.
printf '%s\n' 'Runner prerequisites installed. Reboot before starting Judge0.'
