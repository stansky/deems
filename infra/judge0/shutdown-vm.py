import socket,json
s=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
s.settimeout(25)
try:
 s.connect('/srv/deems-runner-vm/qmp.sock');f=s.makefile('rwb',buffering=0);f.readline()
 for command in ['qmp_capabilities','system_powerdown']:
  f.write((json.dumps({'execute':command})+'\n').encode())
  while True:
   message=json.loads(f.readline())
   if 'return' in message:break
 while True:
  line=f.readline()
  if not line or json.loads(line).get('event')=='SHUTDOWN':break
except (OSError,ValueError):pass
finally:s.close()
