import { SchedulePrefs, DailyPlan } from '../types';

export function downloadCalendarReminders(
  schedule: SchedulePrefs,
  plan?: DailyPlan | null,
  timeZone?: string
) {
  const times =
    schedule.breakWindows && schedule.breakWindows.length > 0
      ? schedule.breakWindows
      : ['10:30', '13:30', '16:00'];

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const tzHeader = timeZone ? [`X-WR-TIMEZONE:${timeZone}`] : [];

  const events = times.map((timeStr, idx) => {
    const [hourStr, minStr] = timeStr.split(':');
    const hr = String(parseInt(hourStr || '10', 10)).padStart(2, '0');
    const mn = String(parseInt(minStr || '0', 10)).padStart(2, '0');
    const endMnNum = (parseInt(minStr || '0', 10) + 5) % 60;
    const endHrNum =
      parseInt(hourStr || '10', 10) + (parseInt(minStr || '0', 10) + 5 >= 60 ? 1 : 0);
    const endHr = String(endHrNum).padStart(2, '0');
    const endMn = String(endMnNum).padStart(2, '0');

    const taskTitle = plan?.tasks[idx]?.title || '2-Minute Movement Reset';
    const taskSub =
      plan?.tasks[idx]?.subtitle || 'Stand up, unclench your shoulders, and breathe.';

    return [
      'BEGIN:VEVENT',
      `UID:unstill-reset-${idx + 1}-${yyyy}${mm}${dd}@unstill.app`,
      `DTSTAMP:${yyyy}${mm}${dd}T000000Z`,
      `DTSTART:${yyyy}${mm}${dd}T${hr}${mn}00`,
      `DTEND:${yyyy}${mm}${dd}T${endHr}${endMn}00`,
      'RRULE:FREQ=DAILY',
      `SUMMARY:UnStill · ${taskTitle}`,
      `DESCRIPTION:${taskSub} Open UnStill for your guided timer.`,
      'BEGIN:VALARM',
      'TRIGGER:-PT0M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Time for a gentle 2-minute movement reset',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UnStill//Everyday Movement//EN',
    'CALSCALE:GREGORIAN',
    ...tzHeader,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'unstill-reminders.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
