#!/usr/bin/env python3
"""One owner-requested public read test. No credentials, redirects or host operations.

A report is an observation, not tunnel health, admission, publication or authorization.
Fixed public targets only. Connect to the validated public IP, retaining TLS/SNI checks.
The Grok JPEG is preserved unchanged only on a bounded, successful image response.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import http.client
import ipaddress
import json
from pathlib import Path
import socket
import ssl
from urllib.parse import urlsplit

SOURCE = 'https://assets.grok.com/users/d04206d6-ae5b-4e6e-8788-54c1ae6a26c1/generated/5667a2b5-7cff-49bd-8abf-0aae862df1e5/image.jpg'
TARGETS = ('https://relay.saelion.co/', 'https://saelion.co/', SOURCE)
LIMIT = 8 * 1024 * 1024

class PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, host, address):
        super().__init__(host, timeout=15, context=ssl.create_default_context())
        self.address = address
    def connect(self):
        raw = socket.create_connection((self.address, 443), timeout=self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except BaseException:
            raw.close()
            raise

def probe(url, output, image=False):
    row = {'url': url, 'observed_at': datetime.now(timezone.utc).isoformat(),
           'state': 'unknown', 'http_status': None, 'sha256': None}
    conn = None
    try:
        parts = urlsplit(url)
        if url not in TARGETS or parts.scheme != 'https':
            raise ValueError('target not in owner-requested fixed allowlist')
        addresses = sorted({x[4][0] for x in socket.getaddrinfo(parts.hostname, 443, type=socket.SOCK_STREAM)})
        if not addresses or any(not ipaddress.ip_address(x).is_global for x in addresses):
            raise ValueError('empty or non-public DNS result')
        row['public_addresses'] = addresses
        address = next((x for x in addresses if ':' not in x), addresses[0])
        conn = PinnedHTTPS(parts.hostname, address)
        conn.request('GET', parts.path or '/', headers={
            'Accept': 'image/jpeg' if image else 'text/html,application/json',
            'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache',
            'User-Agent': 'Saelion-Art-Arrival-ReadTest/1.0'})
        res = conn.getresponse()
        row['http_status'] = res.status
        row['content_type'] = res.getheader('Content-Type', '').split(';')[0].lower()
        row['redirect_seen'] = 300 <= res.status < 400
        if res.status != 200:
            raise ValueError('HTTP ' + str(res.status) + '; redirects are not followed')
        cap = LIMIT if image else 16384
        body = res.read(cap + 1)
        if image:
            if not body or len(body) > LIMIT or row['content_type'] != 'image/jpeg' or not body.startswith(b'\xff\xd8\xff'):
                raise ValueError('not an admitted bounded JPEG')
            row.update(state='bytes_captured', bytes=len(body), sha256=hashlib.sha256(body).hexdigest(), file='source.jpg')
            (output / 'source.jpg').write_bytes(body)
        else:
            row.update(state='http_200_observed', body_sample_bytes=min(len(body), cap))
        # No response text is executed, no cookies or authorization are sent or saved.
    except Exception as exc:
        row.update(state='blocked', error_type=type(exc).__name__, error=str(exc)[:400])
    finally:
        if conn:
            conn.close()
    return row

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=False)
    rows = [probe(u, args.out, image=(u == SOURCE)) for u in TARGETS]
    report = {'schema': 'sae-art-arrival-read-test-v1', 'observations': rows,
              'authenticated_tunnel_tested': False, 'authority_created': False,
              'custody_publication_created': False, 'native_protocol_installed': False}
    text = json.dumps(report, indent=2) + '\n'
    (args.out / 'probe.json').write_text(text, encoding='utf-8')
    print(text)
    # Successful diagnostic recording is not a claim that a target is reachable.
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
