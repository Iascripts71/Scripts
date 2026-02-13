// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @version      0.1
// @author       Iascripts71
// @description  Copia de seguridad remota con nombres de archivo dinámicos por subforo.
// @updateURL    https://raw.githubusercontent.com/Iascripts71/Scripts/main/crg-backup-nube.user.js
// @downloadURL  https://raw.githubusercontent.com/Iascripts71/Scripts/main/crg-backup-nube.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Función para obtener el nombre del archivo con ID de subforo y fecha
    const generarNombreArchivo = () => {
        let subforo = "crg-lista";
        let idLista = "00000";
        
        // Intentar sacar el ID de la lista desde la URL (ej: t=11284)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('t')) idLista = urlParams.get('t');

        // Intentar obtener el nombre del subforo
        const breadcrumb = document.querySelector('.nav-links, .nav-links span:last-child');
        if (breadcrumb) {
            subforo = breadcrumb.innerText.toLowerCase().replace(/[^a-z0-9]/g, '-').split('--')[0];
        }

        const ahora = new Date();
        const fecha = ahora.toISOString().split('T')[0];
        const hora = ahora.getHours().toString().padStart(2, '0') + '-' + 
                     ahora.getMinutes().toString().padStart(2, '0') + '-' + 
                     ahora.getSeconds().toString().padStart(2, '0');
        
        return `${subforo}-${idLista}-${fecha}_${hora}.csv`;
    };

    const showCloudPanel = () => {
        if (document.getElementById('cloud-panel-crg')) return;
        const panel = document.createElement('div');
        panel.id = 'cloud-panel-crg';
        panel.style = "position: fixed; top: 15%; left: 50%; transform: translate(-50%, 0); background: #f4f7f6; border: 2px solid #0050ff; padding: 25px; z-index: 10005; box-shadow: 0 10px 40px rgba(0,0,0,0.4); border-radius: 15px; font-family: sans-serif; width: 340px; color: #333;";
        
        panel.innerHTML = `
            <h3 style="margin-top:0; color:#0050ff; text-align:center;">☁️ Mi Nube CRG v0.1</h3>
            <div style="margin-bottom:10px;">
                <label style="font-size:11px; font-weight:bold;">KVSTORE USER (Store Name):</label>
                <input type="text" id="cloud-user" style="width:100%; padding:8px; border-radius:5px; border:1px solid #ccc;" value="${GM_getValue('cloud_user', '')}">
            </div>
            <div style="margin-bottom:15px;">
                <label style="font-size:11px; font-weight:bold;">API KEY (Contraseña):</label>
                <input type="password" id="cloud-pass" style="width:100%; padding:8px; border-radius:5px; border:1px solid #ccc;" value="${GM_getValue('cloud_pass', '')}">
            </div>
            
            <div style="background:#eee; padding:10px; border-radius:8px; margin-bottom:15px; font-size:10px; border: 1px dashed #999;">
                <b>Archivo generado:</b><br><span id="file-preview" style="color:#0050ff; word-break: break-all;">${generarNombreArchivo()}</span>
            </div>

            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:10px;">📤 GUARDAR EN LA NUBE</button>
            <button id="btn-down" style="width:100%; background:#007bff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">📥 RECUPERAR DE LA NUBE</button>
            
            <div id="cloud-msg" style="margin-top:15px; font-size:12px; text-align:center; font-weight:bold; min-height:15px;"></div>
            <p id="cloud-close" style="text-align:center; margin-top:15px; color:#888; cursor:pointer; font-size:12px;">Cerrar ventana</p>
        `;
        document.body.appendChild(panel);

        const setMsg = (t, c) => {
            const m = document.getElementById('cloud-msg');
            m.innerText = t; m.style.color = c;
        };

        document.getElementById('btn-up').onclick = () => {
            const user = document.getElementById('cloud-user').value;
            const pass = document.getElementById('cloud-pass').value;
            if(!user || !pass) return setMsg("¡Faltan credenciales!", "red");

            GM_setValue('cloud_user', user);
            GM_setValue('cloud_pass', pass);

            let datosParaGuardar = {};
            for (let i = 0; i < localStorage.length; i++) {
                let clave = localStorage.key(i);
                if (clave.startsWith('lm_') || clave.includes('status')) {
                    datosParaGuardar[clave] = localStorage.getItem(clave);
                }
            }

            setMsg("Subiendo a la nube...", "orange");

            GM_xmlhttpRequest({
                method: "POST",
                url: `https://api.kvstore.io/collections/${user}/items/backup_actual`,
                headers: { "kvstore-io-api-key": pass, "Content-Type": "application/json" },
                data: JSON.stringify({ value: JSON.stringify(datosParaGuardar) }),
                onload: (r) => {
                    if(r.status === 201 || r.status === 200) {
                        setMsg("✅ Copia guardada correctamente", "green");
                    } else setMsg("❌ Error: Revisa User/API Key", "red");
                }
            });
        };

        document.getElementById('btn-down').onclick = () => {
            const user = document.getElementById('cloud-user').value;
            const pass = document.getElementById('cloud-pass').value;

            setMsg("Recuperando datos...", "orange");

            GM_xmlhttpRequest({
                method: "GET",
                url: `https://api.kvstore.io/collections/${user}/items/backup_actual`,
                headers: { "kvstore-io-api-key": pass },
                onload: (r) => {
                    if(r.status === 200) {
                        try {
                            const payload = JSON.parse(r.responseText);
                            const datos = JSON.parse(payload.value);
                            Object.keys(datos).forEach(k => localStorage.setItem(k, datos[k]));
                            setMsg("✅ Restaurado. ¡Recarga la página!", "green");
                        } catch(e) { setMsg("❌ Error al procesar datos", "red"); }
                    } else setMsg("❌ No hay copias en la nube", "red");
                }
            });
        };

        document.getElementById('cloud-close').onclick = () => panel.remove();
    };

    const b = document.createElement('div');
    b.innerHTML = "☁️";
    b.title = "Nube CRG (Backup)";
    b.style = "position: fixed; bottom: 20px; right: 70px; background: #0050ff; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; z-index: 10004; box-shadow: 0 4px 10px rgba(0,0,0,0.3);";
    b.onclick = showCloudPanel;
    document.body.appendChild(b);

})();
