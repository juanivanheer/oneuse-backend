const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);

module.exports = () => {

    mongoose.connect('mongodb+srv://fede:1use@cluster0-pdt0d.mongodb.net/test?retryWrites=true&w=majority', { useNewUrlParser: true })
        .then(db => console.log('La base de datos esta conectada'))
        .catch(err => console.error(err));

    process.on('SIGINT', () => {

        mongoose.connection.close(() => {


            console.log('Mongo is disconected!');
            process.exit(0);
        });



    })

}