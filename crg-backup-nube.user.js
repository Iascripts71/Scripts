// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @version      0.10
// @author       Iascripts71
// @description  Backup gratuito permanente con diseño idéntico al gestor de colección.
// @updateURL    https://raw.githubusercontent.com/Iascripts71/Scripts/main/crg-backup-nube.user.js
// @downloadURL  https://raw.githubusercontent.com/Iascripts71/Scripts/main/crg-backup-nube.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ESTILOS CLONADOS EXACTAMENTE
    GM_addStyle(`
        .crg-info-modal {
            position: fixed; top: 20%; left: 50%; transform: translate(-50%, 0);
            background: #1a1a1a; color: white; padding: 25px; z-index: 30000;
            border-radius: 15px; border: 2px solid #0050ff; width: 320px;
            font-family: sans-serif; text-align: left; box-shadow: 0 0 20px rgba(0,80,255,0.5);
        }
        .crg-info-modal h4 { margin-top:0; color:#0050ff; }
        .crg-info-modal p { font-size:13px; line-height:1.5; }
        .crg-info-modal ul { font-size: 12px; padding-left: 20px; color: #ccc; }
        
        #crg-btn-info {
            background: #1a1a1a; color: #0050ff !important; border: 2px solid #0050ff;
            border-radius: 50%; width: 30px; height: 30px; cursor: pointer;
            font-weight: bold; font-size: 16px; display: flex;
            align-items: center; justify-content: center;
        }
    `);

    const showCloudPanel = () => {
        if (document.getElementById('cloud-panel-crg')) return;
        const panel = document.createElement('div');
        panel.id = 'cloud-panel-crg';
        panel.style = "position: fixed; top: 15%; left: 50%; transform: translate(-50%, 0); background: #f4f7f6; border: 2px solid #0050ff; padding: 25px; z-index: 20000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 15px; font-family: sans-serif; width: 340px; color: #333;";
        
        panel.innerHTML = `
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin:0; color:#0050ff;">☁️ Mi Nube CRG</h3>
                <button id="crg-btn-info">ℹ️</button>
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="font-size:11px; font-weight:bold;">PANTRY ID (API Key):</label>
                <input type="text" id="pantry-id" style="width:100%; padding:8px; border-radius:5px; border:1px solid #ccc; box-sizing: border-box;" value="${GM_getValue('pantry_id', '')}" placeholder="Copia aquí tu ID de Pantry">
            </div>

            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:10px;">📤 GUARDAR EN LA NUBE</button>
            <button id="btn-down" style="width:100%; background:#007bff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">📥 RECUPERAR DE LA NUBE</button>
            
            <div id="cloud-msg" style="margin-top:15px; font-size:12px; text-align:center; font-weight:bold; min-height:15px;"></div>
            
            <div style="text-align:center; margin-top:15px; border-top: 1px solid #ddd; padding-top: 10px;">
                <a href="https://getpantry.cloud/" target="_blank" style="font-size:12px; color:#0050ff; text-decoration:none; font-weight:bold;">👉 Crear cuenta gratuita en Pantry</a>
            </div>
            <p id="cloud-close" style="text-align:center; margin-top:10px; color:#888; cursor:pointer; font-size:12px; margin-bottom:0;">Cerrar ventana</p>
        `;
        document.body.appendChild(panel);

        // Lógica del botón Información (IDÉNTICA A LA PEDIDA)
        document.getElementById('crg-btn-info').onclick = () => {
            const info = document.createElement('div');
            info.className = 'crg-info-modal';
            info.innerHTML = `
                <h4 style="margin-top:0; color:#0050ff;">¿Cómo funciona la nube?</h4>
                <p>Usa <b>Pantry Cloud</b> para guardar tus marcas de forma gratuita y permanente (sin caducidad).</p>
                <ul>
                    <li><b>Pantry ID:</b> Es el código que recibes al crear tu cuenta.</li>
                    <li><b>Guardar:</b> Sube tus colores y notas actuales a la nube.</li>
                    <li><b>Recuperar:</b> Descarga tu última copia en este ordenador.</li>
                </ul>
                <p style="font-size:11px; color:#888;">Los cambios se aplican al recargar la página del foro.</p>
                <button id="crg-info-close" style="width:100%; background:#0050ff; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer; margin-top:10px;">Entendido</button>
            `;
            document.body.appendChild(info);
            document.getElementById('crg-info-close').onclick = () => info.remove();
        };

        document.getElementById('btn-up').onclick = () => {
            const id = document.getElementById('pantry-id').value;
            if(!id) return alert("Por favor, introduce tu Pantry ID.");
            GM_setValue('pantry_id', id);
            
            let datos = {};
            for (let i = 0; i < localStorage.length; i++) {
                let k = localStorage.key(i);
                if (k.startsWith('lm_') || k.includes('status')) datos[k] = localStorage.getItem(k);
            }

            document.getElementById('cloud-msg').innerText = "Subiendo...";
            GM_xmlhttpRequest({
                method: "POST",
                url: `https://getpantry.cloud/apiv1/pantry/${id}/basket/crg_backup`,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(datos),
                onload: (r) => {
                    document.getElementById('cloud-msg').innerText = (r.status === 200) ? "✅ ¡Copia guardada con éxito!" : "❌ Error en el ID";
                    document.getElementById('cloud-msg').style.color = (r.status === 200) ? "green" : "red";
                }
            });
        };

        document.getElementById('btn-down').onclick = () => {
            const id = document.getElementById('pantry-id').value;
            if(!id) return alert("Introduce tu Pantry ID.");
            document.getElementById('cloud-msg').innerText = "Recuperando...";
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://getpantry.cloud/apiv1/pantry/${id}/basket/crg_backup`,
                onload: (r) => {
                    if(r.status === 200) {
                        const d = JSON.parse(r.responseText);
                        Object.keys(d).forEach(k => localStorage.setItem(k, d[k]));
                        alert("✅ Restaurado con éxito. Se recargará la página.");
                        location.reload();
                    } else {
                        document.getElementById('cloud-msg').innerText = "❌ No hay copia o ID mal.";
                        document.getElementById('cloud-msg').style.color = "red";
                    }
                }
            });
        };

        document.getElementById('cloud-close').onclick = () => panel.remove();
    };

    const b = document.createElement('div');
    b.innerHTML = "☁️";
    b.style = "position: fixed; bottom: 20px; right: 70px; background: #0050ff; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; z-index: 10004; box-shadow: 0 4px 10px rgba(0,0,0,0.3);";
    b.onclick = showCloudPanel;
    document.body.appendChild(b);

})();
