// bytes — уже прочитанные байты, totalBytes — размер ответа, если он известен.
export type DownloadProgress = {
  bytes: number;
  totalBytes: number | null;
};

export async function get(
  url: string,
  onProgress?: (progress: DownloadProgress) => void,
) {
  // Просим сервер прислать файл без дополнительного HTTP-сжатия.
  // Тайм-аут действует на весь запрос, включая чтение тела ответа.
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept-Encoding': 'identity' },
    signal: AbortSignal.timeout(30_000),
  });

  // Ошибку HTTP передаём вызывающему коду вместе со статусом.
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  // Если размер неизвестен или fetch распаковывает ответ, показываем только байты.
  // В случае сжатия Content-Length относится к сжатому телу, а поток — к распакованному.
  const lengthHeader = response.headers.get('content-length');
  const encoding = response.headers.get('content-encoding');
  const contentType = response.headers.get('content-type');
  const length = lengthHeader === null ? NaN : Number(lengthHeader);
  const totalBytes =
    (encoding === null || encoding.toLowerCase() === 'identity') &&
    Number.isSafeInteger(length) && length >= 0
      ? length
      : null;

  // У некоторых успешных ответов, например HTTP 204, тела нет.
  if (!response.body) return { bytes: 0, totalBytes, contentType };

  // Читаем ответ порциями и сразу считаем байты, чтобы не хранить файл целиком.
  const reader = response.body.getReader();
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytes += value.byteLength;
      onProgress?.({ bytes, totalBytes });
    }
  } finally {
    // Освобождаем поток и при нормальном завершении, и при ошибке чтения.
    reader.releaseLock();
  }

  return { bytes, totalBytes, contentType };
}
