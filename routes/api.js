/* -------------------------- Configuración general ------------------------------- */
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
var encodeUrl = require("encodeurl");
var moment = require("moment");
const app = express();
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();
//const db = "mongodb+srv://fede:1use@cluster0-pdt0d.mongodb.net/test?retryWrites=true&w=majority"
const db =
    "mongodb+srv://federico:1usebasededatos$@cluster1-zogz0.azure.mongodb.net/test?retryWrites=true&w=majority";
var multipart = require("connect-multiparty");
var multipartMiddleware = multipart({ uploadDir: "./uploads" });
var multipartMiddlewarePublicaciones = multipart({
    uploadDir: "./publicaciones",
});
var fs = require("fs"); //Librería FileSystem para borrar archivos locales
var path = require("path"); //Modulo físico de NodeJS que nos permite cargar rutas físicas de nuestro sistema de archivos
var randomstring = require("randomstring"); //Generador de números alfanumericos random
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Allow", "GET, POST, OPTIONS, PUT, DELETE");
    next();
});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const mercadopago = require('mercadopago');

//Access token cuenta juan
//mercadopago.configurations.setAccessToken("TEST-4098695958980794-042601-bbf0cd1a389dea655e9504621063e743-25259647");

//Access token cuenta vendedor test
//mercadopago.configurations.setAccessToken("TEST-6154841231917150-052800-34a55d9d7e73a0024e594c6cb7a6b650-575276817");
mercadopago.configurations.setAccessToken("APP_USR-6154841231917150-052800-3cce632f355c757cbf37f535bd70be21-575276817");

/* ----------------------------------- MODELOS ----------------------------------- */
const User = require("../auth/auth.model");
const Publicacion = require("../Models/publicaciones.model");
const PyR = require("../Models/pyr.model");
const Notificacion = require("../Models/notificaciones.model");
const MisAlquileres = require("../Models/mis-alquileres.model");
const Reclamo = require("../Models/reclamos.model");
const VisitaPublicaciones = require("../Models/visitasPublicaciones.model");

/* ---------------------------- Métodos de configuración ------------------------- */
mongoose.connect(db, { useNewUrlParser: true }, (err) => {
    if (err) {
        console.error("No se pudo conectar a la bd" + err);
    } else {
        console.log("Conectado a la bd en la nube");
    }
});

const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: true,
    auth: {
        user: "one.use.pf@gmail.com",
        pass: "1usemail",
    },
});

//const bodyParser = require('body-parser');
//const bodyParserJSON = bodyParser.json();
//const bodyParserURLEncoded = bodyParser.urlencoded({extended: true});

//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended: true}));

const cors = require("cors");
app.use(cors());
//app.use('/api', router);
//authRoutes(router);

/* ------------------------------ Rutas de usuarios ----------------------------------- */
router.get("/", (req, res) => {
    res.send("From API route");
});

router.post("/register", (req, res) => {
    let userData = req.body;
    let user = new User(userData);
    user.password = bcrypt.hashSync(user.password);
    user.confirmed = false;
    user.save((error, registeredUser) => {
        if (error) {
            //console.log(error)
            res.status(401).send("Error en base de datos. Probar nuevamente");
        } else {
            //jwt de usuario, enviar mail con ese token, y mail con redireccion
            let payload = { subject: registeredUser.email };
            jwt.sign(
                payload,
                "secretKey",
                {
                    expiresIn: "1d",
                },
                (err, token) => {
                    const url = "http://localhost:4200/confirmacionemail/" + token;

                    enviar(
                        userData.email,
                        "Confirma tu Email para terminar tu registro en OneUse",
                        "¡Estás a un paso de finalizar tu registro!",
                        "Gracias por confiar en OneUse. Con el fin de ayudar a mantener la seguridad de tu cuenta, por favor, verifica tu dirección de email.",
                        url,
                        "Verificar email"
                    );
                }
            );
            res.status(200).send(true);
        }
    });
});

router.post("/registerGoogle", (req, res) => {
    let userData = req.body;
    let user = new User(userData);
    user.confirmed = true;
    user.password = bcrypt.hashSync(randomstring.generate(10));
    user.save((error, usuarioRegistrado) => {
        if (error) {
            console.log(error)
            res.status(401).send("Error en base de datos. Probar nuevamente");
        } else {
            res.status(200).send(usuarioRegistrado);
        }
    })
})

router.post("/registerFacebook", (req, res) => {
    let userData = req.body;
    let user = new User(userData);
    user.confirmed = true;
    user.password = bcrypt.hashSync(randomstring.generate(10));
    user.save((error, usuarioRegistrado) => {
        if (error) {
            console.log(error)
            res.status(401).send("Error en base de datos. Probar nuevamente");
        } else {
            res.status(200).send(usuarioRegistrado);
        }
    })
})

router.post("/updateFacebookImg", (req, res) => {
    let usuario = req.body;
    User.findOneAndUpdate({ email: usuario.email }, usuario, (error, user) => {
        if (error) {
            console.log("no trajo nada");
        } else {
            res.status(200).send(user);
        }
    })
})

router.post("/login", (req, res) => {
    let userData = req.body;

    User.findOne({ email: userData.email }, (error, user) => {
        if (error) {
            console.log(error);
        } else {
            if (!user) {
                res.status(401).send("Datos incorrecto");
            } else {
                const compa = bcrypt.compareSync(userData.password, user.password);
                if (!compa) {
                    res.status(401).send("Datos incorrectos");
                } else {
                    if (!user.confirmed) {
                        res
                            .status(401)
                            .send(
                                "Tu usuario no ha sido validado. Verifica tu casilla de e-mail"
                            );
                    } else {
                        let payload = { subject: user._id };
                        let token = jwt.sign(payload, "secretKey");
                        res.status(200).send({ token });
                    }
                }
            }
        }
    });
});

router.post("/confirmation", (req, res) => {
    try {
        let email = jwt.verify(req.body.token, "secretKey").subject;
        User.findOne({ email: email }, (error, user) => {
            if (error) {
                console.log(error);
            } else {
                user.confirmed = true;
                user.save();
                res.status(200).send(true);
            }
        });
    } catch (e) {
        console.log(e);
        res.status(401).send();
    }
});

router.post("/newpwd", (req, res) => {
    if (req.body.user.password != req.body.user.password2) res.status(401).send();

    try {
        let email = jwt.verify(req.body.token, "secretKey").subject;
        User.findOne({ email: email }, (error, user) => {
            if (error) {
                console.log(error);
            } else {
                user.password = bcrypt.hashSync(req.body.user.password);
                user.save();
                res.status(200).send(true);
            }
        });
    } catch (e) {
        console.log(e);
        res.status(401).send();
    }
});

router.post("/lostpassword", (req, res) => {
    let userData = req.body;

    User.findOne({ email: userData.email }, (error, user) => {
        if (error) {
            console.log(error);
        } else {
            let payload = { subject: userData.email };
            jwt.sign(
                payload,
                "secretKey",
                {
                    expiresIn: "1d",
                },
                (err, token) => {
                    const url = "http://localhost:4200/newpwd/" + token;

                    enviar(
                        userData.email,
                        "Cambio de contraseña en www.1use.com",
                        "Cambio de contraseña",
                        "Este mail ha sido generado debido a que ud solicito un cambio de contraseña por el olvido de la misma, para continuar con el cambio de contraseña, por favor siga el siguiente enlace:",
                        url,
                        "Cambio de contraseña"
                    );
                }
            );
            res.status(200).send(true);
        }
    });
});

router.get("/user-data", function (req, res) {
    let params = req.query.email;
    User.findOne({ email: params }, (error, user) => {
        if (error) {
            console.log("No pasa nada che");
        } else {
            res.status(200).send(user);
        }
    });
});

router.get("/get-all-users", function (req, res) {
    User.find((error, user) => {
        if (error) {
            console.log("no trajo nada");
        } else {
            res.status(200).send(user);
        }
    });
});

