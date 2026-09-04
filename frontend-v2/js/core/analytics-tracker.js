// analytics-tracker.js
// El "Asesor Espía" - Rastreador de Eventos de TPL

class TPLAnalytics {
    constructor() {
        this.sessionId = this.getOrCreateSessionId();
        this.pageUrl = window.location.pathname + window.location.search;
        this.parcelaId = new URLSearchParams(window.location.search).get('id') || null;
        this.startTime = Date.now();
        
        this.init();
    }

    getOrCreateSessionId() {
        let sid = sessionStorage.getItem('tpl_session_id');
        if (!sid) {
            sid = 'sess_' + Math.random().toString(36).substring(2, 15);
            sessionStorage.setItem('tpl_session_id', sid);
        }
        return sid;
    }

    async getClient() {
        if (!window.TPLDataService || !window.TPLDataService.getClient) {
            console.error("No se pudo cargar el cliente de Supabase para Analytics");
            return null;
        }

        try {
            return await window.TPLDataService.getClient();
        } catch (e) {
            console.error("No se pudo cargar el cliente de Supabase para Analytics", e);
            return null;
        }
    }

    async logEvent(actionType, metadata = {}) {
        const client = await this.getClient();
        if (!client) return;

        const timeSpentSeconds = Math.floor((Date.now() - this.startTime) / 1000);

        try {
            await client.from('tpl_web_analytics').insert([{
                session_id: this.sessionId,
                page_url: this.pageUrl,
                parcela_id: this.parcelaId,
                action_type: actionType,
                time_spent_seconds: timeSpentSeconds,
                metadata: metadata
            }]);
        } catch (e) {
            // Silently fail to not interrupt user experience
            console.warn("Analytics error", e);
        }
    }

    init() {
        // Log page view on load
        this.logEvent('page_view');

        // Log when user leaves the page (unload)
        window.addEventListener('beforeunload', () => {
            // We use standard fetch with keepalive to ensure it fires during unload
            // but for simplicity, we just trigger it (might not complete in time, but it's a best effort)
            this.logEvent('page_exit');
        });

        // Listen for WhatsApp clicks globally
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href.includes('wa.me')) {
                this.logEvent('whatsapp_click', { href: link.href });
            }
        });

        // Listen for the AI Assistant trigger
        // We monkey-patch the assistant's show method if it exists
        const checkAssistant = setInterval(() => {
            const modal = document.getElementById('tpl-ai-assistant');
            if (modal && modal.classList.contains('visible') && !this.botTriggerLogged) {
                this.botTriggerLogged = true;
                this.logEvent('bot_trigger', { context: 'inactividad_o_manual' });
                clearInterval(checkAssistant);
            }
        }, 1000);
        setTimeout(() => clearInterval(checkAssistant), 600000); // Stop checking after 10 mins
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TPLAnalytics());
} else {
    new TPLAnalytics();
}
