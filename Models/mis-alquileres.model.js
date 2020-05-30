const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.set('useCreateIndex', true);
const misAlquileres = new Schema({
    id_publicacion: {
        type: String
    },
    estado: {
        type: String,
    },
    codigoEntregaPropietario: {
        type: String,
    },
    codigoDevolucionPropietario: {
        type: String,
    },
    codigoEntregaLocatario: {
        type: String,
    },
    codigoDevolucionLocatario: {
        type: String,
    },
    fechaEntrega: {
        type: String,
    },
    fechaDevolucion: {
        type: String,
    },
    fechaCaducidadEntrega: {
        type: String,
    },
    fechaCaducidadDevolucion: {
        type: String,
    },
    name_usuarioPropietario: {
        type: String,
    },
    name_usuarioLocatario: {
        type: String,
    },
    cantidadDias: {
        type: Number,
    },
    cantidadAlquilar: {
        type: Number,
    },
    codigoPropietarioIngresado: {
        type: Boolean
    },
    codigoLocatarioIngresado: {
        type: Boolean
    },
    codigoPropietarioDevolucionIngresado: {
        type: Boolean
    },
    codigoLocatarioDevolucionIngresado: {
        type: Boolean
    },
    fueDevuelto: {
        type: Boolean
    },
    fuePagado: {
        type: Boolean
    },
    imagen: {
        type: String,
    }
 
}, {
    timestamps: true
});

module.exports = mongoose.model('misAlquileres', misAlquileres, 'misAlquileres');