router.delete("/delete-user/:email", function (req, res) {
    let params = req.params.email;
    User.findOneAndDelete({ email: params }, (error, user) => {
        if (error) {
            console.log("No pasa nada che");
        } else {
            res.status(200).send(user);
        }
    });
});

router.post("/update-user", multipartMiddleware, function (req, res) {
    var params = req.query.id;
    var user = req.body;
    var usuario = new User();

    usuario._id = params;
    usuario.nombre = user.nombre;
    usuario.apellido = user.apellido;
    usuario.codArea = user.codArea;
    usuario.telefono = user.telefono;
    usuario.fecha_nacimiento = user.fecha_nacimiento;
    usuario.provincia = user.provincia;
    usuario.ciudad = user.ciudad;
    usuario.barrio = user.barrio;
    //usuario.removablefile = user.removablefile._fileNames;
    usuario.calle = user.calle;
    usuario.numero = user.numero;
    usuario.piso = user.piso;
    usuario.departamento = user.departamento;
    usuario.codigoPostal = user.codigoPostal;

    User.findByIdAndUpdate(params, usuario, { new: true }, (err, pUpdated) => {
        if (err) return res.status(500).send("Error en BD");
        if (!pUpdated) return res.status(500).send("Error en BD");
        return res.status(200).send("Datos guardados correctamente");
    });
});

router.post("/update-superadmin-user", function (req, res) {
    var user = req.body;
    var usuario = new User();

    usuario._id = user._id;
    usuario.name = user.name;
    usuario.password = user.password;
    usuario.confirmed = user.confirmed;
    usuario.createdAt = user.createdAt;
    usuario.updatedAt = user.updatedAt;
    usuario.__v = user.__v;
    usuario.nombre = user.nombre;
    usuario.apellido = user.apellido;
    usuario.codArea = user.codArea;
    usuario.telefono = user.telefono;
    usuario.fecha_nacimiento = user.fecha_nacimiento;
    usuario.provincia = user.provincia;
    usuario.ciudad = user.ciudad;
    usuario.barrio = user.barrio;
    usuario.calle = user.calle;
    usuario.numero = user.numero;
    usuario.piso = user.piso;
    usuario.departamento = user.departamento;
    usuario.codigoPostal = user.codigoPostal;

    User.findOneAndUpdate({ _id: usuario._id }, usuario, (err, pUpdated) => {
        if (err) return res.status(500).send("Error en BD");
        if (!pUpdated) return res.status(500).send("Error en BD");
        return res.status(200).send("Datos guardados correctamente");
    });
});

router.post("/upload-image/:id", multipartMiddleware, function (req, res) {
    var projectId = req.params.id;
    var fileName = "asd";

    if (req.files) {
        var filePath = req.files.removablefile.path;
        var fileSplit = filePath.split("\\");
        var fileName = fileSplit[1];

        User.findByIdAndUpdate(
            projectId,
            { removablefile: fileName },
            { new: true },
            (err, projectUpdated) => {
                if (err) return res.status(500).send({ message: "Imagen no subida" });
                if (!projectUpdated)
                    return res.status(400).send({ message: "No existe" });
                return res.status(200).send("Todo legal");
            }
        );
    } else console.log("ERROR");
});

router.get("/get-image/:id", function (req, respuesta1) {
    var usuario = req.params.id; //Nombre de archivo enviado como parámetro en la URL
    User.findById(usuario, (err, res) => {
        var path_file = "./uploads/" + res.removablefile; //Ubicación del archivo

        fs.exists(path_file, (exists) => {
            if (exists) {
                return respuesta1.sendFile(path.resolve(path_file));
            } else {
                return respuesta1.status(400).send("No existe la imagen");
            }
        });
    });
});

/* ------------------------------ Rutas de publicaciones ----------------------------------- */
router.post("/register-publicacion", function (req, res) {
    var email = req.query.email;
    var datos = req.body;
    var publicaciones = new Publicacion();

    publicaciones.titulo = datos.titulo;
    publicaciones.categoria = datos.categoria;
    publicaciones.subcategoria = datos.subcategoria;
    publicaciones.descripcion = datos.descripcion;
    publicaciones.preciodia = datos.preciodia;
    publicaciones.preciosemana = datos.preciosemana;
    publicaciones.preciomes = datos.preciomes;
    publicaciones.email = email;
    publicaciones.multiplefile = null;
    publicaciones.tipoAlquiler = datos.tipoAlquiler;
    publicaciones.destacar = datos.destacar;
    publicaciones.estado = "ACTIVA";
    publicaciones.id = datos.id;
    publicaciones.cantDias = datos.cantDias;
    publicaciones.cantidadDisponible = datos.cantidadDisponible;
    publicaciones.contadorDeVisita = 0;

    publicaciones.save((err, res1) => {
        if (err) return res.status(500).send("Error papi");
        if (!res) return res.status(404).send("Error papi");

       /*  const url = "http://localhost:4200/publicaciones/" + publicaciones.id;

        enviar(
            publicaciones.email,
            "Su publicacion ha sido publicada exitosamente",
            "¡Enhorabuena, tu producto ha sido publicado!",
            "Gracias por confiar en nosotros. Para ver tu nueva publicacion, haz click en el siguiente link:",
            url,
            "Ir a la publicacion"
        ); */

        return res.status(200).send("todo legal papi");
    });
});

router.post(
    "/upload-publicacion-img/:email/:titulo/:categoria",
    multipartMiddlewarePublicaciones,
    function (req, res) {
        var email = req.params.email;
        var titulo = req.params.titulo;
        var categoria = req.params.categoria;
        var fileName = "asd";

        if (req.files) {
            let nombre = "";
            let nombreFinal;
            if (req.files.multiplefile.length == undefined) {
                var filePath = req.files.multiplefile.path;
                var fileSplit = filePath.split("\\");
                var fileName = fileSplit[1];
                nombre += '{"imagen0":' + '"' + fileName + '",';
                nombreFinal = nombre.slice(0, -1);
                nombreFinal += "}";
            } else {
                for (let i = 0; i < req.files.multiplefile.length; i++) {
                    var filePath = req.files.multiplefile[i].path;
                    var fileSplit = filePath.split("\\");
                    var fileName = fileSplit[1];
                    if (i == 0) nombre += '{"imagen' + i + '":' + '"' + fileName + '",';
                    else nombre += '"imagen' + i + '":"' + fileName + '",';
                }
                nombreFinal = nombre.slice(0, -1);
                nombreFinal += "}";
            }

            Publicacion.findOneAndUpdate(
                { email: email, titulo: titulo, categoria: categoria },
                { multiplefile: nombreFinal },
                { new: true },
                (err, projectUpdated) => {
                    if (err) return res.status(500).send({ message: "Imagen no subida" });
                    if (!projectUpdated)
                        return res.status(400).send({ message: "No existe" });
                    return res.status(200).send(projectUpdated);
                }
            );
        } else console.log("ERROR");
    }
);

router.get("/get-publicacion/:email", function (req, res) {
    var email = req.params.email;
    Publicacion.find({ email: email }).exec((err, publicaciones) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!publicaciones)
            return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ publicaciones });
    });
});

router.post("/actualizar-visitas/:id", function (req, res) {
    var id = req.params.id;

    Publicacion.findById(id, (err, actualizado) => {
        var objeto = { contadorDeVisita: actualizado.contadorDeVisita + 1 };

        Publicacion.findByIdAndUpdate(id, objeto, (err2, actualizado2) => {
            if (err2)
                return res
                    .status(500)
                    .send({ message: "Error al actualizar el contador" });

            if (!actualizado2) return res.status(404).send({ message: "Error" });

            return res.status(200).send({ actualizado2 });
        });
    });
});

