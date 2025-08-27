export const format = (date: Date, formatString: string): string => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  if (formatString === 'dd.MM.yyyy HH:mm') {
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }
  return `${year}-${month}-${day}`;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
};

export const isThisWeek = (date: Date): boolean => {
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 7));
  const d = new Date(date);
  return d >= weekStart && d < weekEnd;
};

export const isThisMonth = (date: Date): boolean => {
  const now = new Date();
  const d = new Date(date);
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};
