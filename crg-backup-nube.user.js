// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @version      0.24
// @author       Iascripts71
// @description  Backup Dual: JSON + CSV Profesional con Valoración y Comentarios.
// ==/UserScript==

(function() {
    'use strict';

    // Función para limpiar textos de comas y comillas para el CSV
    const clean = (txt) => {
        if (!txt) return "";
        return txt.toString().replace(/"/g, '""');
    };

    const generateEnrichedCSV = () => {
        // Encabezados exactos para compatibilidad con Excel
        let csv = "ID,Título,Estado,Valoración,Comentario,URL\n";
        
        // Creamos un set de IDs únicos para no repetir filas
        let ids = new Set();
        for (let i = 0; i < localStorage.length; i++) {
            let k = localStorage.key(i);
            if (k.startsWith('lm_')) {
                let id = k.split('_').pop(); // Extrae el número del final
                if (!isNaN(id)) ids.add(id);
            }
        }

        ids.forEach(id => {
            // Buscamos los datos en LocalStorage (ajusta los nombres si tu script usa otros)
            let estado = localStorage.getItem(`lm_visto_${id}`) || localStorage.getItem(`lm_status_${id}`) || "";
            let valoracion = localStorage.getItem(`lm_val_${id}`) || ""; // Ejemplo: lm_val_113035
            let comentario = localStorage.getItem(`lm_com_${id}`) || ""; // Ejemplo: lm_com_113035
            
            // Intentamos capturar el título si el usuario está en la página de la lista
            let tituloElement = document.querySelector(`a[href*="showtopic=${id}"]`);
            let titulo = tituloElement ? tituloElement.innerText : "ID: " + id;
            let url = `http://lamansion-crg.net/forum/index.php?showtopic=${id}`;

            // Solo añadimos la fila si hay algún dato relevante
            if (estado || valoracion || comentario) {
                csv += `"${clean(id)}","${clean(titulo)}","${clean(estado)}","${clean(valoracion)}","${clean(comentario)}","${url}"\n`;
            }
        });
        
        return "\ufeff" + csv; // Añadimos BOM para que Excel detecte bien los acentos
    };

    // ... (Estilos y panel se mantienen de la v0.22/23) ...
    GM_addStyle(`
        .crg-info-modal { position: fixed; top: 5%; left: 50%; transform: translate(-50%, 0); background: #1a1a1a; color: white; padding: 25px; z-index: 30000; border-radius: 15px; border: 2px solid #0050ff; width: 450px; font-family: sans-serif; box-shadow: 0 0 30px rgba(0,80,255,0.7); }
    `);

    const showCloudPanel = () => {
        if (document.getElementById('cloud-panel-crg')) return;
        const panel = document.createElement('div');
        panel.id = 'cloud-panel-crg';
        panel.style = "position: fixed; top: 15%; left: 50%; transform: translate(-50%, 0); background: #f4f7f6; border: 2px solid #0050ff; padding: 25px; z-index: 20000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 15px; font-family: sans-serif; width: 340px;";
        
        panel.innerHTML = `
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin:0; color:#0050ff;">☁️ Backup Pro CRG</h3>
            </div>
            <textarea id="db-token" style="width:100%; height:60px; font-size:10px; margin-bottom:10px;" placeholder="Pega el Token aquí...">${GM_getValue('db_token', '')}</textarea>
            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:10px;">📤 GUARDAR EN NUBE (JSON+CSV)</button>
            <button id="btn-down" style="width:100%; background:#007bff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">📥 RESTAURAR DATOS (JSON)</button>
            <div id="cloud-msg" style="margin-top:15px; font-size:12px; text-align:center; font-weight:bold;"></div>
            <p id="cloud-close" style="text-align:center; margin-top:10px; color:#888; cursor:pointer; font-size:12px; text-decoration:underline;">Cerrar panel</p>
        `;
        document.body.appendChild(panel);

        document.getElementById('btn-up').onclick = () => {
            const token = document.getElementById('db-token').value.trim();
            if(!token) return alert("Pega el token.");
            GM_setValue('db_token', token);
            
            document.getElementById('cloud-msg').innerText = "Subiendo backup dual...";
            
            let datosJson = {};
            for (let i = 0; i < localStorage.length; i++) {
                let k = localStorage.key(i);
                if (k.startsWith('lm_')) datosJson[k] = localStorage.getItem(k);
            }

            // Subida 1: JSON técnico
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://content.dropboxapi.com/2/files/upload",
                headers: { "Authorization": "Bearer " + token, "Dropbox-API-Arg": JSON.stringify({ "path": "/backup_crg.json", "mode": "overwrite" }), "Content-Type": "application/octet-stream" },
                data: JSON.stringify(datosJson),
                onload: () => {
                    // Subida 2: CSV Profesional
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: "https://content.dropboxapi.com/2/files/upload",
                        headers: { "Authorization": "Bearer " + token, "Dropbox-API-Arg": JSON.stringify({ "path": "/lista_vistos_crg.csv", "mode": "overwrite" }), "Content-Type": "application/octet-stream" },
                        data: generateEnrichedCSV(),
                        onload: (r) => {
                            if (r.status === 200) {
                                document.getElementById('cloud-msg').innerText = "✅ Guardado: backup_crg.json y lista_vistos_crg.csv";
                                document.getElementById('cloud-msg').style.color = "green";
                            }
                        }
                    });
                }
            });
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