router.post(
    "/update-publicacion/:id",
    multipartMiddlewarePublicaciones,
    function (req, res) {
        var id = req.params.id;
        var datos = req.body;
        var publicaciones = new Publicacion();

        publicaciones._id = id;
        publicaciones.titulo = datos.titulo;
        publicaciones.categoria = datos.categoria;
        publicaciones.subcategoria = datos.subcategoria;
        publicaciones.descripcion = datos.descripcion;
        publicaciones.preciodia = datos.preciodia;
        publicaciones.preciosemana = datos.preciosemana;
        publicaciones.preciomes = datos.preciomes;
        publicaciones.email = datos.email;
        //publicaciones.multiplefile = null;
        publicaciones.tipoAlquiler = datos.tipoAlquiler;
        publicaciones.destacar = datos.destacar;
        publicaciones.estado = datos.estado;

        Publicacion.findByIdAndUpdate(
            id,
            publicaciones,
            { new: true },
            (err, eliminado) => {
                if (err) return res.status(500).send({ message: "Error al eliminar" });

                if (!eliminado) return res.status(404).send({ message: "Error" });

                return res.status(200).send({ message: "Todo ok" });
            }
        );
    }
);

router.delete("/delete-publicacion/:id", function (req, res) {
    var id = req.params.id;
    Publicacion.findByIdAndDelete(id, (err, eliminado) => {
        if (err) return res.status(500).send({ message: "Error al eliminar" });

        if (!eliminado) return res.status(404).send({ message: "Error" });

        return res.status(200).send({ message: "Todo ok" });
    });
});

router.get("/get-one-publicacion/:id", function (req, res) {
    var id = req.params.id;
    Publicacion.findById(id, (err, publicaciones) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!publicaciones)
            return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ publicaciones });
    });
});

router.get("/get-image-publicacion/:imagen", function (req, respuesta1) {
    var imagen = req.params.imagen; //Nombre de archivo enviado como parámetro en la URL

    var path_file = "./publicaciones/" + imagen; //Ubicación del archivo

    fs.exists(path_file, (exists) => {
        if (exists) {
            return respuesta1.sendFile(path.resolve(path_file));
        } else {
            return respuesta1.status(400).send("No existe la imagen");
        }
    });
});

router.get("/get-publicaciones-destacadas", function (req, res) {
    Publicacion.find(
        { destacar: "SI", estado: "ACTIVA" },
        (err, publicaciones) => {
            if (err) return res.status(500).send({ message: "Error" });

            if (!publicaciones)
                return res.status(404).send({ message: "El doc no existe" });

            return res.status(200).send({ publicaciones });
        }
    );
});

router.get("/get-all-publicaciones", function (req, res) {
    Publicacion.find(function (err, publicaciones) {
        if (err) return res.status(500).send({ message: "Error" });

        if (!publicaciones)
            return res.status(404).send({ message: "El doc no existe" });
        return res.status(200).send({ publicaciones });
    });
});

router.post("/update-superadmin-publicacion", function (req, res) {
    var datos = req.body;
    var publicaciones = new Publicacion();

    publicaciones._id = datos._id;
    publicaciones.titulo = datos.titulo;
    publicaciones.categoria = datos.categoria;
    publicaciones.subcategoria = datos.subcategoria;
    publicaciones.descripcion = datos.descripcion;
    publicaciones.preciodia = datos.preciodia;
    publicaciones.preciosemana = datos.preciosemana;
    publicaciones.preciomes = datos.preciomes;
    publicaciones.email = datos.email;
    publicaciones.tipoAlquiler = datos.tipoAlquiler;
    publicaciones.destacar = datos.destacar;
    publicaciones.estado = datos.estado;
    publicaciones.createdAt = datos.createdAt;
    publicaciones.updatedAt = datos.updatedAt;
    publicaciones.cantDias = datos.cantDias;
    publicaciones.cantidadDisponible = datos.cantidadDisponible;
    publicaciones.contadorDeVisita = datos.contadorDeVisita;

    Publicacion.findByIdAndUpdate(
        publicaciones._id,
        publicaciones,
        (err, eliminado) => {
            if (err) return res.status(500).send({ message: "Error al eliminar" });

            if (!eliminado) return res.status(404).send({ message: "Error" });

            return res.status(200).send({ message: "Todo ok" });
        }
    );
});

/* ------------------------------ Busqueda de publicaciones ----------------------------------- */
router.get("/search-categoria", function (req, res) {
    var categoria = req.query.c;
    var preciodia = req.query.precio;
    var estrellas = req.query.star;
    var subcategoria = req.query.s;

    var query;

    /*  c sc p e 
          0  0 0 0
          0  0 0 1
          0  0 1 0
          0  0 1 1
  
          0  1 0 0
          0  1 0 1
          0  1 1 0
          0  1 1 1
  
          1  0 0 0
          1  0 0 1
          1  0 1 0
          1  0 1 1
          
          1  1 0 0
          1  1 0 1
          1  1 1 0
          1  1 1 1  
      */

    /* URL EJEMPLO: http://localhost:4201/api/search-categoria/Hogar?p=300&s=Decoración */

    //0000
    if (
        categoria == undefined &&
        subcategoria == undefined &&
        preciodia == undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({ estado: "ACTIVA" });
        //{ $regex: '.*' + palabra + '.*' }
        // new RegExp('^' + palabra + '$', "i")
    }

    //0001
    if (
        categoria == undefined &&
        subcategoria == undefined &&
        preciodia == undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({ estrellas: estrellas, estado: "ACTIVA" });
    }

    //0010
    if (
        categoria == undefined &&
        subcategoria == undefined &&
        preciodia != undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({ preciodia: preciodia, estado: "ACTIVA" })
            .where("preciodia")
            .lt(preciodia);
    }

    //0011
    if (
        categoria == undefined &&
        subcategoria == undefined &&
        preciodia != undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            preciodia: preciodia,
            estrellas: estrellas,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //0100
    if (
        categoria == undefined &&
        subcategoria != undefined &&
        preciodia == undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({ subcategoria: subcategoria, estado: "ACTIVA" });
    }

    //0101
    if (
        categoria == undefined &&
        subcategoria != undefined &&
        preciodia == undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            subcategoria: subcategoria,
            estrellas: estrellas,
            estado: "ACTIVA",
        });
    }

    //0110
    if (
        categoria == undefined &&
        subcategoria != undefined &&
        preciodia != undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            subcategoria: subcategoria,
            preciodia: preciodia,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //0111
    if (
        categoria == undefined &&
        subcategoria != undefined &&
        preciodia != undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            subcategoria: subcategoria,
            preciodia: preciodia,
            estrellas: estrellas,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //1000
    if (
        categoria != undefined &&
        subcategoria == undefined &&
        preciodia == undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({ categoria: categoria, estado: "ACTIVA" });
    }

    //1001
    if (
        categoria != undefined &&
        subcategoria == undefined &&
        preciodia == undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            categoria: categoria,
            estrellas: estrellas,
            estado: "ACTIVA",
        });
    }

    //1010
    if (
        categoria != undefined &&
        subcategoria == undefined &&
        preciodia != undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            categoria: categoria,
            preciodia: preciodia,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //1011
    if (
        categoria != undefined &&
        subcategoria == undefined &&
        preciodia != undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            categoria: categoria,
            preciodia: preciodia,
            estrellas: estrellas,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //1100
    if (
        categoria != undefined &&
        subcategoria != undefined &&
        preciodia == undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            categoria: categoria,
            subcategoria: subcategoria,
            estado: "ACTIVA",
        });
    }

    //1101
    if (
        categoria != undefined &&
        subcategoria != undefined &&
        preciodia == undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            categoria: categoria,
            subcategoria: subcategoria,
            estrellas: estrellas,
            estado: "ACTIVA",
        });
    }

    //1110
    if (
        categoria != undefined &&
        subcategoria != undefined &&
        preciodia != undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            categoria: categoria,
            subcategoria: subcategoria,
            preciodia: preciodia,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //1111
    if (
        categoria != undefined &&
        subcategoria != undefined &&
        preciodia != undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            categoria: categoria,
            subcategoria: subcategoria,
            preciodia: preciodia,
            estrellas: estrellas,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    query.exec((err, publicaciones) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!res) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ publicaciones });
    });
});

