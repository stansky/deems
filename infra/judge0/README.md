# Deems code runner

This is a separate Linux x86_64 host, not the Deems app server or personal database. Judge0 requires privileged containers and cgroups v1. Docker Desktop on this Mac uses ARM64 and cgroups v2, so it is not a compatible deployment target for this pinned release.

Current target: the owner's existing OVH host, with an isolated Ubuntu 22.04 KVM guest. The shared host stays on cgroups v2; only the guest uses cgroups v1. The VM has 2 vCPUs, 2 GB RAM and a 28 GB thin disk, with a 2800 MB host memory cap and 200% CPU quota. No new cloud subscription was created.

The host systemd service is deems-runner-vm.service and its files are under /srv/deems-runner-vm. Only guest SSH is forwarded to host loopback port 2229. Judge0 is forwarded to the host loopback port 2359. The existing host Caddy service terminates HTTPS for the route in ovh-site.caddy. The runner hostname is an infrastructure endpoint, never a product navigation link.

Guest setup uses the pinned compose project without its proxy service. The server publishes guest port 2358 for the VM forwarding rule. Generate distinct random credentials from judge0.conf.example. The mounted secret file must be owned by UID 1000/GID 999 with mode 0600, because the pinned image runs as judge0 rather than root. Disable Judge0 container logging: its upstream startup script prints its environment. Do not stream those startup logs into CI or app logs.

After initial image installation, guest networking is restricted at the QEMU boundary. Runtime access to the runner is through authenticated inbound requests only. Maintenance that needs outbound downloads requires an explicit bounded maintenance window. The shared host is not rebooted or switched to cgroups v1.

Configure DEEMS_JUDGE0_URL and DEEMS_JUDGE0_TOKEN only on the server, separately in each Vercel project. The manual Configure Deems coding runner workflow reads the existing approved deployment credential and environment-specific runner settings. It changes only the two server-side runner settings. Temporary backup-key settings are removed after verification.

The app sends only the submitted code, language, fixed harness and selected test inputs. It never sends cookies, database credentials, resumes or workspace data. Tests and comparisons are fixed code, with no model calls. The runner denies program networking, callbacks, extra files and custom compiler/CLI options. API requests use a private token. The guest contains only this disposable runner. App attempts are durable in each authenticated user's existing PostgreSQL schema; the runner database is transient operational storage with a daily retention job for finished submissions older than 24 hours.

Pinned upstream release: https://github.com/judge0/judge0/releases/tag/v1.13.1
License: Judge0 is GPL-3.0. It remains a separate service; retain upstream license notices and provide source for any distributed modifications. No Judge0 source modifications are made here.
Pricing: https://aws.amazon.com/lightsail/pricing/

Modern runtimes are pinned in runtime-lock.json. Download and verify both archives into /opt/deems-runtime-build, then use Dockerfile or install-runtimes.sh to produce deems-judge0:20261029. The script uses a clean, never-started container, so no credentials enter the image. Both methods retain the upstream runtime license files and update Judge0's startup language definitions. The guest compose project must select the custom image. Node.js 24.22.2 and Python 3.12.16 are checked through the same remote execution path as user solutions.
