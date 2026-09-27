# Prismatene Docker — GitHub backed

Status: **CANDIDATE.** `authorityEffect: none.`
Not Immich. Not saelion.co. Not a merge from chat.

## Show now (no Docker)

https://cdn.jsdelivr.net/gh/stevoblevo/stevoblevo.github.io@prismatene-candidate/prismatene/index.html

## Push / pull

- Branch: `prismatene-candidate`
- Draft PR: https://github.com/stevoblevo/stevoblevo.github.io/pull/8
- After you merge: https://stevoblevo.github.io/prismatene/

## Publish on a box you own

```bash
git clone https://github.com/stevoblevo/stevoblevo.github.io.git
cd stevoblevo.github.io
git checkout prismatene-candidate
cd prismatene
docker compose up --build
```

Open http://127.0.0.1:4177/
Stop: `docker compose down`

Do not publish this container through a dead trycloudflare tunnel.
Do not treat compose-up as Skein accept.