router.post("/search-palabra", function (req, res) {
    var palabra = req.body.palabra;

    var preciodia = req.query.precio;
    var estrellas = req.query.star;
    var categoria = req.query.c;
    var subcategoria = req.query.sc;

    var query;

    /*  c sc p e 
          0  0 0 0
          0  0 0 1
          0  0 1 0
          0  0 1 1
  
          0  1 0 0
          0  1 0 1
          0  1 1 0
          0  1 1 1
  
          1  0 0 0
          1  0 0 1
          1  0 1 0
          1  0 1 1
          
          1  1 0 0
          1  1 0 1
          1  1 1 0
          1  1 1 1  
      */

    //0000
    if (
        categoria == undefined &&
        subcategoria == undefined &&
        preciodia == undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            estado: "ACTIVA",
        });
        //{ $regex: '.*' + palabra + '.*' }
        // new RegExp('^' + palabra + '$', "i")
    }

    //0001
    if (
        categoria == undefined &&
        subcategoria == undefined &&
        preciodia == undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            estrellas: estrellas,
            estado: "ACTIVA",
        });
    }

    //0010
    if (
        categoria == undefined &&
        subcategoria == undefined &&
        preciodia != undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            preciodia: preciodia,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //0011
    if (
        categoria == undefined &&
        subcategoria == undefined &&
        preciodia != undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            preciodia: preciodia,
            estrellas: estrellas,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //0100
    if (
        categoria == undefined &&
        subcategoria != undefined &&
        preciodia == undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            subcategoria: subcategoria,
            estado: "ACTIVA",
        });
    }

    //0101
    if (
        categoria == undefined &&
        subcategoria != undefined &&
        preciodia == undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            subcategoria: subcategoria,
            estrellas: estrellas,
            estado: "ACTIVA",
        });
    }

    //0110
    if (
        categoria == undefined &&
        subcategoria != undefined &&
        preciodia != undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            subcategoria: subcategoria,
            preciodia: preciodia,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //0111
    if (
        categoria == undefined &&
        subcategoria != undefined &&
        preciodia != undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            subcategoria: subcategoria,
            preciodia: preciodia,
            estrellas: estrellas,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //1000
    if (
        categoria != undefined &&
        subcategoria == undefined &&
        preciodia == undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            categoria: categoria,
            estado: "ACTIVA",
        });
    }

    //1001
    if (
        categoria != undefined &&
        subcategoria == undefined &&
        preciodia == undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            categoria: categoria,
            estrellas: estrellas,
            estado: "ACTIVA",
        });
    }

    //1010
    if (
        categoria != undefined &&
        subcategoria == undefined &&
        preciodia != undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            categoria: categoria,
            preciodia: preciodia,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //1011
    if (
        categoria != undefined &&
        subcategoria == undefined &&
        preciodia != undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            categoria: categoria,
            preciodia: preciodia,
            estrellas: estrellas,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //1100
    if (
        categoria != undefined &&
        subcategoria != undefined &&
        preciodia == undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            categoria: categoria,
            subcategoria: subcategoria,
            estado: "ACTIVA",
        });
    }

    //1101
    if (
        categoria != undefined &&
        subcategoria != undefined &&
        preciodia == undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            categoria: categoria,
            subcategoria: subcategoria,
            estrellas: estrellas,
            estado: "ACTIVA",
        });
    }

    //1110
    if (
        categoria != undefined &&
        subcategoria != undefined &&
        preciodia != undefined &&
        estrellas == undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            categoria: categoria,
            subcategoria: subcategoria,
            preciodia: preciodia,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    //1111
    if (
        categoria != undefined &&
        subcategoria != undefined &&
        preciodia != undefined &&
        estrellas != undefined
    ) {
        query = Publicacion.find({
            titulo: new RegExp(palabra, "i"),
            categoria: categoria,
            subcategoria: subcategoria,
            preciodia: preciodia,
            estrellas: estrellas,
            estado: "ACTIVA",
        })
            .where("preciodia")
            .lt(preciodia);
    }

    query.exec((err, publicaciones) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!res) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ publicaciones });
    });
});

/* ------------------------------ Preguntas y respuestas ----------------------------------- */
//Get de las preguntas y respuestas de una publicación
router.get("/pyr/:id", function (req, res) {
    PyR.find({ id_publicacion: req.params.id }).exec((err, publicacion) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!res) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ publicacion });
    });
});

//Post del usuario cuando hace una pregunta (id = id del detalle de la publicación)
router.post("/pregunta/:id/:name", function (req, res) {
    var pregunta = req.body.pregunta;
    var id_publicacion = req.params.id;
    var usuario_pregunta = req.params.name;
    var objeto = {
        id_publicacion: id_publicacion,
        usuario_pregunta: usuario_pregunta,
        pregunta: pregunta,
    };
    var modelo = new PyR(objeto);

    modelo.save((err, pyr) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!res) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ pyr });
    });
});

//Post de la respuesta del usuario que publicó (id = id de la pregunta que realizó el usuario interesado)
router.post("/respuesta/:idPyR/:name", function (req, res) {
    var respuesta = req.body.respuesta;
    var usuarioRespuesta = req.params.name;
    var id_publicacion = req.params.idPyR;
    var objeto = {
        usuario_publicacion: usuarioRespuesta,
        respuesta: respuesta,
        tiene_respuesta: true,
    };

    PyR.findByIdAndUpdate(id_publicacion, objeto, (err, pyr) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!res) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ pyr });
    });
});

router.get("/onePyR/:id", function (req, res) {
    var _id = req.params.id;
    PyR.findById(_id, (err, pyr) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!res) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ pyr });
    });
});

/* ------------------------------ Notificaciones ----------------------------------- */
router.post(
    "/notificacion-pregunta/:origen/:destino/:tituloPublicacion/:imagen/:id_publicacion",
    function (req, res) {
        var id_publicacion = req.params.id_publicacion;
        var tituloPublicacion = req.params.tituloPublicacion;
        var imagen = req.params.imagen;
        var titulo = "Nueva pregunta en ";
        var origen = req.params.origen;
        var mensaje = origen + " ha realizado una pregunta en tu publicación";
        var destino = req.params.destino;
        var tipo = "pregunta";

        var objeto = {
            id_publicacion: id_publicacion,
            tituloPublicacion: tituloPublicacion,
            imagen: imagen,
            titulo: titulo,
            name_origen: origen,
            name_destino: destino,
            tipo: tipo,
            mensaje_notificacion: mensaje,
            visto: false,
        };

        var notificacion = new Notificacion(objeto);

        notificacion.save((err, not) => {
            if (err) return res.status(500).send({ message: "Error" });

            if (!res) return res.status(404).send({ message: "El doc no existe" });

            return res.status(200).send({ not });
        });
    }
);

router.post(
    "/notificacion-respuesta/:origen/:destino/:tituloPublicacion/:imagen/:id_publicacion",
    function (req, res) {
        var id_publicacion = req.params.id_publicacion;
        var tituloPublicacion = req.params.tituloPublicacion;
        var imagen = req.params.imagen;
        var titulo = "Nueva respuesta en ";
        var origen = req.params.origen;
        var destino = req.params.destino;
        var tipo = "respuesta";
        var mensaje = origen + " ha respondido a tu pregunta";

        var objeto = {
            id_publicacion: id_publicacion,
            tituloPublicacion: tituloPublicacion,
            imagen: imagen,
            titulo: titulo,
            name_origen: origen,
            name_destino: destino,
            tipo: tipo,
            mensaje_notificacion: mensaje,
            visto: false,
        };

        var notificacion = new Notificacion(objeto);

        notificacion.save((err, not) => {
            if (err) return res.status(500).send({ message: "Error" });

            if (!res) return res.status(404).send({ message: "El doc no existe" });

            return res.status(200).send({ not });
        });
    }
);

