# Extra intermediate certificates

Public CA certificates for register hosts that leave an intermediate out of
their TLS chain. A fetcher adds the one it needs to Node's built-in roots for
that host only (`ca` option in `scripts/register-lib.js`). Certificate
verification is never turned off.

| File | Used by | Why | Checked |
| --- | --- | --- | --- |
| `digicert-global-g2-tls-rsa-sha256-2020-ca1.pem` | `fetch-zamra.js` | `app.zamra.co.zm:42882` sends its leaf certificate without this intermediate. Downloaded from DigiCert's own AIA URL `http://cacerts.digicert.com/DigiCertGlobalG2TLSRSASHA2562020CA1-1.crt`. Issued by DigiCert Global Root G2 (in Node's root store). SHA-256 `C8:02:5F:9F:C6:5F:DF:C9:5B:3C:A8:CC:78:67:B9:A5:87:B5:27:79:73:95:79:17:46:3F:C8:13:D0:B6:25:A9`. Valid to 29 Mar 2031. | 1 Oct 2026 |

Replace a file before it expires, from the same AIA URL, and record the new
fingerprint here.
