// В импорте указан .js, чтобы Node.js нашёл модуль после компиляции TypeScript.
import { measure } from './measure.js';

const DEFAULT_URL = 'https://httpbin.org/image/jpeg';

try {
  // URL передаётся первым аргументом. Без аргумента используем тестовую картинку.
  const url = new URL(process.argv[2] ?? DEFAULT_URL);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Укажи адрес с протоколом http:// или https://.');
  }

  const { requests, summary } = await measure(url.href);

  // Для вывода округляем время до двух знаков. Расчёты используют полную точность.
  console.table(requests.map(({ id, method, url, durationMs, bytes }) => ({
    ID: id,
    Метод: method,
    URL: url,
    'Время, мс': Number(durationMs.toFixed(2)),
    'Объём, байт': bytes,
  })));

  console.log(`Завершено запросов: ${requests.length}`);
  console.log(`Среднее время запроса: ${summary.averageDurationMs.toFixed(2)} мс`);
  console.log(`Общий объём: ${summary.totalBytes} байт`);
  console.log(`Скорость скачивания: ${summary.speedMbps.toFixed(2)} Мбит/с`);
} catch (error) {
  // При ошибке показываем причину и сообщаем оболочке, что замер не завершён.
  console.error(error);
  process.exitCode = 1;
}
