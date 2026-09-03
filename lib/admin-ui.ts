/**
 * Helpers the admin pages had each written their own copy of.
 */

/**
 * Case-insensitive substring test that tolerates a missing field.
 *
 * The list pages all filtered with a bare `row.user.name.toLowerCase()`, so one
 * record with a null name took the whole page down rather than failing to match.
 */
export const matches = (value: string | undefined | null, needle: string) =>
  (value ?? '').toLowerCase().includes(needle);

/**
 * Fetch a file and hand it to the browser as a download.
 *
 * Three pages had this anchor-click dance inline, and they had already drifted —
 * one revoked the object URL before removing the node it belonged to.
 */
export async function downloadFile(
  endpoint: string,
  filename: string,
  onError: (message: string) => void,
  onSuccess?: (message: string) => void
) {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('다운로드에 실패했습니다');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    onSuccess?.('다운로드를 시작했습니다');
  } catch (error: any) {
    onError(error.message || '다운로드에 실패했습니다');
  }
}

/**
 * Serialise rows as CSV.
 *
 * The flags page built its export with `row.join(',')`, so a single comma in a
 * flag or a team name silently shifted every column after it. RFC 4180: wrap in
 * quotes, and double any quote inside.
 */
export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');
}
