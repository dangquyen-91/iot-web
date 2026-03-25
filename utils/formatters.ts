// Format time to HH:MM:SS
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Format date to "Thứ X, DD/MM/YYYY"
export function formatDate(date: Date): string {
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const day = days[date.getDay()];
  return `${day}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

// Format timestamp to locale string
export function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('vi-VN');
}
