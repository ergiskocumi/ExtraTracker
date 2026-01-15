/**
 * 📦 LARGE BODY PARSER MIDDLEWARE
 * ================================
 * 
 * Middleware per gestire body di grandi dimensioni (es. import dati)
 * Applica limite aumentato solo alle route che ne hanno bisogno
 */

const express = require('express');

/**
 * Crea un middleware per parsing body con limite aumentato
 * @param {string} limit - Limite del body (es. '50mb')
 */
const largeBodyParser = (limit = '50mb') => {
    return express.json({ limit });
};

module.exports = {
    largeBodyParser,
};
