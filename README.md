# World news poster — Sunday 22 November 2026

[![make.fun · news-image-20261122](https://make.fun/badge/news-image-20261122.svg)](https://make.fun/bounty/news-image-20261122)
[![rank](https://make.fun/badge/news-image-20261122/toannhu96/makefun-news-image-20261122/rank.svg)](https://make.fun/bounty/news-image-20261122)
[![reward](https://make.fun/badge/news-image-20261122/toannhu96/makefun-news-image-20261122/reward.svg)](https://make.fun/bounty/news-image-20261122)

A 1024×1024 poster summarising the world news of Sunday 22 November 2026, submitted to the
[make.fun news-image-20261122 bounty](https://make.fun/bounty/news-image-20261122).

## What it does

The poster is stored in the repository as `entry.png`. `main.ts` copies `entry.png` from the
script's own directory into the directory named by `$MAKEFUN_OUTPUT_DIR`. It creates that
directory if needed, never modifies the source, and prints the number of bytes copied.

## Checks

Before writing, the source must:

- not be empty (0 bytes);
- be at most 1 MiB (1,048,576 bytes), checked with `stat()` before reading and again on the bytes read;
- start with the 8-byte PNG signature `89 50 4E 47 0D 0A 1A 0A`.

After writing, the output is read back and must pass the same checks and be byte-identical to
the validated source bytes. If the read-back or any check fails, the bad output file is removed
and the program exits with code 1. Errors are printed to stderr with an `error:` prefix.

## Running

Requires Node 22 or later. There are no npm dependencies.

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out node --experimental-strip-types main.ts
```

Exit code 0 means success; 1 means `MAKEFUN_OUTPUT_DIR` is unset, a check failed, or an I/O
error occurred.

## Image limits

- 1024×1024 pixels
- at most 1 MiB
- one complete PNG file

## Network and determinism

The program uses only built-in `node:` modules and makes no network requests. Given the same
`entry.png`, it always writes the same bytes.

## License

Released under the MIT License. Source: https://github.com/toannhu96/makefun-news-image-20261122
