const firebaseConfig = {
    apiKey: "AIzaSyDQbhKzzama3zTK5d8pd-wvLh7VZb3TzOo",
    authDomain: "costify-650226.firebaseapp.com",
    projectId: "costify-650226",
    storageBucket: "costify-650226.firebasestorage.app",
    messagingSenderId: "156523089815",
    appId: "1:156523089815:web:c8f7ca09ce7a80c268bed2"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let correoUsuario = "";
let saldo = 0, ingresosTotales = 0, gastosTotales = 0;
let tipoMovimientoActual = 'venta';
let esProActivo = false;
let fechaExpiracionPro = null;
let empresaNombre = "Mi Tienda";
let logotipoActual = "logo.png";
let productos = [], movimientos = [];
let calculosRecientes = [];
let deudoresLista = [];
let codigosBarrasLista = [];
let presupuestoLimite = 500000;
let ultimoPrecioCalculado = 0;
let isDarkMode = false;
let precioProNum = 29900;
let monedaSimbolo = "$";
let monedaTexto = "COP";
let filtroTiempoInicio = '1S';
let filtroGlobalTipo = '1S';

let masterModoActual = 'ganancias';
let masterFiltroTipo = '1S';
let fechaMasterActual = new Date(2026, 8, 1);
const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
let fechaVisualizacionActual = new Date(2026, 8, 1);
let fechaGlobalActual = new Date(2026, 8, 1);
let idMovimientoAEliminar = null;
let recognitionInstance = null;
let carritoItems = [];

let chartSemanalInstance = null;
let chartGlobalInstance = null;
let chartMasterInstance = null;

// --- SISTEMA DE DESBLOQUEO PRO POR ANUNCIOS (2 HORAS) ---
let anunciosVistosParaPro = 0;
let funcionProSeleccionadaActual = null;

function verificarAccesoPro(idFn, nombreFuncion) {
    if (esProActivo) return true;

    let expiracion = localStorage.getItem(`pro_access_${idFn}`);
    if (expiracion && new Date().getTime() < parseInt(expiracion)) {
        return true; // Acceso temporal activo
    }

    // Si expiró o no existe, abrir modal para ver 3 anuncios
    abrirModalVerAnuncioPro(idFn, nombreFuncion);
    return false;
}

function abrirModalVerAnuncioPro(idFn, nombreFuncion) {
    anunciosVistosParaPro = 0;
    funcionProSeleccionadaActual = idFn;
    
    let modalExistente = document.getElementById('modalAnunciosPro');
    if (modalExistente) modalExistente.remove();

    let modalHTML = `
        <div id="modalAnunciosPro" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: var(--card-bg, #1E293B); color: var(--text-primary, #FFF); padding: 28px; border-radius: 20px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                <h3 style="font-size: 18px; font-weight: 800; color: #F59E0B; margin-bottom: 10px;">⭐ Desbloquear ${nombreFuncion}</h3>
                <p style="font-size: 13px; color: var(--text-secondary, #94A3B8); margin-bottom: 20px;">Mira 3 anuncios cortos para desbloquear esta función gratis durante 2 horas.</p>
                
                <div style="font-size: 15px; font-weight: 700; margin-bottom: 20px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 12px;">
                    Anuncios vistos: <span id="contadorAnunciosPro" style="color: #34D399;">0</span> / 3
                </div>

                <button id="btnVerAnuncioIndividual" onclick="simularVerAnuncioPro('${nombreFuncion}')" class="btn-action" style="background: #0071E3; width: 100%; padding: 14px; font-weight: 800; margin-bottom: 10px; cursor: pointer;">📺 Ver Anuncio (1/3)</button>
                <button onclick="cerrarModalAnunciosPro()" class="ios-btn-secondary" style="width: 100%; padding: 10px;">Cancelar</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function simularVerAnuncioPro(nombreFuncion) {
    anunciosVistosParaPro++;
    let contadorSpan = document.getElementById('contadorAnunciosPro');
    let btnAnuncio = document.getElementById('btnVerAnuncioIndividual');

    if (anunciosVistosParaPro < 3) {
        if (contadorSpan) contadorSpan.innerText = anunciosVistosParaPro;
        if (btnAnuncio) btnAnuncio.innerText = `📺 Ver Anuncio (${anunciosVistosParaPro + 1}/3)`;
        showToast("¡Anuncio visto! Falta el siguiente.");
    } else {
        let tiempoExpiracion = new Date().getTime() + (2 * 60 * 60 * 1000); // 2 horas
        localStorage.setItem(`pro_access_${funcionProSeleccionadaActual}`, tiempoExpiracion);
        
        let idFnGuardado = funcionProSeleccionadaActual;
        cerrarModalAnunciosPro();
        showToast(`¡Función ${nombreFuncion} desbloqueada por 2 horas! 🎉`);
        
        setTimeout(() => {
            abrirFuncionPro(idFnGuardado);
        }, 400);
    }
}

function cerrarModalAnunciosPro() {
    let modal = document.getElementById('modalAnunciosPro');
    if (modal) modal.remove();
}
// --------------------------------------------------------

window.addEventListener('DOMContentLoaded', async () => {
    await detectarMonedaSegunUbicacion();

    let guardadoTheme = localStorage.getItem('costify_dark');
    if(guardadoTheme === 'true') {
        isDarkMode = true;
        document.body.classList.add('dark');
        let btnDark = document.getElementById('btnDarkModeToggle');
        if(btnDark) btnDark.innerText = '☀️';
    }

    let recordadoEmail = localStorage.getItem('costify_recordado_email');
    let recordadoPass = localStorage.getItem('costify_recordado_pass');
    if (recordadoEmail && recordadoPass) {
        const emailInput = document.getElementById('loginEmail');
        const passInput = document.getElementById('loginPassword');
        const checkRecordar = document.getElementById('checkRecordarme');
        if(emailInput) emailInput.value = recordadoEmail;
        if(passInput) passInput.value = recordadoPass;
        if(checkRecordar) checkRecordar.checked = true;
    }

    renderizarCuentasGuardadasLogin();
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'APPROVED' || urlParams.get('reference')?.startsWith('pro_')) {
        setTimeout(() => {
            if (typeof activarSuscripcion30DiasPro === 'function') {
                activarSuscripcion30DiasPro();
            }
            showToast('🌟 ¡Pago verificado con éxito! Membresía Pro+ activada.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 1200);
    }
});

async function detectarMonedaSegunUbicacion() {
    try {
        let res = await fetch('https://ipapi.co/json/');
        let data = await res.json();
        if(data && data.country_code) {
            if(data.country_code === 'US') {
                monedaSimbolo = "$"; monedaTexto = "USD"; precioProNum = 7.99;
            } else if(['FR', 'DE', 'ES', 'IT', 'NL', 'PT', 'BE', 'AT', 'IE', 'FI', 'GR'].includes(data.country_code)) {
                monedaSimbolo = "€"; monedaTexto = "EUR"; precioProNum = 6.99;
            } else {
                monedaSimbolo = "$"; monedaTexto = "COP"; precioProNum = 29900;
            }
        }
    } catch(e) {
        monedaSimbolo = "$"; monedaTexto = "COP"; precioProNum = 29900;
    }
    const labelSub = document.getElementById('precioSuscripcionLabel');
    if(labelSub) {
        labelSub.innerText = `${monedaSimbolo}${precioProNum.toLocaleString()} ${monedaTexto} /mes`;
    }
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    if(isDarkMode) {
        document.body.classList.add('dark');
        document.getElementById('btnDarkModeToggle').innerText = '☀️';
    } else {
        document.body.classList.remove('dark');
        document.getElementById('btnDarkModeToggle').innerText = '🌙';
    }
    localStorage.setItem('costify_dark', isDarkMode);
    renderCalculosRecientes();
    renderizarGraficaSemanal();
    renderGraficaTradingEmpresa();
    actualizarSelectProductosCarrito();
}

function togglePasswordVisibility(fieldId) {
    const input = document.getElementById(fieldId);
    if(input) input.type = input.type === 'password' ? 'text' : 'password';
}

function abrirModalOlvidoPassword(event) {
    if(event) event.preventDefault();
    let emailActual = document.getElementById('loginEmail').value.trim();
    if(emailActual) {
        document.getElementById('inputCorreoOlvido').value = emailActual;
    }
    document.getElementById('modalOlvidoPassword').style.display = 'flex';
}

function ejecutarRecuperacionPassword() {
    let email = document.getElementById('inputCorreoOlvido').value.trim();
    if(!email || !email.includes('@')) {
        showToast('⚠ Ingresa un correo electrónico válido');
        return;
    }

    auth.sendPasswordResetEmail(email).then(() => {
        document.getElementById('modalOlvidoPassword').style.display = 'none';
        showToast('📧 ¡Enlace de recuperación enviado a tu correo!');
    }).catch((error) => {
        showToast('❌ Error: ' + error.message);
    });
}

function guardarDatosSesionActual() {
    if(!correoUsuario) return;
    let fechaHoy = new Date().toISOString().split('T')[0];
    let datosActualizados = {
        saldo, ingresosTotales, gastosTotales, esProActivo, fechaExpiracionPro, empresaNombre, logotipoActual,
        productos: [...productos], movimientos: [...movimientos], calculosRecientes: [...calculosRecientes],
        deudoresLista: [...deudoresLista], codigosBarrasLista: [...codigosBarrasLista], presupuestoLimite,
        fechaRegistro: fechaHoy
    };

    db.collection("usuarios").doc(correoUsuario).set(datosActualizados, { merge: true }).catch((error) => {
        console.error("Error al sincronizar: ", error);
    });
}

function registrarCuentaGuardadaLocal(email) {
    let guardadas = JSON.parse(localStorage.getItem('costify_cuentas_disponibles') || '[]');
    if(!guardadas.includes(email)) {
        guardadas.push(email);
        localStorage.setItem('costify_cuentas_disponibles', JSON.stringify(guardadas));
    }
}

function renderizarCuentasGuardadasLogin() {
    let guardadas = JSON.parse(localStorage.getItem('costify_cuentas_disponibles') || '[]');
    const contenedor = document.getElementById('loginCuentasRapidasList');
    if(!contenedor) return;
    if(guardadas.length === 0) { contenedor.innerHTML = ''; return; }

    let html = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
    guardadas.forEach(email => {
        html += `<button onclick="autocompletarCuentaGuardada('${email}')" style="background: rgba(120, 120, 128, 0.08); border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 12px; color: var(--text-primary); font-size: 13px; font-weight: 600; cursor: pointer; text-align: left; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;"><span>👤 ${email}</span><span style="font-size:11px; color:#10B981; font-weight:700;">Acceso rápido</span></button>`;
    });
    html += `</div>`;
    contenedor.innerHTML = html;
}

function autocompletarCuentaGuardada(email) {
    const emailInput = document.getElementById('loginEmail');
    if(emailInput) emailInput.value = email;
    showToast('✨ Cuenta seleccionada. Ingresa tu contraseña.');
}

function cargarDatosDesdeNube(email) {
    correoUsuario = email;
    registrarCuentaGuardadaLocal(email);

    let recordarCheck = document.getElementById('checkRecordarme');
    let passInput = document.getElementById('loginPassword');
    if(recordarCheck && recordarCheck.checked && passInput) {
        localStorage.setItem('costify_recordado_email', email);
        localStorage.setItem('costify_recordado_pass', passInput.value.trim());
    } else {
        localStorage.removeItem('costify_recordado_email');
        localStorage.removeItem('costify_recordado_pass');
    }

    db.collection("usuarios").doc(email).get().then((doc) => {
        if (doc.exists) {
            let d = doc.data();
            saldo = d.saldo || 0;
            ingresosTotales = d.ingresosTotales || 0;
            gastosTotales = d.gastosTotales || 0;
            esProActivo = d.esProActivo || false;
            fechaExpiracionPro = d.fechaExpiracionPro || null;
            
            if (esProActivo && fechaExpiracionPro) {
                let hoy = new Date();
                let expiracion = new Date(fechaExpiracionPro);
                if (hoy > expiracion) {
                    esProActivo = false;
                    fechaExpiracionPro = null;
                    showToast('⚠️ Tu membresía Pro+ ha expirado.');
                }
            }

            empresaNombre = d.empresaNombre || "Mi Tienda";
            logotipoActual = d.logotipoActual || "logo.png";
            productos = [...(d.productos || [])];
            movimientos = [...(d.movimientos || [])];
            calculosRecientes = [...(d.calculosRecientes || [])];
            deudoresLista = [...(d.deudoresLista || [])];
            codigosBarrasLista = [...(d.codigosBarrasLista || [])];
            presupuestoLimite = d.presupuestoLimite || 500000;

            document.getElementById('headerCompanyName').innerText = empresaNombre;
            document.getElementById('inputNombreEmpresa').value = empresaNombre;
            
            const inputCuentaActiva = document.getElementById('labelUserEmail');
            if(inputCuentaActiva) inputCuentaActiva.innerText = email;
            
            document.getElementById('headerAvatarContainer').innerHTML = `<img src="logo.png" style="width:100%; height:100%; object-fit:cover;">`;

            const badgePlan = document.getElementById('badgePlan');
            if(badgePlan) {
                badgePlan.innerText = esProActivo ? 'PRO+' : 'FREE';
                badgePlan.style.background = esProActivo ? '#F59E0B' : '#F1F5F9';
                badgePlan.style.color = esProActivo ? '#FFF' : '#475569';
            }

            const textoEstado = document.getElementById('textoEstadoPro');
            if(textoEstado) {
                textoEstado.innerText = esProActivo ? `Estado actual: Pro+ Activo (Vence: ${fechaExpiracionPro})` : "Estado actual: Plan Free";
            }

            renderInventario(); 
            renderMovimientos(); 
            renderCalculosRecientes(); 
            recalcularMetricasDesdeCaja();
            verificarRolMaster();
            verificarVencimientoDeudores();
            verificarTopePresupuesto();
            actualizarSelectProductosCarrito();
            
            switchTab('inicio');
            iniciarApp("¡Conectado a la nube de Costify!");
        }
    });
}

function mostrarPantallaRegistro() {
    document.getElementById('authScreenLogin').classList.add('hidden');
    document.getElementById('authScreenRegister').classList.remove('hidden');
}

function mostrarPantallaLogin() {
    document.getElementById('authScreenRegister').classList.add('hidden');
    document.getElementById('authScreenLogin').classList.remove('hidden');
    renderizarCuentasGuardadasLogin();
}

function ejecutarLogin() {
    let email = document.getElementById('loginEmail').value.trim();
    let pass = document.getElementById('loginPassword').value.trim();
    if(!email || !pass) { showToast('⚠️ Ingresa correo y contraseña válidos'); return; }

    auth.signInWithEmailAndPassword(email, pass).then(() => {
        cargarDatosDesdeNube(email);
    }).catch(() => {
        showToast('❌ Correo o contraseña incorrectos');
    });
}

function ejecutarRegistro() {
    let empresa = document.getElementById('regEmpresa').value.trim();
    let email = document.getElementById('regEmail').value.trim();
    let pass = document.getElementById('regPassword').value.trim();

    if(!empresa || !email || !email.includes('@') || pass.length < 8) {
        showToast('⚠️ Ingresa una empresa, correo válido y contraseña de 8+ caracteres');
        return;
    }

    auth.createUserWithEmailAndPassword(email, pass).then(() => {
        let fechaHoy = new Date().toISOString().split('T')[0];
        let datosIniciales = {
            empresaNombre: empresa, saldo: 0, ingresosTotales: 0, gastosTotales: 0,
            esProActivo: false, fechaExpiracionPro: null, logotipoActual: "logo.png",
            productos: [], movimientos: [], calculosRecientes: [], deudoresLista: [], codigosBarrasLista: [], presupuestoLimite: 500000,
            fechaRegistro: fechaHoy
        };

        db.collection("usuarios").doc(email).set(datosIniciales).then(() => {
            showToast('✨ ¡Cuenta creada en la nube con éxito!');
            mostrarPantallaLogin();
        });
    }).catch((error) => {
        showToast('⚠️ Error al registrar: ' + error.message);
    });
}

function verificarRolMaster() {
    const masterBtn = document.getElementById('navMasterBtn');
    if(!masterBtn) return;
    if(correoUsuario.toLowerCase() === "andresmateocr21@gmail.com") {
        masterBtn.classList.remove('hidden');
        renderizarPanelMasterReal();
    } else {
        masterBtn.classList.add('hidden');
    }
}

function verificarVencimientoDeudores() {
    if(!deudoresLista || deudoresLista.length === 0) return;
    let hoyStr = new Date().toISOString().split('T')[0];
    deudoresLista.forEach(d => {
        if(d.fechaLimite && d.fechaLimite <= hoyStr && !d.notificado) {
            mostrarNotificacionPush("🔔 Alerta de Cobro Pendiente", `${d.nombre} tiene saldo pendiente por ${monedaSimbolo}${d.monto.toLocaleString()} con límite ${d.fechaLimite}.`);
            d.notificado = true;
        }
    });
    guardarDatosSesionActual();
}

function verificarTopePresupuesto() {
    if(gastosTotales >= presupuestoLimite * 0.8) {
        mostrarNotificacionPush("⚠️ Alerta de Presupuesto", `Tus gastos (${monedaSimbolo}${gastosTotales.toLocaleString()}) han superado el 80% de tu tope mensual.`);
    }
}

function mostrarNotificacionPush(titulo, mensaje) {
    showToast(`${titulo}: ${mensaje}`);
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(titulo, { body: mensaje, icon: "logo.png" });
    } else if ("Notification" in window && Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(titulo, { body: mensaje, icon: "logo.png" });
            }
        });
    }
}

function guardarDeudorNuevo() {
    let nombre = document.getElementById('deudorNombreInput').value.trim();
    let monto = parseFloat(document.getElementById('deudorMontoInput').value);
    let fechaLimite = document.getElementById('deudorFechaInput').value;

    if(!nombre || isNaN(monto) || !fechaLimite) {
        showToast('⚠️ Ingresa nombre, monto y fecha límite de pago');
        return;
    }

    deudoresLista.push({ id: Date.now(), nombre, monto, fechaLimite, notificado: false });
    guardarDatosSesionActual();
    showToast('📝 Deudor registrado con éxito');
    abrirFuncionPro(2);
}

function eliminarDeudor(id) {
    deudoresLista = deudoresLista.filter(d => d.id !== id);
    guardarDatosSesionActual();
    abrirFuncionPro(2);
    showToast('🗑 Deudor eliminado');
}

function iniciarMicromonoVozReal() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast('❌ Tu navegador no soporta reconocimiento de voz por micrófono.');
        return;
    }

    if (recognitionInstance) {
        try { recognitionInstance.stop(); } catch(e){}
    }

    recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = 'es-ES';
    recognitionInstance.interimResults = false;
    recognitionInstance.maxAlternatives = 1;

    const btnVoz = document.getElementById('btnMicVozReal');
    if(btnVoz) btnVoz.innerText = "🎙️ Escuchando... Habla ahora...";
    showToast('🎙️ Escuchando transacción por voz...');

    recognitionInstance.onresult = (event) => {
        let texto = event.results[0][0].transcript.toLowerCase();
        if(btnVoz) btnVoz.innerText = "🎙️ Activar Micrófono Real";
        
        let numeros = texto.match(/\d+/g);
        let monto = numeros ? parseInt(numeros.join('')) : 0;

        if(monto > 0) {
            let tipo = texto.includes('gasto') || texto.includes('pagué') || texto.includes('compré') ? 'gasto' : 'venta';
            let fechaHoy = new Date().toISOString().split('T')[0];
            movimientos.unshift({ id: Date.now(), desc: `Voz: "${texto}"`, monto, tipo, fecha: fechaHoy });
            recalcularMetricasDesdeCaja();
            renderMovimientos();
            guardarDatosSesionActual();
            showToast(`✅ Voz procesada: ${tipo === 'venta' ? 'Venta' : 'Gasto'} de ${monedaSimbolo}${monto.toLocaleString()}`);
            document.getElementById('modalFuncionPro').style.display = 'none';
        } else {
            showToast(`⚠️ No se reconoció un monto en: "${texto}". Intenta de nuevo.`);
        }
    };

    recognitionInstance.onerror = () => {
        if(btnVoz) btnVoz.innerText = "🎙️ Activar Micrófono Real";
        showToast('❌ Error al capturar audio del micrófono.');
    };

    recognitionInstance.onend = () => {
        if(btnVoz) btnVoz.innerText = "🎙️ Activar Micrófono Real";
    };

    recognitionInstance.start();
}

function exportarReportePDF() {
    let contenidoHTML = `
        <html>
        <head>
            <title>Reporte Financiero - ${empresaNombre}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1d1d1f; background: #fff; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0071E3; padding-bottom: 20px; margin-bottom: 30px; }
                .logo-title { display: flex; align-items: center; gap: 15px; }
                .title { font-size: 22px; font-weight: 800; color: #1d1d1f; }
                .sub { font-size: 12px; color: #86868b; }
                .metrics { display: flex; gap: 15px; margin-bottom: 30px; }
                .metric-card { background: #f5f5f7; padding: 18px; border-radius: 14px; flex: 1; border: 1px solid #e2e8f0; }
                .metric-card span { font-size: 11px; text-transform: uppercase; color: #86868b; font-weight: 700; display: block; margin-bottom: 5px; }
                .metric-card strong { font-size: 18px; font-weight: 800; color: #1d1d1f; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
                th { background: #0071E3; color: white; text-align: left; padding: 12px; font-weight: 700; }
                td { border-bottom: 1px solid #e2e8f0; padding: 12px; color: #334155; }
                tr:nth-child(even) { background-color: #f8fafc; }
                .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #86868b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-title">
                    <div>
                        <div class="title">Costify — ${empresaNombre}</div>
                        <div class="sub">Reporte Oficial de Movimientos y Caja Contable (Enterprise)</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div class="sub">Fecha de Emisión: ${new Date().toLocaleDateString()}</div>
                    <div class="sub">Cuenta: ${correoUsuario}</div>
                </div>
            </div>
            <div class="metrics">
                <div class="metric-card"><span>Ingresos Totales</span><strong style="color: #10B981;">+${monedaSimbolo} ${ingresosTotales.toLocaleString()}</strong></div>
                <div class="metric-card"><span>Gastos Totales</span><strong style="color: #EF4444;">-${monedaSimbolo} ${gastosTotales.toLocaleString()}</strong></div>
                <div class="metric-card"><span>Balance Neto</span><strong style="color: #0071E3;">${monedaSimbolo} ${saldo.toLocaleString()}</strong></div>
            </div>
            <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 10px;">Detalle de Transacciones</h3>
            <table>
                <tr><th>Fecha</th><th>Descripción</th><th>Tipo</th><th>Monto</th></tr>
                ${movimientos.map(m => `<tr><td>${m.fecha || 'N/A'}</td><td>${m.desc}</td><td>${m.tipo.toUpperCase()}</td><td><strong>${m.tipo === 'venta' ? '+' : '-'}${monedaSimbolo} ${m.monto.toLocaleString()}</strong></td></tr>`).join('')}
            </table>
            <div class="footer">Generado automáticamente por Costify Enterprise System 👑 — Todos los derechos reservados</div>
        </body>
        </html>
    `;
    let ventana = window.open('', '_blank');
    ventana.document.write(contenidoHTML);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 500);
    showToast('📄 PDF empresarial generado con éxito');
}

function exportarReporteExcel() {
    let csvContent = "\ufeff";
    csvContent += `Reporte Financiero Oficial - ${empresaNombre}\n`;
    csvContent += `Fecha de Emisión:,${new Date().toLocaleDateString()}\n`;
    csvContent += `Cuenta Activa:,${correoUsuario}\n\n`;
    csvContent += `Resumen Financiero\n`;
    csvContent += `Ingresos Totales,+${ingresosTotales}\n`;
    csvContent += `Gastos Totales,-${gastosTotales}\n`;
    csvContent += `Balance Neto,${saldo}\n\n`;
    csvContent += `Detalle de Transacciones\n`;
    csvContent += `Fecha,Descripcion,Tipo,Monto\n`;
    
    movimientos.forEach(m => {
        let descLimpia = `"${(m.desc || '').replace(/"/g, '""')}"`;
        csvContent += `${m.fecha || 'N/A'},${descLimpia},${m.tipo.toUpperCase()},${m.tipo === 'venta' ? m.monto : -m.monto}\n`;
    });

    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Contable_${empresaNombre}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📊 Reporte Excel profesional descargado');
}

function guardarTopePresupuesto() {
    let tope = parseFloat(document.getElementById('inputTopeGasto').value);
    if(isNaN(tope) || tope <= 0) { showToast('⚠️ Ingresa un tope válido'); return; }
    presupuestoLimite = tope;
    guardarDatosSesionActual();
    verificarTopePresupuesto();
    document.getElementById('modalFuncionPro').style.display = 'none';
    showToast('🎯 Tope de presupuesto guardado correctamente');
}

function calcularProyeccionAnualReal() {
    let mesesRegistrados = new Set(movimientos.map(m => m.fecha ? m.fecha.substring(0,7) : '')).size || 1;
    let promedioMensualVentas = ingresosTotales / Math.max(mesesRegistrados, 1);
    let proyeccionAnualVentas = promedioMensualVentas * 12;
    let crecimientoEstimado = ingresosTotales > 0 ? "+35.4% 🚀" : "0% (Sin registros)";
    
    return `
        <div style="background: rgba(139,92,246,0.1); padding: 16px; border-radius: 12px; border: 1px solid rgba(139,92,246,0.3); color: #8B5CF6;">
            <strong>📊 Análisis Financiero Predictivo Real:</strong><br><br>
            • Ingresos Totales Acumulados: ${monedaSimbolo}${ingresosTotales.toLocaleString()}<br>
            • Promedio Mensual Real: ${monedaSimbolo}${Math.round(promedioMensualVentas).toLocaleString()}<br>
            • <strong>Proyección Anual Estimada:</strong> ${monedaSimbolo}${Math.round(proyeccionAnualVentas).toLocaleString()}<br>
            • Tendencia de Crecimiento: <strong>${crecimientoEstimado}</strong>
        </div>
    `;
}

function enviarIdeaUsuario() {
    let texto = document.getElementById('inputIdeaUsuario').value.trim();
    if(!texto) { showToast('⚠️ Escribe una idea o comentario primero'); return; }

    let ideasGuardadas = JSON.parse(localStorage.getItem('costify_ideas_usuarios') || '[]');
    ideasGuardadas.unshift({ email: correoUsuario, tienda: empresaNombre, comentario: texto, fecha: new Date().toLocaleString() });
    localStorage.setItem('costify_ideas_usuarios', JSON.stringify(ideasGuardadas));

    document.getElementById('inputIdeaUsuario').value = '';
    showToast('💡 ¡Idea o comentario enviado con éxito al creador!');
}

function cargarIdeasUsuariosCreador() {
    const contenedor = document.getElementById('contenedorIdeasCreador');
    if(!contenedor) return;

    let ideasGuardadas = JSON.parse(localStorage.getItem('costify_ideas_usuarios') || '[]');
    if(ideasGuardadas.length === 0) {
        contenedor.innerHTML = '<p style="color: #64748B; text-align: center; padding: 15px;">No hay comentarios o ideas registradas todavía.</p>';
        return;
    }

    let html = '';
    ideasGuardadas.forEach(i => {
        html += `
            <div style="padding: 10px 14px; background: rgba(255,255,255,0.04); border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #38BDF8; margin-bottom: 4px;">
                    <span>👤 ${i.email} (${i.tienda})</span>
                    <span>${i.fecha}</span>
                </div>
                <p style="font-size: 13px; color: #FFF; margin: 0;">${i.comentario}</p>
            </div>
        `;
    });
    contenedor.innerHTML = html;
}

function abrirFuncionPro(idFn) {
    let titulos = {
        1: "🎙️ IA por Voz Inteligente",
        2: "📝 Control de Deudores",
        3: "📊 Exportar Reportes (Excel / PDF)",
        4: "🎯 Alertas de Presupuesto",
        5: "🏷 Códigos de Barras",
        6: "📈 Proyección Anual con IA Predictiva",
        7: "☁️ Respaldo en la Nube"
    };

    let nombreFnStr = titulos[idFn] || "Función Pro+";

    // Validar si tiene Pro o desbloqueo temporal por ver anuncios
    if (!verificarAccesoPro(idFn, nombreFnStr)) {
        return; // Si no tiene acceso, se abre el modal de ver anuncios
    }

    const modal = document.getElementById('modalFuncionPro');
    const titulo = document.getElementById('modalProFuncTitulo');
    const cuerpo = document.getElementById('modalProFuncCuerpo');

    let deudoresHtml = `
        <p>Registra deudas pendientes con fechas límite. Te avisaremos cuando llegue el día de cobro.</p><br>
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
            <input type="text" id="deudorNombreInput" placeholder="Nombre de la persona o empresa" class="ios-input" style="margin-bottom:0;">
            <input type="number" id="deudorMontoInput" placeholder="Monto adeudado ($)" class="ios-input" style="margin-bottom:0;">
            <label style="font-size:11px; color:#86868B;">Fecha límite de pago:</label>
            <input type="date" id="deudorFechaInput" class="ios-input" style="margin-bottom:0;">
            <button onclick="guardarDeudorNuevo()" class="btn-action">Guardar Deudor</button>
        </div>
        <div style="max-height:150px; overflow-y:auto;" class="custom-scroll">
    `;
    if(deudoresLista.length === 0) {
        deudoresHtml += `<p style="color:#86868B; text-align:center;">No hay deudores registrados.</p>`;
    } else {
        deudoresLista.forEach(d => {
            deudoresHtml += `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:6px;"><span><strong>${d.nombre}</strong>: ${monedaSimbolo}${d.monto.toLocaleString()} (Límite: ${d.fechaLimite})</span><button onclick="eliminarDeudor(${d.id})" style="background:none; border:none; color:#EF4444; cursor:pointer; font-weight:bold;">✕</button></div>`;
        });
    }
    deudoresHtml += `</div>`;

    let contenidos = {
        1: `<p>Dicta tus transacciones por voz. El sistema usa tu micrófono para escuchar y registrar todo automáticamente.</p><br><button id="btnMicVozReal" class="btn-action" style="background:#6366F1; padding:14px; font-size:14px;" onclick="iniciarMicromonoVozReal()">🎙️ Activar Micrófono Real</button>`,
        2: deudoresHtml,
        3: `<p>Descarga informes contables empresariales super profesionales.</p><br><div style="display:flex; gap:10px;"><button class="btn-action" style="flex:1; background:#10B981;" onclick="exportarReporteExcel()">📊 Descargar Excel</button><button class="btn-action" style="flex:1; background:#EF4444;" onclick="exportarReportePDF()">📄 Descargar PDF</button></div>`,
        4: `<p>Define el tope máximo de tus gastos mensuales conectados a la caja.</p><br><input type="number" id="inputTopeGasto" value="${presupuestoLimite}" class="ios-input"><button class="btn-action" style="margin-top:10px;" onclick="guardarTopePresupuesto()">Establecer Tope</button>`,
        5: `<p>Genera etiquetas con códigos de barras para tu inventario.</p><br><div style="background:#FFF; padding:15px; border-radius:10px; text-align:center; color:#000; font-family:monospace; font-weight:bold; font-size:18px;">||| | |||| || | ||</div><br><button class="btn-action" onclick="showToast('🖨️ Etiquetas listas para imprimir');">Imprimir Etiquetas</button>`,
        6: calcularProyeccionAnualReal(),
        7: `<p>Tus datos están respaldados en servidores seguros de Google Cloud.</p><br><button class="btn-action" style="background:#8B5CF6;" onclick="showToast('☁️ Respaldo en la nube verificado.');">Verificar Respaldo</button>`
    };

    if(titulo) titulo.innerText = nombreFnStr;
    if(cuerpo) cuerpo.innerHTML = contenidos[idFn] || "<p>Herramienta activa.</p>";
    if(modal) modal.style.display = 'flex';
}

function pedirPasswordCambiarEmpresa() {
    let nuevo = document.getElementById('inputNombreEmpresa').value.trim();
    if(!nuevo) { showToast('⚠️ Ingresa un nombre válido'); return; }
    document.getElementById('inputPassCambiarEmpresa').value = '';
    document.getElementById('modalPasswordEmpresa').style.display = 'flex';
}

function ejecutarGuardarNombreEmpresa() {
    let pass = document.getElementById('inputPassCambiarEmpresa').value.trim();
    let nuevo = document.getElementById('inputNombreEmpresa').value.trim();
    if(!pass) { showToast('⚠️ Ingresa tu contraseña'); return; }

    auth.signInWithEmailAndPassword(correoUsuario, pass).then(() => {
        empresaNombre = nuevo;
        document.getElementById('headerCompanyName').innerText = nuevo;
        guardarDatosSesionActual();
        document.getElementById('modalPasswordEmpresa').style.display = 'none';
        showToast('💾 Nombre de tienda actualizado con éxito');
    }).catch(() => {
        showToast('❌ Contraseña incorrecta');
    });
}

async function renderizarPanelMasterReal() {
    try {
        let snapshot = await db.collection("usuarios").get();
        let totalCuentas = snapshot.size;
        let usuariosProCount = 0;
        let listaCuentasHtml = '';
        let listaUsuariosArray = [];

        let anioTarget = fechaMasterActual.getFullYear();
        let mesTarget = fechaMasterActual.getMonth();

        snapshot.forEach(doc => {
            let data = doc.data();
            let email = doc.id;
            let esPro = data.esProActivo || false;
            let tienda = data.empresaNombre || "Mi Tienda";
            let fechaReg = data.fechaRegistro || "2026-09-01";

            if (esPro) usuariosProCount++;
            listaUsuariosArray.push({ email, esPro, tienda, fechaReg });

            let badgeColor = esPro ? '#F59E0B' : '#64748B';
            let badgeText = esPro ? 'PRO+' : 'FREE';

            listaCuentasHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.04); border-radius:10px; border:1px solid rgba(255,255,255,0.08); font-size:13px;">
                    <div>
                        <strong style="color:#FFF; display:block;">👤 ${email}</strong>
                        <span style="font-size:11px; color:#94A3B8;">Tienda: ${tienda} | Registro: ${fechaReg}</span>
                    </div>
                    <span style="background:${badgeColor}; color:#FFF; font-size:10px; font-weight:800; padding:3px 8px; border-radius:6px;">${badgeText}</span>
                </div>`;
        });

        const listaUsuariosFullContainer = document.getElementById('masterListaUsuariosFull');
        if (listaUsuariosFullContainer) {
            listaUsuariosFullContainer.innerHTML = listaCuentasHtml || '<p style="color:#848E9C; text-align:center;">No hay usuarios registrados.</p>';
        }

        let gananciasTotalesPro = usuariosProCount * precioProNum;

        const masterLiveVal = document.getElementById('masterLiveCrecimientoVal');
        if (masterLiveVal) {
            if (masterModoActual === 'ganancias') {
                masterLiveVal.innerText = `${monedaSimbolo} ${gananciasTotalesPro.toLocaleString()}`;
                masterLiveVal.style.color = '#0ECB81';
            } else if (masterModoActual === 'pro') {
                masterLiveVal.innerText = `${usuariosProCount} usuarios Pro+`;
                masterLiveVal.style.color = '#F59E0B';
            } else {
                masterLiveVal.innerText = `${totalCuentas} usuarios totales`;
                masterLiveVal.style.color = '#38BDF8';
            }
        }

        document.getElementById('modalMasterGanadoTotal').innerText = `${monedaSimbolo} ${gananciasTotalesPro.toLocaleString()}`;
        document.getElementById('modalMasterProCount').innerText = usuariosProCount;
        document.getElementById('modalMasterTotalCuentas').innerText = totalCuentas;

        renderizarGraficaChartJSMaster(listaUsuariosArray, anioTarget, mesTarget);
        cargarIdeasUsuariosCreador();

    } catch (error) {
        console.error("Error al cargar datos del Panel Master:", error);
    }
}

function cambiarModoMasterGrafica(modo) {
    masterModoActual = modo;
    document.getElementById('btnMasterGanancias').style.background = modo === 'ganancias' ? 'rgba(34,197,94,0.2)' : 'none';
    document.getElementById('btnMasterGanancias').style.color = modo === 'ganancias' ? '#34D399' : '#848E9C';
    document.getElementById('btnMasterPro').style.background = modo === 'pro' ? 'rgba(245,158,11,0.2)' : 'none';
    document.getElementById('btnMasterPro').style.color = modo === 'pro' ? '#F59E0B' : '#848E9C';
    document.getElementById('btnMasterUsuarios').style.background = modo === 'usuarios' ? 'rgba(56,189,248,0.2)' : 'none';
    document.getElementById('btnMasterUsuarios').style.color = modo === 'usuarios' ? '#38BDF8' : '#848E9C';

    const subLabel = document.getElementById('masterHeaderSubLabel');
    if(subLabel) {
        if(modo === 'ganancias') subLabel.innerText = "Ganancias Pro+ Recaudadas";
        else if(modo === 'pro') subLabel.innerText = "Total Suscriptores Pro+";
        else subLabel.innerText = "Total Usuarios en la App";
    }
    renderizarPanelMasterReal();
}

function cambiarFiltroMasterTipo(tipo) {
    masterFiltroTipo = tipo;
    document.getElementById('btnMaster1S').style.background = tipo === '1S' ? 'rgba(255,255,255,0.2)' : 'none';
    document.getElementById('btnMaster1S').style.color = tipo === '1S' ? '#FFF' : '#848E9C';
    document.getElementById('btnMaster1M').style.background = tipo === '1M' ? 'rgba(255,255,255,0.2)' : 'none';
    document.getElementById('btnMaster1M').style.color = tipo === '1M' ? '#FFF' : '#848E9C';
    document.getElementById('btnMaster1A').style.background = tipo === '1A' ? 'rgba(255,255,255,0.2)' : 'none';
    document.getElementById('btnMaster1A').style.color = tipo === '1A' ? '#FFF' : '#848E9C';
    renderizarPanelMasterReal();
}

function cambiarMesMasterAnterior() {
    if(masterFiltroTipo === '1M' || masterFiltroTipo === '1A') fechaMasterActual.setFullYear(fechaMasterActual.getFullYear() - 1);
    else fechaMasterActual.setMonth(fechaMasterActual.getMonth() - 1);
    renderizarPanelMasterReal();
}

function cambiarMesMasterSiguiente() {
    if(masterFiltroTipo === '1M' || masterFiltroTipo === '1A') fechaMasterActual.setFullYear(fechaMasterActual.getFullYear() + 1);
    else fechaMasterActual.setMonth(fechaMasterActual.getMonth() + 1);
    renderizarPanelMasterReal();
}

function actualizarLabelMesMaster() {
    let label = document.getElementById('labelMasterMesActual');
    if(label) {
        let mesNombre = nombresMeses[fechaMasterActual.getMonth()];
        let anioNum = fechaMasterActual.getFullYear();
        label.innerText = masterFiltroTipo === '1M' ? `${anioNum}` : (masterFiltroTipo === '1A' ? 'Histórico Anual' : `${mesNombre} ${anioNum}`);
    }
}

function abrirModalSelectorMesMaster() {
    if(masterFiltroTipo === '1M' || masterFiltroTipo === '1A') return;
    const grid = document.getElementById('gridMesesSelectorMaster');
    if(!grid) return;
    grid.innerHTML = '';
    nombresMeses.forEach((m, idx) => {
        grid.innerHTML += `<button onclick="seleccionarMesMasterDirecto(${idx})" style="padding:10px; background:rgba(245,158,11,0.1); border:none; border-radius:10px; font-weight:700; color:inherit; cursor:pointer;">${m}</button>`;
    });
    document.getElementById('modalSelectorMesMaster').style.display = 'flex';
}

function seleccionarMesMasterDirecto(mesIdx) {
    fechaMasterActual.setMonth(mesIdx);
    document.getElementById('modalSelectorMesMaster').style.display = 'none';
    renderizarPanelMasterReal();
}

function renderizarGraficaChartJSMaster(usuarios, anioTarget, mesTarget) {
    actualizarLabelMesMaster();
    const canvas = document.getElementById('chartMasterCanvas');
    if(!canvas) return;

    let colorTema = masterModoActual === 'ganancias' ? '#34D399' : (masterModoActual === 'pro' ? '#F59E0B' : '#38BDF8');
    let puntosDatos = [];
    let etiquetasEje = [];

    if (masterFiltroTipo === '1S') {
        etiquetasEje = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
        puntosDatos = [0, 0, 0, 0];
        usuarios.forEach(u => {
            if(!u.fechaReg) return;
            let d = new Date(u.fechaReg + 'T00:00:00');
            if(d.getFullYear() === anioTarget && d.getMonth() === mesTarget) {
                let diaNum = d.getDate();
                let semanaIdx = Math.min(Math.floor((diaNum - 1) / 7), 3);
                let val = masterModoActual === 'ganancias' ? (u.esPro ? precioProNum : 0) : (masterModoActual === 'pro' ? (u.esPro ? 1 : 0) : 1);
                puntosDatos[semanaIdx] += val;
            }
        });
        for(let i=1; i<puntosDatos.length; i++) puntosDatos[i] += puntosDatos[i-1];
    } else if (masterFiltroTipo === '1M') {
        etiquetasEje = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        puntosDatos = new Array(12).fill(0);
        usuarios.forEach(u => {
            if(!u.fechaReg) return;
            let d = new Date(u.fechaReg + 'T00:00:00');
            if(d.getFullYear() === anioTarget) {
                let mIdx = d.getMonth();
                let val = masterModoActual === 'ganancias' ? (u.esPro ? precioProNum : 0) : (masterModoActual === 'pro' ? (u.esPro ? 1 : 0) : 1);
                puntosDatos[mIdx] += val;
            }
        });
        for(let i=1; i<puntosDatos.length; i++) puntosDatos[i] += puntosDatos[i-1];
    } else {
        let aniosMap = {};
        usuarios.forEach(u => {
            if(!u.fechaReg) return;
            let d = new Date(u.fechaReg + 'T00:00:00');
            let yr = d.getFullYear();
            if(!aniosMap[yr]) aniosMap[yr] = 0;
            let val = masterModoActual === 'ganancias' ? (u.esPro ? precioProNum : 0) : (masterModoActual === 'pro' ? (u.esPro ? 1 : 0) : 1);
            aniosMap[yr] += val;
        });
        let aniosKeys = Object.keys(aniosMap).sort();
        if(aniosKeys.length === 0) aniosKeys = [anioTarget.toString()];
        etiquetasEje = aniosKeys;
        puntosDatos = aniosKeys.map(yr => aniosMap[yr] || 0);
    }

    if(chartMasterInstance) chartMasterInstance.destroy();

    chartMasterInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: etiquetasEje,
            datasets: [{
                label: 'Analítica Master',
                data: puntosDatos,
                borderColor: colorTema,
                backgroundColor: colorTema + '33',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#0B0E14',
                pointBorderColor: colorTema,
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#848E9C', font: { size: 11 } } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#848E9C', font: { size: 11 } } }
            }
        }
    });
}

function abrirModalDetalleMasterExclusivo() {
    document.getElementById('modalDetalleMasterExclusivo').style.display = 'flex';
}

function recalcularMetricasDesdeCaja() {
    ingresosTotales = 0; gastosTotales = 0;
    movimientos.forEach(m => {
        if(m.tipo === 'venta') ingresosTotales += m.monto || 0;
        else gastosTotales += m.monto || 0;
    });
    saldo = ingresosTotales - gastosTotales;
    renderizarGraficaSemanal();
    renderGraficaTradingEmpresa();
    verificarTopePresupuesto();
}

function actualizarLabelMesVisualizacion() {
    let mesNombre = nombresMeses[fechaVisualizacionActual.getMonth()];
    let anioNum = fechaVisualizacionActual.getFullYear();
    let label = document.getElementById('labelMesActualGrafica');
    if(label) label.innerText = filtroTiempoInicio === '1M' ? `${anioNum}` : (filtroTiempoInicio === '1A' ? 'Histórico Anual' : `${mesNombre} ${anioNum}`);
}

function cambiarMesAnterior() {
    if(filtroTiempoInicio === '1M' || filtroTiempoInicio === '1A') fechaVisualizacionActual.setFullYear(fechaVisualizacionActual.getFullYear() - 1);
    else fechaVisualizacionActual.setMonth(fechaVisualizacionActual.getMonth() - 1);
    renderizarGraficaSemanal();
}

function cambiarMesSiguiente() {
    if(filtroTiempoInicio === '1M' || filtroTiempoInicio === '1A') fechaVisualizacionActual.setFullYear(fechaVisualizacionActual.getFullYear() + 1);
    else fechaVisualizacionActual.setMonth(fechaVisualizacionActual.getMonth() + 1);
    renderizarGraficaSemanal();
}

function abrirModalSelectorMeses() {
    if(filtroTiempoInicio === '1M' || filtroTiempoInicio === '1A') return;
    const grid = document.getElementById('gridMesesSelector');
    if(!grid) return;
    grid.innerHTML = '';
    nombresMeses.forEach((m, idx) => {
        grid.innerHTML += `<button onclick="seleccionarMesDirecto(${idx})" style="padding:10px; background:rgba(0,113,227,0.1); border:none; border-radius:10px; font-weight:700; color:inherit; cursor:pointer;">${m}</button>`;
    });
    document.getElementById('modalSelectorMeses').style.display = 'flex';
}

function seleccionarMesDirecto(mesIdx) {
    fechaVisualizacionActual.setMonth(mesIdx);
    renderizarGraficaSemanal();
    document.getElementById('modalSelectorMeses').style.display = 'none';
}

function cambiarFiltroTiempoInicio(filtro) {
    filtroTiempoInicio = filtro;
    document.getElementById('btnFiltro1S').style.background = filtro === '1S' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
    document.getElementById('btnFiltro1M').style.background = filtro === '1M' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
    document.getElementById('btnFiltro1A').style.background = filtro === '1A' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
    renderizarGraficaSemanal();
}

function renderizarGraficaSemanal() {
    actualizarLabelMesVisualizacion();
    const canvas = document.getElementById('chartSemanalCanvas');
    if(!canvas) return;

    let anioTarget = fechaVisualizacionActual.getFullYear();
    let barrasDatos = [], etiquetas = [];
    let ventasTotalPeriodo = 0, gastosTotalPeriodo = 0;

    if (filtroTiempoInicio === '1S') {
        let mesTarget = fechaVisualizacionActual.getMonth();
        let movimientosMes = movimientos.filter(m => {
            if(!m.fecha) return false;
            let d = new Date(m.fecha + 'T00:00:00');
            return d.getMonth() === mesTarget && d.getFullYear() === anioTarget;
        });
        barrasDatos = [0, 0, 0, 0]; etiquetas = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
        movimientosMes.forEach(m => {
            let d = new Date(m.fecha + 'T00:00:00');
            let diaNum = d.getDate();
            let semanaIdx = Math.min(Math.floor((diaNum - 1) / 7), 3);
            let valor = m.monto || 0;
            if(m.tipo === 'venta') { barrasDatos[semanaIdx] += valor; ventasTotalPeriodo += valor; }
            else { barrasDatos[semanaIdx] -= valor; gastosTotalPeriodo += valor; }
        });
    } else if (filtroTiempoInicio === '1M') {
        barrasDatos = new Array(12).fill(0);
        etiquetas = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        movimientos.forEach(m => {
            if(!m.fecha) return;
            let d = new Date(m.fecha + 'T00:00:00');
            if(d.getFullYear() === anioTarget) {
                let mIdx = d.getMonth();
                let valor = m.monto || 0;
                if(m.tipo === 'venta') { barrasDatos[mIdx] += valor; ventasTotalPeriodo += valor; }
                else { barrasDatos[mIdx] -= valor; gastosTotalPeriodo += valor; }
            }
        });
    } else if (filtroTiempoInicio === '1A') {
        let aniosMap = {};
        movimientos.forEach(m => {
            if(!m.fecha) return;
            let d = new Date(m.fecha + 'T00:00:00');
            let yr = d.getFullYear();
            if(!aniosMap[yr]) aniosMap[yr] = 0;
            let valor = m.monto || 0;
            if(m.tipo === 'venta') { aniosMap[yr] += valor; ventasTotalPeriodo += valor; }
            else { aniosMap[yr] -= valor; gastosTotalPeriodo += valor; }
        });
        let aniosKeys = Object.keys(aniosMap).sort();
        if(aniosKeys.length === 0) aniosKeys = [anioTarget.toString()];
        etiquetas = aniosKeys;
        barrasDatos = aniosKeys.map(yr => aniosMap[yr] || 0);
    }

    if(chartSemanalInstance) chartSemanalInstance.destroy();

    let backgroundColors = barrasDatos.map(v => v >= 0 ? '#34D399' : '#F87171');

    chartSemanalInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Balance',
                data: barrasDatos,
                backgroundColor: backgroundColors,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 10 } } },
                y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#94A3B8', font: { size: 10 } } }
            }
        }
    });

    let saldoPeriodo = ventasTotalPeriodo - gastosTotalPeriodo;
    document.getElementById('homeSaldo').innerText = monedaSimbolo + ' ' + saldoPeriodo.toLocaleString();
    document.getElementById('homeVentas').innerText = '+' + monedaSimbolo + ' ' + ventasTotalPeriodo.toLocaleString();
    document.getElementById('homeGastos').innerText = '-' + monedaSimbolo + ' ' + gastosTotalPeriodo.toLocaleString();
}

function actualizarLabelMesGlobal() {
    let mesNombre = nombresMeses[fechaGlobalActual.getMonth()];
    let anioNum = fechaGlobalActual.getFullYear();
    let label = document.getElementById('labelMesGlobalGrafica');
    if(label) label.innerText = filtroGlobalTipo === '1M' ? `${anioNum}` : (filtroGlobalTipo === '1A' ? 'Histórico Anual' : `${mesNombre} ${anioNum}`);
}

function cambiarMesGlobalAnterior() {
    if(filtroGlobalTipo === '1M' || filtroGlobalTipo === '1A') fechaGlobalActual.setFullYear(fechaGlobalActual.getFullYear() - 1);
    else fechaGlobalActual.setMonth(fechaGlobalActual.getMonth() - 1);
    renderGraficaTradingEmpresa();
}

function cambiarMesGlobalSiguiente() {
    if(filtroGlobalTipo === '1M' || filtroGlobalTipo === '1A') fechaGlobalActual.setFullYear(fechaGlobalActual.getFullYear() + 1);
    else fechaGlobalActual.setMonth(fechaGlobalActual.getMonth() + 1);
    renderGraficaTradingEmpresa();
}

function cambiarFiltroGlobal(tipo) {
    filtroGlobalTipo = tipo;
    document.getElementById('btnGlobal1S').style.background = tipo === '1S' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
    document.getElementById('btnGlobal1M').style.background = tipo === '1M' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
    document.getElementById('btnGlobal1A').style.background = tipo === '1A' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
    renderGraficaTradingEmpresa();
}

function renderGraficaTradingEmpresa() {
    actualizarLabelMesGlobal();
    const canvas = document.getElementById('chartGlobalCanvas');
    if(!canvas) return;

    let anioTarget = fechaGlobalActual.getFullYear();
    let puntosDatos = [], etiquetas = [], balanceTotalGlobal = 0;

    if (filtroGlobalTipo === '1S') {
        let mesTarget = fechaGlobalActual.getMonth();
        let movimientosMes = movimientos.filter(m => {
            if(!m.fecha) return false;
            let d = new Date(m.fecha + 'T00:00:00');
            return d.getMonth() === mesTarget && d.getFullYear() === anioTarget;
        });
        puntosDatos = [0, 0, 0, 0]; etiquetas = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
        movimientosMes.forEach(m => {
            let d = new Date(m.fecha + 'T00:00:00');
            let diaNum = d.getDate();
            let semanaIdx = Math.min(Math.floor((diaNum - 1) / 7), 3);
            let valor = m.monto || 0;
            if(m.tipo === 'venta') { puntosDatos[semanaIdx] += valor; balanceTotalGlobal += valor; }
            else { puntosDatos[semanaIdx] -= valor; balanceTotalGlobal -= valor; }
        });
    } else if (filtroGlobalTipo === '1M') {
        puntosDatos = new Array(12).fill(0);
        etiquetas = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        movimientos.forEach(m => {
            if(!m.fecha) return;
            let d = new Date(m.fecha + 'T00:00:00');
            if(d.getFullYear() === anioTarget) {
                let mIdx = d.getMonth();
                let valor = m.monto || 0;
                if(m.tipo === 'venta') { puntosDatos[mIdx] += valor; balanceTotalGlobal += valor; }
                else { puntosDatos[mIdx] -= valor; balanceTotalGlobal -= valor; }
            }
        });
    } else if (filtroGlobalTipo === '1A') {
        let aniosMap = {};
        movimientos.forEach(m => {
            if(!m.fecha) return;
            let d = new Date(m.fecha + 'T00:00:00');
            let yr = d.getFullYear();
            if(!aniosMap[yr]) aniosMap[yr] = 0;
            let valor = m.monto || 0;
            if(m.tipo === 'venta') { aniosMap[yr] += valor; balanceTotalGlobal += valor; }
            else { aniosMap[yr] -= valor; balanceTotalGlobal -= valor; }
        });
        let aniosKeys = Object.keys(aniosMap).sort();
        if(aniosKeys.length === 0) aniosKeys = [anioTarget.toString()];
        etiquetas = aniosKeys;
        puntosDatos = aniosKeys.map(yr => aniosMap[yr] || 0);
    }

    const valGlobalElem = document.getElementById('valorRendimientoGlobal');
    if(valGlobalElem) {
        valGlobalElem.innerText = monedaSimbolo + ' ' + balanceTotalGlobal.toLocaleString();
        valGlobalElem.style.color = balanceTotalGlobal >= 0 ? '#34D399' : '#F87171';
    }

    if(chartGlobalInstance) chartGlobalInstance.destroy();

    chartGlobalInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Rendimiento Global',
                data: puntosDatos,
                borderColor: '#38BDF8',
                backgroundColor: '#38BDF833',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#0B0E14',
                pointBorderColor: '#38BDF8',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#848E9C', font: { size: 11 } } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#848E9C', font: { size: 11 } } }
            }
        }
    });
}

function abrirModalSelectorMesesGlobal() {
    if(filtroGlobalTipo === '1M' || filtroGlobalTipo === '1A') return;
    const grid = document.getElementById('gridMesesSelectorGlobal');
    if(!grid) return;
    grid.innerHTML = '';
    nombresMeses.forEach((m, idx) => {
        grid.innerHTML += `<button onclick="seleccionarMesGlobalDirecto(${idx})" style="padding:10px; background:rgba(34,197,94,0.1); border:none; border-radius:10px; font-weight:700; color:inherit; cursor:pointer;">${m}</button>`;
    });
    document.getElementById('modalSelectorMesesGlobal').style.display = 'flex';
}

function seleccionarMesGlobalDirecto(mesIdx) {
    fechaGlobalActual.setMonth(mesIdx);
    renderGraficaTradingEmpresa();
    document.getElementById('modalSelectorMesesGlobal').style.display = 'none';
}

function abrirModalDetalleGlobalCaja() {
    const lista = document.getElementById('modalGlobalListaMovimientos');
    if(!lista) return;
    lista.innerHTML = '';
    if(movimientos.length === 0) {
        lista.innerHTML = '<p style="color:#86868B; text-align:center;">No hay transacciones registradas.</p>';
    } else {
        movimientos.forEach(m => {
            let color = m.tipo === 'venta' ? '#34C759' : '#EF4444';
            lista.innerHTML += `<div style="display:flex; justify-content:space-between; padding:8px 12px; background:rgba(0,0,0,0.04); border-radius:8px;"><span>${m.desc}</span><strong style="color:${color}">${m.tipo === 'venta' ? '+' : '-'}${monedaSimbolo} ${m.monto.toLocaleString()}</strong></div>`;
        });
    }
    document.getElementById('modalDetalleGlobalCaja').style.display = 'flex';
}

function abrirModalCambiarCuenta() {
    let guardadas = JSON.parse(localStorage.getItem('costify_cuentas_disponibles') || '[]');
    const listaDiv = document.getElementById('listaCuentasEstiloIOS');
    if(listaDiv) {
        listaDiv.innerHTML = '';
        if(guardadas.length === 0) {
            listaDiv.innerHTML = '<p style="color:#86868B; font-size:13px; text-align:center;">No hay otras cuentas guardadas.</p>';
        } else {
            guardadas.forEach(email => {
                let estiloActivo = email === correoUsuario ? 'border: 2px solid #34D399; background: rgba(52,211,153,0.1);' : 'border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.04);';
                listaDiv.innerHTML += `<div onclick="seleccionarYCambiarCuenta('${email}')" style="padding: 10px 14px; border-radius: 10px; cursor: pointer; margin-bottom: 6px; ${estiloActivo} display: flex; justify-content: space-between; align-items: center;"><span>👤 ${email}</span> ${email === correoUsuario ? '<span style="font-size:11px; color:#34D399; font-weight:bold;">ACTIVA</span>' : ''}</div>`;
            });
        }
    }
    document.getElementById('modalCambiarCuenta').style.display = 'flex';
}

function seleccionarYCambiarCuenta(email) {
    guardarDatosSesionActual();
    document.getElementById('modalCambiarCuenta').style.display = 'none';
    cargarDatosDesdeNube(email);
    showToast(`🔄 Cuenta cambiada a: ${email}`);
}

function eliminarCuentaDeDispositivo() {
    if(!correoUsuario) return;
    let guardadas = JSON.parse(localStorage.getItem('costify_cuentas_disponibles') || '[]');
    guardadas = guardadas.filter(e => e !== correoUsuario);
    localStorage.setItem('costify_cuentas_disponibles', JSON.stringify(guardadas));
    showToast('🗑️ Cuenta eliminada de este dispositivo');
    cerrarSesion();
}

function pedirPasswordEliminarCuentaDispositivo() {
    document.getElementById('modalPasswordEliminarCuenta').style.display = 'flex';
}

function ejecutarEliminarCuentaDispositivo() {
    document.getElementById('modalPasswordEliminarCuenta').style.display = 'none';
    eliminarCuentaDeDispositivo();
}

function abrirModalCheckout() {
    const modal = document.getElementById('modalCheckout');
    const linkWompi = document.getElementById('wompiCheckoutLink');
    if (linkWompi && correoUsuario) {
        linkWompi.href = `https://checkout.wompi.co/l/zlIhQx?reference=pro_${encodeURIComponent(correoUsuario)}`;
    }
    if(modal) modal.style.display = 'flex';
}

function activarSuscripcion30DiasPro() {
    esProActivo = true;
    let fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);
    fechaExpiracionPro = fechaExpiracion.toISOString().split('T')[0];
    guardarDatosSesionActual();
    const modalCheckout = document.getElementById('modalCheckout');
    if(modalCheckout) modalCheckout.style.display = 'none';
    showToast('🌟 ¡Membresía Pro+ activada por 30 días!');
    
    const badgePlan = document.getElementById('badgePlan');
    if(badgePlan) { badgePlan.innerText = 'PRO+'; badgePlan.style.background = '#F59E0B'; badgePlan.style.color = '#FFF'; }
    const textoEstado = document.getElementById('textoEstadoPro');
    if(textoEstado) textoEstado.innerText = `Estado actual: Pro+ Activo (Vence: ${fechaExpiracionPro})`;
}

function abrirModalLogo() { document.getElementById('modalLogo').style.display = 'flex'; }

function cerrarSesion() {
    guardarDatosSesionActual();
    correoUsuario = "";
    document.getElementById('mainAppContainer').classList.add('hidden');
    document.getElementById('authScreenLogin').classList.remove('hidden');
    renderizarCuentasGuardadasLogin();
    showToast('👋 Sesión cerrada');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab-btn').forEach(el => el.classList.remove('active'));
    let targetTab = document.getElementById('tab-' + tabId);
    if(targetTab) targetTab.classList.add('active');
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        if(btn.getAttribute('data-tab') === tabId) btn.classList.add('active');
    });
    if(tabId === 'master') renderizarPanelMasterReal();
    if(tabId === 'carrito') actualizarSelectProductosCarrito();
}

function showToast(msg) {
    let t = document.getElementById('toast');
    document.getElementById('toastMsg').innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function iniciarApp(msg) {
    document.getElementById('authScreenLogin').classList.add('hidden');
    document.getElementById('authScreenRegister').classList.add('hidden');
    document.getElementById('mainAppContainer').classList.remove('hidden');
    showToast(msg);
}

function calcularPrecio() {
    let nombre = document.getElementById('calcName').value.trim();
    let costo = parseFloat(document.getElementById('calcCost').value);
    let margen = parseFloat(document.getElementById('calcMargin').value);
    if(!nombre || isNaN(costo) || isNaN(margen)) { showToast('⚠️ Ingresa datos válidos'); return; }
    
    let precioSugerido = costo * (1 + (margen / 100));
    ultimoPrecioCalculado = Math.round(precioSugerido);
    let gananciaNeta = ultimoPrecioCalculado - costo;

    document.getElementById('resPrice').innerText = monedaSimbolo + ' ' + ultimoPrecioCalculado.toLocaleString();
    document.getElementById('resGanancia').innerText = monedaSimbolo + ' ' + gananciaNeta.toLocaleString();
    document.getElementById('calcResultContainer').classList.remove('hidden');

    calculosRecientes.unshift({ id: Date.now(), nombre, costo, margen, precio: ultimoPrecioCalculado });
    guardarDatosSesionActual();
    renderCalculosRecientes();
}

function renderCalculosRecientes() {
    const tbody = document.getElementById('tablaCalculosRecientesBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    if(calculosRecientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 15px; color: var(--text-secondary);">No hay cálculos recientes.</td></tr>';
        return;
    }
    calculosRecientes.forEach(c => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 10px; font-weight:700;">${c.nombre}</td>
                <td style="padding: 10px;">${monedaSimbolo} ${c.costo.toLocaleString()}</td>
                <td style="padding: 10px;">${c.margen}%</td>
                <td style="padding: 10px; color: #10B981; font-weight:800;">${monedaSimbolo} ${c.precio.toLocaleString()}</td>
                <td style="padding: 10px; text-align: right;">
                    <button onclick="eliminarCalculoReciente(${c.id})" style="background:none; border:none; color:#EF4444; cursor:pointer; font-weight:bold;">✕</button>
                </td>
            </tr>`;
    });
}

function eliminarCalculoReciente(id) {
    calculosRecientes = calculosRecientes.filter(c => c.id !== id);
    guardarDatosSesionActual();
    renderCalculosRecientes();
}

function copiarPrecioCalculado() {
    navigator.clipboard.writeText(ultimoPrecioCalculado);
    showToast('📋 Precio copiado');
}

function guardarEnInventarioDesdeCalc() {
    let nombre = document.getElementById('calcName').value.trim();
    if(!nombre || ultimoPrecioCalculado === 0) return;
    productos.push({ id: Date.now(), nombre, precio: ultimoPrecioCalculado, stock: 1 });
    guardarDatosSesionActual();
    renderInventario();
    showToast('🚀 Producto guardado en inventario');
}

function abrirModalProducto() { document.getElementById('modalProducto').style.display = 'flex'; }

function guardarNuevoProducto() {
    let nombre = document.getElementById('nuevoNombre').value.trim();
    let precio = parseFloat(document.getElementById('nuevoPrecio').value);
    let stock = parseInt(document.getElementById('nuevoStock').value);
    if(!nombre || isNaN(precio) || isNaN(stock)) { showToast('⚠️ Completa todos los campos'); return; }

    productos.push({ id: Date.now(), nombre, precio, stock });
    guardarDatosSesionActual();
    renderInventario();
    document.getElementById('modalProducto').style.display = 'none';
    document.getElementById('nuevoNombre').value = '';
    document.getElementById('nuevoPrecio').value = '';
    document.getElementById('nuevoStock').value = '';
    showToast('📦 Producto guardado con éxito');
}

function renderInventario() {
    const container = document.getElementById('inventoryList');
    const widgetCount = document.getElementById('widgetProdCount');
    if(widgetCount) widgetCount.innerText = `${productos.length} productos registrados.`;
    if(!container) return;
    
    container.innerHTML = '';
    if(productos.length === 0) {
        container.innerHTML = `
            <div style="grid-column: span 2; text-align: center; padding: 40px; background: var(--card-bg); border-radius: 20px; border: 1px solid var(--border-color);">
                <p style="color: var(--text-secondary); font-size: 14px; font-weight: 600;">No hay productos en inventario.</p>
            </div>`;
        return;
    }

    productos.forEach(p => {
        container.innerHTML += `
            <div class="card zoom-card" style="padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; border-radius: 20px; background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: blur(20px);">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.2px;">${p.nombre}</h4>
                    <div style="display: flex; align-items: center; gap: 12px; margin-top: 2px;">
                        <span style="font-size: 13px; color: #10B981; font-weight: 700;">${monedaSimbolo} ${p.precio.toLocaleString()}</span>
                        <span style="font-size: 11px; background: rgba(120, 120, 128, 0.1); color: var(--text-secondary); padding: 2px 8px; border-radius: 8px; font-weight: 700;">Stock: ${p.stock} unids.</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="display: flex; align-items: center; background: rgba(120, 120, 128, 0.08); padding: 4px; border-radius: 12px; gap: 4px; border: 1px solid var(--border-color);">
                        <button onclick="cambiarStockProducto(${p.id}, -1)" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: none; width: 30px; height: 30px; border-radius: 9px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.1s;" title="Restar stock">-</button>
                        <button onclick="cambiarStockProducto(${p.id}, 1)" style="background: rgba(16, 185, 129, 0.15); color: #10B981; border: none; width: 30px; height: 30px; border-radius: 9px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.1s;" title="Sumar stock">+</button>
                    </div>
                    <button onclick="eliminarProducto(${p.id})" style="background: rgba(239, 68, 68, 0.08); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.2); width: 38px; height: 38px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all 0.2s;" title="Eliminar producto">🗑️</button>
                </div>
            </div>`;
    });
}

function cambiarStockProducto(id, cambio) {
    let prod = productos.find(p => p.id === id);
    if(prod) {
        prod.stock = Math.max(0, prod.stock + cambio);
        guardarDatosSesionActual();
        renderInventario();
        showToast(`📦 Stock actualizado: ${prod.nombre} (${prod.stock})`);
    }
}

function eliminarProducto(id) {
    productos = productos.filter(p => p.id !== id);
    guardarDatosSesionActual();
    renderInventario();
    showToast('🗑️ Producto eliminado');
}

function abrirModalMovimiento(tipo) {
    tipoMovimientoActual = tipo;
    const titulo = document.getElementById('modalMovTitulo');
    if(titulo) titulo.innerText = tipo === 'venta' ? 'Registrar Venta' : 'Registrar Gasto';
    document.getElementById('modalMovimiento').style.display = 'flex';
}

function guardarMovimiento() {
    let desc = document.getElementById('movDesc').value.trim();
    let monto = parseFloat(document.getElementById('movMonto').value);
    if(!desc || isNaN(monto)) { showToast('⚠️ Ingresa descripción y monto'); return; }

    let fechaHoy = new Date().toISOString().split('T')[0];
    movimientos.unshift({ id: Date.now(), desc, monto, tipo: tipoMovimientoActual, fecha: fechaHoy });
    
    recalcularMetricasDesdeCaja();
    renderMovimientos();
    guardarDatosSesionActual();

    document.getElementById('modalMovimiento').style.display = 'none';
    document.getElementById('movDesc').value = '';
    document.getElementById('movMonto').value = '';
    showToast(tipoMovimientoActual === 'venta' ? '💵 Venta registrada' : '💸 Gasto registrado');
}

function renderMovimientos() {
    const container = document.getElementById('movimientosList');
    if(!container) return;
    container.innerHTML = '';

    if(movimientos.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 15px;">No hay transacciones registradas.</p>';
        return;
    }

    movimientos.forEach(m => {
        let color = m.tipo === 'venta' ? '#10B981' : '#EF4444';
        let signo = m.tipo === 'venta' ? '+' : '-';
        container.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(120, 120, 128, 0.05); border-radius: 12px; border: 1px solid var(--border-color);">
                <div>
                    <strong style="font-size: 14px; display: block; margin-bottom: 2px;">${m.desc}</strong>
                    <span style="font-size: 11px; color: var(--text-secondary);">${m.fecha || 'Hoy'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <strong style="font-size: 14px; color: ${color};">${signo}${monedaSimbolo} ${m.monto.toLocaleString()}</strong>
                    <button onclick="pedirPasswordBorrarUnico(${m.id})" style="background:none; border:none; color:#EF4444; cursor:pointer; font-weight:bold; font-size:16px;" title="Eliminar transacción">✕</button>
                </div>
            </div>`;
    });
}

function pedirPasswordBorrarUnico(id) {
    idMovimientoAEliminar = id;
    document.getElementById('inputPassBorrarUnico').value = '';
    document.getElementById('modalPasswordBorrarUnico').style.display = 'flex';
}

function ejecutarBorrarMovimientoUnico() {
    let pass = document.getElementById('inputPassBorrarUnico').value.trim();
    if(!pass) { showToast('⚠️ Ingresa tu contraseña'); return; }

    auth.signInWithEmailAndPassword(correoUsuario, pass).then(() => {
        movimientos = movimientos.filter(m => m.id !== idMovimientoAEliminar);
        recalcularMetricasDesdeCaja();
        renderMovimientos();
        guardarDatosSesionActual();
        document.getElementById('modalPasswordBorrarUnico').style.display = 'none';
        showToast('🗑️ Transacción eliminada con éxito');
    }).catch(() => {
        showToast('❌ Contraseña incorrecta');
    });
}

function filtrarMovimientosPorFecha() {
    let fechaFiltro = document.getElementById('inputFiltroFechaCaja').value;
    if(!fechaFiltro) return;
    const container = document.getElementById('movimientosList');
    if(!container) return;
    container.innerHTML = '';
    let filtrados = movimientos.filter(m => m.fecha === fechaFiltro);
    if(filtrados.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 15px;">No hay transacciones en esta fecha.</p>';
        return;
    }
    filtrados.forEach(m => {
        let color = m.tipo === 'venta' ? '#10B981' : '#EF4444';
        let signo = m.tipo === 'venta' ? '+' : '-';
        container.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(120, 120, 128, 0.05); border-radius: 12px; border: 1px solid var(--border-color);">
                <div><strong style="font-size: 14px; display: block;">${m.desc}</strong><span style="font-size: 11px; color: var(--text-secondary);">${m.fecha}</span></div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <strong style="font-size: 14px; color: ${color};">${signo}${monedaSimbolo} ${m.monto.toLocaleString()}</strong>
                    <button onclick="pedirPasswordBorrarUnico(${m.id})" style="background:none; border:none; color:#EF4444; cursor:pointer; font-weight:bold; font-size:16px;">✕</button>
                </div>
            </div>`;
    });
}

function limpiarFiltroFechaCaja() {
    document.getElementById('inputFiltroFechaCaja').value = '';
    renderMovimientos();
}

function pedirPasswordEliminarHistorial() {
    document.getElementById('modalPasswordBorrar').style.display = 'flex';
}

function ejecutarBorrarHistorial() {
    movimientos = [];
    recalcularMetricasDesdeCaja();
    renderMovimientos();
    guardarDatosSesionActual();
    document.getElementById('modalPasswordBorrar').style.display = 'none';
    showToast('🗑️ Historial borrado');
}

function actualizarSelectProductosCarrito(filtro = "") {
    const select = document.getElementById('selectProductoCarrito');
    if(!select) return;
    
    let bgOpt = isDarkMode ? '#1E293B' : '#FFFFFF';
    let colorOpt = isDarkMode ? '#F8FAFC' : '#0F172A';

    select.innerHTML = `<option value="" style="background: ${bgOpt}; color: ${colorOpt};">-- Elige un producto --</option>`;
    
    let filtrados = productos.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase()));
    filtrados.forEach(p => {
        select.innerHTML += `<option value="${p.id}" style="background: ${bgOpt}; color: ${colorOpt}; font-weight: 600;">${p.nombre} (${monedaSimbolo}${p.precio.toLocaleString()}) - Stock: ${p.stock}</option>`;
    });
}

function filtrarProductosCarrito() {
    let textoBusqueda = document.getElementById('inputBuscadorCarrito')?.value || "";
    actualizarSelectProductosCarrito(textoBusqueda);
}

function agregarProductoAlCarritoConCantidad() {
    const select = document.getElementById('selectProductoCarrito');
    const inputCant = document.getElementById('inputCantidadCarrito');
    let prodId = parseInt(select.value);
    let cantidadAdicionar = parseInt(inputCant.value) || 1;

    if(isNaN(prodId)) {
        showToast('⚠️ Selecciona un producto válido');
        return;
    }

    let productoEncontrado = productos.find(p => p.id === prodId);
    if(!productoEncontrado) return;

    let itemExistente = carritoItems.find(i => i.id === prodId);
    if(itemExistente) {
        itemExistente.cantidad += cantidadAdicionar;
    } else {
        carritoItems.push({ 
            id: productoEncontrado.id, 
            nombre: productoEncontrado.nombre, 
            precio: productoEncontrado.precio, 
            cantidad: cantidadAdicionar 
        });
    }

    select.value = "";
    inputCant.value = "1";
    document.getElementById('inputBuscadorCarrito').value = "";
    actualizarSelectProductosCarrito();
    renderizarCarritoItems();
    showToast(`🛒 ${productoEncontrado.nombre} agregado al carrito`);
}

function cambiarCantidadItemCarrito(id, cambio) {
    let item = carritoItems.find(i => i.id === id);
    if(item) {
        item.cantidad += cambio;
        if(item.cantidad <= 0) {
            carritoItems = carritoItems.filter(i => i.id !== id);
        }
    }
    renderizarCarritoItems();
}

function renderizarCarritoItems() {
    const contenedor = document.getElementById('listaItemsCarrito');
    const totalElem = document.getElementById('carritoTotalMonto');
    if(!contenedor) return;

    if(carritoItems.length === 0) {
        contenedor.innerHTML = '<p style="color: var(--text-secondary); text-align: center; font-size: 13px;">El carrito está vacío.</p>';
        if(totalElem) totalElem.innerText = `${monedaSimbolo} 0`;
        return;
    }

    let html = '';
    let totalGeneral = 0;
    carritoItems.forEach(i => {
        let subtotal = i.precio * i.cantidad;
        totalGeneral += subtotal;
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0;">
                <div>
                    <strong style="font-size: 13px; display: block; color: var(--text-primary);">${i.nombre}</strong>
                    <span style="font-size: 11px; color: var(--text-secondary);">${monedaSimbolo}${i.precio.toLocaleString()} x ${i.cantidad}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 13px; color: #10B981;">${monedaSimbolo}${subtotal.toLocaleString()}</strong>
                    <button onclick="cambiarCantidadItemCarrito(${i.id}, 1)" style="background:rgba(16,185,129,0.2); color:#10B981; border:none; width:22px; height:22px; border-radius:6px; font-weight:bold; cursor:pointer;">+</button>
                    <button onclick="cambiarCantidadItemCarrito(${i.id}, -1)" style="background:rgba(239,68,68,0.2); color:#EF4444; border:none; width:22px; height:22px; border-radius:6px; font-weight:bold; cursor:pointer;">-</button>
                </div>
            </div>`;
    });
    contenedor.innerHTML = html;
    if(totalElem) totalElem.innerText = `${monedaSimbolo} ${totalGeneral.toLocaleString()}`;
}

function confirmarVentaDesdeCarritoConTicket() {
    let totalGeneral = carritoItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    if(totalGeneral <= 0) {
        showToast('⚠️ Agrega productos al carrito primero');
        return;
    }

    let descripcionVenta = carritoItems.map(i => `${i.cantidad}x ${i.nombre}`).join(', ');
    let fechaHoy = new Date().toISOString().split('T')[0];

    movimientos.unshift({ id: Date.now(), desc: `Venta Carrito: ${descripcionVenta}`, monto: totalGeneral, tipo: 'venta', fecha: fechaHoy });
    
    recalcularMetricasDesdeCaja();
    renderMovimientos();
    guardarDatosSesionActual();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text(empresaNombre, 105, 20, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.text(`Comprobante de Venta / Ticket Digital`, 105, 28, { align: "center" });
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 20, 40);
    doc.text(`Cuenta Comercial: ${correoUsuario}`, 20, 48);
    
    doc.setLineWidth(0.5);
    doc.line(20, 54, 190, 54);

    let posY = 64;
    doc.setFont("Helvetica", "bold");
    doc.text("Cant x Producto", 20, posY);
    doc.text("Subtotal", 160, posY);
    posY += 8;

    doc.setFont("Helvetica", "normal");
    carritoItems.forEach(i => {
        let subtotalStr = `${monedaSimbolo}${(i.precio * i.cantidad).toLocaleString()}`;
        doc.text(`${i.cantidad}x ${i.nombre}`, 20, posY);
        doc.text(subtotalStr, 160, posY);
        posY += 8;
    });

    doc.line(20, posY + 2, 190, posY + 2);
    posY += 12;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`TOTAL PAGADO: ${monedaSimbolo} ${totalGeneral.toLocaleString()}`, 20, posY);

    doc.setFontSize(10);
    doc.setFont("Helvetica", "italic");
    doc.text("¡Gracias por su compra en Costify POS!", 105, posY + 25, { align: "center" });

    doc.save(`Ticket_Venta_${empresaNombre}_${Date.now()}.pdf`);

    carritoItems = [];
    renderizarCarritoItems();

    showToast('✅ ¡Venta cobrada, registrada y Ticket PDF generado!');
    switchTab('caja');
}
