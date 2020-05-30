const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.set('useCreateIndex', true);
const notificaciones = new Schema({
    id_publicacion: {
        type: String
    },
    tituloPublicacion: {
        type: String
    },
    imagen: {
        type: String
    },
    titulo: {
        type: String,
    },
    name_origen: {
        type: String,
    },
    name_destino: {
        type: String,
    },
    tipo: {
        type: String,
    },
    mensaje_notificacion: {
        type: String,
    },
    visto: {
        type: Boolean,
    },
}, {
        timestamps: true
    });

module.exports = mongoose.model('notificaciones', notificaciones, 'notificaciones');