router.get("/nuevas-notificaciones/:username", function (req, res) {
    var name = req.params.username;

    Notificacion.find({ name_destino: name, visto: false }, (err, not) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!res) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ not });
    });
});

router.get("/todas-notificaciones/:username", function (req, res) {
    var name = req.params.username;

    Notificacion.find({ name_destino: name }, (err, not) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!res) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ not });
    });
});

router.post("/notificacion-vista", function (req, res) {
    var notificacion = req.body;

    Notificacion.findByIdAndUpdate(
        notificacion._id,
        { visto: true },
        (err, not) => {
            if (err) return res.status(500).send({ message: "Error" });

            if (!res) return res.status(404).send({ message: "El doc no existe" });

            return res.status(200).send({ not });
        }
    );
});
/*Notificación para avisar a el propietario el tiempo que le queda para entregar el producto al locatario*/
router.post(
    "/notificacion-caducidad-entrega-propietario/:imagen/:id_publicacion/:user_propietario/:user_locatario/:id_alquiler",
    function (req, res) {
        var fechaActual = moment(new Date(req.body.fechaActual)).format(
            "MM/DD/YYYY"
        );
        var fechaCaducidad = moment(new Date(req.body.fechaCaducidad)).format(
            "MM/DD/YYYY"
        );

        const date1 = new Date(fechaCaducidad);
        const date2 = new Date(fechaActual);
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        var id_publicacion = req.params.id_publicacion;
        var tituloPublicacion = req.params.tituloPublicacion;
        var imagen = req.params.imagen;
        var titulo = "ALERTA: tienes una entrega de producto pendiente.";
        var origen = req.params.user_locatario; //EL USUARIO QUE ME ALQUILÓ UNA PUBLICACIÓN
        var destino = req.params.user_propietario; //YO USUARIO, DUEÑO DE LA PUBLICACIÓN
        var id_alquiler = req.params.id_alquiler;
        if (date1 >= date2) {
            if (diffDays <= 3 && diffDays > 0) {
                if (diffDays == 1) {
                    var mensaje =
                        "Tienes " + diffDays + " día para entregar el producto a " + origen;
                } else {
                    var mensaje =
                        "Tienes " +
                        diffDays +
                        " dias para entregar el producto a " +
                        origen;
                }
            } else {
                if (diffDays == 0) {
                    var mensaje =
                        "Hoy es el último día para entregar el producto a " + origen;
                } else {
                    return;
                }
            }
        } else {
            if (diffDays == 1) {
                var mensaje =
                    "Te has demorado " +
                    diffDays +
                    " día en entregar el producto a " +
                    origen;
            } else {
                var mensaje =
                    "Te has demorado " +
                    diffDays +
                    " dias en entregar el producto a " +
                    origen;
            }
        }

        var objeto = {
            id_publicacion: id_publicacion,
            tituloPublicacion: tituloPublicacion,
            imagen: imagen,
            titulo: titulo,
            name_destino: destino,
            mensaje_notificacion: mensaje,
            visto: false,
        };

        var notificacion = new Notificacion(objeto);

        MisAlquileres.findById(id_alquiler, (err, alquiler) => {
            if (err) return res.status(500).send({ message: "Error" });

            if (!alquiler) return res.status(404).send({ message: "Error" });

            if (
                alquiler.fechaEntrega == undefined &&
                alquiler.estado == "En proceso de entrega"
            ) {
                Notificacion.find(
                    { mensaje_notificacion: mensaje, id_publicacion: id_publicacion },
                    (err, not1) => {
                        if (err) return res.status(500).send({ message: "Error" });

                        /* Si encuentra la notificación, no la envía. En cambio, si no la encuentra, la sube como nueva */
                        if (not1.length < 1) {
                            notificacion.save((err, not) => {
                                if (diffDays == 2 && date1 >= date2) {
                                    enviarEmailAUsuario(
                                        destino,
                                        "Tiempo de caducación de entrega de tu alquiler",
                                        "Tu producto debe ser entregado en 2 días",
                                        "¡Hola " +
                                        destino +
                                        "! Este e-mail es para recordate que debes entregar el producto dentro de 2(dos) días. En caso de que no se realice la entrega, un botón para generar un reclamo va a ser generado en la sección de 'Mis Alquileres' dentro de tu cuenta en el cual podrás realizar un descargo del por qué no fue entregado en la fecha pactada.",
                                        "http://localhost:4200/mi-cuenta/mis-alquileres",
                                        "Ir a Mis Alquileres"
                                    );
                                }

                                if (diffDays == 1 && date1 < date2) {
                                    enviarEmailAUsuario(
                                        destino,
                                        "Tiempo de caducación de entrega de tu alquiler",
                                        "Tu producto no fue entregado en el tiempo pactado",
                                        "¡Hola " +
                                        destino +
                                        "! Este e-mail es para recordate que no has entregado en tiempo y forma el producto que te han alquilado. Puedes realizar tu descargo dentro de la sección 'Mis Alquileres'.",
                                        "http://localhost:4200/mi-cuenta/mis-alquileres",
                                        "Ir a Mis Alquileres"
                                    );
                                }

                                if (err) return res.status(500).send({ message: "Error" });

                                if (!not)
                                    return res.status(404).send({ message: "El doc no existe" });

                                return res.status(200).send({ not });
                            });
                        } else {
                            return res.status(200).send({ not1 });
                        }
                    }
                );
            } else {
                res.status(200).send("");
            }
        });
    }
);

/*Notificación para avisar al locatario el tiempo que queda para que el propietario le entregue el producto*/
router.post(
    "/notificacion-caducidad-entrega-locatario/:imagen/:id_publicacion/:user_propietario/:user_locatario/:id_alquiler",
    function (req, res) {
        var fechaActual = moment(new Date(req.body.fechaActual)).format(
            "MM/DD/YYYY"
        );
        var fechaCaducidad = moment(new Date(req.body.fechaCaducidad)).format(
            "MM/DD/YYYY"
        );

        const date1 = new Date(fechaCaducidad);
        const date2 = new Date(fechaActual);
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        var id_publicacion = req.params.id_publicacion;
        var tituloPublicacion = req.params.tituloPublicacion;
        var imagen = req.params.imagen;
        var titulo = "ALERTA, tienes una entrega de producto pendiente";
        var origen = req.params.user_propietario; //EL USUARIO DUEÑO DE LA PUBLICACIÓN QUE ALQUILÉ
        var destino = req.params.user_locatario; //YO USUARIO, QUIEN ALQUILÓ LA PUBLICACIÓN
        var id_alquiler = req.params.id_alquiler;

        if (date1 >= date2) {
            if (diffDays <= 3 && diffDays > 0) {
                if (diffDays == 1) {
                    var mensaje =
                        "Tienes " +
                        diffDays +
                        " día para recibir el producto que has alquilado a " +
                        origen;
                } else {
                    var mensaje =
                        "Tienes " +
                        diffDays +
                        " dias para recibir el producto que has alquilado a " +
                        origen;
                }
            } else {
                if (diffDays == 0) {
                    var mensaje =
                        "Hoy es el último día para recibir el producto que has alquilado a " +
                        origen;
                } else {
                    return;
                }
            }
        } else {
            if (diffDays == 1) {
                var mensaje =
                    origen +
                    " se ha demorado " +
                    diffDays +
                    " día en entregarte el objeto que has alquilado";
            } else {
                var mensaje =
                    origen +
                    " se ha demorado " +
                    diffDays +
                    " dias en entregarte el objeto que has alquilado";
            }
        }

        var objeto = {
            id_publicacion: id_publicacion,
            tituloPublicacion: tituloPublicacion,
            imagen: imagen,
            titulo: titulo,
            name_destino: destino,
            mensaje_notificacion: mensaje,
            visto: false,
        };

        var notificacion = new Notificacion(objeto);

        MisAlquileres.findById(id_alquiler, (err, alquiler) => {
            if (err) return res.status(500).send({ message: "Error" });

            if (!alquiler) return res.status(404).send({ message: "Error" });

            if (
                alquiler.fechaEntrega == undefined &&
                alquiler.estado == "En proceso de entrega"
            ) {
                Notificacion.find({ mensaje_notificacion: mensaje }, (err, not1) => {
                    if (err) return res.status(500).send({ message: "Error" });

                    /* Si encuentra la notificación, no la envía. En cambio, si no la encuentra, la sube como nueva */
                    if (not1.length < 1) {
                        notificacion.save((err, not) => {
                            if (diffDays == 2 && date1 >= date2) {
                                enviarEmailAUsuario(
                                    destino,
                                    "Tiempo de caducación de entrega de tu alquiler",
                                    "Tu producto debe ser entregado en 2 días",
                                    "¡Hola " +
                                    destino +
                                    "! Este e-mail es para recordate que el dueño de la publicación debe entregarte el producto dentro de 2(dos) días. En caso de que no se realice la entrega, un botón para generar un reclamo va a ser generado en la sección de 'Mis Alquileres' dentro de tu cuenta.",
                                    "http://localhost:4200/mi-cuenta/mis-alquileres",
                                    "Ir a Mis Alquileres"
                                );
                            }

                            if (diffDays == 1 && date1 < date2) {
                                enviarEmailAUsuario(
                                    destino,
                                    "Tiempo de caducación de entrega de tu alquiler",
                                    "Tu producto no fue entregado en el tiempo pactado",
                                    "¡Hola " +
                                    destino +
                                    "! Este e-mail es para recordate que el dueño de la publicación no ha entregado en tiempo y forma el producto que has alquilado. Puedes realizar el reclamo del mismo dentro de la sección 'Mis Alquileres'.",
                                    "http://localhost:4200/mi-cuenta/mis-alquileres",
                                    "Ir a Mis Alquileres"
                                );
                            }

                            if (err) return res.status(500).send({ message: "Error" });

                            if (!not)
                                return res.status(404).send({ message: "El doc no existe" });

                            return res.status(200).send({ not });
                        });
                    } else {
                        return res.status(200).send({ not1 });
                    }
                });
            } else {
                res.status(200).send("");
            }
        });
    }
);

