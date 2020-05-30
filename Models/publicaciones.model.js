const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.set('useCreateIndex', true);
const publicacionesSchema = new Schema({

    titulo: {
        type: String,
    },

    categoria: {
        type: String,
    },

    subcategoria: {
        type: String,
    },

    descripcion: {
        type: String,
    },

    preciodia: {
        type: Number,
    },

    preciosemana: {
        type: String,
    },

    preciomes: {
        type: String,
    },

    foto: {
        type: String,
    },

    email: {
        type: String,
    },
    multiplefile: {
        type: String,
    },
    tipoAlquiler: {
        type: String,
    },
    destacar: {
        type: String,
    },
    estado: {
        type: String,
    },
    cantidadDisponible: {
        type: String
    },
    cantDias: {
        type: String,
    },
    contadorDeVisita:{
        type:Number
    }
}, {
        timestamps: true
    });

module.exports = mongoose.model('publicaciones', publicacionesSchema, 'publicaciones');