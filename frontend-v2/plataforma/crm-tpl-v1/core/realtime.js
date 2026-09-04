import { getClient } from '../core/supabase.js';
import { toast } from '../components/toast.js';

export async function initRealtime() {
  const client = getClient();
  
  if (!client) {
    console.warn('Supabase client not available for realtime subscriptions.');
    return;
  }
  
  // Nombres verificados contra el resto del código: 'tpl_parcelas' no existe en
  // ningún otro archivo del proyecto; la tabla real de propiedades/parcelas es
  // 'tpl_propiedades'. 'tpl_oportunidades', 'tpl_visitas' y 'tpl_tasaciones'
  // tampoco aparecen en ningún otro módulo — confirma con tu esquema real de
  // Supabase si esos tres nombres son correctos.
  const tables = ['tpl_propiedades', 'tpl_catastro_mercado', 'tpl_oportunidades', 'tpl_visitas', 'tpl_tasaciones'];
  
  tables.forEach(table => {
    client
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, payload => {
        window.dispatchEvent(new CustomEvent('tpl:data-changed', { detail: payload }));
        
        let operation = 'Actualización';
        if (payload.eventType === 'INSERT') operation = 'Nuevo registro';
        if (payload.eventType === 'DELETE') operation = 'Registro eliminado';
        
        const message = `${operation} en ${table.replace('tpl_', '')}`;
        toast(message, 'info');
        console.log(`Realtime change in ${table}:`, payload);
      })
      .subscribe();
  });
}
