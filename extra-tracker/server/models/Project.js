const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({ //questo è il mio cliente alla fine per cui lavorerò
    //sotto ci sono tutti i vari campi che servono per il progetto come dichiarto dal frontend
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String },
    rate: { type: Number, required: true }
});

//serve per l'id come nel worklog.js
projectSchema.set('toJSON', {
    virtuals:true,
    versionKey:false,
    transform: function (doc, ret) 
    { delete ret._id; } //questo perchè mongo salva come _id mentre noi vogliamo id dal forntend perchè id è quello che si aspetta
});

module.exports = mongoose.model('Project', projectSchema);