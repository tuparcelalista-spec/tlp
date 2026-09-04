(function(window) {
    'use strict';

    // CSS Inyectado para el motor de video
    const style = document.createElement('style');
    style.textContent = `
        .tpl-video-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: #000;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.5s ease;
        }
        .tpl-video-overlay.active {
            opacity: 1;
            pointer-events: all;
        }
        .tpl-video-container {
            width: 100%;
            max-width: 400px;
            aspect-ratio: 9/16;
            background: #111;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            border-radius: 8px;
        }
        .tpl-video-slide {
            position: absolute;
            inset: 0;
            opacity: 0;
            background-size: cover;
            background-position: center;
            transition: opacity 1s ease, transform 6s linear;
            transform: scale(1);
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding: 30px 20px;
        }
        .tpl-video-slide.active {
            opacity: 1;
            transform: scale(1.1);
        }
        .tpl-video-text {
            color: #fff;
            font-family: 'Outfit', sans-serif;
            font-size: 24px;
            font-weight: 700;
            text-shadow: 0 2px 10px rgba(0,0,0,0.8);
            transform: translateY(20px);
            opacity: 0;
            transition: transform 0.5s ease 0.5s, opacity 0.5s ease 0.5s;
            text-align: center;
        }
        .tpl-video-slide.active .tpl-video-text {
            transform: translateY(0);
            opacity: 1;
        }
        .tpl-video-logo {
            position: absolute;
            top: 20px;
            left: 20px;
            width: 60px;
            z-index: 10;
        }
        .tpl-video-close {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            cursor: pointer;
            z-index: 10;
            font-weight: bold;
        }
        .tpl-video-progress {
            position: absolute;
            top: 0; left: 0; height: 4px; background: #0284c7;
            width: 0%;
            z-index: 10;
            transition: width 0.1s linear;
        }
    `;
    document.head.appendChild(style);

    const formatMoney = val => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

    class TPLVideoEngine {
        constructor() {
            this.buildDOM();
            this.slides = [];
            this.currentIndex = 0;
            this.timer = null;
            this.progressTimer = null;
        }

        buildDOM() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'tpl-video-overlay';
            this.overlay.innerHTML = `
                <div class="tpl-video-container" id="tpl-video-viewport">
                    <div class="tpl-video-progress" id="tpl-video-progress"></div>
                    <img src="./assets/logo-tu-parcela-lista.png" class="tpl-video-logo">
                    <button class="tpl-video-close" id="tpl-video-close">×</button>
                    <div id="tpl-video-tracks"></div>
                </div>
            `;
            document.body.appendChild(this.overlay);

            document.getElementById('tpl-video-close').addEventListener('click', () => this.stop());
        }

        generateScript(parcel, house, totalBudget) {
            const images = [];
            try {
                if (parcel.imagenes && typeof parcel.imagenes === 'string') {
                    const arr = JSON.parse(parcel.imagenes.replace(/^{|}$/g, '["').replace(/,/g, '","') + '"]');
                    if (Array.isArray(arr)) images.push(...arr.slice(0, 3));
                } else if (Array.isArray(parcel.imagenes)) {
                    images.push(...parcel.imagenes.slice(0, 3));
                }
            } catch(e) {}
            
            // Fallback de imágenes de parcelas si no hay suficientes
            if (images.length === 0) images.push('https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80');
            if (images.length === 1) images.push('https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?w=800&q=80');

            const pName = parcel.nombre || parcel.titulo || `Parcela en ${parcel.comuna || 'Chile'}`;
            const area = parcel.superficie_m2 || parcel.tamano || '5.000';
            const areaStr = Number(area).toLocaleString('es-CL');

            const slides = [
                {
                    image: images[0].replace(/['"]/g, ''),
                    text: `Imagina tu próximo refugio en ${parcel.comuna || 'el sur de Chile'}.`,
                    duration: 4000
                },
                {
                    image: (images[1] || images[0]).replace(/['"]/g, ''),
                    text: `${pName} · ${areaStr} m²`,
                    duration: 4000
                }
            ];

            if (house) {
                // MODO: Parcela + Casa (Cotizador)
                const houseImg = house.imagen || house.thumb || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80';
                const hName = house.nombre || 'Diseño propio';
                
                slides.push({
                    image: houseImg,
                    text: `Pensado con el modelo ${hName}.`,
                    duration: 4000
                });
                slides.push({
                    image: images[0].replace(/['"]/g, ''),
                    text: `Inversión total estimada: ${formatMoney(totalBudget)}`,
                    duration: 4500
                });
            } else {
                // MODO: Solo Parcela (parcela.html)
                const price = parcel.precio_publicado || parcel.precio || totalBudget || 0;
                slides.push({
                    image: (images[2] || images[0]).replace(/['"]/g, ''),
                    text: `Precio de Venta: ${formatMoney(price)}`,
                    duration: 4500
                });
            }

            return slides;
        }

        async play(parcel, house, totalBudget) {
            this.slides = this.generateScript(parcel, house, totalBudget);
            
            const tracks = document.getElementById('tpl-video-tracks');
            tracks.innerHTML = this.slides.map((s, i) => `
                <div class="tpl-video-slide" id="tpl-slide-${i}" style="background-image: url('${s.image}')">
                    <div class="tpl-video-text">${s.text}</div>
                </div>
            `).join('');

            this.overlay.classList.add('active');
            this.currentIndex = 0;
            this.runSlide();
        }

        runSlide() {
            if (this.currentIndex >= this.slides.length) {
                this.stop();
                return;
            }

            document.querySelectorAll('.tpl-video-slide').forEach(el => el.classList.remove('active'));
            const currentEl = document.getElementById(`tpl-slide-${this.currentIndex}`);
            if (currentEl) currentEl.classList.add('active');

            const duration = this.slides[this.currentIndex].duration;
            
            let start = Date.now();
            const bar = document.getElementById('tpl-video-progress');
            
            clearInterval(this.progressTimer);
            this.progressTimer = setInterval(() => {
                const elapsed = Date.now() - start;
                const percent = Math.min(100, (elapsed / duration) * 100);
                bar.style.width = percent + '%';
            }, 50);

            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                this.currentIndex++;
                this.runSlide();
            }, duration);
        }

        stop() {
            clearTimeout(this.timer);
            clearInterval(this.progressTimer);
            this.overlay.classList.remove('active');
            document.getElementById('tpl-video-progress').style.width = '0%';
        }
    }

    window.TPLVideoEngine = new TPLVideoEngine();

})(window);
