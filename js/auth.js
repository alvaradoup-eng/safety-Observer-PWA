// ============================================================
// PANTALLA PRINCIPAL: INICIO DE SESIÓN / REGISTRO DE SUPERVISOR
// (Conexión a Supabase)
// ============================================================
const STORAGE_SESION = 'safety_sesion';

class AuthApp {
    constructor() {
        this.usuario = null;
        this.fotoData = null;
        this.init();
    }

    async init() {
        const sesionId = localStorage.getItem(STORAGE_SESION);
        if (sesionId) {
            try {
                const user = await this.getUsuarioById(sesionId);
                if (user) {
                    this.usuario = user;
                    this.activarApp();
                } else {
                    localStorage.removeItem(STORAGE_SESION);
                }
            } catch (error) {
                console.error('Error restaurando sesión:', error);
                localStorage.removeItem(STORAGE_SESION);
            }
        }

        const input = document.getElementById('registro-foto');
        if (input) input.addEventListener('change', e => this.cargarFoto(e));

        const cambiarInput = document.getElementById('cambiar-foto');
        if (cambiarInput) cambiarInput.addEventListener('change', e => this.cambiarFoto(e));

        this.actualizarChip();
    }

    // ============================================================
    // CONSULTAS A SUPABASE
    // ============================================================

    async getUsuarios() {
        if (!supabaseClient) return [];
        const { data, error } = await supabaseClient.from('usuarios').select('*');
        if (error) {
            console.error('Error obteniendo usuarios:', error);
            return [];
        }
        return data || [];
    }

    async getUsuarioById(id) {
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.from('usuarios').select('*').eq('id', id).single();
        if (error) {
            console.error('Error obteniendo usuario por id:', error);
            return null;
        }
        return data;
    }

    async insertarUsuario(user) {
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.from('usuarios').insert(user).select().single();
        if (error) {
            console.error('Error insertando usuario:', error);
            return null;
        }
        return data;
    }

    async actualizarUsuario(id, campos) {
        if (!supabaseClient) return false;
        const { error } = await supabaseClient.from('usuarios').update(campos).eq('id', id);
        if (error) {
            console.error('Error actualizando usuario:', error);
            return false;
        }
        return true;
    }

    getUsuarioActual() {
        return this.usuario;
    }

    // ============================================================
    // NAVEGACIÓN ENTRE PESTAÑAS
    // ============================================================

    mostrarLogin() {
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('tab-registro').classList.remove('active');
        document.getElementById('form-login').classList.add('active');
        document.getElementById('form-registro').classList.remove('active');
    }

    mostrarRegistro() {
        document.getElementById('tab-registro').classList.add('active');
        document.getElementById('tab-login').classList.remove('active');
        document.getElementById('form-registro').classList.add('active');
        document.getElementById('form-login').classList.remove('active');
    }

    // ============================================================
    // FOTO DE PERFIL (OPCIONAL)
    // ============================================================

    cargarFoto(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            this.showToast('⚠️ La imagen debe pesar menos de 2 MB');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            this.fotoData = e.target.result;
            const preview = document.getElementById('registro-foto-preview');
            preview.innerHTML = `<img src="${this.fotoData}" alt="Foto de perfil">`;
            document.getElementById('registro-foto-clear').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }

    quitarFoto() {
        this.fotoData = null;
        document.getElementById('registro-foto-preview').textContent = '👤';
        document.getElementById('registro-foto').value = '';
        document.getElementById('registro-foto-clear').style.display = 'none';
    }

