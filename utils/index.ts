export function getCurrentDetailedTime(): string {
  const now = new Date();
  const formattedTime = now.toLocaleString('en-US', { hour12: false });
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');

  return `${formattedTime}.${milliseconds}`;
}
