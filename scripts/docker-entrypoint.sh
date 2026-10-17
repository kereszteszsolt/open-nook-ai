#!/bin/sh
# SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
# SPDX-License-Identifier: Apache-2.0

set -eu

node scripts/validate-env.ts
./node_modules/.bin/prisma migrate deploy
exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port 3000
