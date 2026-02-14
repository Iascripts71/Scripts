// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @version      0.30
// @author       Iascripts71
// @description  Restore Dual (JSON/CSV) + Subida desde PC + Formato fecha exacto.
// ==/UserScript==

(function() {
    'use strict';

    const getFormattedDate = () => {
        const d = new Date();
        const f = (n) => n.toString().padStart(2, '0');
        // Formato: DD-MM-YYYY_HH-MM-SS
        return `${f(d.getDate())}-${f(d.getMonth()+1)}-${d.getFullYear()}_${f(d.getHours())}-${f(d.getMinutes())}-${f(d.getSeconds())}`;
    };

    const getSubforo = () => {
        const nav = document.querySelector('.nav_main, #navstrip');
        return nav ? nav.innerText.split('>').pop().trim().toLowerCase().replace(/[^a-z0-9]/g, '-') : "general";
    };

    // Función para procesar un CSV y meterlo en LocalStorage
    const processCSVtoLocalStorage = (csvText) => {
        const lines = csvText.split(/\r?\n/);
        if (lines.length < 2) return;
        
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const idxID = headers.indexOf("ID");
        const idxMarcador = headers.indexOf("Marcador");
        const idxVal = headers.indexOf("Valoración");
        const idxCom = headers.indexOf("Comentario");

        let count = 0;
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim());
            if (row[idxID]) {
                const id = row[idxID];
                // Restaurar Marcador (Visto)
                if (idxMarcador !== -1 && row[idxMarcador].toLowerCase() === "visto") {
                    localStorage.setItem(`lm_visto_${id}`, "true");
                }
                // Restaurar Valoración
                if (idxVal !== -1 && row[idxVal]) {
                    localStorage.setItem(`lm_val_${id}`, row[idxVal]);
                }
                // Restaurar Comentario
                if (idxCom !== -1 && row[idxCom]) {
                    localStorage.setItem(`lm_com_${id}`, row[idxCom]);
                }
                count++;
            }
        }
        return count;
    };

    const showCloudPanel = () => {
        if (document.getElementById('cloud-panel-crg')) return;
        const panel = document.createElement('div');
        panel.id = 'cloud-panel-crg';
        panel.style = "position: fixed; top: 10%; left: 50%; transform: translate(-50%, 0); background: #f4f7f6; border: 2px solid #0050ff; padding: 25px; z-index: 20000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 15px; font-family: sans-serif; width: 360px;";
        
        panel.innerHTML = `
            <h3 style="margin:0 0 15px 0; color:#0050ff; text-align:center;">☁️ Gestión Nube CRG</h3>
            <textarea id="db-token" style="width:100%; height:40px; font-size:10px; margin-bottom:10px;">${GM_getValue('db_token', '')}</textarea>

            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; font-weight:bold; margin-bottom:10px;">📤 GUARDAR LISTAS (JSON+CSV)</button>
            
            <button id="btn-down" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; font-weight:bold; margin-bottom:10px;">📥 RESTAURAR (Desde CSV o JSON)</button>

            <div style="border-top: 1px solid #ccc; padding-top:10px; margin-top:10px;">
                <input type="file" id="file-pc" style="display:none;">
                <button id="btn-pc" style="width:100%; background:#6c757d; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; font-weight:bold;">📁 SUBIR ARCHIVO DE PC A NUBE</button>
            </div>

            <div id="cloud-msg" style="margin-top:15px; font-size:12px; text-align:center; font-weight:bold;"></div>
            <p id="cloud-close" style="text-align:center; margin-top:15px; cursor:pointer; text-decoration:underline; font-size:12px; color:#888;">Cerrar Panel</p>
        `;
        document.body.appendChild(panel);

        // --- LÓGICA DE RESTAURACIÓN (JSON o CSV) ---
        document.getElementById('btn-down').onclick = () => {
            const tk = document.getElementById('db-token').value.trim();
            const filename = prompt("Escribe el nombre del archivo en Dropbox para restaurar (ej: manga-lista-crg...csv):");
            if (!filename) return;

            document.getElementById('cloud-msg').innerText = "Descargando y procesando...";
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://content.dropboxapi.com/2/files/download",
                headers: { "Authorization": "Bearer " + tk, "Dropbox-API-Arg": JSON.stringify({ "path": "/" + filename }) },
                onload: (r) => {
                    if (r.status === 200) {
                        if (filename.toLowerCase().endsWith('.csv')) {
                            const num = processCSVtoLocalStorage(r.responseText);
                            alert(`✅ CSV procesado: ${num} elementos restaurados.`);
                        } else {
                            const d = JSON.parse(r.responseText);
                            Object.keys(d).forEach(k => localStorage.setItem(k, d[k]));
                            alert("✅ JSON restaurado con éxito.");
                        }
                        location.reload();
                    } else alert("❌ Error: No se encontró el archivo.");
                }
            });
        };

        // --- SUBIR DESDE PC ---
        document.getElementById('btn-pc').onclick = () => document.getElementById('file-pc').click();
        document.getElementById('file-pc').onchange = (e) => {
            const tk = document.getElementById('db-token').value.trim();
            const file = e.target.files[0];
            if(!file || !tk) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const subforo = getSubforo();
                const fecha = getFormattedDate();
                const finalName = `${subforo}-pc-import-${fecha}.${file.name.split('.').pop()}`;
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://content.dropboxapi.com/2/files/upload",
                    headers: { "Authorization": "Bearer " + tk, "Dropbox-API-Arg": JSON.stringify({ "path": "/" + finalName }), "Content-Type": "application/octet-stream" },
                    data: evt.target.result,
                    onload: () => { document.getElementById('cloud-msg').innerText = "✅ Subido: " + finalName; }
                });
            };
            reader.readAsArrayBuffer(file);
        };

        document.getElementById('cloud-close').onclick = () => panel.remove();
    };

    // Botón flotante
    const b = document.createElement('div');
    b.innerHTML = "☁️";
    b.style = "position: fixed; bottom: 20px; right: 70px; background: #0050ff; color: white; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 22px; z-index: 10004;";
    b.onclick = showCloudPanel;
    document.body.appendChild(b);
})();
