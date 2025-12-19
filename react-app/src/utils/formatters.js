import { format, parseISO, formatDistanceToNow, isToday, isTomorrow, isYesterday, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDate(date, formatStr = 'd MMM yyyy') {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: es });
  } catch {
    return date;
  }
}

export function formatDateTime(date) {
  return formatDate(date, "d MMM yyyy 'a las' HH:mm");
}

export function formatTime(time) {
  if (!time) return '';
  if (typeof time === 'string' && time.includes(':')) {
    return time.slice(0, 5);
  }
  return time;
}

export function formatRelativeDate(date) {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (isToday(dateObj)) return 'Hoy';
    if (isTomorrow(dateObj)) return 'Manana';
    if (isYesterday(dateObj)) return 'Ayer';
    
    const days = differenceInDays(dateObj, new Date());
    if (days > 0 && days <= 7) return `En ${days} dias`;
    if (days < 0 && days >= -7) return `Hace ${Math.abs(days)} dias`;
    
    return formatDate(dateObj);
  } catch {
    return date;
  }
}

export function formatTimeAgo(date) {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: es });
  } catch {
    return date;
  }
}

export function parseDateSafe(dateStr) {
  if (!dateStr) return null;
  try {
    if (dateStr instanceof Date) {
      return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
    }
    
    const str = String(dateStr);
    let year, month, day;
    
    if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
      const fechaPart = str.split('T')[0];
      [year, month, day] = fechaPart.split('-').map(Number);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      [year, month, day] = str.split('-').map(Number);
    } else {
      const dateObj = new Date(str);
      if (!isNaN(dateObj.getTime())) {
        year = dateObj.getUTCFullYear();
        month = dateObj.getUTCMonth() + 1;
        day = dateObj.getUTCDate();
      } else {
        return null;
      }
    }
    
    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
}

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function formatNumber(num, options = {}) {
  if (num === null || num === undefined) return '';
  
  const { decimals = 0, prefix = '', suffix = '' } = options;
  
  const formatted = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
  
  return `${prefix}${formatted}${suffix}`;
}

export function formatCurrency(amount, currency = 'MXN') {
  if (amount === null || amount === undefined) return '';
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatPercentage(value, decimals = 0) {
  if (value === null || value === undefined) return '';
  return `${value.toFixed(decimals)}%`;
}

export function truncate(str, length = 50, suffix = '...') {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function slugify(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
