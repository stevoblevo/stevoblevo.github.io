# Prismatene candidate static door
# authorityEffect: none. Not Immich. Not saelion.co.
FROM nginx:1.27-alpine
COPY index.html /usr/share/nginx/html/index.html
COPY README.md /usr/share/nginx/html/README.md
EXPOSE 80
HEALTHCHECK CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
