const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.set('useCreateIndex', true);
const pyrSchema = new Schema({
    id_publicacion: {
        type: String,
    },
    usuario_publicacion: {
        type: String,
    },
    usuario_pregunta: {
        type: String,
    },
    pregunta: {
        type: String,
    },
    respuesta: {
        type: String,
    },
    tiene_respuesta: {
        type: Boolean
    }
}, {
        timestamps: true
    });

module.exports = mongoose.model('pyrusuarios', pyrSchema, 'pyrusuarios');