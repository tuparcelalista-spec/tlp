/**
 * TPL Property Card Web Component
 * Encapsulates the UI for a property (parcela/casa) to be reused across Public Site and CRM.
 * Usage: <tpl-property-card image="url" title="Parcela 1" price="1000" location="Frutillar"></tpl-property-card>
 */
export class TPLPropertyCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ['image', 'title', 'price', 'location', 'badge', 'badges-color'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        const image = this.getAttribute('image') || 'https://via.placeholder.com/400x300?text=Sin+Foto';
        const title = this.getAttribute('title') || 'Propiedad sin título';
        const price = this.getAttribute('price') || '0';
        const location = this.getAttribute('location') || 'Ubicación no especificada';
        const badge = this.getAttribute('badge') || '';
        
        // We use CSS variables defined in global-tokens.css
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    --card-bg: var(--c-surface, #ffffff);
                    --card-border: var(--c-border, #dde3ea);
                    --text-main: var(--c-text, #1a202c);
                    --text-muted: var(--c-text-secondary, #5a6678);
                    --primary: var(--c-primary, #073a5a);
                    --shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1));
                    --shadow-hover: var(--shadow-xl, 0 20px 50px rgba(0,0,0,0.14));
                    --radius: var(--radius-xl, 20px);
                    --transition: var(--transition-base, 280ms ease);
                }

                .card {
                    background: var(--card-bg);
                    border: 1px solid var(--card-border);
                    border-radius: var(--radius);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    transition: box-shadow var(--transition), transform var(--transition);
                    box-shadow: var(--shadow);
                    height: 100%;
                    font-family: var(--font-sans, system-ui, sans-serif);
                    cursor: pointer;
                }

                .card:hover {
                    box-shadow: var(--shadow-hover);
                    transform: translateY(-4px);
                }

                .image-container {
                    position: relative;
                    height: 220px;
                    background: #eee;
                    overflow: hidden;
                }

                .image-container img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.5s ease;
                }

                .card:hover .image-container img {
                    transform: scale(1.05);
                }

                .badge {
                    position: absolute;
                    top: 12px;
                    left: 12px;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(4px);
                    color: var(--primary);
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    display: ${badge ? 'block' : 'none'};
                }

                .content {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                    gap: 8px;
                }

                .location {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .title {
                    margin: 0;
                    font-size: 1.15rem;
                    color: var(--text-main);
                    font-weight: 700;
                    line-height: 1.3;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .footer {
                    margin-top: auto;
                    padding-top: 16px;
                    border-top: 1px solid var(--c-border-light, #eef0f3);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .price-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                .price-value {
                    font-size: 1.25rem;
                    color: var(--primary);
                    font-weight: 800;
                }
            </style>

            <article class="card">
                <div class="image-container">
                    <img src="${image}" alt="${title}" loading="lazy" />
                    <div class="badge">${badge}</div>
                </div>
                <div class="content">
                    <div class="location">📍 ${location}</div>
                    <h3 class="title">${title}</h3>
                    
                    <!-- Slot for injecting custom CRM buttons or public icons -->
                    <slot name="extra-info"></slot>
                    
                    <div class="footer">
                        <div class="price-wrapper">
                            <div class="price-label">Valor desde</div>
                            <div class="price-value">${price} UF</div>
                        </div>
                        <slot name="actions"></slot>
                    </div>
                </div>
            </article>
        `;
    }
}

// Register the custom element
if (!customElements.get('tpl-property-card')) {
    customElements.define('tpl-property-card', TPLPropertyCard);
}
