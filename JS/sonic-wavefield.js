(function () {
    const selector = '.sonic-wavefield-canvas';

    function initSonicWavefield() {
        if (document.querySelector(selector)) return;

        const canvas = document.createElement('canvas');
        canvas.className = 'sonic-wavefield-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.prepend(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let dpr = 1;
        const waveCount = 4;
        const layers = Array.from({ length: waveCount }, (_, index) => ({
            amplitude: 60 + index * 20,
            frequency: 0.008 + index * 0.002,
            speed: 0.0004 + index * 0.00012,
            alpha: 0.14 + index * 0.04,
            hue: index === 0 ? 160 : 220 + index * 10
        }));

        function resize() {
            dpr = window.devicePixelRatio || 1;
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function draw(time) {
            ctx.clearRect(0, 0, width, height);
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, 'rgba(6, 10, 18, 0.18)');
            gradient.addColorStop(1, 'rgba(6, 10, 18, 0.02)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            layers.forEach((layer, layerIndex) => {
                ctx.beginPath();
                ctx.moveTo(0, height * 0.55);

                for (let x = 0; x <= width; x += 16) {
                    const y = Math.sin(x * layer.frequency + time * layer.speed) * layer.amplitude + height * (0.45 + layerIndex * 0.07);
                    ctx.lineTo(x, y);
                }

                ctx.lineTo(width, height);
                ctx.lineTo(0, height);
                ctx.closePath();

                ctx.fillStyle = `hsla(${layer.hue}, 80%, 58%, ${layer.alpha})`;
                ctx.fill();
            });

            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1;
            layers.forEach((layer, layerIndex) => {
                ctx.beginPath();
                for (let x = 0; x <= width; x += 18) {
                    const y = Math.sin(x * (layer.frequency * 0.65) + time * (layer.speed * 1.35)) * (layer.amplitude * 0.35) + height * (0.55 + layerIndex * 0.04);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            });
            ctx.globalAlpha = 1;

            window.requestAnimationFrame(draw);
        }

        resize();
        draw(0);
        window.addEventListener('resize', resize);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSonicWavefield, { once: true });
    } else {
        initSonicWavefield();
    }
})();
