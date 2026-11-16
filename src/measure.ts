import { get, type DownloadProgress } from './get.js';

// Одна запись в таблице соответствует одному полностью скачанному ответу.
type RequestRecord = {
  id: number;
  method: 'GET';
  url: string;
  durationMs: number;
  bytes: number;
};

const REQUEST_COUNT = 10;
const PROGRESS_INTERVAL_MS = 250;

function formatProgress({ bytes, totalBytes }: DownloadProgress): string {
  // Процент можно рассчитать, если сервер сообщил ненулевой размер ответа.
  if (totalBytes === null || totalBytes === 0) return `${bytes} байт`;

  const percent = ((bytes / totalBytes) * 100).toFixed(1);
  return `${bytes} / ${totalBytes} байт (${percent}%)`;
}

export async function measure(url: string) {
  // Массив создаётся заново для каждого запуска замера.
  const requests: RequestRecord[] = [];

  for (let id = 1; id <= REQUEST_COUNT; id++) {
    const label = `Запрос ${id}/${REQUEST_COUNT}`;
    console.log(`${label}: GET ${url}`);

    // Монотонный таймер считает длительность от начала GET до конца чтения тела.
    const startedAt = performance.now();
    let nextProgressAt = startedAt;

    // await внутри цикла заставляет следующий запрос дождаться текущего.
    const download = await get(url, (progress) => {
      const now = performance.now();
      if (now < nextProgressAt || progress.bytes === progress.totalBytes) return;

      // Ограничиваем частоту вывода, чтобы не печатать строку на каждый блок данных.
      console.log(`  ${label}: ${formatProgress(progress)}`);
      nextProgressAt = now + PROGRESS_INTERVAL_MS;
    }).catch((cause: unknown) => {
      // Номер и адрес показывают, на каком запросе остановился замер.
      throw new Error(`${label} не завершён: ${url}`, { cause });
    });

    const durationMs = performance.now() - startedAt;
    requests.push({ id, method: 'GET', url, durationMs, bytes: download.bytes });
    // Последний результат выводим всегда, даже если загрузка была очень быстрой.
    console.log(`  ${label}: готово, ${formatProgress(download)} за ${durationMs.toFixed(2)} мс`);
  }

  // Сводку считаем из тех же записей, которые будут показаны в таблице.
  const totalBytes = requests.reduce((sum, request) => sum + request.bytes, 0);
  const totalMs = requests.reduce((sum, request) => sum + request.durationMs, 0);

  return {
    requests,
    summary: {
      totalBytes,
      averageDurationMs: totalMs / requests.length,
      // Переводим байты в биты, миллисекунды в секунды, биты/с в Мбит/с.
      speedMbps: (totalBytes * 8) / (totalMs / 1000) / 1_000_000,
    },
  };
}
