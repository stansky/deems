#!/usr/bin/env python3
"""Run local services, register the local name, and preserve personal data."""

import argparse
import datetime
import json
import os
from pathlib import Path
import plistlib
import re
import shlex
import shutil
import socket
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / "private"
BACKUPS = ROOT / "backups"
LABEL = "local.deems.dns"
PLIST = Path.home() / "Library/LaunchAgents" / f"{LABEL}.plist"
IPV4_LABEL = "local.deems.dns.ipv4"
IPV4_PLIST = PLIST.with_name(f"{IPV4_LABEL}.plist")
IPV4_ADDRESS = "127.101.13.236"
DOMAIN = f"gui/{os.getuid()}"


def run(args, timeout=60, **kwargs):
    return subprocess.run(args, cwd=ROOT, timeout=timeout, check=True, **kwargs)


def compose(*args, timeout=60, **kwargs):
    return run(["docker", "compose", *args], timeout=timeout, **kwargs)


def running_writers():
    result = compose("ps", "--status", "running", "--services", capture_output=True, text=True)
    return [name for name in ("research", "app") if name in result.stdout.splitlines()]


def local_key(name):
    value = os.environ.get(name, "")
    if value:
        return value.strip()
    config = Path.home() / ".localrc"
    if not config.is_file():
        return ""
    assignment = re.compile(r"^\s*(?:export\s+)?" + re.escape(name) + r"\s*=")
    for line in config.read_text().splitlines():
        if not assignment.match(line):
            continue
        literal = assignment.sub("", line, count=1).strip()
        # Parse the one requested assignment without executing shell code.
        if any(marker in literal for marker in ("$", "`", ";", "\\")):
            raise RuntimeError(f"{name} must be a literal key assignment; shell expressions are not evaluated.")
        try:
            tokens = shlex.split(literal, comments=True, posix=True)
        except ValueError as error:
            raise RuntimeError(f"Could not parse the literal {name} assignment.") from error
        if len(tokens) > 1:
            raise RuntimeError(f"{name} must contain one literal value.")
        value = tokens[0] if tokens else ""
    return value.strip()


def prepare_secrets():
    runtime = PRIVATE / "runtime"
    runtime.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(runtime, 0o700)
    values = {
        "openai-key": local_key("DEEMS_OPENAI_KEY") or local_key("INTERVIEW_LOCAL_OPENAI_KEY"),
        "typesafe-key": local_key("DEEMS_TYPESAFE_KEY") or local_key("INTERVIEW_LOCAL_TYPESAFE_KEY") or local_key("TYPESAFE_API_KEY") or local_key("PROVIDENCE_JEV_KEY"),
    }
    for filename, value in values.items():
        if any(character.isspace() for character in value) or len(value) > 16384:
            raise RuntimeError(f"Invalid literal credential format for {filename}.")
        destination = runtime / filename
        if destination.is_symlink():
            raise RuntimeError(f"Refusing to replace a symlink at private/runtime/{filename}.")
        descriptor, temporary = tempfile.mkstemp(prefix=".credential-", dir=runtime)
        try:
            with os.fdopen(descriptor, "w") as output:
                output.write(value)
            os.chmod(temporary, 0o600)
            os.replace(temporary, destination)
        finally:
            Path(temporary).unlink(missing_ok=True)
    print("Runtime credential files prepared. OpenAI: " + ("configured" if values["openai-key"] else "not configured") + "; Jev: " + ("configured" if values["typesafe-key"] else "not configured") + ".")


