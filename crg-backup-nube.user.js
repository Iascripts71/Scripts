// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @version      0.25
// @author       Iascripts71
// @description  Corrección: Captura total de datos para evitar archivos vacíos.
// ==/UserScript==

(function() {
    'use strict';

    const clean = (txt) => txt ? txt.toString().replace(/"/g, '""').trim() : "";

    const getAllData = () => {
        let items = [];
        let keys = Object.keys(localStorage);
        
        // Buscamos cualquier clave que parezca contener IDs (numéricos)
        keys.forEach(key => {
            // Intentamos extraer el ID: puede ser lm_visto_12345 o simplemente 12345
            let match = key.match(/\d+/); 
            if (match) {
                let id = match[0];
                let existente = items.find(i => i.id === id);
                
                if (!existente) {
                    existente = { id: id, titulo: "", estado: "", val: "", com: "" };
                    items.push(existente);
                }

                // Asignamos el valor según el tipo de clave que sea
                let val = localStorage.getItem(key);
                if (key.includes('visto') || key.includes('status')) existente.estado = val;
                else if (key.includes('val')) existente.val = val;
                else if (key.includes('com')) existente.com = val;
                else if (!existente.estado) existente.estado = val; // Por si acaso
            }
        });
        return items;
    };

    const generateCSV = (items) => {
        let csv = "ID,Título,Estado,Valoración,Comentario,URL\n";
        items.forEach(item => {
            let tituloElem = document.querySelector(`a[href*="showtopic=${item.id}"]`);
            let titulo = tituloElem ? tituloElem.innerText : "Archivo CRG " + item.id;
            let url = `http://lamansion-crg.net/forum/index.php?showtopic=${item.id}`;
            
            csv += `"${clean(item.id)}","${clean(titulo)}","${clean(item.estado)}","${clean(item.val)}","${clean(item.com)}","${url}"\n`;
        });
        return "\ufeff" + csv;
    };

    const showCloudPanel = () => {
        if (document.getElementById('cloud-panel-crg')) return;
        const panel = document.createElement('div');
        panel.id = 'cloud-panel-crg';
        panel.style = "position: fixed; top: 15%; left: 50%; transform: translate(-50%, 0); background: #f4f7f6; border: 2px solid #0050ff; padding: 25px; z-index: 20000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 15px; font-family: sans-serif; width: 340px;";
        
        panel.innerHTML = `
            <h3 style="margin:0 0 15px 0; color:#0050ff; font-size:18px;">☁️ Backup Nube CRG</h3>
            <textarea id="db-token" style="width:100%; height:50px; font-size:10px; margin-bottom:10px;" placeholder="Pega el Token de Dropbox...">${GM_getValue('db_token', '')}</textarea>
            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:10px;">📤 GUARDAR TODO</button>
            <button id="btn-down" style="width:100%; background:#007bff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">📥 RESTAURAR</button>
            <div id="cloud-msg" style="margin-top:10px; font-size:11px; text-align:center;"></div>
            <p id="cloud-close" style="text-align:center; margin-top:10px; font-size:12px; cursor:pointer; text-decoration:underline;">Cerrar</p>
        `;
        document.body.appendChild(panel);

        document.getElementById('btn-up').onclick = () => {
            const token = document.getElementById('db-token').value.trim();
            if(!token) return alert("Pega el token.");
            GM_setValue('db_token', token);

            const items = getAllData();
            if (items.length === 0) {
                document.getElementById('cloud-msg').innerText = "⚠️ No se encontraron datos para guardar.";
                document.getElementById('cloud-msg').style.color = "orange";
                return;
            }

            document.getElementById('cloud-msg').innerText = `Subiendo ${items.length} elementos...`;
            
            // Subida JSON
            let datosJson = {};
            Object.keys(localStorage).forEach(k => { datosJson[k] = localStorage.getItem(k); });

            GM_xmlhttpRequest({
                method: "POST",
                url: "https://content.dropboxapi.com/2/files/upload",
                headers: { "Authorization": "Bearer " + token, "Dropbox-API-Arg": JSON.stringify({ "path": "/backup_crg.json", "mode": "overwrite" }), "Content-Type": "application/octet-stream" },
                data: JSON.stringify(datosJson),
                onload: () => {
                    // Subida CSV
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: "https://content.dropboxapi.com/2/files/upload",
                        headers: { "Authorization": "Bearer " + token, "Dropbox-API-Arg": JSON.stringify({ "path": "/lista_vistos.csv", "mode": "overwrite" }), "Content-Type": "application/octet-stream" },
                        data: generateCSV(items),
                        onload: () => {
                            document.getElementById('cloud-msg').innerText = `✅ ¡Éxito! ${items.length} cómics guardados.`;
                            document.getElementById('cloud-msg').style.color = "green";
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
