// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @version      0.17
// @author       Iascripts71
// @description  Backup en Dropbox con depuración de errores.
// @updateURL    https://raw.githubusercontent.com/Iascripts71/Scripts/main/crg-backup-nube.user.js
// @downloadURL  https://raw.githubusercontent.com/Iascripts71/Scripts/main/crg-backup-nube.user.js
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .crg-info-modal {
            position: fixed; top: 10%; left: 50%; transform: translate(-50%, 0);
            background: #1a1a1a; color: white; padding: 25px; z-index: 30000;
            border-radius: 15px; border: 2px solid #0050ff; width: 400px;
            font-family: sans-serif; text-align: left; box-shadow: 0 0 25px rgba(0,80,255,0.6);
        }
        .crg-info-modal h4 { margin:0 0 10px 0; color:#0050ff; border-bottom: 1px solid #333; padding-bottom:10px; }
        .db-help-step { background:#222; border-left: 3px solid #0050ff; padding:8px; margin:10px 0; font-size:12px; }
        
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
                <button id="crg-btn-info">ℹ️</button>
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="font-size:11px; font-weight:bold;">TOKEN DE ACCESO:</label>
                <textarea id="db-token" style="width:100%; height:80px; padding:8px; border-radius:5px; border:1px solid #ccc; box-sizing: border-box; font-size:10px; font-family:monospace; resize:none;">${GM_getValue('db_token', '')}</textarea>
            </div>

            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:10px;">📤 SUBIR BACKUP</button>
            <button id="btn-down" style="width:100%; background:#007bff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">📥 DESCARGAR BACKUP</button>
            
            <div id="cloud-msg" style="margin-top:15px; font-size:12px; text-align:center; font-weight:bold; min-height:15px;"></div>
            
            <p id="cloud-close" style="text-align:center; margin-top:15px; color:#888; cursor:pointer; font-size:12px; margin-bottom:0; text-decoration:underline;">Cerrar panel</p>
        `;
        document.body.appendChild(panel);

        document.getElementById('crg-btn-info').onclick = () => {
            const info = document.createElement('div');
            info.className = 'crg-info-modal';
            info.innerHTML = `
                <h4>Solución al Error</h4>
                <p>Si te da error de permisos tras configurarlo:</p>
                <div class="db-help-step">
                    1. Ve a <b>Permissions</b>, marca las casillas y pulsa <b>SUBMIT</b>.
                </div>
                <div class="db-help-step">
                    2. Vuelve a <b>Settings</b> y genera un <b>TOKEN NUEVO</b>. El antiguo ya no sirve tras cambiar permisos.
                </div>
                <button id="crg-info-close" style="width:100%; background:#0050ff; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; margin-top:15px; font-weight:bold;">ENTENDIDO</button>
            `;
            document.body.appendChild(info);
            document.getElementById('crg-info-close').onclick = () => info.remove();
        };

        document.getElementById('btn-up').onclick = () => {
            const token = document.getElementById('db-token').value.trim();
            if(!token) return alert("Pega el token.");
            GM_setValue('db_token', token);
            
            let datos = {};
            for (let i = 0; i < localStorage.length; i++) {
                let k = localStorage.key(i);
                if (k.startsWith('lm_') || k.includes('status')) datos[k] = localStorage.getItem(k);
            }

            document.getElementById('cloud-msg').innerText = "Subiendo...";
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
                        document.getElementById('cloud-msg').innerText = "✅ ¡Backup guardado!";
                        document.getElementById('cloud-msg').style.color = "green";
                    } else {
                        const errorMsg = JSON.parse(r.responseText);
                        console.error("DETALLE ERROR DROPBOX:", errorMsg);
                        document.getElementById('cloud-msg').innerText = "❌ Error: " + (errorMsg.error_summary || "Token inválido");
                        document.getElementById('cloud-msg').style.color = "red";
                    }
                }
            });
        };

        document.getElementById('btn-down').onclick = () => {
            const token = document.getElementById('db-token').value.trim();
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://content.dropboxapi.com/2/files/download",
                headers: { "Authorization": "Bearer " + token, "Dropbox-API-Arg": JSON.stringify({ "path": "/backup_crg.json" }) },
                onload: (r) => {
                    if(r.status === 200) {
                        const d = JSON.parse(r.responseText);
                        Object.keys(d).forEach(k => localStorage.setItem(k, d[k]));
                        alert("✅ Datos recuperados."); location.reload();
                    } else {
                        alert("❌ Error: " + r.status);
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
