// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

const url = process.env.TEST_DATABASE_URL;
if (!url || !/^\/open_nook_test[A-Za-z0-9_]*$/.test(new URL(url).pathname)) {
  throw new Error("TEST_DATABASE_URL must point to an isolated open_nook_test* database.");
}
process.env.DATABASE_URL = url;
