#!/usr/bin/env python3
"""AND SO relay: carries signed leaderboard messages from a Reticulum network (LoRa, packet radio, or anything else
Reticulum runs on) to the AND SO board on the internet, and carries the board's answer back.

A player with no internet opens the board in AND SO, picks "carry it by radio" and copies the signed score, then sends
that text as an LXMF message (from Sideband, MeshChat, NomadNet, or any LXMF app) to this relay's address. The node
running the relay needs the internet only some of the time: while it has none, it keeps what arrives on disk and
sends it later, because a signed score stays good for 30 days. Nothing here is trusted. The board checks every
signature itself, so a relay can carry a score but can't change it.

    pip install rns lxmf
    python3 _tools/andso-rns-sidecar.py                 # your usual Reticulum config (~/.reticulum)
    python3 _tools/andso-rns-sidecar.py --config DIR --store DIR --board URL --announce 1800
    python3 _tools/andso-rns-sidecar.py --post '{"op":"score",...}'     # one body straight to the board, no radio

What it understands (the body of the LXMF message):
    {"op": "score", ...}             a signed score, as AND SO copies it      -> "kept: you're 3rd of 12", or why not
    {"op": "signin" | "leave", ...}  signed the same way                       -> the board's answer
    {"op": "board", "token": "..."}  the token a sign-in answers with          -> the top ten
    anything else                                                             -> a short note on how to use it

The protocol itself is in _src/and-so-board/README.md.
"""
import argparse, json, os, queue, threading, time, urllib.error, urllib.request
from pathlib import Path

BOARD = 'https://and-so-board.vercel.app/api/board'
OPS = {'score', 'signin', 'leave', 'board'}
MAX_TEXT = 4096
HELP = ('AND SO relay. Send a signed score exactly as AND SO copies it (the board, then "carry it by radio"), and '
        "I'll post it and tell you where you stand. Send {\"op\":\"board\",\"token\":\"...\"} for the top ten.")


