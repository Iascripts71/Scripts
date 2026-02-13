// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @version      0.2
// @author       Iascripts71
// @description  Copia de seguridad remota con diseño unificado y ayuda.
// @updateURL    https://raw.githubusercontent.com/Iascripts71/Scripts/main/crg-backup-nube.user.js
// @downloadURL  https://raw.githubusercontent.com/Iascripts71/Scripts/main/crg-backup-nube.user.js
// ==/UserScript==

(function() {
    'use strict';

    const generarNombreArchivo = () => {
        let subforo = "crg-lista", idLista = "00000";
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('t')) idLista = urlParams.get('t');
        const breadcrumb = document.querySelector('.nav-links, .nav-links span:last-child');
        if (breadcrumb) subforo = breadcrumb.innerText.toLowerCase().replace(/[^a-z0-9]/g, '-').split('--')[0];
        const ahora = new Date();
        const fecha = ahora.toISOString().split('T')[0];
        const hora = ahora.getHours().toString().padStart(2, '0') + '-' + ahora.getMinutes().toString().padStart(2, '0') + '-' + ahora.getSeconds().toString().padStart(2, '0');
        return `${subforo}-${idLista}-${fecha}_${hora}.csv`;
    };

    // Panel de Información (Estilo unificado con el otro script)
    const mostrarInfoCloud = () => {
        const infoDiv = document.createElement('div');
        infoDiv.style = "position: fixed; top: 20%; left: 50%; transform: translate(-50%, 0); background: #1a1a1a; color: white; padding: 25px; z-index: 30000; border-radius: 15px; border: 2px solid #0050ff; width: 320px; font-family: sans-serif; text-align: left; box-shadow: 0 0 20px rgba(0,80,255,0.5);";
        infoDiv.innerHTML = `
            <h3 style="margin-top:0; color:#0050ff; border-bottom:1px solid #333; padding-bottom:10px;">ℹ️ Guía de la Nube</h3>
            <p style="font-size:13px; line-height:1.5;">Este script asegura tus datos para que nunca pierdas tus cómics marcados.</p>
            <ul style="font-size:12px; padding-left:20px; color:#ccc;">
                <li><b>Paso 1:</b> Crea cuenta en KVstore.io (gratis).</li>
                <li><b>Paso 2:</b> Pon el nombre de tu 'Store' en Usuario.</li>
                <li><b>Paso 3:</b> Pon tu 'API Key' en Contraseña.</li>
                <li><b>Guardar:</b> Sube tus marcas actuales a la nube.</li>
                <li><b>Recuperar:</b> Baja tus marcas a este navegador.</li>
            </ul>
            <button id="close-info-cloud" style="width:100%; background:#0050ff; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold; margin-top:10px;">ENTENDIDO</button>
        `;
        document.body.appendChild(infoDiv);
        document.getElementById('close-info-cloud').onclick = () => infoDiv.remove();
    };

    const showCloudPanel = () => {
        if (document.getElementById('cloud-panel-crg')) return;
        const panel = document.createElement('div');
        panel.id = 'cloud-panel-crg';
        panel.style = "position: fixed; top: 15%; left: 50%; transform: translate(-50%, 0); background: #f4f7f6; border: 2px solid #0050ff; padding: 25px; z-index: 20000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 15px; font-family: sans-serif; width: 340px; color: #333;";
        
        panel.innerHTML = `
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin:0; color:#0050ff;">☁️ Mi Nube CRG v0.2</h3>
                <button id="btn-info-cloud" style="background:#1a1a1a; color:#0050ff; border:1px solid #0050ff; border-radius:50%; width:30px; height:30px; cursor:pointer; font-weight:bold; font-size:16px; display:flex; align-items:center; justify-content:center; transition:0.3s;">ℹ️</button>
            </div>
            
            <div style="margin-bottom:10px;">
                <label style="font-size:11px; font-weight:bold;">KVSTORE USER (Store Name):</label>
                <input type="text" id="cloud-user" style="width:100%; padding:8px; border-radius:5px; border:1px solid #ccc;" value="${GM_getValue('cloud_user', '')}">
            </div>
            <div style="margin-bottom:15px;">
                <label style="font-size:11px; font-weight:bold;">API KEY (Contraseña):</label>
                <input type="password" id="cloud-pass" style="width:100%; padding:8px; border-radius:5px; border:1px solid #ccc;" value="${GM_getValue('cloud_pass', '')}">
            </div>
            
            <div style="background:#e9ecef; padding:10px; border-radius:8px; margin-bottom:15px; font-size:10px; border: 1px dashed #adb5bd;">
                <b>Archivo generado:</b><br><span style="color:#0050ff;">${generarNombreArchivo()}</span>
            </div>

            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:10px;">📤 GUARDAR EN LA NUBE</button>
            <button id="btn-down" style="width:100%; background:#007bff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">📥 RECUPERAR DE LA NUBE</button>
            
            <div id="cloud-msg" style="margin-top:15px; font-size:12px; text-align:center; font-weight:bold; min-height:15px;"></div>
            
            <div style="text-align:center; margin-top:15px; border-top: 1px solid #ddd; padding-top: 10px;">
                <a href="https://www.kvstore.io/signup" target="_blank" style="font-size:12px; color:#0050ff; text-decoration:none; font-weight:bold;">👉 Crear cuenta en KVstore.io</a>
            </div>
            <p id="cloud-close" style="text-align:center; margin-top:10px; color:#888; cursor:pointer; font-size:12px; margin-bottom:0;">Cerrar ventana</p>
        `;
        document.body.appendChild(panel);

        document.getElementById('btn-info-cloud').onclick = mostrarInfoCloud;
        
        // Acciones de los botones
        document.getElementById('btn-up').onclick = () => {
            const user = document.getElementById('cloud-user').value;
            const pass = document.getElementById('cloud-pass').value;
            if(!user || !pass) return alert("Por favor, rellena los datos.");
            GM_setValue('cloud_user', user); GM_setValue('cloud_pass', pass);
            
            let datos = {};
            for (let i = 0; i < localStorage.length; i++) {
                let k = localStorage.key(i);
                if (k.startsWith('lm_') || k.includes('status')) datos[k] = localStorage.getItem(k);
            }

            document.getElementById('cloud-msg').innerText = "Subiendo...";
            GM_xmlhttpRequest({
                method: "POST",
                url: `https://api.kvstore.io/collections/${user}/items/backup_actual`,
                headers: { "kvstore-io-api-key": pass, "Content-Type": "application/json" },
                data: JSON.stringify({ value: JSON.stringify(datos) }),
                onload: (r) => {
                    document.getElementById('cloud-msg').innerText = (r.status === 201 || r.status === 200) ? "✅ ¡Copia guardada!" : "❌ Error de credenciales";
                    document.getElementById('cloud-msg').style.color = (r.status === 201 || r.status === 200) ? "green" : "red";
                }
            });
        };

        document.getElementById('btn-down').onclick = () => {
            const user = document.getElementById('cloud-user').value, pass = document.getElementById('cloud-pass').value;
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://api.kvstore.io/collections/${user}/items/backup_actual`,
                headers: { "kvstore-io-api-key": pass },
                onload: (r) => {
                    if(r.status === 200) {
                        const d = JSON.parse(JSON.parse(r.responseText).value);
                        Object.keys(d).forEach(k => localStorage.setItem(k, d[k]));
                        alert("✅ Restaurado. Se recargará la página.");
                        location.reload();
                    } else alert("❌ No se encontró copia.");
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
