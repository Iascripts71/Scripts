// ==UserScript==
// @name         CRG: Backup Remoto Nube
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @version      0.28
// @author       Iascripts71
// @description  Genera archivos con formato: subforo-lista-crg-DD-MM-YYYY_HH-MM-SS.csv
// ==/UserScript==

(function() {
    'use strict';

    // Formato de fecha solicitado: DD-MM-YYYY_HH-MM-SS
    const getFormattedDate = () => {
        const d = new Date();
        const f = (n) => n.toString().padStart(2, '0');
        return `${f(d.getDate())}-${f(d.getMonth()+1)}-${d.getFullYear()}_${f(d.getHours())}-${f(d.getMinutes())}-${f(d.getSeconds())}`;
    };

    const getSubforo = () => {
        const nav = document.querySelector('.nav_main, #navstrip');
        return nav ? nav.innerText.split('>').pop().trim().toLowerCase().replace(/[^a-z0-9]/g, '-') : "general";
    };

    const clean = (txt) => txt ? txt.toString().replace(/"/g, '""').trim() : "";

    const generateCSV = () => {
        // Encabezados basados fielmente en tu archivo de ejemplo
        let csv = "ID,Título,Subtítulo,Autor,Creado,Modificado,Subforo,URL,Marcador,Valoración,Comentario\n";
        let count = 0;

        // Escaneamos el LocalStorage buscando los IDs de los cómics
        Object.keys(localStorage).forEach(key => {
            // Buscamos cualquier clave que contenga un ID numérico (ej: lm_visto_113035)
            let match = key.match(/\d+/);
            if (match) {
                let id = match[0];
                
                // Solo procesamos una vez por ID para evitar duplicados en el CSV
                if (key.includes('visto') || key.includes('status')) {
                    let titulo = localStorage.getItem(`lm_titulo_${id}`) || "Desconocido";
                    let subtitulo = localStorage.getItem(`lm_sub_${id}`) || "";
                    let autor = localStorage.getItem(`lm_autor_${id}`) || "";
                    let creado = localStorage.getItem(`lm_creado_${id}`) || "";
                    let modificado = localStorage.getItem(`lm_mod_${id}`) || "";
                    let subforo = getSubforo();
                    let url = `http://lamansion-crg.net/forum/index.php?showtopic=${id}`;
                    let marcador = localStorage.getItem(`lm_visto_${id}`) ? "Visto" : "";
                    let val = localStorage.getItem(`lm_val_${id}`) || "";
                    let com = localStorage.getItem(`lm_com_${id}`) || "";

                    csv += `"${id}","${clean(titulo)}","${clean(subtitulo)}","${clean(autor)}","${creado}","${modificado}","${subforo}","${url}","${marcador}","${clean(val)}","${clean(com)}"\n`;
                    count++;
                }
            }
        });
        return { content: "\ufeff" + csv, count: count };
    };

    const showCloudPanel = () => {
        if (document.getElementById('cloud-panel-crg')) return;
        const panel = document.createElement('div');
        panel.id = 'cloud-panel-crg';
        panel.style = "position: fixed; top: 15%; left: 50%; transform: translate(-50%, 0); background: #f4f7f6; border: 2px solid #0050ff; padding: 25px; z-index: 20000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 15px; font-family: sans-serif; width: 340px;";
        
        panel.innerHTML = `
            <h3 style="margin:0 0 10px 0; color:#0050ff;">☁️ Backup Nube CRG</h3>
            <textarea id="db-token" style="width:100%; height:50px; font-size:10px; margin-bottom:10px;" placeholder="Pega el Token de Dropbox...">${GM_getValue('db_token', '')}</textarea>
            <button id="btn-up" style="width:100%; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">📤 GUARDAR EN DROPBOX</button>
            <div id="cloud-msg" style="margin-top:15px; font-size:12px; text-align:center; font-weight:bold;"></div>
            <p id="cloud-close" style="text-align:center; margin-top:15px; cursor:pointer; text-decoration:underline; font-size:12px;">Cerrar</p>
        `;
        document.body.appendChild(panel);

        document.getElementById('btn-up').onclick = () => {
            const token = document.getElementById('db-token').value.trim();
            if(!token) return alert("Pega el token.");
            GM_setValue('db_token', token);

            const csvData = generateCSV();
            const subforo = getSubforo();
            const fecha = getFormattedDate();
            
            // Nombre de archivo solicitado: manga-lista-crg-fecha-hora
            const fileNameCsv = `${subforo}-lista-crg-${fecha}.csv`;
            const fileNameJson = `${subforo}-backup-crg-${fecha}.json`;

            document.getElementById('cloud-msg').innerText = "Subiendo datos...";

            // Subida CSV
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://content.dropboxapi.com/2/files/upload",
                headers: { 
                    "Authorization": "Bearer " + token, 
                    "Dropbox-API-Arg": JSON.stringify({ "path": "/" + fileNameCsv, "mode": "overwrite" }), 
                    "Content-Type": "application/octet-stream" 
                },
                data: csvData.content,
                onload: (r) => {
                    if (r.status === 200) {
                        document.getElementById('cloud-msg').innerText = `✅ Guardados ${csvData.count} cómics en Dropbox.`;
                        document.getElementById('cloud-msg').style.color = "green";
                    } else {
                        document.getElementById('cloud-msg').innerText = "❌ Error al subir. Revisa el Token.";
                        document.getElementById('cloud-msg').style.color = "red";
                    }
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
