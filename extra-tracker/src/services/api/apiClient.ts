import axios from 'axios';

// Configurazione base per tutte le chiamate API
// La porta 3001 è quella del nostro server Express
const apiClient = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;
