const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.set('useCreateIndex', true);
const visitasPublicaciones = new Schema({
    id_publicacion: {
        type: String
    },
    fecha_visita: {
        type: String,
    },
    cantidadVisitas: {
        type: Number
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('visitasPublicaciones', visitasPublicaciones, 'visitasPublicaciones');