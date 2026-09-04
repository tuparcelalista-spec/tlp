import { getClient } from '../../core/supabase.js';
import { toast } from '../../components/toast.js';
import { closeModal } from '../../components/modal.js';
import { refrescarSnapshot } from '../../core/refresh.js';

export function render(casa = null) {
    const isEdit = !!casa;
    return `
        <div class="casa-editor bg-white p-6 max-w-lg mx-auto w-full rounded shadow-lg">
            <div class="flex justify-between items-center mb-6 pb-3 border-b">
                <h2 class="text-xl font-bold text-gray-800">${isEdit ? 'Editar Casa' : 'Nueva Casa'}</h2>
                <button type="button" class="text-gray-400 hover:text-gray-600 transition" onclick="document.dispatchEvent(new CustomEvent('close-modal'))">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <form id="form-casa" class="space-y-4">
                <input type="hidden" name="id" value="${casa?.id || ''}">
                
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Nombre de la Casa <span class="text-red-500">*</span></label>
                    <input type="text" name="nombre" value="${casa?.nombre || ''}" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required placeholder="Ej. Casa Roble">
                </div>
                
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Código</label>
                    <input type="text" name="codigo" value="${casa?.codigo || ''}" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono" placeholder="Opcional">
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Superficie (m²)</label>
                        <input type="number" step="0.01" name="superficie_m2" value="${casa?.superficie_m2 || ''}" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Precio Base (CLP)</label>
                        <input type="number" name="precio_base" value="${casa?.precio_base || ''}" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Dormitorios</label>
                        <input type="number" name="dormitorios" value="${casa?.dormitorios || ''}" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Baños</label>
                        <input type="number" step="0.5" name="banos" value="${casa?.banos || ''}" class="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                    </div>
                </div>
                
                <div class="pt-4 mt-6 border-t flex justify-end gap-3">
                    <button type="button" class="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition" onclick="document.dispatchEvent(new CustomEvent('close-modal'))">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 shadow-sm transition flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        Guardar Casa
                    </button>
                </div>
            </form>
        </div>
    `;
}

export function init(casa = null) {
    const form = document.getElementById('form-casa');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = Object.fromEntries(fd.entries());
        
        if(payload.superficie_m2) payload.superficie_m2 = parseFloat(payload.superficie_m2);
        if(payload.precio_base) payload.precio_base = parseFloat(payload.precio_base);
        if(payload.dormitorios) payload.dormitorios = parseInt(payload.dormitorios, 10);
        if(payload.banos) payload.banos = parseFloat(payload.banos);
        
        try {
            const { data, error } = await getClient().rpc('tpl_crm_guardar_casa_v1', { p_payload: payload });
            if (error) throw error;
            toast('Casa guardada con éxito', 'success');
            closeModal();
            // El inventario se pinta desde el snapshot, que no se refresca solo:
            // sin esto la casa recien guardada no aparecia hasta recargar a mano.
            await refrescarSnapshot();
        } catch (err) {
            console.error(err);
            toast('Error al guardar: ' + err.message, 'error');
        }
    });
}