def domain_install():
    if sys.platform != "darwin":
        raise RuntimeError("Domain registration uses macOS Bonjour.")
    with socket.socket() as probe:
        try:
            probe.bind((IPV4_ADDRESS, 0))
        except OSError as error:
            raise RuntimeError(f"This Mac's existing loopback alias {IPV4_ADDRESS} is absent. No network settings were changed. The IPv6 fallback is http://[::1].") from error
    document = {
        "Label": LABEL,
        "ProgramArguments": ["/usr/bin/dns-sd", "-lo", "-P", "Deems", "_http._tcp", "local", "80", "deems.local", "::1"],
        "RunAtLoad": True,
        "KeepAlive": True,
        "ThrottleInterval": 10,
    }
    if PLIST.exists() and plistlib.loads(PLIST.read_bytes()) != document:
        previous = plistlib.loads(PLIST.read_bytes())
        old_document = {**document, "ProgramArguments": [*document["ProgramArguments"][:-1], "127.0.0.1"]}
        if previous != old_document:
            raise RuntimeError(f"Existing {PLIST} differs. It was preserved.")
        loaded = subprocess.run(["launchctl", "print", f"{DOMAIN}/{LABEL}"], capture_output=True, timeout=10)
        if loaded.returncode == 0:
            run(["launchctl", "bootout", f"{DOMAIN}/{LABEL}"], timeout=10)
    PLIST.parent.mkdir(parents=True, exist_ok=True)
    PLIST.write_bytes(plistlib.dumps(document))
    os.chmod(PLIST, 0o600)
    loaded = subprocess.run(["launchctl", "print", f"{DOMAIN}/{LABEL}"], capture_output=True, timeout=10)
    if loaded.returncode != 0:
        run(["launchctl", "bootstrap", DOMAIN, str(PLIST)], timeout=10)
    run(["launchctl", "kickstart", f"{DOMAIN}/{LABEL}"], timeout=10)
    ipv4_document = {
        **document,
        "Label": IPV4_LABEL,
        "ProgramArguments": ["/usr/bin/dns-sd", "-lo", "-P", "Deems IPv4", "_http._tcp", "local", "80", "deems.local", IPV4_ADDRESS],
    }
    if IPV4_PLIST.exists() and plistlib.loads(IPV4_PLIST.read_bytes()) != ipv4_document:
        raise RuntimeError(f"Existing {IPV4_PLIST} differs. It was preserved.")
    IPV4_PLIST.write_bytes(plistlib.dumps(ipv4_document))
    os.chmod(IPV4_PLIST, 0o600)
    loaded = subprocess.run(["launchctl", "print", f"{DOMAIN}/{IPV4_LABEL}"], capture_output=True, timeout=10)
    if loaded.returncode != 0:
        run(["launchctl", "bootstrap", DOMAIN, str(IPV4_PLIST)], timeout=10)
    run(["launchctl", "kickstart", f"{DOMAIN}/{IPV4_LABEL}"], timeout=10)
    # Bonjour's own deadline allows one bounded lookup without a polling loop.
    run(["dns-sd", "-t", "3", "-G", "v4v6", "deems.local"], timeout=5, stdout=subprocess.DEVNULL)
    resolved = {entry[4][0] for entry in socket.getaddrinfo("deems.local", 80)}
    if resolved != {"::1", IPV4_ADDRESS}:
        raise RuntimeError(f"Unexpected address for deems.local: {resolved}")
    print(f"deems.local resolves to ::1 and {IPV4_ADDRESS}. Local-only user services installed.")


def domain_remove():
    for path, label in [(PLIST, LABEL), (IPV4_PLIST, IPV4_LABEL)]:
        if not path.exists():
            continue
        document = plistlib.loads(path.read_bytes())
        if document.get("Label") != label or document.get("ProgramArguments", [None])[0] != "/usr/bin/dns-sd":
            raise RuntimeError("Unexpected service file preserved.")
        loaded = subprocess.run(["launchctl", "print", f"{DOMAIN}/{label}"], capture_output=True, timeout=10)
        if loaded.returncode == 0:
            run(["launchctl", "bootout", f"{DOMAIN}/{label}"], timeout=10)
        path.unlink()
    print("Removed Deems domain services. Hosts file unchanged.")


def up():
    prepare_secrets()
    own_proxy = compose("ps", "--status", "running", "--services", capture_output=True, text=True)
    if "proxy" not in own_proxy.stdout.splitlines():
        # Connecting detects listeners without requiring permission to bind port 80.
        for family, address in [(socket.AF_INET6, "::1"), (socket.AF_INET, IPV4_ADDRESS)]:
            with socket.socket(family) as probe:
                probe.settimeout(2)
                if probe.connect_ex((address, 80)) == 0:
                    raise RuntimeError(f"Loopback port {address}:80 is occupied. Existing listener was preserved.")
    PRIVATE.mkdir(exist_ok=True)
    domain_install()
    compose("up", "-d", "--build", "--wait", "--wait-timeout", "180", timeout=900)
    # Secret files are replaced atomically. Recreate the app to mount the new files.
    compose("up", "-d", "--no-deps", "--force-recreate", "app", "--wait", "--wait-timeout", "90", timeout=120)
    print("Open http://deems.local")


