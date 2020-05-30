const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.set('useCreateIndex', true);
const userSchema = new Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },


    email: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },

    password: {
        type: String,
        required: true,
        trim: true

    },

    confirmed: {
        type: Boolean,
        required: true,
        defaultValue: false
    },

    nombre: {
        type: String,
    },

    apellido: {
        type: String,
    },

    fecha_nacimiento: {
        type: Date,
    },
    codArea: {
        type: String,
    },

    telefono: {
        type: String,
    },

    ciudad: {
        type: String,
    },

    provincia: {
        type: String,
    },

    removablefile: {
        type: String
    },
    barrio: {
        type: String
    },
    calle: {
        type: String
    },

    numero: {
        type: String
    },

    piso: {
        type: String
    },
    departamento: {
        type: String
    },
    codigoPostal: {
        type: String
    }

}, {

        timestamps: true

    });

module.exports = mongoose.model('user', userSchema, 'users');