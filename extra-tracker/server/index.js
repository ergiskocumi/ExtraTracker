const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const apiRoutes = require('./routes/api');

// 1. MIDDLEWARE 
app.use(cors()); // permetti richieste da altri domini
app.use(express.json()); // permettere di leggere i JSON che ci manda react 

app.use('/api', apiRoutes); // usa le rotte definite in routes/api.js


// 2. CONNESSIONE AL DATABASE
const MONGO_URI = 'mongodb://admin:password123@localhost:27017/extra-tracker?authSource=admin'; //TODO: spostare in variabile d'ambiente per non avere hardcoded le credenziali

mongoose.connect(MONGO_URI)
.then(() => { console.log('Connesso al database MongoDB'); })
.catch((err) => { console.error('Errore di connessione al database:', err); });

// 3. DEFINIZIONE DELLO SCHEMA E DEL MODELLO
app.get('/', (req, res) => {
    res.send('Benvenuto in Extra Tracker Server');
});

app.listen(PORT, () => { console.log(`Server in ascolto sulla porta ${PORT}`);});