def snapshot():
    BACKUPS.mkdir(mode=0o700, exist_ok=True)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    destination = BACKUPS / stamp
    destination.mkdir(mode=0o700)
    with (destination / "database.dump").open("wb") as output:
        compose("exec", "-T", "db", "pg_dump", "-U", "interview", "-d", "interview", "-Fc", timeout=180, stdout=output)
    PRIVATE.mkdir(exist_ok=True)
    with tarfile.open(destination / "private.tar.gz", "w:gz") as archive:
        archive.add(PRIVATE, arcname="private", filter=lambda member: None if member.name == "private/runtime" or member.name.startswith("private/runtime/") else member)
    (destination / "manifest.json").write_text(json.dumps({"format": 1, "created_at": stamp, "database": "interview", "private_data": "private.tar.gz"}, indent=2) + "\n")
    print(f"Backup saved: {destination}")
    return destination


def backup():
    was_running = running_writers()
    if was_running:
        compose("stop", *was_running)
    try:
        snapshot()
    finally:
        if was_running:
            compose("start", *reversed(was_running))


def restore(source, replace):
    if not replace:
        raise RuntimeError("Restore replaces saved data. Run with --replace to request it. A safety backup is always created first.")
    source = Path(source).resolve()
    manifest = json.loads((source / "manifest.json").read_text())
    if manifest.get("format") != 1 or not (source / "database.dump").is_file():
        raise RuntimeError("Invalid backup.")
    # Extract before changing live data. Refuse paths or links outside the backup root.
    BACKUPS.mkdir(mode=0o700, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="interview-restore-", dir=BACKUPS) as staging:
        with tarfile.open(source / "private.tar.gz", "r:gz") as archive:
            for member in archive.getmembers():
                path = Path(member.name)
                if path.is_absolute() or ".." in path.parts or not path.parts or path.parts[0] != "private" or not (member.isfile() or member.isdir()):
                    raise RuntimeError("Backup contains an unsafe path or unsupported file type.")
            members = [member for member in archive.getmembers() if member.name != "private/runtime" and not member.name.startswith("private/runtime/")]
            archive.extractall(staging, members=members, filter="data")
        staged_private = Path(staging) / "private"
        if not staged_private.is_dir():
            raise RuntimeError("Backup has no private data directory.")
        was_running = running_writers()
        if was_running:
            compose("stop", *was_running)
        try:
            safety = snapshot()
            with (source / "database.dump").open("rb") as input_file:
                compose("exec", "-T", "db", "pg_restore", "-U", "interview", "-d", "interview", "--clean", "--if-exists", "--single-transaction", "--no-owner", timeout=180, stdin=input_file)
            preserved = safety / "previous-private"
            PRIVATE.rename(preserved)
            try:
                shutil.copytree(staged_private, PRIVATE)
                if (preserved / "runtime").exists():
                    (preserved / "runtime").rename(PRIVATE / "runtime")
            except Exception:
                if PRIVATE.exists():
                    shutil.rmtree(PRIVATE)
                preserved.rename(PRIVATE)
                with (safety / "database.dump").open("rb") as input_file:
                    compose("exec", "-T", "db", "pg_restore", "-U", "interview", "-d", "interview", "--clean", "--if-exists", "--single-transaction", "--no-owner", timeout=180, stdin=input_file)
                raise
            print(f"Restored {source}. Previous data preserved in {safety}.")
        finally:
            if was_running:
                # Recreate so Docker mounts the replaced directory.
                compose("up", "-d", "--no-deps", "--force-recreate", *reversed(was_running), timeout=120)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["up", "domain-install", "domain-remove", "secrets", "backup", "restore"])
    parser.add_argument("source", nargs="?")
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args()
    if args.command == "restore":
        if not args.source:
            parser.error("restore requires a backup directory")
        restore(args.source, args.replace)
    else:
        {"up": up, "domain-install": domain_install, "domain-remove": domain_remove, "secrets": prepare_secrets, "backup": backup}[args.command]()


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, subprocess.SubprocessError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)
