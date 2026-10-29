import { Unzip, UnzipInflate } from 'fflate';

export interface LogEntry {
  id: string;
  date: string;
  kind: string;
  refId: string;
  title: string;
  durationSec: number;
  createdAt: string;
}

export interface AppleHealthImportResult {
  dailySteps: Record<string, number>;
  workouts: LogEntry[];
  daysImported: number;
}

export async function parseAppleHealthFile(
  file: File,
  onProgress: (percent: number) => void
): Promise<AppleHealthImportResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  const dailySteps: Record<string, number> = {};
  const workouts: LogEntry[] = [];
  let leftover = '';

  const processXmlChunk = (chunkText: string) => {
    const combined = leftover + chunkText;
    const lines = combined.split('\n');
    leftover = lines.pop() || '';

    for (const line of lines) {
      if (line.includes('HKQuantityTypeIdentifierStepCount')) {
        const startMatch = line.match(/startDate="(\d{4}-\d{2}-\d{2})/);
        const valMatch = line.match(/value="(\d+(?:\.\d+)?)"/);
        if (startMatch && valMatch) {
          const date = startMatch[1];
          const val = Math.round(parseFloat(valMatch[1]));
          if (date >= cutoffStr && val > 0) {
            dailySteps[date] = (dailySteps[date] || 0) + val;
          }
        }
      } else if (line.includes('<Workout ') && line.includes('workoutActivityType=')) {
        const startMatch = line.match(/startDate="(\d{4}-\d{2}-\d{2})/);
        const durMatch = line.match(/duration="(\d+(?:\.\d+)?)"/);
        const typeMatch = line.match(/workoutActivityType="([^"]+)"/);
        if (startMatch) {
          const date = startMatch[1];
          if (date >= cutoffStr) {
            const durationMin = durMatch ? Math.max(1, Math.round(parseFloat(durMatch[1]))) : 20;
            const rawType = typeMatch
              ? typeMatch[1].replace('HKWorkoutActivityType', '')
              : 'Walk';
            workouts.push({
              id: `ah-${date}-${ workouts.length + 1}`,
              date,
              kind: 'manual',
              refId: 'apple-health',
              title: `Apple Health ${rawType}`,
              durationSec: durationMin * 60,
              createdAt: `${date}T12:00:00.000Z`,
            });
          }
        }
      }
    }
  };

  const decoder = new TextDecoder('utf-8');
  const totalSize = Math.max(1, file.size);
  let bytesRead = 0;

  if (file.name.endsWith('.zip')) {
    await new Promise<void>((resolve, reject) => {
      const unzipper = new Unzip((stream) => {
        if (stream.name.endsWith('export.xml') || stream.name.endsWith('.xml')) {
          stream.ondata = (err, data, final) => {
            if (err) {
              reject(err);
              return;
            }
            if (data) {
              processXmlChunk(decoder.decode(data, { stream: !final }));
            }
            if (final) {
              processXmlChunk('\n');
              resolve();
            }
          };
          stream.start();
        }
      });
      unzipper.register(UnzipInflate);

      const reader = file.stream().getReader();
      const pump = (): void => {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              unzipper.push(new Uint8Array(0), true);
              resolve();
              return;
            }
            if (value) {
              bytesRead += value.byteLength;
              onProgress(Math.min(99, Math.round((bytesRead / totalSize) * 100)));
              unzipper.push(value, false);
            }
            pump();
          })
          .catch(reject);
      };
      pump();
    });
  } else {
    const reader = file.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        bytesRead += value.byteLength;
        onProgress(Math.min(99, Math.round((bytesRead / totalSize) * 100)));
        processXmlChunk(decoder.decode(value, { stream: true }));
      }
    }
    processXmlChunk('\n');
  }

  onProgress(100);
  return {
    dailySteps,
    workouts: workouts.slice(0, 60),
    daysImported: Object.keys(dailySteps).length,
  };
}
