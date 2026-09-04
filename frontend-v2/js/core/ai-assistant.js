// ai-assistant.js
// Asesor Proactivo de Tu Parcela Lista (TPL)

class TPLAssistant {
    constructor() {
        this.idleTime = 0;
        // Trigger after 4 minutes (240 seconds) of being on the page
        this.triggerTime = 240; 
        this.timer = null;
        this.hasTriggered = false;
        
        this.init();
    }

    init() {
        if (this.hasTriggered) return;
        this.injectCSS();
        this.injectHTML();
        this.startTimer();
        
        // Expose to window for testing
        window.triggerTPLAssistant = () => this.showAssistant();
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.idleTime += 1;
            if (this.idleTime >= this.triggerTime && !this.hasTriggered) {
                this.showAssistant();
            }
        }, 1000);
    }

    injectCSS() {
        const style = document.createElement('style');
        style.textContent = `
            .tpl-ai-assistant {
                position: fixed;
                bottom: -400px;
                right: 20px;
                width: 320px;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                z-index: 999999;
                font-family: 'Montserrat', sans-serif;
                transition: bottom 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                overflow: hidden;
                border: 1px solid rgba(0,0,0,0.05);
            }
            .tpl-ai-assistant.visible {
                bottom: 20px;
            }
            .tpl-ai-header {
                background: linear-gradient(135deg, #0a0f18 0%, #1a202c 100%);
                color: #d4af37;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .tpl-ai-header h4 {
                margin: 0;
                font-size: 1rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .tpl-ai-close {
                background: none;
                border: none;
                color: #fff;
                font-size: 1.5rem;
                cursor: pointer;
                line-height: 1;
            }
            .tpl-ai-body {
                padding: 20px;
                background: #f8fafc;
            }
            .tpl-ai-bubble {
                background: #fff;
                padding: 12px 16px;
                border-radius: 12px;
                border-bottom-left-radius: 2px;
                font-size: 0.95rem;
                color: #334155;
                box-shadow: 0 2px 5px rgba(0,0,0,0.02);
                margin-bottom: 20px;
                line-height: 1.5;
            }
            .tpl-ai-actions {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .tpl-ai-btn {
                padding: 12px;
                border: none;
                border-radius: 6px;
                font-family: 'Montserrat', sans-serif;
                font-weight: 600;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
                text-decoration: none;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .tpl-ai-btn-wa {
                background: #25D366;
                color: white;
            }
            .tpl-ai-btn-wa:hover {
                background: #128C7E;
            }
            .tpl-ai-btn-chat {
                background: #0a0f18;
                color: #d4af37;
            }
            .tpl-ai-btn-chat:hover {
                background: #1a202c;
            }
        `;
        document.head.appendChild(style);
    }

    injectHTML() {
        const container = document.createElement('div');
        container.className = 'tpl-ai-assistant';
        container.id = 'tpl-ai-assistant';
        
        let customMessage = "Hola, veo que llevas un rato revisando esto. ¿Tienes alguna duda técnica o necesitas ayuda con el proceso?";
        
        // Detect Context
        if (window.location.href.includes('publicar')) {
            customMessage = "Hola, veo que estás intentando publicar tu parcela. ¿Tienes dudas con el formulario o la tasación?";
        } else if (window.location.href.includes('parcela.html')) {
            customMessage = "Hola, ¿te interesa esta propiedad? Te puedo ayudar a contactar al corredor asignado o resolver tus dudas.";
        }

        container.innerHTML = `
            <div class="tpl-ai-header">
                <h4>🤖 Asesor Virtual TPL</h4>
                <button class="tpl-ai-close" onclick="document.getElementById('tpl-ai-assistant').classList.remove('visible')">&times;</button>
            </div>
            <div class="tpl-ai-body">
                <div class="tpl-ai-bubble">
                    ${customMessage}
                </div>
                <div class="tpl-ai-actions">
                    <a href="https://wa.me/56988508361?text=Hola,%20necesito%20ayuda%20en%20la%20plataforma%20de%20TPL" target="_blank" class="tpl-ai-btn tpl-ai-btn-wa">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        Hablar con un Humano
                    </a>
                    <button class="tpl-ai-btn tpl-ai-btn-chat" onclick="alert('La IA Conversacional está en desarrollo para la Fase 3.')">
                        Consultar a Inteligencia Artificial
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(container);
    }

    showAssistant() {
        const modal = document.getElementById('tpl-ai-assistant');
        if (modal) {
            modal.classList.add('visible');
            this.hasTriggered = true;
            if (this.timer) clearInterval(this.timer);
        }
    }
}

// Initialize on DOM Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TPLAssistant());
} else {
    new TPLAssistant();
}
