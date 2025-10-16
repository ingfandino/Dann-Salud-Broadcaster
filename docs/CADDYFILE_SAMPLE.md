https://192.168.1.49 {
  tls internal
  encode gzip
  reverse_proxy 127.0.0.1:5000 {
    header_up X-Forwarded-Proto https
    header_up X-Forwarded-Host {host}
  }
}

# Pasos:
# 1) Guarda este contenido como C:\caddy\Caddyfile (ajusta la IP si cambia)
# 2) Arranca el backend (puerto 5000)
# 3) Ejecuta: C:\caddy\caddy.exe run --config C:\caddy\Caddyfile --adapter caddyfile
# 4) Confia la CA interna (root.crt) en los equipos clientes

# Variante dentro del repositorio (cappy/Caddyfile)
# Puedes usar este mismo bloque guardándolo en `cappy/Caddyfile` dentro del repo
# y arrancar Caddy con:
#   C:\caddy\caddy.exe run --config "C:\Users\Daniel\Downloads\Dann+Salud Online (DEV)\cappy\Caddyfile" --adapter caddyfile
# Contenido sugerido:
https://192.168.1.49 {
  tls internal
  encode gzip
  reverse_proxy 127.0.0.1:5000 {
    header_up X-Forwarded-Proto https
    header_up X-Forwarded-Host {host}
  }
}