/* ------------------------------ Mis alquileres ----------------------------------- */

//Test de generación de códigos
router.post("/codigo-alquiler", function (req, res) {
    res.status(200).send(randomstring.generate(10));
});

router.get("/get-all-alquileres", function (req, res) {
    MisAlquileres.find((err, alquileres) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!alquileres)
            return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send(alquileres);
    });
});

router.get("/get-alquiler-id/:id", function (req, res) {
    let id = req.params.id;
    MisAlquileres.findById(id, (err, alquileres) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!alquileres)
            return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send(alquileres);
    });
});

router.delete("/delete-alquiler/:id", function (req, res) {
    let id = req.params.id;
    MisAlquileres.findByIdAndDelete(id, (err, alquiler) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!alquiler) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send(alquiler);
    });
});

router.post("/update-superadmin-alquiler/", function (req, res) {
    let datos = req.body;
    let alquiler = new MisAlquileres();

    alquiler._id = datos._id;
    alquiler.imagen = datos.imagen;
    alquiler.fuePagado = datos.fuePagado;
    alquiler.estado = datos.estado;
    alquiler.id_publicacion = datos.id_publicacion;
    alquiler.name_usuarioPropietario = datos.name_usuarioPropietario;
    alquiler.name_usuarioLocatario = datos.name_usuarioLocatario;
    alquiler.cantidadDias = datos.cantidadDias;
    alquiler.cantidadAlquilar = datos.cantidadAlquilar;
    alquiler.createdAt = datos.createdAt;
    alquiler.updatedAt = datos.updatedAt;
    alquiler.codigoEntregaLocatario = datos.codigoEntregaLocatario;
    alquiler.codigoEntregaPropietario = datos.codigoEntregaPropietario;
    alquiler.codigoLocatarioIngresado = datos.codigoLocatarioIngresado;
    alquiler.codigoPropietarioIngresado = datos.codigoPropietarioIngresado;
    alquiler.fechaCaducidadEntrega = datos.fechaCaducidadEntrega;
    alquiler.fechaCaducidadEntrega = datos.fechaCaducidadEntrega;
    alquiler.codigoDevolucionLocatario = datos.codigoDevolucionLocatario;
    alquiler.codigoDevolucionPropietario = datos.codigoDevolucionPropietario;
    alquiler.codigoLocatarioDevolucionIngresado =
        datos.codigoLocatarioDevolucionIngresado;
    alquiler.codigoPropietarioDevolucionIngresado =
        datos.codigoPropietarioDevolucionIngresado;
    alquiler.fechaCaducidadDevolucion = datos.fechaEntrega;
    alquiler.fechaDevolucion = datos.fechaDevolucion;

    MisAlquileres.findByIdAndUpdate(alquiler._id, alquiler, (err, alquiler) => {
        if (err) return res.status(500).send({ message: "Error" });

        if (!res) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send(alquiler);
    });
});

router.post(
    "/registrar-alquiler/:id_publicacion/:usuarioPropietario/:usuarioLocatario/:cantidadDias/:cantidadAlquilar/:imagen/:montoTotal",
    function (req, res) {
        var estado = "En proceso de pago";
        var id_publicacion = req.params.id_publicacion;
        var name_usuarioPropietario = req.params.usuarioPropietario;
        var name_usuarioLocatario = req.params.usuarioLocatario;
        var cantidadDias = req.params.cantidadDias;
        var cantidadAlquilar = req.params.cantidadAlquilar;
        var imagen = req.params.imagen;
        var fuePagado = false;
        var montoTotal = req.params.montoTotal;
        
        var objeto = {
            imagen: imagen,
            fuePagado: fuePagado,
            estado: estado,
            id_publicacion: id_publicacion,
            name_usuarioPropietario: name_usuarioPropietario,
            name_usuarioLocatario: name_usuarioLocatario,
            cantidadDias: cantidadDias,
            cantidadAlquilar: cantidadAlquilar,
            montoTotal: montoTotal
        };

        var misAlquileres = new MisAlquileres(objeto);

        misAlquileres.save((err, alquiler) => {
            if (err) return res.status(500).send({ message: "Error" });

            if (!res) return res.status(404).send({ message: "El doc no existe" });

            return res.status(200).send({ alquiler });
        });
    }
);

router.post("/registrar-proceso-entrega/:id_alquiler", function (req, res) {
    var id_alquiler = req.params.id_alquiler;
    var estado = "En proceso de entrega";
    var codigoEntregaPropietario = randomstring.generate(10);
    var codigoEntregaLocatario = randomstring.generate(10);
    var codigoPropietarioIngresado = false;
    var codigoLocatarioIngresado = false;
    var date = new Date();
    var fuePagado = true;
    date.setDate(date.getDate() + 3); //DEFINIR LA CANTIDAD DE DÍAS EN EL QUE SE PUEDE TARDAR EN ENTREGAR EL PRODUCTO
    var fechaCaducidadEntrega = moment(date).format("MM/DD/YYYY");

    var objeto = {
        fuePagado: fuePagado,
        estado: estado,
        codigoEntregaPropietario: codigoEntregaPropietario,
        codigoEntregaLocatario: codigoEntregaLocatario,
        fechaCaducidadEntrega: fechaCaducidadEntrega,
        codigoPropietarioIngresado: codigoPropietarioIngresado,
        codigoLocatarioIngresado: codigoLocatarioIngresado,
    };

    MisAlquileres.findByIdAndUpdate(id_alquiler,
        objeto,
        function (err, alquiler) {
            if (err) return res.status(500).send({ message: "Error" });

            if (!res) return res.status(404).send({ message: "El doc no existe" });
            //console.log(alquiler)
/*             enviarEmailAUsuario(
                alquiler.name_usuarioPropietario,
                "Código de entrega propietario",
                "¡Enhobrabuena! Tu publicación ha sido pagada",
                "¡Hola! Tu código de propietario es el siguiente: <b>" +
                codigoEntregaPropietario +
                "</b>. Recuerda darselo al locatario cuando este te lo indique.",
                "https://localhost:4200/mis-alquileres",
                "Ir a mis alquileres"
            );
            enviarEmailAUsuario(
                alquiler.name_usuarioLocatario,
                "Código de entrega locatario",
                "¡Enhobrabuena! Tu producto ha sido pagado",
                "¡Hola! Tu código de locatario es el siguiente: <b>" +
                codigoEntregaLocatario +
                "</b>. Recuerda darselo al propietario cuando este te lo indique.",
                "https://localhost:4200/mis-alquileres",
                "Ir a mis alquileres"
            );
 */
            return res.status(200).send({ alquiler });
        }
    );
});

