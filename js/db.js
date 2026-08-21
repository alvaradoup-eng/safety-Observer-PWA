// Gestor de base de datos local
// Actualmente usa localStorage, preparado para migrar a IndexedDB o Firebase

class DatabaseManager {
    constructor() {
        this.storageKey = 'safety_observations';
        this.init();
    }

    init() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    async addObservation(observation) {
        const observations = this.getAllObservations();
        observations.push(observation);
        localStorage.setItem(this.storageKey, JSON.stringify(observations));
        return observation;
    }

    getAllObservations() {
        const data = localStorage.getItem(this.storageKey);
        return JSON.parse(data || '[]');
    }

    getObservationById(id) {
        const observations = this.getAllObservations();
        return observations.find(obs => obs.id === id) || null;
    }

    async updateObservation(id, updatedData) {
        const observations = this.getAllObservations();
        const index = observations.findIndex(obs => obs.id === id);
        if (index !== -1) {
            observations[index] = { ...observations[index], ...updatedData };
            localStorage.setItem(this.storageKey, JSON.stringify(observations));
            return observations[index];
        }
        return null;
    }

    async deleteObservation(id) {
        const observations = this.getAllObservations();
        const filtered = observations.filter(obs => obs.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
        return true;
    }

    getObservationsByDate(date) {
        const observations = this.getAllObservations();
        return observations.filter(obs => {
            const obsDate = new Date(obs.fecha).toISOString().split('T')[0];
            return obsDate === date;
        });
    }

    getObservationsByArea(area) {
        const observations = this.getAllObservations();
        return observations.filter(obs => obs.area === area);
    }

    getObservationsByType(tipo) {
        const observations = this.getAllObservations();
        return observations.filter(obs => obs.tipo === tipo);
    }

    getObservationsByRisk(nivelRiesgo) {
        const observations = this.getAllObservations();
        return observations.filter(obs => obs.nivelRiesgo === nivelRiesgo);
    }

    getStatistics() {
        const observations = this.getAllObservations();
        const hoy = new Date().toISOString().split('T')[0];
        
        return {
            total: observations.length,
            hoy: observations.filter(obs => {
                const obsDate = new Date(obs.fecha).toISOString().split('T')[0];
                return obsDate === hoy;
            }).length,
            criticas: observations.filter(obs => obs.nivelRiesgo === 'critico').length,
            porArea: this.countByProperty(observations, 'area'),
            porTipo: this.countByProperty(observations, 'tipo'),
            porRiesgo: this.countByProperty(observations, 'nivelRiesgo')
        };
    }

    countByProperty(array, property) {
        const count = {};
        array.forEach(item => {
            const value = item[property];
            if (value) {
                count[value] = (count[value] || 0) + 1;
            }
        });
        return count;
    }

    async exportData() {
        const observations = this.getAllObservations();
        return JSON.stringify(observations, null, 2);
    }

    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (Array.isArray(data)) {
                localStorage.setItem(this.storageKey, JSON.stringify(data));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error al importar datos:', error);
            return false;
        }
    }

    clearAllData() {
        localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
}

// Crear instancia global
const dbManager = new DatabaseManager();