def ordinal(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def post(board, body, timeout=20):
    """POST one body to the board. Returns (status, json); raises OSError when the board can't be reached."""
    req = urllib.request.Request(board, data=json.dumps(body).encode(), method='POST',
                                 headers={'content-type': 'text/plain', 'user-agent': 'andso-relay/1'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:   # the board answered, with a no
        try: return e.code, json.loads(e.read() or b'{}')
        except ValueError: return e.code, {}


def answer(op, status, j):
    """The board's answer as one short message for a small screen."""
    if status != 200:
        return f"the board said: {j.get('error', status)}."
    if op == 'score':
        return (f"signed and kept: you're {ordinal(j['rank'])} of {j['of']}." if j.get('kept')
                else f"signed. your best is still {j.get('best', 0):,}.")
    if op == 'signin':
        return f"signed in as {j['name']}. to see the board, send {{\"op\":\"board\",\"token\":\"{j['token']}\"}}"
    if op == 'leave':
        return "you're off the board: your name, your scores and your key."
    rows = [f"{r['rank']}. {r['name']}  {r['score']:,}" for r in j.get('top', [])[:10]]
    you = j.get('you')
    return '\n'.join(['the board, top ten:'] + rows + ([f"you: {ordinal(you['rank'])} of {j['count']}"] if you else []))


def parse(text):
    """A message body we can carry, or None."""
    if not text or len(text) > MAX_TEXT: return None
    try: body = json.loads(text.strip())
    except ValueError: return None
    return body if isinstance(body, dict) and body.get('op') in OPS else None


class Relay:
    def __init__(self, args):
        import RNS, LXMF   # imported here so --post works without them
        self.RNS, self.LXMF, self.args = RNS, LXMF, args
        self.store = Path(args.store).expanduser(); (self.store / 'queue').mkdir(parents=True, exist_ok=True)
        self.reticulum = RNS.Reticulum(args.config)
        idf = self.store / 'identity'
        self.identity = RNS.Identity.from_file(str(idf)) if idf.exists() else RNS.Identity()
        if not idf.exists(): self.identity.to_file(str(idf))
        self.router = LXMF.LXMRouter(identity=self.identity, storagepath=str(self.store / 'lxmf'))
        self.dest = self.router.register_delivery_identity(self.identity, display_name=args.name)
        self.router.register_delivery_callback(self.arrived)
        self.work, self.seen = queue.Queue(), {}
        (self.store / 'address').write_text(RNS.prettyhexrep(self.dest.hash).strip('<>') + '\n')
        print(f'AND SO relay at {RNS.prettyhexrep(self.dest.hash)}, posting to {args.board}', flush=True)

    # an LXMF message came in: hand it to the worker, so the radio stack never waits on the internet
    def arrived(self, message):
        src = message.source_hash
        now = time.time(); recent = [t for t in self.seen.get(src, []) if now - t < 60]
        if len(recent) >= 20: return   # a sender who talks too much is ignored for a minute
        if len(self.seen) > 1000: self.seen = {k: v for k, v in self.seen.items() if now - v[-1] < 60}
        self.seen[src] = recent + [now]
        try: text = message.content_as_string()
        except Exception: text = ''
        self.work.put((src, text))

    def reply(self, src, text, tries=12):
        RNS, LXMF = self.RNS, self.LXMF
        ident = RNS.Identity.recall(src)
        if ident is None:   # we haven't heard this sender announce yet: ask the network for them, and try again
            if tries <= 0: print(f'no way back to {RNS.prettyhexrep(src)}; answer dropped', flush=True); return
            RNS.Transport.request_path(src)
            threading.Timer(5, self.reply, (src, text, tries - 1)).start(); return
        out = RNS.Destination(ident, RNS.Destination.OUT, RNS.Destination.SINGLE, 'lxmf', 'delivery')
        self.router.handle_outbound(LXMF.LXMessage(out, self.dest, text, 'AND SO', desired_method=LXMF.LXMessage.OPPORTUNISTIC))

    def carry(self, src, text):
        body = parse(text)
        if body is None: self.reply(src, HELP); return
        try: status, j = post(self.args.board, body)
        except OSError:   # no internet here right now: keep it and say so
            name = f"{int(time.time() * 1000)}-{os.urandom(3).hex()}.json"
            (self.store / 'queue' / name).write_text(json.dumps({'src': src.hex(), 'body': body}))
            self.reply(src, "no internet at this relay right now. it's kept and goes out as soon as there is; "
                            "a signed score stays good for 30 days.")
            return
        print(f"{body['op']} from {self.RNS.prettyhexrep(src)}: {status}", flush=True)
        self.reply(src, answer(body['op'], status, j))

    def drain(self):   # what arrived while the internet was away
        for f in sorted((self.store / 'queue').glob('*.json')):
            item = json.loads(f.read_text())
            try: status, j = post(self.args.board, item['body'])
            except OSError: return
            if status == 429: return   # one score every 8 seconds: the next pass sends it
            f.unlink(); self.reply(bytes.fromhex(item['src']), '(sent later) ' + answer(item['body']['op'], status, j))

    def run(self):
        def worker():
            while True:
                src, text = self.work.get()
                try: self.carry(src, text)
                except Exception as e: print('could not carry a message:', e, flush=True)
        threading.Thread(target=worker, daemon=True).start()
        next_announce = next_drain = 0
        while True:
            now = time.time()
            if now >= next_announce: self.router.announce(self.dest.hash); next_announce = now + self.args.announce
            if now >= next_drain:
                try: self.drain()
                except Exception as e: print('could not send the queue:', e, flush=True)
                next_drain = now + 60
            time.sleep(1)


def main():
    ap = argparse.ArgumentParser(description='Carry signed AND SO scores between Reticulum and the board.')
    ap.add_argument('--config', help='Reticulum config directory (default: ~/.reticulum)')
    ap.add_argument('--store', default='~/.andso-relay', help="where the relay keeps its identity and anything waiting to go out")
    ap.add_argument('--board', default=BOARD, help='the board to post to')
    ap.add_argument('--announce', type=int, default=1800, help='seconds between announces (default 1800)')
    ap.add_argument('--name', default='AND SO relay', help='the name other LXMF apps show for this relay')
    ap.add_argument('--post', metavar='JSON', help='post one body to the board and print the answer, then stop')
    args = ap.parse_args()
    if args.post:
        body = parse(args.post)
        if body is None: raise SystemExit('that is not a body the board takes: ' + HELP)
        status, j = post(args.board, body); print(status, answer(body['op'], status, j)); return
    Relay(args).run()


if __name__ == '__main__':
    main()
