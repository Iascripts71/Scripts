// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @version      0.20
// @author       Iascripts71
// @description  Backup en Dropbox con manual de configuración detallado paso a paso.
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .crg-info-modal {
            position: fixed; top: 5%; left: 50%; transform: translate(-50%, 0);
            background: #1a1a1a; color: white; padding: 25px; z-index: 30000;
            border-radius: 15px; border: 2px solid #0050ff; width: 450px;
            font-family: sans-serif; text-align: left; box-shadow: 0 0 30px rgba(0,80,255,0.7);
            max-height: 85vh; overflow-y: auto;
        }
        .crg-info-modal h4 { margin-top:0; color:#0050ff; font-size:20px; border-bottom: 1px solid #333; padding-bottom:10px; }
        .crg-info-modal p { font-size:13px; line-height: 1.5; margin: 10px 0; }
        .crg-step-card { background:#252525; border-left: 4px solid #0050ff; padding:12px; margin-bottom:10px; border-radius:4px; }
        .crg-step-card b { color: #0050ff; display: block; margin-bottom: 5px; font-size: 14px; }
        .crg-alert { background: #441111; border: 1px solid #ff4444; padding: 8px; border-radius: 5px; font-size: 11px; margin-top: 5px; }
        
        #crg-btn-info {
            background: #1a1a1a; color: #0050ff !important; border: 2px solid #0050ff;
            border-radius: 50%; width: 30px; height: 30px; cursor: pointer;
            font-weight: bold; font-size: 16px; display: flex; align-items: center; justify-content: center;
        }
    `);

    const showCloudPanel = () => {
        if (document.getElementById('cloud-panel-crg')) return;
        const panel = document.createElement('div');
        panel.id = 'cloud-panel-crg';
        panel.style = "position: fixed; top: 15%; left: 50%; transform: translate(-50%, 0); background: #f4f7f6; border: 2px solid #0050ff; padding: 25px; z-index: 20000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 15px; font-family: sans-serif; width: 340px; color: #333;";
        
        panel.innerHTML = `
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin:0; color:#0050ff;">☁️ Nube Dropbox CRG</h3>
                <button id="crg-btn-info" title="Guía de configuración">ℹ️</button>
            </div>
            <div style="margin-bottom:15px;">
                <label style="font-size:11px; font-weight:bold;">TOKEN DE ACCESO:</label>
                <textarea id="db-token" style="width:100%; height:90px; padding:8px; border-radius:5px; border:1px solid #ccc; box-sizing: border-box; font-size:10px; font-family:monospace; resize:none;" placeholder="Pega aquí el Token generado en Dropbox...">${GM_getValue('db_token', '')}</textarea>
            </div>
            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:10px; box-shadow: 0 4px 0 #1e7e34;">📤 SUBIR BACKUP A DROPBOX</button>
            <button id="btn-down" style="width:100%; background:#007bff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; box-shadow: 0 4px 0 #0056b3;">📥 DESCARGAR DE LA NUBE</button>
            <div id="cloud-msg" style="margin-top:15px; font-size:12px; text-align:center; font-weight:bold; min-height:15px;"></div>
            <p id="cloud-close" style="text-align:center; margin-top:15px; color:#888; cursor:pointer; font-size:12px; text-decoration:underline;">Cerrar panel</p>
        `;
        document.body.appendChild(panel);

        document.getElementById('crg-btn-info').onclick = () => {
            const info = document.createElement('div');
            info.className = 'crg-info-modal';
            info.innerHTML = `
                <h4>Guía de Configuración Dropbox</h4>
                <p>Para usar este sistema, necesitas crear una "llave" (Token) en tu Dropbox. Sigue estos pasos exactamente:</p>
                
                <div class="crg-step-card">
                    <b>1. Crear la App</b>
                    Entra en <a href="https://www.dropbox.com/developers/apps" target="_blank" style="color:#00ff00">Dropbox Developers</a> y pulsa <b>Create App</b>. Elige "Scoped API" y "App Folder". Ponle cualquier nombre.
                </div>

                <div class="crg-step-card">
                    <b>2. Permisos (¡CRÍTICO!)</b>
                    Ve a la pestaña <b>Permissions</b>. Marca las casillas <u>files.content.write</u> y <u>files.content.read</u>.
                    <div class="crg-alert">⚠️ DEBES pulsar el botón <b>SUBMIT</b> al final de la página o el token no funcionará.</div>
                </div>

                <div class="crg-step-card">
                    <b>3. Token Permanente</b>
                    Ve a la pestaña <b>Settings</b>. En "Access token expiration", elige <b>No expiration</b>. Luego pulsa el botón <b>Generate</b>.
                </div>

                <div class="crg-step-card">
                    <b>4. Activar</b>
                    Copia el código largo que aparecerá y pégalo en el cuadro de texto del script.
                </div>

                <p style="font-size:11px; color:#aaa;"><i>* Este proceso solo se hace una vez. El backup permite archivos de más de 20MB y es totalmente privado en tu cuenta.</i></p>
                
                <button id="crg-info-close" style="width:100%; background:#0050ff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; margin-top:10px; font-weight:bold;">¡ENTENDIDO, VOY A ELLO!</button>
            `;
            document.body.appendChild(info);
            document.getElementById('crg-info-close').onclick = () => info.remove();
        };

        // Lógica de Subida (Optimizado)
        document.getElementById('btn-up').onclick = () => {
            const token = document.getElementById('db-token').value.trim();
            if(!token) return alert("Por favor, pega el token de Dropbox.");
            GM_setValue('db_token', token);
            
            let datos = {};
            for (let i = 0; i < localStorage.length; i++) {
                let k = localStorage.key(i);
                if (k.startsWith('lm_') || k.includes('status')) datos[k] = localStorage.getItem(k);
            }

            document.getElementById('cloud-msg').innerText = "Conectando con Dropbox...";
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://content.dropboxapi.com/2/files/upload",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Dropbox-API-Arg": JSON.stringify({ "path": "/backup_crg.json", "mode": "overwrite" }),
                    "Content-Type": "application/octet-stream"
                },
                data: JSON.stringify(datos),
                onload: (r) => {
                    if (r.status === 200) {
                        document.getElementById('cloud-msg').innerText = "✅ ¡Guardado con éxito!";
                        document.getElementById('cloud-msg').style.color = "green";
                    } else {
                        const err = r.responseText.includes("missing_scope") ? "Error: Falta pulsar SUBMIT en Permissions" : "Error de Token";
                        document.getElementById('cloud-msg').innerText = "❌ " + err;
                        document.getElementById('cloud-msg').style.color = "red";
                    }
                }
            });
        };

        // Lógica de Descarga (Optimizado)
        document.getElementById('btn-down').onclick = () => {
            const token = document.getElementById('db-token').value.trim();
            if(!token) return alert("Pega el token.");
            document.getElementById('cloud-msg').innerText = "Recuperando backup...";
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://content.dropboxapi.com/2/files/download",
                headers: { "Authorization": "Bearer " + token, "Dropbox-API-Arg": JSON.stringify({ "path": "/backup_crg.json" }) },
                onload: (r) => {
                    if(r.status === 200) {
                        const d = JSON.parse(r.responseText);
                        Object.keys(d).forEach(k => localStorage.setItem(k, d[k]));
                        alert("✅ Datos restaurados con éxito. La página se recargará.");
                        location.reload();
                    } else {
                        alert("❌ No se encontró archivo de backup en tu Dropbox.");
                    }
                }
            });
        };

        document.getElementById('cloud-close').onclick = () => panel.remove();
    };

    const b = document.createElement('div');
    b.innerHTML = "☁️";
    b.style = "position: fixed; bottom: 20px; right: 70px; background: #0050ff; color: white; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 22px; z-index: 10004; box-shadow: 0 4px 15px rgba(0,80,255,0.4); border: 1px solid rgba(255,255,255,0.2);";
    b.onclick = showCloudPanel;
    document.body.appendChild(b);

})();
