// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @version      0.31
// @author       Iascripts71
// @description  Explorador de archivos de Dropbox integrado + Reparación de exportación.
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .crg-file-list { max-height: 150px; overflow-y: auto; background: #fff; border: 1px solid #ccc; margin-top: 10px; border-radius: 5px; display:none; }
        .crg-file-item { padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 11px; color: #333; text-align: left; }
        .crg-file-item:hover { background: #eef4ff; color: #0050ff; }
        .crg-loading { font-style: italic; color: #666; font-size: 11px; padding: 10px; }
    `);

    const getFormattedDate = () => {
        const d = new Date();
        const f = (n) => n.toString().padStart(2, '0');
        return `${f(d.getDate())}-${f(d.getMonth()+1)}-${d.getFullYear()}_${f(d.getHours())}-${f(d.getMinutes())}-${f(d.getSeconds())}`;
    };

    const getSubforo = () => {
        const nav = document.querySelector('.nav_main, #navstrip');
        return nav ? nav.innerText.split('>').pop().trim().toLowerCase().replace(/[^a-z0-9]/g, '-') : "general";
    };

    const showCloudPanel = () => {
        if (document.getElementById('cloud-panel-crg')) return;
        const panel = document.createElement('div');
        panel.id = 'cloud-panel-crg';
        panel.style = "position: fixed; top: 10%; left: 50%; transform: translate(-50%, 0); background: #f4f7f6; border: 2px solid #0050ff; padding: 25px; z-index: 20000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 15px; font-family: sans-serif; width: 380px; text-align:center;";
        
        panel.innerHTML = `
            <h3 style="margin:0 0 15px 0; color:#0050ff;">☁️ Explorador Nube CRG</h3>
            <textarea id="db-token" style="width:100%; height:40px; font-size:10px; margin-bottom:10px;" placeholder="Pega tu Token aquí...">${GM_getValue('db_token', '')}</textarea>

            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:10px;">📤 GUARDAR ESTADO ACTUAL</button>
            
            <button id="btn-list" style="width:100%; background:#007bff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">📥 VER ARCHIVOS EN DROPBOX</button>
            
            <div id="file-container" class="crg-file-list"></div>

            <div style="border-top: 1px solid #ccc; padding-top:10px; margin-top:15px;">
                <input type="file" id="file-pc" style="display:none;">
                <button id="btn-pc" style="width:100%; background:#6c757d; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;">📁 SUBIR DESDE MI PC</button>
            </div>

            <div id="cloud-msg" style="margin-top:15px; font-size:12px; font-weight:bold; min-height:15px;"></div>
            <p id="cloud-close" style="margin-top:15px; cursor:pointer; text-decoration:underline; font-size:12px; color:#888;">Cerrar Panel</p>
        `;
        document.body.appendChild(panel);

        const token = () => document.getElementById('db-token').value.trim();
        const msg = (t, color="#333") => { const m = document.getElementById('cloud-msg'); m.innerText = t; m.style.color = color; };

        // --- FUNCIÓN: LISTAR ARCHIVOS DE DROPBOX ---
        document.getElementById('btn-list').onclick = () => {
            const tk = token();
            if(!tk) return alert("Pega el Token.");
            
            const container = document.getElementById('file-container');
            container.innerHTML = '<div class="crg-loading">Conectando con Dropbox...</div>';
            container.style.display = 'block';

            GM_xmlhttpRequest({
                method: "POST",
                url: "https://api.dropboxapi.com/2/files/list_folder",
                headers: { "Authorization": "Bearer " + tk, "Content-Type": "application/json" },
                data: JSON.stringify({ "path": "" }),
                onload: (r) => {
                    if(r.status === 200) {
                        const files = JSON.parse(r.responseText).entries;
                        container.innerHTML = '';
                        if(files.length === 0) container.innerHTML = '<div class="crg-loading">Carpeta vacía.</div>';
                        
                        files.forEach(file => {
                            if(file.name.endsWith('.json') || file.name.endsWith('.csv')) {
                                const item = document.createElement('div');
                                item.className = 'crg-file-item';
                                item.innerText = "📄 " + file.name;
                                item.onclick = () => restaurarArchivo(file.name);
                                container.appendChild(item);
                            }
                        });
                    } else {
                        container.innerHTML = '<div class="crg-loading" style="color:red;">Error de conexión. Revisa el Token.</div>';
                    }
                }
            });
        };

        // --- FUNCIÓN: RESTAURAR (AL HACER CLIC EN UN ARCHIVO) ---
        const restaurarArchivo = (filename) => {
            if(!confirm(`¿Quieres restaurar los datos de "${filename}"?`)) return;
            const tk = token();
            msg("Restaurando...", "orange");

            GM_xmlhttpRequest({
                method: "POST",
                url: "https://content.dropboxapi.com/2/files/download",
                headers: { "Authorization": "Bearer " + tk, "Dropbox-API-Arg": JSON.stringify({ "path": "/" + filename }) },
                onload: (r) => {
                    if(r.status === 200) {
                        if(filename.endsWith('.csv')) {
                            // Lógica de procesamiento de CSV (asumida de v0.30)
                            alert("Función CSV: Se recomienda usar JSON para restaurar.");
                        } else {
                            const data = JSON.parse(r.responseText);
                            Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
                            alert("✅ Restauración completada.");
                            location.reload();
                        }
                    }
                }
            });
        };

        // --- FUNCIÓN: GUARDAR (EXPORTAR) ---
        document.getElementById('btn-up').onclick = () => {
            const tk = token();
            if(!tk) return alert("Pega el Token.");
            GM_setValue('db_token', tk);

            msg("Preparando datos...", "orange");
            let backup = {};
            Object.keys(localStorage).forEach(k => { backup[k] = localStorage.getItem(k); });

            const subforo = getSubforo();
            const fecha = getFormattedDate();
            const nombre = `${subforo}-backup-crg-${fecha}.json`;

            GM_xmlhttpRequest({
                method: "POST",
                url: "https://content.dropboxapi.com/2/files/upload",
                headers: { "Authorization": "Bearer " + tk, "Dropbox-API-Arg": JSON.stringify({ "path": "/" + nombre, "mode": "overwrite" }), "Content-Type": "application/octet-stream" },
                data: JSON.stringify(backup),
                onload: (r) => {
                    if(r.status === 200) msg("✅ Guardado: " + nombre, "green");
                    else msg("❌ Error al subir", "red");
                }
            });
        };

        // --- SUBIDA DESDE PC ---
        document.getElementById('btn-pc').onclick = () => document.getElementById('file-pc').click();
        document.getElementById('file-pc').onchange = (e) => {
            const tk = token();
            const file = e.target.files[0];
            if(!file || !tk) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                msg("Subiendo archivo PC...", "orange");
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://content.dropboxapi.com/2/files/upload",
                    headers: { "Authorization": "Bearer " + tk, "Dropbox-API-Arg": JSON.stringify({ "path": "/" + file.name }), "Content-Type": "application/octet-stream" },
                    data: evt.target.result,
                    onload: () => msg("✅ PC subido con éxito", "green")
                });
            };
            reader.readAsArrayBuffer(file);
        };

        document.getElementById('cloud-close').onclick = () => panel.remove();
    };

    const b = document.createElement('div');
    b.innerHTML = "☁️";
    b.style = "position: fixed; bottom: 20px; right: 70px; background: #0050ff; color: white; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 22px; z-index: 10004;";
    b.onclick = showCloudPanel;
    document.body.appendChild(b);
})();
