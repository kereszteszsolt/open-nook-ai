// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

export const latexAnswer = String.raw`**The linear system**

\[
\begin{cases}
a x+2y+z = 4\\[2pt]
a x+4y+z = 6\\[2pt]
x-y+ a z = 1
\end{cases}
\qquad\qquad (1)
\]

has the coefficient matrix

\[
A(a)=\begin{pmatrix}
a&2&1\\[2pt]
a&4&1\\[2pt]
1&-1&a
\end{pmatrix},
\qquad
\mathbf b=\begin{pmatrix}4\\6\\1\end{pmatrix}.
\]

### 1. Determinant of the coefficient matrix

\[
\begin{aligned}
\det A(a) &= a\det\begin{pmatrix}4&1\\-1&a\end{pmatrix}
-2\det\begin{pmatrix}a&1\\1&a\end{pmatrix}
+1\det\begin{pmatrix}a&4\\1&-1\end{pmatrix}\\[4pt]
&=2\,(a^{2}-1)=2\,(a-1)(a+1).
\end{aligned}
\]

Hence

- \(\det A(a)\neq0\) for \(a\neq\pm1\) (the matrix is invertible).
- \(\det A(a)=0\) for \(a=1\) or \(a=-1\).`;
