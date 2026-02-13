// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @version      0.27
// @author       Iascripts71
// @description  Backup Dual con sello de tiempo: subforo-lista-crg-fecha-hora
// ==/UserScript==

(function() {
    'use strict';

    // 1. Función para obtener fecha y hora formateada
    const getTimestamp = () => {
        const d = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    };

    const getSubforoName = () => {
        try {
            const nav = document.querySelector('.nav_main, #navstrip');
            if (nav) {
                const links = nav.querySelectorAll('a');
                if (links.length > 0) {
                    let lastLink = links[links.length - 1].innerText.toLowerCase().trim();
                    return lastLink.replace(/[^a-z0-9]/g, '-');
                }
            }
        } catch (e) {}
        return "crg-general";
    };

    const clean = (txt) => txt ? txt.toString().replace(/"/g, '""').trim() : "";

    const getAllData = () => {
        let items = [];
        let keys = Object.keys(localStorage);
        keys.forEach(key => {
            let match = key.match(/\d+/); 
            if (match) {
                let id = match[0];
                let existente = items.find(i => i.id === id);
                if (!existente) {
                    existente = { id: id, titulo: "", estado: "", val: "", com: "" };
                    items.push(existente);
                }
                let val = localStorage.getItem(key);
                if (key.includes('visto') || key.includes('status')) existente.estado = val;
                else if (key.includes('val')) existente.val = val;
                else if (key.includes('com')) existente.com = val;
            }
        });
        return items;
    };

    const generateCSV = (items) => {
        let csv = "ID,Título,Estado,Valoración,Comentario,URL\n";
        items.forEach(item => {
            let tituloElem = document.querySelector(`a[href*="showtopic=${item.id}"]`);
            let titulo = tituloElem ? tituloElem.innerText : "ID " + item.id;
            let url = `http://lamansion-crg.net/forum/index.php?showtopic=${item.id}`;
            csv += `"${clean(item.id)}","${clean(titulo)}","${clean(item.estado)}","${clean(item.val)}","${clean(item.com)}","${url}"\n`;
        });
        return "\ufeff" + csv;
    };

    const showCloudPanel = () => {
        if (document.getElementById('cloud-panel-crg')) return;
        const subforo = getSubforoName();
        const panel = document.createElement('div');
        panel.id = 'cloud-panel-crg';
        panel.style = "position: fixed; top: 15%; left: 50%; transform: translate(-50%, 0); background: #f4f7f6; border: 2px solid #0050ff; padding: 25px; z-index: 20000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 15px; font-family: sans-serif; width: 340px;";
        
        panel.innerHTML = `
            <h3 style="margin:0 0 5px 0; color:#0050ff; font-size:18px;">☁️ Backup Nube CRG</h3>
            <p style="margin:0 0 15px 0; font-size:10px; color:#666;">Sección: ${subforo.toUpperCase()}</p>
            <textarea id="db-token" style="width:100%; height:50px; font-size:10px; margin-bottom:10px;">${GM_getValue('db_token', '')}</textarea>
            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:10px;">📤 GUARDAR EN DROPBOX</button>
            <button id="btn-down" style="width:100%; background:#007bff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">📥 RESTAURAR (Último JSON)</button>
            <div id="cloud-msg" style="margin-top:10px; font-size:11px; text-align:center; font-weight:bold;"></div>
            <p id="cloud-close" style="text-align:center; margin-top:10px; font-size:12px; cursor:pointer; text-decoration:underline; color:#888;">Cerrar</p>
        `;
        document.body.appendChild(panel);

        document.getElementById('btn-up').onclick = () => {
            const token = document.getElementById('db-token').value.trim();
            if(!token) return alert("Pega el token.");
            GM_setValue('db_token', token);

            const items = getAllData();
            const subforo = getSubforoName();
            const time = getTimestamp();
            
            // Nombres de archivos solicitados
            const fileNameJson = `${subforo}-backup-crg-${time}.json`;
            const fileNameCsv = `${subforo}-lista-crg-${time}.csv`;

            document.getElementById('cloud-msg').innerText = "Subiendo archivos...";
            
            let datosJson = {};
            Object.keys(localStorage).forEach(k => { datosJson[k] = localStorage.getItem(k); });

            // Subida JSON
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://content.dropboxapi.com/2/files/upload",
                headers: { "Authorization": "Bearer " + token, "Dropbox-API-Arg": JSON.stringify({ "path": `/${fileNameJson}`, "mode": "overwrite" }), "Content-Type": "application/octet-stream" },
                data: JSON.stringify(datosJson),
                onload: () => {
                    // Subida CSV
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: "https://content.dropboxapi.com/2/files/upload",
                        headers: { "Authorization": "Bearer " + token, "Dropbox-API-Arg": JSON.stringify({ "path": `/${fileNameCsv}`, "mode": "overwrite" }), "Content-Type": "application/octet-stream" },
                        data: generateCSV(items),
                        onload: (r) => {
                            if (r.status === 200) {
                                document.getElementById('cloud-msg').innerText = `✅ ¡Guardado con éxito!`;
                                document.getElementById('cloud-msg').style.color = "green";
                            }
                        }
                    });
                }
            });
        };

        document.getElementById('cloud-close').onclick = () => panel.remove();
    };

    const b = document.createElement('div');
    b.innerHTML = "☁️";
    b.style = "position: fixed; bottom: 20px; right: 70px; background: #0050ff; color: white; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 22px; z-index: 10004;";
    b.onclick = showCloudPanel;
    document.body.appendChild(b);
})();
