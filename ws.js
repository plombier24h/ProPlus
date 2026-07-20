(function() {
    const currentUrl = window.location.href;

    // ==========================================
    // EXTRACTION DE L'ADRESSE EN TÂCHE DE FOND
    // ==========================================
    if (!currentUrl.includes("cedeo.fr") && !currentUrl.includes("github.io") && !currentUrl.includes("leroymerlin.fr")) {
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            if (!input.dataset.suivi) {
                input.dataset.suivi = "true";
                input.addEventListener('input', function() {
                    const txt = (this.placeholder || this.name || this.id || "").toLowerCase();
                    if (txt.includes('adresse') || txt.includes('postale')) {
                        const val = this.value.trim();
                        if (val !== "") localStorage.setItem('artisan-adresse-postale', val);
                    }
                });
            }
        });
    }

    // ==========================================
    // ACTION SUR CEDEO
    // ==========================================
    if (currentUrl.includes("cedeo.fr")) {
        if (document.getElementById('centralisateur-dock')) return;

        const style = document.createElement('style');
        style.innerHTML = `
            #centralisateur-dock { position: fixed; bottom: 0; left: 0; width: 100%; background: #ffffff; box-shadow: 0 -3px 10px rgba(0, 0, 0, 0.15); z-index: 999999; padding: 12px 0; display: flex; justify-content: center; align-items: center; }
            #btn-transfert-unique { background: #002F6C; color: white; padding: 12px 20px; border: none; border-radius: 50px; font-weight: bold; cursor: pointer; }
        `;
        document.head.appendChild(style);

        const dock = document.createElement('div');
        dock.id = 'centralisateur-dock';
        const b = document.createElement('button');
        b.id = 'btn-transfert-unique';
        b.innerText = 'COPIER VERS FACTURE';

        b.onclick = function() {
            const panier = [];
            document.querySelectorAll('li[data-testid^="cart/article/"]').forEach(l => {
                const info = l.querySelector('.area-article-tile-info');
                const des = (info ? info.innerText.trim().replace(/\s+/g, ' ') : 'Article');
                const ref = l.getAttribute('data-testid')?.split('/').pop() || '';
                const prixB = l.querySelector('.area-article-tile-price');
                let px = 0;
                if(prixB) {
                    const m = prixB.innerText.match(/([0-9\s\u00A0,.]+)/);
                    if(m) px = parseFloat(m[1].replace(/\s/g,'').replace(',','.'));
                }
                const inp = l.querySelector('input[type="number"]') || l.querySelector('input');
                const qte = inp ? parseInt(inp.value, 10) : 1;
                panier.push({des: des + ' (Réf: ' + ref + ')', ref, px, qte});
            });

            if (panier.length > 0) {
                window.location.href = 'https://plombier24h.github.io/ProPlus/facture/?data=' + encodeURIComponent(JSON.stringify(panier)) + '&adr=' + encodeURIComponent(localStorage.getItem('artisan-adresse-postale') || '');
            } else {
                alert('Panier vide.');
            }
        };
        dock.appendChild(b);
        document.body.appendChild(dock);
    }

    // ==========================================
    // ACTION SUR LEROY MERLIN (sélecteurs réels + persistant)
    // ==========================================
    if (currentUrl.includes("leroymerlin.fr")) {

        function extrairePanierLM() {
            const panier = [];
            const prixEls = document.querySelectorAll('.offer-price');

            prixEls.forEach(priceEl => {
                let line = priceEl.parentElement;
                let safety = 0;
                while (line && !line.querySelector('.mc-quantity-selector') && safety < 6) {
                    line = line.parentElement;
                    safety++;
                }
                if (!line) return;

                let name = '';
                const moveBtn = line.querySelector('[data-testid="cart-offer-line-desktop-move-btn"]');
                if (moveBtn) {
                    const label = moveBtn.getAttribute('aria-label') || '';
                    name = label.replace(/^Mettre de côté le produit\s*/i, '').trim();
                }
                if (!name) return;

                let px = 0;
                const pricesContainer = line.querySelector('.offer-price__prices');
                let prixTxt = '';
                if (pricesContainer) {
                    const discountEl = pricesContainer.querySelector('[class*="discount-price"]');
                    if (discountEl) {
                        prixTxt = discountEl.textContent.trim();
                    } else {
                        const nonDel = Array.from(pricesContainer.children).find(el => el.tagName !== 'DEL');
                        prixTxt = nonDel ? nonDel.textContent.trim() : pricesContainer.textContent.trim();
                    }
                }
                if (prixTxt) {
                    const m = prixTxt.replace(/\s/g, '').replace(',', '.').match(/([0-9]+\.?[0-9]*)/);
                    if (m) px = parseFloat(m[1]);
                }

                const qtyInput = line.querySelector('.mc-quantity-selector__input');
                const qty = qtyInput ? parseInt(qtyInput.value || qtyInput.getAttribute('aria-valuenow'), 10) : 1;

                panier.push({ des: name, ref: 'LM', px: px, qte: qty || 1 });
            });

            return panier;
        }

        function injectDockLM() {
            if (document.getElementById('centralisateur-dock-lm')) return;

            const style = document.createElement('style');
            style.innerHTML = `
                #centralisateur-dock-lm { position: fixed; bottom: 0; left: 0; width: 100%; background: #ffffff; box-shadow: 0 -3px 10px rgba(0, 0, 0, 0.15); z-index: 999999; padding: 12px 0; display: flex; justify-content: center; }
                #btn-transfert-lm { background: #E66C00; color: white; padding: 12px 20px; border: none; border-radius: 50px; font-weight: bold; cursor: pointer; }
            `;
            document.head.appendChild(style);

            const dock = document.createElement('div');
            dock.id = 'centralisateur-dock-lm';
            const b = document.createElement('button');
            b.id = 'btn-transfert-lm';
            b.innerText = 'COPIER PANIER LEROY MERLIN';

            b.onclick = function() {
                const panier = extrairePanierLM();

                if (panier.length > 0) {
                    window.location.href = 'https://plombier24h.github.io/ProPlus/facture/?data=' + encodeURIComponent(JSON.stringify(panier)) + '&adr=' + encodeURIComponent(localStorage.getItem('artisan-adresse-postale') || '');
                } else {
                    const candidats = document.querySelectorAll('[data-testid]');
                    const echantillon = Array.from(candidats).slice(0, 15).map(el => el.getAttribute('data-testid')).join('\n');
                    alert('Panier non détecté.\n\nAttributs data-testid trouvés (échantillon) :\n\n' + (echantillon || 'aucun'));
                }
            };
            dock.appendChild(b);
            document.body.appendChild(dock);
        }

        injectDockLM();

        const observerLM = new MutationObserver(function() {
            if (!document.getElementById('centralisateur-dock-lm')) injectDockLM();
        });
        observerLM.observe(document.body, { childList: true, subtree: true });

        setInterval(function() {
            if (!document.getElementById('centralisateur-dock-lm')) injectDockLM();
        }, 1500);
    }

    // ==========================================
    // INJECTION DE L'ADRESSE (GITHUB)
    // ==========================================
    if (currentUrl.includes("github.io")) {
        const params = new URLSearchParams(window.location.search);
        const adrParam = params.get('adr');
        if (adrParam) {
            let adresse = decodeURIComponent(adrParam);
            let t = 0;
            const interval = setInterval(function() {
                const champs = document.querySelectorAll('.left-col .auto-ta');
                if (champs && champs[2]) {
                    champs[2].value = adresse;
                    champs[2].style.height = 'auto';
                    champs[2].style.height = champs[2].scrollHeight + 'px';
                    clearInterval(interval);
                }
                if (++t > 20) clearInterval(interval);
            }, 200);
        }
    }

    // ==========================================
    // INJECTION DES INFOS CLIENT (GITHUB)
    // Lues directement en localStorage (même domaine github.io que PRO+)
    // ==========================================
    if (currentUrl.includes("github.io")) {
        let tClient = 0;
        const intervalClient = setInterval(function() {
            const champsTa = document.querySelectorAll('.client-box .auto-ta');
            const champsInput = document.querySelectorAll('.client-box input');
            const nomEl = champsTa[0];
            const adresseEl = champsTa[1];
            const telEl = champsInput[0];
            const emailEl = document.getElementById('emailClient');

            if (nomEl && adresseEl && telEl) {
                const clientNom = localStorage.getItem('clientNom');
                const clientAdresse = localStorage.getItem('clientAdresse');
                const clientTel = localStorage.getItem('clientTel');
                const clientEmail = localStorage.getItem('clientEmail');

                if (clientNom) {
                    nomEl.value = clientNom;
                    nomEl.style.height = 'auto';
                    nomEl.style.height = nomEl.scrollHeight + 'px';
                }
                if (clientAdresse) {
                    adresseEl.value = clientAdresse;
                    adresseEl.style.height = 'auto';
                    adresseEl.style.height = adresseEl.scrollHeight + 'px';
                }
                if (clientTel) telEl.value = clientTel;
                if (clientEmail && emailEl) emailEl.value = clientEmail;

                clearInterval(intervalClient);
            }
            if (++tClient > 20) clearInterval(intervalClient);
        }, 200);
    }
})();