    async cambiarFoto(event) {
        const file = event.target.files && event.target.files[0];
        if (!file || !this.usuario) return;

        if (file.size > 2 * 1024 * 1024) {
            this.showToast('⚠️ La imagen debe pesar menos de 2 MB');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async e => {
            const foto = e.target.result;
            const ok = await this.actualizarUsuario(this.usuario.id, { foto });
            if (ok) {
                this.usuario.foto = foto;
                this.actualizarChip();
                this.showToast('✅ Foto de perfil actualizada');
            } else {
                this.showToast('❌ No se pudo actualizar la foto');
            }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }

    // ============================================================
    // REGISTRO E INICIO DE SESIÓN
    // ============================================================

    async registrar() {
        const nombre = document.getElementById('registro-nombre').value.trim();
        const password = document.getElementById('registro-password').value;
        const password2 = document.getElementById('registro-password2').value;

        if (!nombre) {
            this.showToast('⚠️ Ingresa tu nombre');
            document.getElementById('registro-nombre').focus();
            return;
        }
        if (password.length < 6) {
            this.showToast('⚠️ La contraseña debe tener al menos 6 caracteres');
            document.getElementById('registro-password').focus();
            return;
        }
        if (password !== password2) {
            this.showToast('⚠️ Las contraseñas no coinciden');
            document.getElementById('registro-password2').focus();
            return;
        }

        const usuarios = await this.getUsuarios();
        if (usuarios.some(u => u.nombre.toLowerCase() === nombre.toLowerCase())) {
            this.showToast('⚠️ Ya existe un supervisor con ese nombre');
            return;
        }

        const user = await this.insertarUsuario({ nombre, password, foto: this.fotoData || null });
        if (!user) {
            this.showToast('❌ No se pudo crear la cuenta. Intenta de nuevo.');
            return;
        }

        this.usuario = user;
        localStorage.setItem(STORAGE_SESION, user.id);

        this.limpiarFormularios();
        this.activarApp();
        this.showToast('✅ Cuenta creada. ¡Bienvenido ' + user.nombre + '!');
    }

    async iniciarSesion() {
        const nombre = document.getElementById('login-nombre').value.trim();
        const password = document.getElementById('login-password').value;

        if (!nombre || !password) {
            this.showToast('⚠️ Ingresa tu nombre y contraseña');
            return;
        }

        const usuarios = await this.getUsuarios();
        const user = usuarios.find(u => u.nombre.toLowerCase() === nombre.toLowerCase());
        if (!user || user.password !== password) {
            this.showToast('❌ Nombre o contraseña incorrectos');
            return;
        }

        this.usuario = user;
        localStorage.setItem(STORAGE_SESION, user.id);

        this.limpiarFormularios();
        this.activarApp();
        this.showToast('✅ Bienvenido ' + user.nombre);
    }

    cerrarSesion() {
        localStorage.removeItem(STORAGE_SESION);
        this.usuario = null;
        document.body.classList.remove('authenticated');
        this.mostrarLogin();
    }

    // ============================================================
    // UTILIDADES
    // ============================================================

    activarApp() {
        document.body.classList.add('authenticated');
        this.actualizarChip();
        if (window.app) {
            window.app.usuarioActual = this.usuario
                ? { id: this.usuario.id, nombre: this.usuario.nombre }
                : null;
            window.app.mostrarFrasePositiva();
        }
    }

    actualizarChip() {
        const avatar = document.getElementById('header-avatar');
        const name = document.getElementById('header-name');
        if (!avatar || !name) return;

        if (this.usuario) {
            name.textContent = this.usuario.nombre;
            if (this.usuario.foto) {
                avatar.innerHTML = `<img src="${this.usuario.foto}" alt="Foto de perfil">`;
            } else {
                avatar.textContent = '🦺';
            }
        }
    }

    limpiarFormularios() {
        document.getElementById('login-nombre').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('registro-nombre').value = '';
        document.getElementById('registro-password').value = '';
        document.getElementById('registro-password2').value = '';
        this.quitarFoto();
    }

    showToast(msg) {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.log(msg);
            return;
        }
        toast.textContent = msg;
        toast.className = 'toast show';
        setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 5000);
    }
}

const authApp = new AuthApp();
window.authApp = authApp;
