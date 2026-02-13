// ==UserScript==
// @name         CRG: Gestor de Colección Personalizado
// @namespace    Violentmonkey Scripts
// @match        *://lamansion-crg.net/forum/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @version      5.6
// @author       Iascripts71
// @description  Panel con leyenda personalizable, colores y parpadeo. Con sistema de actualización opcional.
// @updateURL    https://raw.githubusercontent.com/Iascripts71/Scripts/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/Iascripts71/Scripts/main/script.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_VERSION = "5.6";
    const UPDATE_URL = "https://raw.githubusercontent.com/Iascripts71/Scripts/main/script.user.js";

    // 1. Estilos CSS
    const inyectarCSS = () => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes crgBlink {
                0% { opacity: 1; }
                50% { opacity: 0.3; }
                100% { opacity: 1; }
            }
            .crg-blink { animation: crgBlink 1.2s infinite ease-in-out !important; }
            #crg-settings-panel table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            #crg-settings-panel td { padding: 6px 4px; border-bottom: 1px solid #eee; vertical-align: middle; }
            #crg-settings-panel th { text-align: left; font-size: 11px; color: #888; text-transform: uppercase; padding-bottom: 5px; }
            .crg-input-text { width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 6px; font-size: 12px; box-sizing: border-box; }
            .update-banner { background: #fff3cd; color: #856404; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 12px; display: none; border: 1px solid #ffeeba; text-align: center; }
            .crg-info-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f9f9f9; border: 1px solid #999; padding: 20px; z-index: 10001; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border-radius: 12px; width: 400px; font-size: 13px; line-height: 1.5; color: #444; }
        `;
        document.head.appendChild(style);
    };

    // 2. Valores por defecto
    const defaults = {
        enabled: true,
        note0: "No descargado.",
        note1: "Descargado. No leído.",
        note2: "Sin significado aún",
        note3: "No me gustó. Eliminado.",
        note4: "Me gustó. Guardado.",
        color0: '#ffff00', color1: '#00a2ff', color2: '#9e9e9e', color3: '#ff0000', color4: '#00ff00',
        blink0: false, blink1: false, blink2: false, blink3: false, blink4: false
    };

    const hexToSoftRgba = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, 0.25)`;
    };

    const checkUpdate = (callback) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: UPDATE_URL,
            nocache: true,
            onload: (response) => {
                const match = response.responseText.match(/@version\s+([\d.]+)/);
                if (match && match[1] !== SCRIPT_VERSION) {
                    callback(match[1]);
                }
            }
        });
    };

    // 3. Función del Panel
    const showPanel = () => {
        if (document.getElementById('crg-settings-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'crg-settings-panel';
        panel.style = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 1px solid #ccc; padding: 25px; z-index: 10000; box-shadow: 0 15px 50px rgba(0,0,0,0.5); border-radius: 16px; font-family: sans-serif; width: 500px; color: #333;";

        let rowsHtml = '';
        for (let i = 0; i <= 4; i++) {
            const note = GM_getValue(`note${i}`, defaults[`note${i}`]);
            const col = GM_getValue(`color${i}`, defaults[`color${i}`]);
            const blk = GM_getValue(`blink${i}`, defaults[`blink${i}`]);
            rowsHtml += `
                <tr>
                    <td style="font-weight:bold; color:#0050ff; font-size:14px;">#${i}</td>
                    <td><input type="text" id="crg-note-${i}" value="${note}" class="crg-input-text"></td>
                    <td style="text-align:center"><input type="color" id="crg-col-${i}" value="${col}" style="width:30px; height:28px; border:none; cursor:pointer; background:none;"></td>
                    <td style="text-align:center"><input type="checkbox" id="crg-blk-${i}" ${blk ? 'checked' : ''}></td>
                </tr>`;
        }

        panel.innerHTML = `
            <div id="crg-update-info" class="update-banner">
                🚀 ¡Nueva versión disponible! <a href="${UPDATE_URL}" target="_blank" style="font-weight:bold; color:#856404; text-decoration:underline;">Instalar actualización</a>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <h3 style="margin: 0; color: #0050ff;">Gestión de Colección CRG</h3>
                <span style="font-size:10px; color:#aaa;">v${SCRIPT_VERSION} | Iascripts71</span>
            </div>
            <p style="font-size: 12px; color: #666; margin-bottom: 20px;">Personaliza el significado de tus estatus y su apariencia visual.</p>
            <label style="display:flex; align-items:center; margin-bottom:15px; font-weight:bold; font-size: 14px; cursor:pointer;">
                <input type="checkbox" id="crg-chk-en" ${GM_getValue('enabled', defaults.enabled) ? 'checked' : ''} style="margin-right:10px;"> Activar sistema de identificación
            </label>
            <table>
                <thead>
                    <tr><th>Est.</th><th>Significado Personal</th><th style="text-align:center">Color</th><th style="text-align:center">Blink</th></tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <div style="margin-top:25px; display:flex; justify-content:space-between; align-items:center;">
                <button id="crg-btn-info" style="background:#eee; border:none; color:#555; padding:8px 15px; border-radius:8px; cursor:pointer; font-size:12px;">ℹ️ Información</button>
                <div>
                    <button id="crg-btn-cancel" style="background:none; border:none; color:#888; cursor:pointer; padding:5px 15px;">Cancelar</button>
                    <button id="crg-btn-save" style="background:#0050ff; color:white; border:none; padding:10px 25px; border-radius:10px; cursor:pointer; font-weight:bold; margin-left:10px;">Guardar Cambios</button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Lógica del botón Información
        document.getElementById('crg-btn-info').onclick = () => {
            const info = document.createElement('div');
            info.className = 'crg-info-modal';
            info.innerHTML = `
                <h4 style="margin-top:0; color:#0050ff;">¿Cómo funciona este script?</h4>
                <p>Este gestor resalta con un "sombreado de color" los enlaces de los cómics en el foro basándose en el "Estatus" que tengan asignado en la Mansión-CRG.</p>
                <ul>
                    <li><b>Color:</b> Elige el color de fondo para cada estado (0 al 4).</li>
                    <li><b>Significado:</b> Etiquetas personales para recordar qué representa cada estatus para ti.</li>

                    <li><b>Blink:</b> Haz que los enlaces parpadeen para destacar estados importantes.</li>
                </ul>
                <p style="font-size:11px; color:#888;">Los cambios se aplican al recargar la página del foro.</p>
                <button id="crg-info-close" style="width:100%; background:#0050ff; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer; margin-top:10px;">Entendido</button>
            `;
            document.body.appendChild(info);
            document.getElementById('crg-info-close').onclick = () => info.remove();
        };

        checkUpdate((v) => {
            document.getElementById('crg-update-info').style.display = 'block';
        });

        document.getElementById('crg-btn-cancel').onclick = () => panel.remove();
        document.getElementById('crg-btn-save').onclick = () => {
            GM_setValue('enabled', document.getElementById('crg-chk-en').checked);
            for (let i = 0; i <= 4; i++) {
                GM_setValue(`note${i}`, document.getElementById(`crg-note-${i}`).value);
                GM_setValue(`color${i}`, document.getElementById(`crg-col-${i}`).value);
                GM_setValue(`blink${i}`, document.getElementById(`crg-blk-${i}`).checked);
            }
            panel.remove();
            location.reload();
        };
    };

    GM_registerMenuCommand('🎨 Gestionar mi Sistema de Colores', showPanel);

    const aplicarEstilos = () => {
        if (!GM_getValue('enabled', defaults.enabled)) return;

        for (let i = 0; i <= 4; i++) {
            const hex = GM_getValue(`color${i}`, defaults[`color${i}`]);
            const isBlink = GM_getValue(`blink${i}`, defaults[`blink${i}`]);
            const softColor = hexToSoftRgba(hex);

            const elms = document.querySelectorAll(`.lm-tm.status-${i}`);
            elms.forEach(span => {
                let link = span.previousElementSibling;
                while (link && link.tagName !== 'A' && link.previousElementSibling) {
                    link = link.previousElementSibling;
                }
                if (link && link.tagName === 'A') {
                    link.style.backgroundColor = softColor;
                    link.style.padding = '2px 8px';
                    link.style.borderRadius = '5px';
                    link.style.border = `1px solid ${hex}44`;
                    link.style.fontWeight = '500';
                    link.style.display = 'inline-block';
                    if (isBlink) link.classList.add('crg-blink');
                    else link.classList.remove('crg-blink');
                }
            });
        }
    };

    inyectarCSS();
    setTimeout(aplicarEstilos, 600);
    const observer = new MutationObserver(aplicarEstilos);
    observer.observe(document.body, { childList: true, subtree: true });

})();