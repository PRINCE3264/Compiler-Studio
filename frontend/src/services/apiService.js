import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
});

export const analyzeCode = async (code, userInput) => {
    return await api.post('/analyze', { code, userInput });
};

export const getHistory = async () => {
    return await api.get('/analyze/history');
};
