// ============================================================
// CONFIGURACIÓN DE SUPABASE
// ============================================================
const SUPABASE_URL = 'https://gmaiqpvjlpvygeexsavb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYWlxcHZqbHB2eWdlZXhzYXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MzM3MzIsImV4cCI6MjEwMjMwOTczMn0.iDhDw31RdgAlFs0G2zQ570r7Jh9sqyiey6-1W0kdgQw';

// Inicializar Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class SafetyObserver {
    constructor() {
        this.currentView = 'registro';
        this.tipoChart = null;
        this.areaChart = null;
        this.statorChart = null;
        this.rotorChart = null;
        this.personaChart = null;
        this.buenasPracticasChart = null;
        this.supervisorRiesgosChart = null;
        this.supervisorBuenasChart = null;
        this.paretoChart = null;
        this.supervisores = [];
        this.usuarioActual = null;
        this.init();
    }

    async init() {
        const autenticado = await this.verificarAutenticacion();
        if (!autenticado) {
            this.mostrarLogin();
            return;
        }
        
        await this.cargarSupervisores();
        this.registerSW();
        this.setupNavigation();
        this.setupForms();
        this.setupFilters();
        await this.loadObservations();
        await this.loadStatistics();
        setTimeout(() => {
            this.generarHeatmap();
            this.generarGraficaBuenasPracticas();
            this.generarDiagramaPareto();
        }, 500);
    }

    // ============================================================
    // AUTENTICACIÓN
    // ============================================================
    
    async verificarAutenticacion() {
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            if (error || !user) {
                return false;
            }
            this.usuarioActual = user;
            console.log('✅ Usuario autenticado');
            return true;
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            return false;
        }
    }

    mostrarLogin() {
        const loginHTML = `
            <div id="login-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;justify-content:center;align-items:center;z-index:9999;">
                <div style="background:white;padding:40px;border-radius:16px;max-width:400px;width:90%;">
                    <div style="text-align:center;margin-bottom:20px;">
                        <div style="font-size:48px;">🦺</div>
                        <h2 style="color:#1a237e;margin:10px 0;">Safety Observer</h2>
                        <p style="color:#666;font-size:14px;">Accede para registrar observaciones</p>
                    </div>
                    <div id="login-form">
                        <div class="form-group">
                            <label style="display:block;font-weight:600;color:#37474f;margin-bottom:5px;">Nombre</label>
                            <input type="text" id="login-nombre" placeholder="Tu nombre" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
                        </div>
                        <div class="form-group">
                            <label style="display:block;font-weight:600;color:#37474f;margin-bottom:5px;">Apellido Paterno</label>
                            <input type="text" id="login-apellido" placeholder="Tu apellido paterno" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
                        </div>
                        <div class="form-group">
                            <label style="display:block;font-weight:600;color:#37474f;margin-bottom:5px;">Contraseña</label>
                            <input type="password" id="login-password" placeholder="********" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
                        </div>
                        <button type="button" onclick="app.iniciarSesion()" style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:16px;margin-top:10px;">
                            🔐 Iniciar Sesión
                        </button>
                        <p style="text-align:center;margin-top:15px;font-size:13px;color:#666;">
                            ¿No tienes cuenta? 
                            <a href="#" onclick="app.mostrarRegistro()" style="color:#2563eb;text-decoration:none;font-weight:600;">Regístrate</a>
                        </p>
                    </div>
                    <div id="registro-form" style="display:none;">
                        <div class="form-group">
                            <label style="display:block;font-weight:600;color:#37474f;margin-bottom:5px;">Nombre(s)</label>
                            <input type="text" id="registro-nombre" placeholder="Tu nombre" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
                        </div>
                        <div class="form-group">
                            <label style="display:block;font-weight:600;color:#37474f;margin-bottom:5px;">Apellido Paterno</label>
                            <input type="text" id="registro-apellido-paterno" placeholder="Apellido paterno" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
                        </div>
                        <div class="form-group">
                            <label style="display:block;font-weight:600;color:#37474f;margin-bottom:5px;">Apellido Materno</label>
                            <input type="text" id="registro-apellido-materno" placeholder="Apellido materno (opcional)" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
                        </div>
                        <div class="form-group">
                            <label style="display:block;font-weight:600;color:#37474f;margin-bottom:5px;">Contraseña</label>
                            <input type="password" id="registro-password" placeholder="********" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
                        </div>
                        <button type="button" onclick="app.registrarUsuario()" style="width:100%;padding:12px;background:#4caf50;color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:16px;margin-top:10px;">
                            📝 Registrarse
                        </button>
                        <p style="text-align:center;margin-top:15px;font-size:13px;color:#666;">
                            ¿Ya tienes cuenta? 
                            <a href="#" onclick="app.mostrarLoginForm()" style="color:#2563eb;text-decoration:none;font-weight:600;">Inicia Sesión</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
        const existingModal = document.getElementById('login-modal');
        if (existingModal) {
            existingModal.remove();
        }
        document.body.insertAdjacentHTML('beforeend', loginHTML);
    }

    async iniciarSesion() {
        const nombre = document.getElementById('login-nombre').value.trim();
        const apellido = document.getElementById('login-apellido').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!nombre || !apellido || !password) {
            this.mostrarMensajeError('⚠️ Completa todos los campos');
            return;
        }

        try {
            // Buscar el supervisor por nombre y apellido
            const { data: supervisor, error: searchError } = await supabaseClient
                .from('supervisores')
                .select('*')
                .eq('nombre', nombre)
                .eq('apellido_paterno', apellido)
                .maybeSingle();

            if (searchError) {
                console.error('❌ Error buscando supervisor:', searchError);
                this.mostrarMensajeError('❌ Error al buscar el usuario');
                return;
            }

            if (!supervisor) {
                this.mostrarMensajeError('❌ Usuario no encontrado. Verifica tus datos.');
                return;
            }

            // Email generado internamente (el usuario no lo ve)
            const email = `${nombre}.${apellido}@safety.local`;
            
            console.log('🔐 Intentando iniciar sesión como:', nombre, apellido);
            
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('❌ Error de autenticación:', error);
                this.mostrarMensajeError('❌ Contraseña incorrecta. Intenta nuevamente.');
                return;
            }

            if (!data || !data.user) {
                this.mostrarMensajeError('❌ No se pudo iniciar sesión. Verifica tus credenciales.');
                return;
            }

            this.usuarioActual = data.user;
            console.log('✅ Usuario autenticado:', nombre, apellido);
            
            const modal = document.getElementById('login-modal');
            if (modal) modal.remove();
            
            this.mostrarMensajeExito('✅ Bienvenido ' + nombre + ' ' + apellido);
            
            await this.cargarSupervisores();
            await this.loadObservations();
            await this.loadStatistics();
            this.generarHeatmap();
            this.generarGraficaBuenasPracticas();
            this.generarDiagramaPareto();
            
        } catch (error) {
            console.error('❌ Error inesperado:', error);
            this.mostrarMensajeError('❌ Error inesperado: ' + error.message);
        }
    }

    async registrarUsuario() {
        const nombre = document.getElementById('registro-nombre').value.trim();
        const apellidoPaterno = document.getElementById('registro-apellido-paterno').value.trim();
        const apellidoMaterno = document.getElementById('registro-apellido-materno').value.trim();
        const password = document.getElementById('registro-password').value;

        if (!nombre || !apellidoPaterno || !password) {
            this.mostrarMensajeError('⚠️ Completa todos los campos obligatorios');
            return;
        }

        if (password.length < 6) {
            this.mostrarMensajeError('⚠️ La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            // Email generado internamente (el usuario no lo ve)
            const email = `${nombre}.${apellidoPaterno}@safety.local`;
            
            console.log('📝 Registrando usuario:', nombre, apellidoPaterno);
            
            // Registrar en Supabase Auth (el usuario no ve el email)
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        nombre: nombre,
                        apellido_paterno: apellidoPaterno,
                        apellido_materno: apellidoMaterno || ''
                    }
                }
            });

            if (error) {
                console.error('❌ Error en registro:', error);
                this.mostrarMensajeError('❌ Error al registrarse: ' + error.message);
                return;
            }

            if (!data || !data.user) {
                this.mostrarMensajeError('❌ No se pudo registrar el usuario. Intenta nuevamente.');
                return;
            }

            console.log('✅ Usuario registrado:', nombre, apellidoPaterno);

            // Guardar en supervisores
            try {
                const supervisorData = {
                    nombre: nombre,
                    apellido_paterno: apellidoPaterno,
                    apellido_materno: apellidoMaterno || ''
                };
                
                // Verificar si ya existe un supervisor con ese nombre y apellido
                const { data: existente, error: checkError } = await supabaseClient
                    .from('supervisores')
                    .select('*')
                    .eq('nombre', nombre)
                    .eq('apellido_paterno', apellidoPaterno)
                    .maybeSingle();

                if (checkError) {
                    console.error('❌ Error verificando existencia:', checkError);
                }

                if (!existente) {
                    const { error: insertError } = await supabaseClient
                        .from('supervisores')
                        .insert(supervisorData);

                    if (insertError) {
                        console.error('❌ Error guardando supervisor:', insertError);
                        this.mostrarMensajeExito('✅ Usuario registrado, pero hubo un problema al guardar los datos del supervisor');
                    } else {
                        this.mostrarMensajeExito('✅ Usuario registrado exitosamente');
                    }
                } else {
                    this.mostrarMensajeExito('✅ Usuario ya existente. Inicia sesión.');
                }
            } catch (insertError) {
                console.error('❌ Error guardando supervisor:', insertError);
                this.mostrarMensajeExito('✅ Usuario registrado, pero hubo un problema al guardar los datos del supervisor');
            }

            document.getElementById('registro-nombre').value = '';
            document.getElementById('registro-apellido-paterno').value = '';
            document.getElementById('registro-apellido-materno').value = '';
            document.getElementById('registro-password').value = '';
            
            this.mostrarLoginForm();
            
            // Prellenar campos de login
            document.getElementById('login-nombre').value = nombre;
            document.getElementById('login-apellido').value = apellidoPaterno;
            
            this.mostrarMensajeExito('✅ Usuario registrado. Ahora inicia sesión.');
            
        } catch (error) {
            console.error('❌ Error inesperado en registro:', error);
            this.mostrarMensajeError('❌ Error inesperado: ' + error.message);
        }
    }

    mostrarRegistro() {
        const loginForm = document.getElementById('login-form');
        const registroForm = document.getElementById('registro-form');
        if (loginForm) loginForm.style.display = 'none';
        if (registroForm) registroForm.style.display = 'block';
        this.limpiarMensajes();
    }

    mostrarLoginForm() {
        const loginForm = document.getElementById('login-form');
        const registroForm = document.getElementById('registro-form');
        if (loginForm) loginForm.style.display = 'block';
        if (registroForm) registroForm.style.display = 'none';
        this.limpiarMensajes();
    }

    mostrarMensajeError(mensaje) {
        this.showToast(mensaje);
        
        const modal = document.getElementById('login-modal');
        if (modal) {
            const msgAnterior = modal.querySelector('.mensaje-modal');
            if (msgAnterior) msgAnterior.remove();
            
            const msgDiv = document.createElement('div');
            msgDiv.className = 'mensaje-modal';
            msgDiv.style.cssText = 'background:#ffebee;color:#c62828;padding:10px;border-radius:6px;margin:10px 0;text-align:center;font-weight:600;';
            msgDiv.textContent = mensaje;
            
            const titulo = modal.querySelector('h2');
            if (titulo) {
                titulo.parentNode.insertBefore(msgDiv, titulo.nextSibling);
            }
            
            setTimeout(() => {
                if (msgDiv.parentNode) msgDiv.remove();
            }, 5000);
        }
    }

    mostrarMensajeExito(mensaje) {
        this.showToast(mensaje);
    }

    limpiarMensajes() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            const mensajes = modal.querySelectorAll('.mensaje-modal');
            mensajes.forEach(el => el.remove());
        }
    }

    // ============================================================
    // REGISTER SW
    // ============================================================
    
    async registerSW() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/safety-observer-pwa/sw.js');
                console.log('Service Worker registrado:', registration.scope);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showToast('Nueva versión disponible. Actualizando...');
                                setTimeout(() => {
                                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                                    window.location.reload();
                                }, 1500);
                            }
                        });
                    }
                });

                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        refreshing = true;
                        window.location.reload();
                    }
                });
            } catch (error) {
                console.error('Error registrando Service Worker:', error);
            }
        }
    }

    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', e => this.switchView(e.currentTarget.dataset.view));
        });
    }

    switchView(viewName) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewName}`).classList.add('active');
        this.currentView = viewName;
        if (viewName === 'observaciones') this.loadObservations();
        if (viewName === 'estadisticas') {
            this.loadStatistics();
            setTimeout(() => {
                this.generarHeatmap();
                this.generarGraficaBuenasPracticas();
                this.generarDiagramaPareto();
            }, 300);
        }
    }

    // -------------------------------------------
    // LÓGICA DEL FORMULARIO Y VALIDACIONES
    // -------------------------------------------
    setupForms() {
        document.querySelectorAll('input[name="area"]').forEach(radio => {
            radio.addEventListener('change', e => {
                const area = e.target.value;
                const grupo = document.getElementById('grupo-modulo');
                if (area === 'stator' || area === 'rotor') {
                    grupo.style.display = 'block';
                } else {
                    grupo.style.display = 'none';
                    document.getElementById('modulo').value = '';
                }
                this.clearFieldError('error-area');
            });
        });

        document.querySelectorAll('input[name="tipo-observacion"]').forEach(radio => {
            radio.addEventListener('change', e => {
                this.actualizarNivelesRiesgo(e.target.value);
                this.clearFieldError('error-tipo');
            });
        });

        document.querySelectorAll('input[name="nivel-riesgo"]').forEach(radio => {
            radio.addEventListener('change', () => this.clearFieldError('error-riesgo'));
        });

        document.getElementById('persona-observada').addEventListener('change', () => this.clearFieldError('error-persona'));
        document.getElementById('supervisor-select').addEventListener('change', () => this.clearFieldError('error-supervisor'));
        document.getElementById('descripcion').addEventListener('input', () => this.clearFieldError('error-descripcion'));

        document.getElementById('form-observacion').addEventListener('submit', e => {
            e.preventDefault();
            this.saveObservation();
        });
    }

    actualizarNivelesRiesgo(tipo) {
        const todos = document.querySelectorAll('input[name="nivel-riesgo"]');
        if (tipo === 'buena-practica') {
            todos.forEach(r => {
                if (r.value === 'no-aplica') {
                    r.disabled = false;
                    r.checked = true;
                    r.closest('.radio-option').classList.remove('disabled');
                } else {
                    r.disabled = true;
                    r.checked = false;
                    r.closest('.radio-option').classList.add('disabled');
                }
            });
        } else {
            todos.forEach(r => {
                if (r.value === 'no-aplica') {
                    r.disabled = true;
                    r.checked = false;
                    r.closest('.radio-option').classList.add('disabled');
                } else {
                    r.disabled = false;
                    r.closest('.radio-option').classList.remove('disabled');
                }
            });
            const seleccionado = document.querySelector('input[name="nivel-riesgo"]:checked');
            if (seleccionado && seleccionado.value === 'no-aplica') {
                seleccionado.checked = false;
            }
        }
        this.clearFieldError('error-riesgo');
    }

    clearFieldError(id) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            el.closest('.form-group')?.classList.remove('has-error');
        }
    }

    clearAllErrors() {
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));
    }

    showToast(msg) {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.log('Toast:', msg);
            return;
        }
        toast.textContent = msg;
        toast.className = 'toast show';
        setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 5000);
    }

    validateForm() {
        this.clearAllErrors();
        let valid = true;
        const area = document.querySelector('input[name="area"]:checked');
        const tipo = document.querySelector('input[name="tipo-observacion"]:checked');
        const riesgo = document.querySelector('input[name="nivel-riesgo"]:checked');
        const persona = document.getElementById('persona-observada').value;
        const supervisor = document.getElementById('supervisor-select').value;
        const desc = document.getElementById('descripcion').value.trim();
        const modulo = document.getElementById('modulo');
        const moduloVisible = document.getElementById('grupo-modulo').style.display !== 'none';

        if (!area) { this.setError('error-area', 'Selecciona un área de trabajo'); valid = false; }
        if (!tipo) { this.setError('error-tipo', 'Selecciona un tipo de observación'); valid = false; }
        if (!riesgo) { this.setError('error-riesgo', 'Selecciona un nivel de riesgo'); valid = false; }
        if (moduloVisible && modulo.value === '') { this.setError('error-modulo', 'Selecciona un módulo'); valid = false; }
        if (persona === '') { this.setError('error-persona', 'Indica a quién se observa'); valid = false; }
        if (supervisor === '') { this.setError('error-supervisor', 'Selecciona un supervisor'); valid = false; }
        if (desc === '') { this.setError('error-descripcion', 'La descripción es obligatoria'); valid = false; }

        if (!valid) this.showToast('Información incompleta. Revisa los campos señalados.');
        return valid;
    }

    setError(id, msg) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '⚠️ ' + msg;
            el.closest('.form-group')?.classList.add('has-error');
        }
    }

    // ============================================================
    // GUARDAR OBSERVACIÓN
    // ============================================================
    
    async saveObservation() {
        if (!this.validateForm()) return;

        if (!this.usuarioActual) {
            this.showToast('⚠️ Por favor, inicia sesión primero');
            this.mostrarLogin();
            return;
        }

        const now = new Date();
        
        const supervisorEvaluado = this.supervisores.find(s => 
            `${s.apellido_paterno} ${s.apellido_materno} ${s.nombre}` === document.getElementById('supervisor-select').value
        );

        const nombreRegistra = this.usuarioActual.user_metadata?.nombre || '';
        const apellidoPaternoRegistra = this.usuarioActual.user_metadata?.apellido_paterno || '';
        
        const supervisorRegistra = this.supervisores.find(s => 
            s.nombre === nombreRegistra &&
            s.apellido_paterno === apellidoPaternoRegistra
        );

        const registraId = supervisorRegistra?.id || (this.supervisores.length > 0 ? this.supervisores[0].id : null);

        const obs = {
            supervisor_registra_id: registraId,
            supervisor_evaluado_id: supervisorEvaluado?.id || null,
            area: document.querySelector('input[name="area"]:checked').value,
            modulo: document.getElementById('modulo').value || null,
            tipo: document.querySelector('input[name="tipo-observacion"]:checked').value,
            nivel_riesgo: document.querySelector('input[name="nivel-riesgo"]:checked').value,
            persona_observada: document.getElementById('persona-observada').value,
            descripcion: document.getElementById('descripcion').value,
            accion_inmediata: document.getElementById('accion-inmediata').value || null,
            fecha: now.toISOString()
        };

        delete obs.id;
        
        console.log('📤 Enviando observación:', obs);

        try {
            this.showToast('⏳ Guardando observación...');
            
            const { data, error } = await supabaseClient
                .from('observaciones')
                .insert(obs)
                .select();

            if (error) {
                console.error('❌ Error de Supabase:', error);
                throw error;
            }

            console.log('✅ Observación guardada:', data);

            this.showToast('✅ Observación guardada en la nube');
            this.resetForm();
            
            await this.loadObservations();
            await this.loadStatistics();
            
            setTimeout(() => {
                this.generarHeatmap();
                this.generarGraficaBuenasPracticas();
                this.generarDiagramaPareto();
            }, 300);
            
        } catch (error) {
            console.error('❌ Error guardando observación:', error);
            this.showToast('❌ Error al guardar: ' + error.message);
        }
    }

    resetForm() {
        document.querySelectorAll('input[name="area"]').forEach(r => r.checked = false);
        document.querySelectorAll('input[name="tipo-observacion"]').forEach(r => r.checked = false);
        document.querySelectorAll('input[name="nivel-riesgo"]').forEach(r => {
            r.checked = false;
            r.disabled = false;
            r.closest('.radio-option').classList.remove('disabled');
        });
        document.getElementById('modulo').value = '';
        document.getElementById('persona-observada').value = '';
        document.getElementById('supervisor-select').value = '';
        document.getElementById('descripcion').value = '';
        document.getElementById('accion-inmediata').value = '';
        document.getElementById('grupo-modulo').style.display = 'none';
        this.clearAllErrors();
    }

    // -------------------------------------------
    // FILTROS Y LISTADO DE OBSERVACIONES
    // -------------------------------------------
    setupFilters() {
        document.getElementById('filter-fecha').addEventListener('change', () => this.loadObservations());
        document.getElementById('filter-area').addEventListener('change', () => this.loadObservations());
        document.getElementById('filter-tipo').addEventListener('change', () => this.loadObservations());
    }

    async loadObservations() {
        try {
            const { data: observaciones, error } = await supabaseClient
                .from('observaciones')
                .select(`
                    *,
                    registra:supervisor_registra_id (
                        id,
                        nombre,
                        apellido_paterno,
                        apellido_materno
                    ),
                    evaluado:supervisor_evaluado_id (
                        id,
                        nombre,
                        apellido_paterno,
                        apellido_materno
                    )
                `)
                .order('fecha', { ascending: false });

            if (error) throw error;

            const observacionesConSupervisores = (observaciones || []).map(obs => {
                if (obs.registra) {
                    obs.registra_nombre = `${obs.registra.apellido_paterno} ${obs.registra.apellido_materno} ${obs.registra.nombre}`;
                } else {
                    obs.registra_nombre = 'Sin identificar';
                }
                
                if (obs.evaluado) {
                    obs.evaluado_nombre = `${obs.evaluado.apellido_paterno} ${obs.evaluado.apellido_materno} ${obs.evaluado.nombre}`;
                } else {
                    obs.evaluado_nombre = 'No especificado';
                }
                
                return obs;
            });

            const filtered = this.applyFilters(observacionesConSupervisores || []);
            this.renderObservations(filtered);
            
            if (observacionesConSupervisores && observacionesConSupervisores.length > 0) {
                localStorage.setItem('observaciones_cache', JSON.stringify(observacionesConSupervisores));
            }
            
        } catch (error) {
            console.error('Error cargando observaciones:', error);
            const cached = localStorage.getItem('observaciones_cache');
            if (cached) {
                const data = JSON.parse(cached);
                const filtered = this.applyFilters(data);
                this.renderObservations(filtered);
                this.showToast('📶 Mostrando datos en modo offline');
            }
        }
    }

    applyFilters(obs) {
        let filtered = [...obs];
        const fecha = document.getElementById('filter-fecha').value;
        const area = document.getElementById('filter-area').value;
        const tipo = document.getElementById('filter-tipo').value;
        if (fecha) filtered = filtered.filter(o => new Date(o.fecha).toISOString().split('T')[0] === fecha);
        if (area) filtered = filtered.filter(o => o.area === area);
        if (tipo) filtered = filtered.filter(o => o.tipo === tipo);
        return filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    renderObservations(observations) {
        const container = document.getElementById('lista-observaciones');
        if (!observations.length) {
            container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-secondary)">No hay observaciones registradas</p>';
            return;
        }
        container.innerHTML = observations.map(o => `
            <div class="observation-card ${o.nivel_riesgo}">
                <div class="meta">
                    <span>${new Date(o.fecha).toLocaleString('es-MX')}</span>
                    <span>${this.getAreaLabel(o.area)}${o.modulo ? ' - Módulo ' + o.modulo : ''}</span>
                </div>
                <h3>${this.getTipoLabel(o.tipo)}</h3>
                <p><strong>Riesgo:</strong> ${this.getNivelRiesgoLabel(o.nivel_riesgo)}</p>
                <p><strong>Observado a:</strong> ${this.getPersonaLabel(o.persona_observada)}</p>
                <p><strong>Registrado por:</strong> ${o.registra_nombre || 'Sin identificar'}</p>
                <p><strong>Supervisor evaluado:</strong> ${o.evaluado_nombre || 'No especificado'}</p>
                <p class="descripcion">${o.descripcion}</p>
                ${o.accion_inmediata ? `<p><strong>Acción:</strong> ${o.accion_inmediata}</p>` : ''}
            </div>
        `).join('');
    }

    // -------------------------------------------
    // GESTIÓN DE SUPERVISORES
    // ===========================================
    
    async cargarSupervisores() {
        try {
            const { data, error } = await supabaseClient
                .from('supervisores')
                .select('*')
                .order('apellido_paterno');
            
            if (error) throw error;
            
            this.supervisores = data || [];
            this.actualizarSelectSupervisores();
            console.log('✅ Supervisores cargados:', this.supervisores.length);
        } catch (error) {
            console.error('Error cargando supervisores:', error);
            this.supervisores = [];
        }
    }

    actualizarSelectSupervisores() {
        const select = document.getElementById('supervisor-select');
        if (!select) return;
        
        const valorActual = select.value;
        select.innerHTML = '<option value="">Seleccionar supervisor...</option>';
        
        this.supervisores.forEach(s => {
            const option = document.createElement('option');
            const nombreCompleto = `${s.apellido_paterno} ${s.apellido_materno} ${s.nombre}`;
            option.value = nombreCompleto;
            option.textContent = nombreCompleto;
            select.appendChild(option);
        });
        
        if (valorActual && this.supervisores.some(s => `${s.apellido_paterno} ${s.apellido_materno} ${s.nombre}` === valorActual)) {
            select.value = valorActual;
        }
    }

    // ============================================================
    // MODAL PARA AGREGAR SUPERVISOR
    // ============================================================
    
    mostrarModalSupervisor() {
        const modal = document.getElementById('modal-supervisor');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('supervisor-apellido-paterno').value = '';
            document.getElementById('supervisor-apellido-materno').value = '';
            document.getElementById('supervisor-nombre').value = '';
            document.getElementById('supervisor-apellido-paterno').focus();
        }
    }

    cerrarModalSupervisor() {
        const modal = document.getElementById('modal-supervisor');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async guardarSupervisor() {
        const apellidoPaterno = document.getElementById('supervisor-apellido-paterno').value.trim();
        const apellidoMaterno = document.getElementById('supervisor-apellido-materno').value.trim();
        const nombre = document.getElementById('supervisor-nombre').value.trim();
        
        if (!apellidoPaterno) {
            this.showToast('⚠️ El apellido paterno es obligatorio');
            document.getElementById('supervisor-apellido-paterno').focus();
            return;
        }
        
        if (!nombre) {
            this.showToast('⚠️ El nombre es obligatorio');
            document.getElementById('supervisor-nombre').focus();
            return;
        }
        
        try {
            const { data: existentes, error: searchError } = await supabaseClient
                .from('supervisores')
                .select('*')
                .eq('apellido_paterno', apellidoPaterno)
                .eq('apellido_materno', apellidoMaterno)
                .eq('nombre', nombre);
            
            if (searchError) throw searchError;
            
            if (existentes && existentes.length > 0) {
                this.showToast('⚠️ Este supervisor ya está registrado');
                this.cerrarModalSupervisor();
                return;
            }
            
            const { data, error } = await supabaseClient
                .from('supervisores')
                .insert({
                    apellido_paterno: apellidoPaterno,
                    apellido_materno: apellidoMaterno,
                    nombre: nombre
                })
                .select();
            
            if (error) throw error;
            
            await this.cargarSupervisores();
            
            const nombreCompleto = `${apellidoPaterno} ${apellidoMaterno} ${nombre}`;
            document.getElementById('supervisor-select').value = nombreCompleto;
            
            this.cerrarModalSupervisor();
            this.showToast('✅ Supervisor registrado exitosamente');
            
        } catch (error) {
            console.error('Error guardando supervisor:', error);
            this.showToast('❌ Error al guardar supervisor: ' + error.message);
        }
    }

    // ============================================================
    // ESTADÍSTICAS
    // ============================================================
    
    async loadStatistics() {
        try {
            const { data: observaciones, error } = await supabaseClient
                .from('observaciones')
                .select(`
                    *,
                    registra:supervisor_registra_id (
                        id,
                        nombre,
                        apellido_paterno,
                        apellido_materno
                    ),
                    evaluado:supervisor_evaluado_id (
                        id,
                        nombre,
                        apellido_paterno,
                        apellido_materno
                    )
                `);

            if (error) throw error;

            const observacionesConSupervisores = (observaciones || []).map(obs => {
                if (obs.registra) {
                    obs.registra_nombre = `${obs.registra.apellido_paterno} ${obs.registra.apellido_materno} ${obs.registra.nombre}`;
                } else {
                    obs.registra_nombre = 'Sin identificar';
                }
                
                if (obs.evaluado) {
                    obs.evaluado_nombre = `${obs.evaluado.apellido_paterno} ${obs.evaluado.apellido_materno} ${obs.evaluado.nombre}`;
                } else {
                    obs.evaluado_nombre = 'No especificado';
                }
                
                return obs;
            });

            const obs = observacionesConSupervisores || [];
            
            document.getElementById('total-obs').textContent = obs.length;
            
            const hoy = new Date().toISOString().split('T')[0];
            document.getElementById('obs-hoy').textContent = obs.filter(o => 
                new Date(o.fecha).toISOString().split('T')[0] === hoy
            ).length;
            
            document.getElementById('obs-criticas').textContent = obs.filter(o => 
                o.nivel_riesgo === 'critico'
            ).length;

            this.createTipoChart(obs);
            this.createAreaChart(obs);
            this.createStatorChart(obs);
            this.createRotorChart(obs);
            this.createPersonaChart(obs);
            this.createSupervisorRiesgosChart(obs);
            this.createSupervisorBuenasChart(obs);
            this.generarGraficaBuenasPracticas();
            this.generarDiagramaPareto();
            
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            this.showToast('❌ Error al cargar estadísticas');
        }
    }

    // -------------------------------------------
    // ETIQUETAS
    // -------------------------------------------
    getAreaLabel(a) { return {stator:'Stator',rotor:'Rotor',ensamble:'Ensamble',inverter:'Inverter',engranes:'Engranes'}[a]||a; }
    getTipoLabel(t) { return {epp:'EPP','acto-inseguro':'Acto Inseguro','condicion-insegura':'Condición Insegura',pta:'PTA',ambiental:'Ambiental',pedestrian:'Pedestrian','buena-practica':'Buenas Prácticas'}[t]||t; }
    getNivelRiesgoLabel(n) { return {'no-aplica':'No Aplica',bajo:'Bajo',medio:'Medio',alto:'Alto',critico:'Crítico'}[n]||n; }
    getPersonaLabel(p) { return {mecanico:'Mecánico',tubero:'Tubero',electrico:'Eléctrico',otros:'Otros'}[p]||p; }

    // ============================================================
    // GRÁFICAS (todas las funciones completas)
    // ============================================================

    createTipoChart(obs) {
        const tipos = {epp:0,'acto-inseguro':0,'condicion-insegura':0,pta:0,ambiental:0,pedestrian:0,'buena-practica':0};
        obs.forEach(o => { if (tipos.hasOwnProperty(o.tipo)) tipos[o.tipo]++; });
        const ctx = document.getElementById('chart-tipos');
        if (this.tipoChart) this.tipoChart.destroy();
        this.tipoChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['EPP','Acto Inseguro','Cond. Insegura','PTA','Ambiental','Pedestrian','Buenas Prácticas'],
                datasets: [{ label:'Cantidad', data:Object.values(tipos), backgroundColor:['#3b82f6','#ef4444','#f97316','#8b5cf6','#10b981','#f59e0b','#06b6d4'], borderRadius:6 }]
            },
            options: { responsive:true, plugins:{ title:{ display:true, text:'Distribución por Tipo' } }, scales:{ y:{ beginAtZero:true, ticks:{ stepSize:1 } } } }
        });
    }

    createAreaChart(obs) {
        const observacionesFiltradas = obs.filter(o => o.tipo !== 'buena-practica');
        const areas = {};
        observacionesFiltradas.forEach(o => { 
            const l = this.getAreaLabel(o.area); 
            areas[l] = (areas[l]||0)+1; 
        });
        const ctx = document.getElementById('chart-areas');
        if (this.areaChart) this.areaChart.destroy();
        if (Object.keys(areas).length === 0) {
            this.areaChart = new Chart(ctx, {
                type: 'bar',
                data: { labels: ['Sin datos'], datasets: [{ label:'Observaciones', data: [0], backgroundColor: '#e0e0e0', borderRadius: 6 }] },
                options: { responsive: true, plugins: { title: { display: true, text: 'No hay observaciones' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
            });
            return;
        }
        this.areaChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: Object.keys(areas), datasets: [{ label: 'Observaciones', data: Object.values(areas), backgroundColor: '#2563eb', borderRadius: 6 }] },
            options: { responsive: true, plugins: { title: { display: true, text: 'Por Área' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    normalizarModulo(modulo) {
        if (!modulo) return null;
        if (typeof modulo === 'string') {
            const limpio = modulo.toLowerCase().replace(/modulo-?|módulo-?/g, '').trim();
            const numero = parseInt(limpio);
            if (!isNaN(numero) && numero >= 1 && numero <= 5) {
                return numero.toString();
            }
        }
        if (typeof modulo === 'number') {
            return modulo.toString();
        }
        return null;
    }

    createStatorChart(obs) {
        const statorObs = obs.filter(o => o.area === 'stator' && o.modulo && o.tipo !== 'buena-practica');
        const modulos = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        statorObs.forEach(o => {
            const moduloNormalizado = this.normalizarModulo(o.modulo);
            if (moduloNormalizado && modulos.hasOwnProperty(moduloNormalizado)) {
                modulos[moduloNormalizado]++;
            }
        });
        const ctx = document.getElementById('chart-stator');
        if (this.statorChart) this.statorChart.destroy();
        const labels = ['Módulo 1', 'Módulo 2', 'Módulo 3', 'Módulo 4', 'Módulo 5'];
        const data = [modulos['1'], modulos['2'], modulos['3'], modulos['4'], modulos['5']];
        const total = data.reduce((a, b) => a + b, 0);
        const colores = ['#1565c0', '#1e88e5', '#42a5f5', '#64b5f6', '#90caf9'];
        this.statorChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'Observaciones Stator', data: data, backgroundColor: colores, borderRadius: 6, borderColor: '#0d47a1', borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: `Total: ${total} observaciones en Stator`, font: { size: 13 } }, legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    createRotorChart(obs) {
        const rotorObs = obs.filter(o => o.area === 'rotor' && o.modulo && o.tipo !== 'buena-practica');
        const modulos = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        rotorObs.forEach(o => {
            const moduloNormalizado = this.normalizarModulo(o.modulo);
            if (moduloNormalizado && modulos.hasOwnProperty(moduloNormalizado)) {
                modulos[moduloNormalizado]++;
            }
        });
        const ctx = document.getElementById('chart-rotor');
        if (this.rotorChart) this.rotorChart.destroy();
        const labels = ['Módulo 1', 'Módulo 2', 'Módulo 3', 'Módulo 4', 'Módulo 5'];
        const data = [modulos['1'], modulos['2'], modulos['3'], modulos['4'], modulos['5']];
        const total = data.reduce((a, b) => a + b, 0);
        const colores = ['#e65100', '#ef6c00', '#f57c00', '#fb8c00', '#ff9800'];
        this.rotorChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'Observaciones Rotor', data: data, backgroundColor: colores, borderRadius: 6, borderColor: '#bf360c', borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: `Total: ${total} observaciones en Rotor`, font: { size: 13 } }, legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    createPersonaChart(obs) {
        const pers = {};
        obs.forEach(o => { if (o.persona_observada) { const l = this.getPersonaLabel(o.persona_observada); pers[l] = (pers[l]||0)+1; } });
        const ctx = document.getElementById('chart-personas');
        if (this.personaChart) this.personaChart.destroy();
        if (Object.keys(pers).length) {
            this.personaChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: Object.keys(pers), datasets: [{ data: Object.values(pers), backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316'] }] },
                options: { responsive: true, plugins: { title: { display: true, text: 'Personal observado' } } }
            });
        }
    }

    createSupervisorRiesgosChart(obs) {
        const riesgos = obs.filter(o => o.tipo !== 'buena-practica');
        const supervisores = {};
        
        riesgos.forEach(o => {
            const nombre = o.evaluado_nombre || 'No especificado';
            supervisores[nombre] = (supervisores[nombre] || 0) + 1;
        });
        
        const ctx = document.getElementById('chart-supervisor-riesgos');
        if (this.supervisorRiesgosChart) this.supervisorRiesgosChart.destroy();
        
        const container = ctx.parentElement;
        if (container) {
            container.style.height = Math.max(250, Object.keys(supervisores).length * 35 + 80) + 'px';
        }
        
        if (Object.keys(supervisores).length === 0) {
            this.supervisorRiesgosChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Sin datos'],
                    datasets: [{ label: 'Observaciones de Riesgo', data: [0], backgroundColor: '#e0e0e0', borderRadius: 6 }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'No hay observaciones de riesgo registradas',
                            font: { size: 13 }
                        },
                        legend: { display: false }
                    },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
            return;
        }
        
        const ordenados = Object.entries(supervisores).sort((a, b) => b[1] - a[1]);
        const labels = ordenados.map(item => item[0]);
        const data = ordenados.map(item => item[1]);
        const total = data.reduce((a, b) => a + b, 0);
        
        const colores = ['#c62828', '#d32f2f', '#e53935', '#ef5350', '#e57373', '#ef9a9a'];
        
        this.supervisorRiesgosChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Observaciones de Riesgo',
                    data: data,
                    backgroundColor: colores.slice(0, labels.length),
                    borderRadius: 6,
                    borderColor: '#b71c1c',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Total: ${total} observaciones de riesgo`,
                        font: { size: 13 }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        ticks: {
                            font: { size: 12 }
                        }
                    }
                },
                barPercentage: 0.9,
                categoryPercentage: 0.8
            }
        });
    }

    createSupervisorBuenasChart(obs) {
        const buenas = obs.filter(o => o.tipo === 'buena-practica');
        const supervisores = {};
        
        buenas.forEach(o => {
            const nombre = o.evaluado_nombre || 'No especificado';
            supervisores[nombre] = (supervisores[nombre] || 0) + 1;
        });
        
        const ctx = document.getElementById('chart-supervisor-buenas');
        if (this.supervisorBuenasChart) this.supervisorBuenasChart.destroy();
        
        const container = ctx.parentElement;
        if (container) {
            container.style.height = Math.max(250, Object.keys(supervisores).length * 35 + 80) + 'px';
        }
        
        if (Object.keys(supervisores).length === 0) {
            this.supervisorBuenasChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Sin datos'],
                    datasets: [{ label: 'Buenas Prácticas', data: [0], backgroundColor: '#e0e0e0', borderRadius: 6 }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'No hay buenas prácticas registradas',
                            font: { size: 13 }
                        },
                        legend: { display: false }
                    },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
            return;
        }
        
        const ordenados = Object.entries(supervisores).sort((a, b) => b[1] - a[1]);
        const labels = ordenados.map(item => item[0]);
        const data = ordenados.map(item => item[1]);
        const total = data.reduce((a, b) => a + b, 0);
        
        const colores = ['#1b5e20', '#2e7d32', '#388e3c', '#43a047', '#4caf50', '#66bb6a', '#81c784', '#a5d6a7'];
        
        this.supervisorBuenasChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Buenas Prácticas',
                    data: data,
                    backgroundColor: colores.slice(0, labels.length),
                    borderRadius: 6,
                    borderColor: '#1b5e20',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Total: ${total} buenas prácticas`,
                        font: { size: 13 }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        ticks: {
                            font: { size: 12 }
                        }
                    }
                },
                barPercentage: 0.9,
                categoryPercentage: 0.8
            }
        });
    }

    generarGraficaBuenasPracticas() {
        console.log('🔄 Generando gráfica de buenas prácticas...');
        const container = document.getElementById('grafica-buenas-practicas');
        if (!container) { console.log('❌ Contenedor no encontrado'); return; }

        supabaseClient
            .from('observaciones')
            .select('*')
            .eq('tipo', 'buena-practica')
            .then(({ data: buenasPracticas, error }) => {
                if (error) throw error;

                if (!buenasPracticas || buenasPracticas.length === 0) {
                    container.innerHTML = `<div class="chart-container" style="height:250px;"><div style="text-align:center;padding:60px 20px;color:#78909c;"><div style="font-size:48px;margin-bottom:15px;">⭐</div><h3 style="color:#37474f;">No hay buenas prácticas registradas</h3><p>Registra buenas prácticas para comenzar a ver estadísticas</p></div></div>`;
                    return;
                }

                const areasUnicas = [...new Set(buenasPracticas.map(o => this.getAreaLabel(o.area)))];
                areasUnicas.sort();

                const datos = {};
                areasUnicas.forEach(area => { datos[area] = 0; });
                buenasPracticas.forEach(obs => {
                    const area = this.getAreaLabel(obs.area);
                    if (datos[area] !== undefined) datos[area] += 1;
                });

                const canvasId = 'chart-buenas-practicas';
                let canvas = document.getElementById(canvasId);
                if (!canvas) {
                    canvas = document.createElement('canvas');
                    canvas.id = canvasId;
                    container.innerHTML = '';
                    container.appendChild(canvas);
                }

                const ctx = canvas.getContext('2d');
                if (this.buenasPracticasChart) this.buenasPracticasChart.destroy();

                const labels = Object.keys(datos);
                const values = Object.values(datos);
                const total = values.reduce((a, b) => a + b, 0);
                const colores = ['#1b5e20', '#2e7d32', '#388e3c', '#43a047', '#4caf50', '#66bb6a', '#81c784', '#a5d6a7'];

                this.buenasPracticasChart = new Chart(ctx, {
                    type: 'bar',
                    data: { labels: labels, datasets: [{ label: 'Buenas Prácticas', data: values, backgroundColor: colores.slice(0, labels.length), borderRadius: 6, borderColor: '#1b5e20', borderWidth: 1 }] },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: `Total: ${total} buenas prácticas registradas`, font: { size: 14, weight: 'bold' }, color: '#1a237e' },
                            legend: { display: false }
                        },
                        scales: {
                            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 12 } } },
                            x: { ticks: { font: { size: 12 } } }
                        }
                    }
                });
                console.log('✅ Gráfica de buenas prácticas por área generada correctamente');
            })
            .catch(error => {
                console.error('Error en gráfica de buenas prácticas:', error);
            });
    }

    generarDiagramaPareto() {
        console.log('🔄 Generando diagrama de Pareto...');
        
        const container = document.getElementById('pareto-content');
        const resumenContainer = document.getElementById('pareto-resumen');
        const insightContainer = document.getElementById('pareto-insight');
        
        if (!container) { console.log('❌ Contenedor de Pareto no encontrado'); return; }

        supabaseClient
            .from('observaciones')
            .select('*')
            .then(({ data: observaciones, error }) => {
                if (error) throw error;

                const observacionesRiesgo = (observaciones || []).filter(o => o.tipo !== 'buena-practica');

                if (!observacionesRiesgo || observacionesRiesgo.length === 0) {
                    container.innerHTML = `<div class="heatmap-empty"><div style="font-size:48px;margin-bottom:15px;">📭</div><h3>No hay datos disponibles</h3><p>Registra observaciones para comenzar a ver el diagrama de Pareto</p></div>`;
                    if (resumenContainer) resumenContainer.style.display = 'none';
                    return;
                }

                const tipos = {};
                observacionesRiesgo.forEach(o => {
                    const tipo = this.getTipoLabel(o.tipo);
                    tipos[tipo] = (tipos[tipo] || 0) + 1;
                });

                const ordenados = Object.entries(tipos).sort((a, b) => b[1] - a[1]);
                const labels = ordenados.map(item => item[0]);
                const valores = ordenados.map(item => item[1]);
                const total = valores.reduce((a, b) => a + b, 0);

                let acumulado = 0;
                const acumulados = valores.map(valor => {
                    acumulado += valor;
                    return (acumulado / total) * 100;
                });

                const canvasId = 'chart-pareto';
                let canvas = document.getElementById(canvasId);
                if (!canvas) {
                    canvas = document.createElement('canvas');
                    canvas.id = canvasId;
                    container.innerHTML = '';
                    container.appendChild(canvas);
                }

                const ctx = canvas.getContext('2d');
                
                if (this.paretoChart) {
                    this.paretoChart.destroy();
                }

                this.paretoChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Frecuencia',
                                data: valores,
                                backgroundColor: [
                                    '#c62828', '#d32f2f', '#e53935', '#ef5350', 
                                    '#e57373', '#ef9a9a', '#ffcdd2'
                                ],
                                borderRadius: 6,
                                borderColor: '#b71c1c',
                                borderWidth: 1,
                                order: 1,
                                yAxisID: 'y',
                            },
                            {
                                label: 'Porcentaje Acumulado',
                                data: acumulados,
                                type: 'line',
                                borderColor: '#1a237e',
                                backgroundColor: 'rgba(26, 35, 126, 0.1)',
                                borderWidth: 3,
                                pointRadius: 6,
                                pointBackgroundColor: '#1a237e',
                                pointBorderColor: 'white',
                                pointBorderWidth: 2,
                                tension: 0.3,
                                fill: true,
                                order: 0,
                                yAxisID: 'y1',
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            mode: 'index',
                            intersect: false,
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: `Total: ${total} observaciones de riesgo`,
                                font: { size: 14 },
                                color: '#1a237e'
                            },
                            legend: {
                                position: 'top',
                                labels: {
                                    font: { size: 12 },
                                    padding: 15
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    afterBody: function(context) {
                                        const index = context[0].dataIndex;
                                        const valor = valores[index];
                                        const porcentaje = ((valor / total) * 100).toFixed(1);
                                        const acumulado = acumulados[index].toFixed(1);
                                        return [
                                            `Cantidad: ${valor} observaciones`,
                                            `Porcentaje: ${porcentaje}% del total`,
                                            `Acumulado: ${acumulado}%`
                                        ];
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'Número de Observaciones',
                                    font: { size: 12 }
                                },
                                ticks: { stepSize: 1 }
                            },
                            y1: {
                                beginAtZero: true,
                                position: 'right',
                                max: 100,
                                title: {
                                    display: true,
                                    text: 'Porcentaje Acumulado (%)',
                                    font: { size: 12 }
                                },
                                ticks: {
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                },
                                grid: {
                                    drawOnChartArea: false,
                                }
                            },
                            x: {
                                ticks: {
                                    font: { size: 11 }
                                }
                            }
                        }
                    }
                });

                if (resumenContainer && insightContainer) {
                    let acumulado80 = 0;
                    let tipos80 = 0;
                    for (let i = 0; i < acumulados.length; i++) {
                        if (acumulados[i] <= 80) {
                            tipos80++;
                            acumulado80 = acumulados[i];
                        }
                    }
                    if (tipos80 === 0 && acumulados.length > 0) {
                        tipos80 = 1;
                        acumulado80 = acumulados[0];
                    }

                    const primerTipo = labels[0];
                    const primerValor = valores[0];
                    const porcentajePrimero = ((primerValor / total) * 100).toFixed(1);

                    insightContainer.innerHTML = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
                            <div style="background: white; padding: 12px; border-radius: 8px; border-left: 4px solid #c62828;">
                                <div style="font-weight: 700; font-size: 16px; color: #c62828;">${primerTipo}</div>
                                <div style="font-size: 13px; color: #37474f;">Es el tipo más frecuente con <strong>${primerValor}</strong> observaciones (${porcentajePrimero}%)</div>
                            </div>
                            <div style="background: white; padding: 12px; border-radius: 8px; border-left: 4px solid #1a237e;">
                                <div style="font-weight: 700; font-size: 16px; color: #1a237e;">${tipos80} tipos</div>
                                <div style="font-size: 13px; color: #37474f;">Representan el <strong>${acumulado80.toFixed(1)}%</strong> del total (${total} observaciones)</div>
                            </div>
                        </div>
                        <div style="margin-top: 10px; font-size: 13px; color: #546e7a; background: white; padding: 10px; border-radius: 8px; border: 1px solid #e0e0e0;">
                            💡 <strong>Recomendación:</strong> Enfoca las acciones correctivas en el <strong>${tipos80}</strong> tipo(s) que representan el 80% de las observaciones para maximizar el impacto.
                        </div>
                    `;
                    resumenContainer.style.display = 'block';
                }

                console.log('✅ Diagrama de Pareto generado correctamente');
            })
            .catch(error => {
                console.error('Error generando diagrama de Pareto:', error);
                container.innerHTML = `<div class="heatmap-empty"><div style="font-size:48px;margin-bottom:15px;">❌</div><h3>Error al cargar datos</h3><p>${error.message}</p></div>`;
            });
    }

    // ============================================================
    // MAPA DE CALOR
    // ============================================================
    
    generarHeatmap() {
        console.log('🔄 Generando mapa de calor de observaciones de riesgo...');
        
        supabaseClient
            .from('observaciones')
            .select('*')
            .then(({ data: observaciones, error }) => {
                if (error) throw error;

                const container = document.getElementById('heatmap-content');
                if (!container) { console.log('❌ Contenedor no encontrado'); return; }

                const observacionesRiesgo = (observaciones || []).filter(o => o.tipo !== 'buena-practica');

                if (!observacionesRiesgo || observacionesRiesgo.length === 0) {
                    container.innerHTML = `<div class="heatmap-empty"><div style="font-size:48px;margin-bottom:15px;">📭</div><h3>No hay datos disponibles</h3><p>Registra observaciones de riesgo para comenzar a ver estadísticas</p></div>`;
                    return;
                }

                const areasUnicas = [...new Set(observacionesRiesgo.map(o => this.getAreaLabel(o.area)))];
                areasUnicas.sort();
                const tiposUnicos = [...new Set(observacionesRiesgo.map(o => this.getTipoLabel(o.tipo)))];
                tiposUnicos.sort();

                if (areasUnicas.length === 0 || tiposUnicos.length === 0) {
                    container.innerHTML = `<div class="heatmap-empty"><div style="font-size:48px;margin-bottom:15px;">📭</div><h3>No hay datos para mostrar</h3><p>Las observaciones no tienen áreas o tipos definidos</p></div>`;
                    return;
                }

                const matriz = {};
                areasUnicas.forEach(area => {
                    matriz[area] = {};
                    tiposUnicos.forEach(tipo => {
                        matriz[area][tipo] = 0;
                    });
                });

                const matrizCriticos = {};
                areasUnicas.forEach(area => {
                    matrizCriticos[area] = {};
                    tiposUnicos.forEach(tipo => {
                        matrizCriticos[area][tipo] = 0;
                    });
                });

                observacionesRiesgo.forEach(obs => {
                    const area = this.getAreaLabel(obs.area);
                    const tipo = this.getTipoLabel(obs.tipo);
                    if (matriz[area] && matriz[area][tipo] !== undefined) {
                        matriz[area][tipo] += 1;
                        if (obs.nivel_riesgo === 'critico') {
                            matrizCriticos[area][tipo] += 1;
                        }
                    }
                });

                let maxValor = 0;
                areasUnicas.forEach(area => {
                    tiposUnicos.forEach(tipo => {
                        if (matriz[area][tipo] > maxValor) maxValor = matriz[area][tipo];
                    });
                });

                let html = `<div class="heatmap-table-wrapper"><table class="heatmap-table"><thead><tr><th>Área / Tipo</th>`;
                tiposUnicos.forEach(tipo => { html += `<th>${tipo}</th>`; });
                html += `</tr></thead><tbody>`;

                areasUnicas.forEach(area => {
                    html += `<tr><td>${area}</td>`;
                    tiposUnicos.forEach(tipo => {
                        const valor = matriz[area][tipo];
                        const porcentaje = maxValor > 0 ? (valor / maxValor) * 100 : 0;
                        const criticos = matrizCriticos[area][tipo];

                        let color = '';
                        if (porcentaje === 0) color = '#f5f5f5';
                        else if (porcentaje > 70) color = '#d32f2f';
                        else if (porcentaje > 40) {
                            const rojo = Math.round(180 + (porcentaje / 100) * 75);
                            const verde = Math.round(255 - (porcentaje / 100) * 200);
                            color = `rgb(${rojo}, ${verde}, 0)`;
                        } else {
                            const verde = Math.round(150 + (porcentaje / 100) * 100);
                            color = `rgb(0, ${verde}, 0)`;
                        }

                        const textColor = porcentaje > 50 ? 'white' : '#1a237e';
                        let contenido = `${valor}`;
                        let claseCritico = '';
                        if (criticos > 0) {
                            contenido = `${valor}<span class="critico-text">🚨 crítico (${criticos})</span>`;
                            claseCritico = 'has-critico';
                        }

                        html += `<td style="background-color:${color};color:${textColor};border:${criticos > 0 ? '3px solid #0d47a1' : '1px solid #e0e0e0'};" class="${claseCritico}">${contenido}</td>`;
                    });
                    html += `</tr>`;
                });

                html += `</tbody></table></div>`;
                html += `<div class="heatmap-legend">
                    <span style="font-weight:600;color:#37474f;font-size:14px;">Leyenda:</span>
                    <div class="heatmap-legend-item"><div class="heatmap-legend-color" style="background:#d32f2f;"></div>Alta (>70%)</div>
                    <div class="heatmap-legend-item"><div class="heatmap-legend-color" style="background:#f57f17;"></div>Media (40-70%)</div>
                    <div class="heatmap-legend-item"><div class="heatmap-legend-color" style="background:#2e7d32;"></div>Baja (10-40%)</div>
                    <div class="heatmap-legend-item"><div class="heatmap-legend-color" style="background:#f5f5f5;border:1px solid #ddd;"></div>Sin datos (0%)</div>
                    <div class="heatmap-legend-item" style="border-left:2px solid #e0e0e0;padding-left:15px;">
                        <span class="led-indicator"></span>
                        <span style="font-size:13px;color:#0d47a1;font-weight:600;">Borde LED = Riesgo Crítico</span>
                    </div>
                    <span style="margin-left:auto;font-size:13px;color:#78909c;">📊 ${observacionesRiesgo.length} observaciones de riesgo</span>
                </div>`;

                container.innerHTML = html;
                console.log('✅ Mapa de calor de observaciones de riesgo generado correctamente');
            })
            .catch(error => {
                console.error('Error generando mapa de calor:', error);
            });
    }

    // ============================================================
    // CERRAR SESIÓN
    // ============================================================
    
    async cerrarSesion() {
        if (!confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            return;
        }
        
        try {
            await supabaseClient.auth.signOut();
            this.usuarioActual = null;
            this.showToast('✅ Sesión cerrada exitosamente');
            
            setTimeout(() => {
                location.reload();
            }, 500);
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            this.showToast('❌ Error al cerrar sesión: ' + error.message);
        }
    }
}

// ============================================================
// INICIALIZAR LA APLICACIÓN
// ============================================================
const app = new SafetyObserver();
window.app = app;