/*CUANDO EL LOCATARIO INGRESA EL CÓDIGO DEL PROPIETARIO */
router.post("/registrar-entrega-locatario/:codigoEntregaPropietario", function (
    req,
    res
) {
    var codigoEntregaPropietario = req.params.codigoEntregaPropietario;
    var codigoPropietarioIngresado = true;

    MisAlquileres.findOneAndUpdate(
        { codigoEntregaPropietario: codigoEntregaPropietario },
        { codigoPropietarioIngresado: codigoPropietarioIngresado },
        function (err, alquiler) {
            if (err) return res.status(500).send({ message: "Error" });

            if (!res) return res.status(404).send({ message: "El doc no existe" });

            return res.status(200).send({ alquiler });
        }
    );
});

/*CUANDO EL PROPIETARIO INGRESA EL CÓDIGO DEL LOCATARIO */
router.post("/registrar-entrega-propietario/:codigoEntregaLocatario", function (
    req,
    res
) {
    var codigoEntregaLocatario = req.params.codigoEntregaLocatario;
    var codigoLocatarioIngresado = true;
    var estado = "En proceso de devolución";
    var date = new Date();
    var fechaEntrega = moment(date).format("MM/DD/YYYY");

    var codigoDevolucionPropietario = randomstring.generate(10);
    var codigoDevolucionLocatario = randomstring.generate(10);
    var codigoPropietarioDevolucionIngresado = false;
    var codigoLocatarioDevolucionIngresado = false;

    MisAlquileres.findOne(
        { codigoEntregaLocatario: codigoEntregaLocatario },
        function (err1, alquiler1) {
            var diasAlquiler = alquiler1.cantidadDias;
            var date2 = new Date();
            date2.setDate(date2.getDate() + diasAlquiler + 1); //DEFINIR LA CANTIDAD DE DÍAS EN EL QUE SE PUEDE TARDAR EN devolder EL PRODUCTO
            var fechaCaducidadDevolucion = moment(date2).format("MM/DD/YYYY");

            MisAlquileres.findOneAndUpdate(
                { codigoEntregaLocatario: codigoEntregaLocatario },
                {
                    estado: estado,
                    codigoLocatarioIngresado: codigoLocatarioIngresado,
                    fechaEntrega: fechaEntrega,
                    fechaCaducidadDevolucion: fechaCaducidadDevolucion,
                    codigoDevolucionPropietario: codigoDevolucionPropietario,
                    codigoDevolucionLocatario: codigoDevolucionLocatario,
                    codigoPropietarioDevolucionIngresado: codigoPropietarioDevolucionIngresado,
                    codigoLocatarioDevolucionIngresado: codigoLocatarioDevolucionIngresado,
                },
                function (err, alquiler) {
                    if (err) return res.status(500).send({ message: "Error" });

                    if (!res)
                        return res.status(404).send({ message: "El doc no existe" });

                    enviarEmailAUsuario(
                        alquiler1.name_usuarioPropietario,
                        "Código de propietario",
                        "¡Hola " + alquiler1.name_usuarioPropietario + "!",
                        "Te enviamos este mail con el motivo de acercarte el siguiente código, el cual usarás cuando te tengan que devolver el producto. El mismo es el siguiente: <br>" +
                        codigoDevolucionPropietario +
                        "</br>",
                        "http://localhost:4201/mi-cuenta/mis-alquileres",
                        "Ir a mis alquileres"
                    );

                    enviarEmailAUsuario(
                        alquiler1.name_usuarioLocatario,
                        "Código de locatario",
                        "¡Hola " + alquiler1.name_usuarioLocatario + "!",
                        "Te enviamos este mail con el motivo de acercarte el siguiente código, el cual usarás cuando tengas que devolver el producto. El mismo es el siguiente: <br>" +
                        codigoDevolucionLocatario +
                        "</br>",
                        "http://localhost:4201/mi-cuenta/mis-alquileres",
                        "Ir a mis alquileres"
                    );

                    return res.status(200).send({ alquiler });
                }
            );
        }
    );
});

/* Este evento lo genera el propietario cuando coloca el botón "Finalizar alquiler" en "Mis Alquileres" */
router.post("/registrar-proceso-finalizacion/:id_usuarioPropietario", function (
    req,
    res
) {
    var id_usuarioPropietario = req.params.id_usuarioPropietario;
    var fueDevuelto = true;
    var codigoDevolucionPropietario = randomstring.generate(10);
    var codigoDevolucionLocatario = randomstring.generate(10);
    var codigoPropietarioDevolucionIngresado = false;
    var codigoLocatarioDevolucionIngresado = false;

    var objeto = {
        fueDevuelto: fueDevuelto,
        codigoDevolucionPropietario: codigoDevolucionPropietario,
        codigoDevolucionLocatario: codigoDevolucionLocatario,
        codigoPropietarioDevolucionIngresado: codigoPropietarioDevolucionIngresado,
        codigoLocatarioDevolucionIngresado: codigoLocatarioDevolucionIngresado,
    };

    MisAlquileres.findOneAndUpdate(
        { id_usuarioPropietario: id_usuarioPropietario },
        objeto,
        function (err, alquiler) {
            if (err) return res.status(500).send({ message: "Error" });

            if (!res) return res.status(404).send({ message: "El doc no existe" });

            return res.status(200).send({ alquiler });
        }
    );
});

router.post(
    "/registrar-finalizacion-locatario/:codigoDevolucionPropietario",
    function (req, res) {
        var codigoDevolucionPropietario = req.params.codigoDevolucionPropietario;
        var codigoPropietarioDevolucionIngresado = true;

        MisAlquileres.findOneAndUpdate(
            { codigoDevolucionPropietario: codigoDevolucionPropietario },
            {
                codigoPropietarioDevolucionIngresado: codigoPropietarioDevolucionIngresado,
            },
            function (err, alquiler) {
                if (err) return res.status(500).send({ message: "Error" });

                if (!res) return res.status(404).send({ message: "El doc no existe" });

                return res.status(200).send({ alquiler });
            }
        );
    }
);

router.post(
    "/registrar-finalizacion-propietario/:codigoDevolucionLocatario",
    function (req, res) {
        var codigoDevolucionLocatario = req.params.codigoDevolucionLocatario;
        var codigoLocatarioDevolucionIngresado = true;
        var estado = "Finalizado";
        var date = new Date();
        var fechaDevolucion = moment(date).format("MM/DD/YYYY");

        MisAlquileres.findOneAndUpdate(
            { codigoDevolucionLocatario: codigoDevolucionLocatario },
            {
                estado: estado,
                codigoLocatarioDevolucionIngresado: codigoLocatarioDevolucionIngresado,
                fechaDevolucion: fechaDevolucion,
            },
            function (err, alquiler) {
                if (err) return res.status(500).send({ message: "Error" });

                if (!res) return res.status(404).send({ message: "El doc no existe" });

                return res.status(200).send({ alquiler });
            }
        );
    }
);

