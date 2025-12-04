const mongoose = require('mongoose');

//! questo è il mio worklog schema che mi serve per salvare i vari log di lavoro, ovvero le ore di straordinario fatto fino ad ora.
const workLogSchema = new mongoose.Schema({
    projectId: { 
        type: String, 
        required: true 
    },
    date: { 
        type: String, 
        required: true 
    },
    startTime: { 
        type: String, 
        required: true 
    },
    endTime: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: false // Questo è opzionale
    }
});

// Stesso trucco per l'ID
workLogSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('WorkLog', workLogSchema);