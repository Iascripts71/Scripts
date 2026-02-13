// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @version      0.13
// @author       Iascripts71
// @description  Backup en Dropbox con instrucciones para Token permanente.
// @updateURL    https://raw.githubusercontent.com/Iascripts71/Scripts/main/crg-backup-nube.user.js
// @downloadURL  https://raw.githubusercontent.com/Iascripts71/Scripts/main/crg-backup-nube.user.js
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .crg-info-modal {
            position: fixed; top: 8%; left: 50%; transform: translate(-50%, 0);
            background: #1a1a1a; color: white; padding: 25px; z-index: 30000;
            border-radius: 15px; border: 2px solid #0050ff; width: 400px;
            font-family: sans-serif; text-align: left; box-shadow: 0 0 25px rgba(0,80,255,0.6);
            max-height: 85vh; overflow-y: auto;
        }
        .crg-info-modal h4 { margin-top:0; color:#0050ff; font-size:18px; border-bottom: 1px solid #333; padding-bottom:10px; }
        .crg-info-modal p { font-size:13px; line-height: 1.5; margin: 8px 0; }
        .crg-info-modal ol { font-size: 12px; padding-left: 20px; color: #ccc; }
        .crg-info-modal li { margin-bottom: 10px; }
        .crg-info-modal b { color: #0050ff; }
        
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
                <h3 style="margin:0; color:#0050ff;">☁️ Backup Dropbox CRG</h3>
                <button id="crg-btn-info">ℹ️</button>
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="font-size:11px; font-weight:bold;">DROPBOX ACCESS TOKEN:</label>
                <input type="password" id="db-token" style="width:100%; padding:8px; border-radius:5px; border:1px solid #ccc; box-sizing: border-box;" value="${GM_getValue('db_token', '')}" placeholder="Pega el Access Token permanente">
            </div>

            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:10px;">📤 GUARDAR EN DROPBOX</button>
            <button id="btn-down" style="width:100%; background:#007bff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">📥 RECUPERAR DE DROPBOX</button>
            
            <div id="cloud-msg" style="margin-top:15px; font-size:12px; text-align:center; font-weight:bold; min-height:15px;"></div>
            
            <div style="text-align:center; margin-top:15px; border-top: 1px solid #ddd; padding-top: 10px;">
                <a href="https://www.dropbox.com/developers/apps" target="_blank" style="font-size:12px; color:#0050ff; text-decoration:none; font-weight:bold;">🔑 Consola de Apps Dropbox</a>
            </div>
            <p id="cloud-close" style="text-align:center; margin-top:10px; color:#888; cursor:pointer; font-size:12px; margin-bottom:0;">Cerrar ventana</p>
        `;
        document.body.appendChild(panel);

        document.getElementById('crg-btn-info').onclick = () => {
            const info = document.createElement('div');
            info.className = 'crg-info-modal';
            info.innerHTML = `
                <h4>Instrucciones para el Usuario</h4>
                <p>Para tener un backup infinito y gratuito, sigue estos pasos:</p>
                <ol>
                    <li>Entra en <b>Consola de Apps</b> y pulsa en <b>Create App</b>.</li>
                    <li>Selecciona <b>Scoped API</b> y <b>App Folder</b>. Ponle un nombre cualquiera.</li>
                    <li>En la pestaña <b>Permissions</b>, marca <b>files.content.write</b> y <b>files.content.read</b>. Dale a "Submit".</li>
                    <li>En la pestaña <b>Settings</b>, busca <b>Access token expiration</b> y cámbialo a <b>No expiration</b>.</li>
                    <li>Dale al botón <b>Generate</b>, copia ese código largo y pégalo aquí.</li>
                </ol>
                <p style="background:#222; padding:10px; border-radius:5px; font-size:11px; color:#aaa; border: 1px solid #444;">
                   <b>¿Por qué Dropbox?</b> Permite archivos de hasta 20MB (o más) sin borrar tus datos nunca.
                </p>
                <button id="crg-info-close" style="width:100%; background:#0050ff; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; margin-top:10px; font-weight:bold;">ENTENDIDO</button>
            `;
            document.body.appendChild(info);
            document.getElementById('crg-info-close').onclick = () => info.remove();
        };

        document.getElementById('btn-up').onclick = () => {
            const token = document.getElementById('db-token').value;
            if(!token) return alert("Pega el token de Dropbox.");
            GM_setValue('db_token', token);
            
            let datos = {};
            for (let i = 0; i < localStorage.length; i++) {
                let k = localStorage.key(i);
                if (k.startsWith('lm_') || k.includes('status')) datos[k] = localStorage.getItem(k);
            }

            document.getElementById('cloud-msg').innerText = "Subiendo archivo...";
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
                        document.getElementById('cloud-msg').innerText = "✅ Guardado en tu Dropbox";
                        document.getElementById('cloud-msg').style.color = "green";
                    } else {
                        document.getElementById('cloud-msg').innerText = "❌ Error: Revisa Permisos o Expiración";
                        document.getElementById('cloud-msg').style.color = "red";
                    }
                }
            });
        };

        document.getElementById('btn-down').onclick = () => {
            const token = document.getElementById('db-token').value;
            if(!token) return alert("Pega el token.");
            
            document.getElementById('cloud-msg').innerText = "Recuperando...";
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://content.dropboxapi.com/2/files/download",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Dropbox-API-Arg": JSON.stringify({ "path": "/backup_crg.json" })
                },
                onload: (r) => {
                    if(r.status === 200) {
                        const d = JSON.parse(r.responseText);
                        Object.keys(d).forEach(k => localStorage.setItem(k, d[k]));
                        alert("✅ Restaurado. Se recargará la página.");
                        location.reload();
                    } else {
                        alert("❌ No se encontró el backup o el token es inválido.");
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
