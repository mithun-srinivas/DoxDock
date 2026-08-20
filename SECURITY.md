# Security Policy

DoxDock is built around a simple promise: your files never leave your device.
The app runs 100% in your browser, enforced by a strict Content Security Policy
(`connect-src 'self'`) so there are no uploads, no servers, and no third-party
network calls. Keeping that guarantee intact is our top security priority.

## Supported versions

DoxDock is a continuously deployed web app and Chrome extension. Security fixes
are always applied to the latest release, which is the only supported version.

| Version | Supported |
| ------- | --------- |
| Latest release | Yes |
| Older releases | No |

## Reporting a vulnerability

Please report security issues privately. Do not open a public issue for a
vulnerability.

You can report in either of these ways:

1. **GitHub private advisory (preferred):** open a report at
   https://github.com/mithun-srinivas/DoxDock/security/advisories/new
2. **Email:** send details to **mithunsrinivasappa@gmail.com**.

Please include:

- A description of the issue and its impact.
- Steps to reproduce, or a proof of concept.
- The affected version, browser, and platform if relevant.

## What to expect

- We aim to acknowledge your report within 3 days.
- We will keep you updated as we investigate and work on a fix.
- Once a fix is released, we are happy to credit you in the release notes unless
  you prefer to stay anonymous.

## Scope

Things we especially care about:

- Anything that could cause a user's file or data to leave their device.
- Ways to bypass the Content Security Policy or make an unexpected network
  request.
- Cross-site scripting or code injection in any tool.

Thanks for helping keep DoxDock safe and private for everyone.