router.get("/get-alquiler-publicaciones/:name_usuarioPropietario", function (
    req,
    res
) {
    var name_usuarioPropietario = req.params.name_usuarioPropietario;

    MisAlquileres.find(
        { name_usuarioPropietario: name_usuarioPropietario },
        function (err, alquiler) {
            if (err) return res.status(500).send({ message: "Error" });

            if (!alquiler)
                return res.status(404).send({ message: "El doc no existe" });

            return res.status(200).send({ alquiler });
        }
    );
});

router.get("/get-alquiler-propios/:name_usuarioLocatario", function (req, res) {
    var name_usuarioLocatario = req.params.name_usuarioLocatario;

    MisAlquileres.find(
        { name_usuarioLocatario: name_usuarioLocatario },
        function (err, alquiler) {
            if (err) return res.status(500).send({ message: "Error" });

            if (!alquiler)
                return res.status(404).send({ message: "El doc no existe" });

            return res.status(200).send({ alquiler });
        }
    );
});

router.get("/get-propietario-alquiler/:username", function (req, res) {
    var username = req.params.username;
    User.findOne({ name: username }, function (err, usuario) {
        if (err) return res.status(500).send({ message: "Error" });

        if (!usuario) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ usuario });
    });
});


router.post("/cancelarAlquiler", (req, res) => {

    alquiler = req.body;
    id_f = req.body._id;

    let estado = "Cancelado";

    if (req.body.estado != "Cancelado") {
        MisAlquileres.findOneAndUpdate(
            { _id: id_f },
            {
                estado: estado,
            }, { useFindAndModify: false },
            function (err, alquiler) {
                if (err)
                    return res.status(500).send({ message: "Error" });
                else {
                    return res.status(200).send({ alquiler });

                }

            }
        );
    }
    else
        return res.status(500).send({ message: "Error" });

});

//Reclamo

router.post("/cancelar-alquiler", (req, res) => {
    reclamoData = req.body;
    let reclamos = new Reclamo(reclamoData);
    reclamos.save((error) => {
        if (error) {
            res.status(401).send("error");
        } else {
            res.status(200).send(true);
        }
    });
});

router.get("/get-all-reclamos", function (req, res) {
    Reclamo.find(function (err, reclamos) {
        if (err) return res.status(500).send({ message: "Error" });

        if (!reclamos)
            return res.status(404).send({ message: "No hay reclamos" });
        return res.status(200).send({ reclamos });
    });
});


/* PARA ENVIO DE MAILS */
function enviarEmailAUsuario(
    username,
    asunto,
    titulo,
    mensaje,
    url,
    mensajeBoton
) {
    console.log(username)
    variable = {};
    User.findOne({ name: username }, function (err, usuario) {
        console.log(usuario);
        enviar(usuario.email, asunto, titulo, mensaje, url, mensajeBoton);
    });
}

function enviar(
    email_destinatario,
    asunto,
    titulo,
    mensaje,
    url,
    mensajeBoton
) {
    transporter.sendMail({
        from: "one.use.pf@gmail.com",
        to: email_destinatario,
        subject: asunto,
        html:
            `
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="utf-8">
                        <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
                    </head>

                    <body>
                    <section style="background-color: #4a70af;">
                    <div style="text-align: center;">
                      <img style="padding-top:20px;width: 150px; height: 100px;margin-bottom: 20px;" src="http://oneuseprimerdeploy.s3-website-sa-east-1.amazonaws.com/assets/images/E3.png">
                    </div>
                  
                    <section style="width: 65%;height: 100%;background-color: white;box-sizing: border-box;padding: 5px; text-align:justify; padding-bottom:10px; margin:0 auto">
                  
                      <h1 style="text-align:center !important">` +
            titulo +
            `</h1>
                     
                      <p>` +
            mensaje +
            `</p>
                  
                      <div style="text-align:center !important;">
                        <a style="
                                              line-height: 40px;
                                              padding: 0 40px;
                                              border-radius: 20px;
                                              background: transparent;
                                              border: 1px solid #ffd60f;
                                              display: inline-block;
                                              font-weight: 450;
                                              -webkit-transition: all 0.3s ease 0s;
                                              -moz-transition: all 0.3s ease 0s;
                                              -o-transition: all 0.3s ease 0s;
                                              transition: all 0.3s ease 0s;
                                              cursor: pointer;
                                              outline: none;
                                              margin-top: 20px;
                                              margin-bottom: 20px;
                                              margin-left: 14px;
                                              background: #4a70af;
                                              text-decoration: none;
                                              color: #fff;
                                              box-shadow: 0px 10px 20px 0px rgba(60, 64, 143, 0.2);
                                              " href="` +
            url +
            `">` +
            mensajeBoton +
            `</a>
                      </div>
                      
                      <br>
                      <p>
                        Gracias por elegirnos todos los días.
                      </p>
                  
                      <p style="font-style: italic">
                        El equipo de OneUse
                      </p>
                  
                    </section>
                    <br><br><br>
                  </section>
                  
                    </body>
                    </html>
                    `,
    });
}
module.exports = router;

/* -------------------- ESTADISTICAS --------------------------- */
router.post("/visitas-publicaciones/:id_publicacion", function (req, res) {
    var id_publicacion = req.params.id_publicacion;
    var fecha_actual = moment(new Date()).format("MM/DD/YYYY");
    var objeto;

    VisitaPublicaciones.find(
        { id_publicacion: id_publicacion, fecha_visita: fecha_actual },
        function (err, res2) {
            if (res2.length < 1) {
                objeto = {
                    id_publicacion: id_publicacion,
                    fecha_visita: fecha_actual,
                    cantidadVisitas: 1,
                };
                var visita = new VisitaPublicaciones(objeto);
                visita.save((error) => {
                    if (error) {
                        res.status(500).send("Error");
                    } else {
                        res.status(200).send({ objeto });
                    }
                });
            } else {
                objeto = {
                    id_publicacion: id_publicacion,
                    fecha_visita: fecha_actual,
                    cantidadVisitas: res2[0].cantidadVisitas + 1,
                };
                VisitaPublicaciones.findByIdAndUpdate(res2[0]._id, objeto, function (
                    err,
                    doc
                ) {
                    return res.status(200).send({ doc });
                });
            }
        }
    );
});

router.get("/get-visitas-publicacion/:id_publicacion", function (req, res) {
    var id = req.params.id_publicacion;
    VisitaPublicaciones.find({ id_publicacion: id }, function (err, doc) {
        if (err) return res.status(500).send({ message: "Error" });

        if (!doc) return res.status(404).send({ message: "El doc no existe" });

        return res.status(200).send({ doc });
    });
});

router.get("/get-publicaciones-x-categoria", function (req, res) {
    Publicacion.find({}, function (err, publicacion) {
        return res.status(200).send(publicacion);
    });
});

router.get("/get-alquileres-x-categoria", function (req, res) {
    for (let index = 0; index < res.length; index++) {
        MisAlquileres.find({}, function (err, alquiler) {
            const element = alquiler[index];
            Publicacion.find({ _id: element.id_publicacion }, function (req, res2) {
                asd(res2)
            })
        })
    }
    return res.status(200).send(arreglo);
})

var arreglo = [];

function asd(p) {
    arreglo.push(p);
    console.log(arreglo.length)
}

/* -------------------- MERCADO PAGO --------------------------- */

router.post("/pago-tarjeta-mp", function (req, res) {
    /*
    var payment_data = {
        transaction_amount: 105,
        token: 'ff8080814c11e237014c1ff593b57b4d'
        description: 'Fantastic Marble Bag',
        installments: 1,
        payment_method_id: 'visa',
        payer: {
            email: 'test@test.com'
        }
    };
    */
    let payment_data = req.body;

    mercadopago.payment.save(payment_data).then(function (data) {
        //console.log(data);
        return res.status(200).send(data)
    }).catch(function (error) {
        //console.log(error);
        return res.status(500).send(error)
    });
})

router.post("/mp-webhook", function (req, res) {
    console.log(res);
    return res.status(200).send("ok");
})
