// utils.js
export function formatCLP(value) {
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(value);
}

export function formatUF(value) {
    if (value === null || value === undefined) return '0,00 UF';
    return new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value) + ' UF';
}

export function relativeDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    const daysDifference = Math.round((date - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference === 0) return 'Hoy';
    if (daysDifference === 1) return 'Mañana';
    if (daysDifference === -1) return 'Ayer';
    
    if (Math.abs(daysDifference) < 30) {
        return rtf.format(daysDifference, 'day');
    }
    
    return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

export function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

export function statusColor(status) {
    const colors = {
        'activo': 'bg-green-100 text-green-800',
        'inactivo': 'bg-red-100 text-red-800',
        'pendiente': 'bg-yellow-100 text-yellow-800',
        'completado': 'bg-blue-100 text-blue-800'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

export function statusLabel(status) {
    if (!status) return 'Desconocido';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}
