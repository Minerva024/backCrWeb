const Crm = require('../models/crm.model');


//Controller para el login de usuarios.
exports.loginusuario = function (req, res) {
    let aux = req.body;
    if (req.body.contrctor == Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.loginusuario(aux, function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controller para proceso almacenado.
exports.procesoalmacenado = function (req, res) {
    Crm.procesoalmacenado(function (err, respuesta) {
        if (err)
            res.send(err);
        res.json(respuesta);
    })
}
//Controller para la obtencion de los datos para la creación de un cliente.
exports.obtenciondatoscreacioncliente = function (req, res) {
    Crm.obtenciondatoscreacioncliente(function (err, respuesta) {
        if (err)
            res.send(err);
        res.json(respuesta);
    })
}
//Controller para la obtencion de los territorios de SAP.
exports.obtencionterritoriossap = function (req, res) {
    Crm.obtencionterritorios(function (err, respuesta) {
        if (err)
            res.send(err);
        res.json(respuesta);
    })
}
//Controller para la obtencion de las industrias de SAP.
exports.obtencionindustriassap = function (req, res) {
    Crm.obtencionindustriasap(function (err, respuesta) {
        if (err)
            res.send(err);
        res.json(respuesta);
    })
}
//Controller para la obtencion de las industrias de SAP.
exports.obtenciongrupossap = function (req, res) {
    Crm.obtenciongruposclientes(function (err, respuesta) {
        if (err)
            res.send(err);
        res.json(respuesta);
    })
}
//Controller para la obtencion de los tipos de personas de contacto.
exports.obtenciontipospersonascontactosap = function (req, res) {
    Crm.obtenciontipopersonascontacto(function (err, respuesta) {
        if (err)
            res.send(err);
        res.json(respuesta);
    })
}
//Controller para realizar el registro de un cliente en SAP.
exports.ingresarclientesap = function (req, res) {
    let auxcliente = req.body;
    if (req.body.contrctor == Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.registrarclientesap(auxcliente, function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controller para realizar el registro de la documentacion de un cliente en SAP.
exports.registrardocumentacionsap = function (req, res) {
    let auxcliente = req.body;
    if (req.body.contrctor == Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.registrardocumentacion(auxcliente, function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controller para obtener los clientes de SAP para la documentación.
exports.listarclientescondocumentacionsap = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.listarclientescondocumentacion(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controller para almacenar la informacion documental de los clientes.
exports.ingresaractualizardocumentacion = function (req, res) {
    let auxdocumentacion = req.body;
    if (req.body.contrctor == Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.ingresaractualizardocumentacion(auxdocumentacion, function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controlador para obtener la documentacion de un cliente.
exports.obtnerdocumentacioncliente = function (req, res) {
    let json = req.body;
    console.log(json);

    if (req.body.contrctor == Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.obtenerdocumentacioncliente(json['cardcode'], function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controlador para obtener al cliente
exports.obtenerclientesap = function (req, res) {
    let json = req.body;
    if (req.body.contrctor == Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.obtenercliente(json['cardcode'], function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controller para obtener los permisos del banner de cada usuario.
exports.obtenerpermisos = function (req, res) {
    let json = req.body;
    console.log(json);

    if (req.body.contrctor == Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.obtenerpermisos(json['cedula'], function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controller para obtener el historial de compra de los productos por cliente.
exports.obtenerhistorialcompraproductos = function (req, res) {
    let json = req.body;
    console.log(json);

    if (req.body.contrctor == Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.obtenerhistorialcompraproducto(json, function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controller para obtener los presupuestos y ventas de los vendedores.
exports.obtenerpresupuestosventas = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.obtenerventasypresupuestos(body, function (err, cartera) {
            if (err)
                res.send(err);
            res.json(cartera);
        })
    }
}

//Controller para obtener la factura en base 64 pdf.
exports.obtenerfacturabase64 = function (req, res) {
    console.log("Hola");

    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.obtenerfactura(body, function (err, cartera) {
            if (err)
                res.send(err);
            res.json(cartera);
        })
    }
}
//Controller para el login de usuarios.
exports.obtenerotrospagos = function (req, res) {
    let aux = req.body;
    if (req.body.contrctor == Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.obtenerotrospagos(aux["CardCode"], function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Función para listar cotizaciones.
exports.listarcotizacionescrmweb = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.listarcotizacionescrmweb(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}
//Función para listar cotizaciones por cliente.
exports.listarcotizacionesxclientecrmweb = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.listarcotizacionesxclientecrmweb(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}
//Controlar para obtener el pdf de la cotizacion para la web
exports.obtenerpdfcotizacion = function (req, res) {
    const body = req.body;
    let idcotizacion = body['idcotizacion'];
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.generarcotizacionweb(idcotizacion, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

//Controller para realizar el listado de visitas por el año de los vendedores.
exports.listarvisitacalendario = function (req, res) {
    let auxslpcode = req.body;
    console.log(auxslpcode);

    if (req.body.contrctor == Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.listarvisitascalendario(parseInt(auxslpcode['SlpCode']), function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}

//Controller para listar las visitas de los clientes .
exports.listarvisitacalendarioxfechas = function (req, res) {
    let body = req.body;
    //console.log(auxslpcode);

    if (req.body.contrctor == Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.listarvisitascalendarioxfecha(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controller para obtener los leads de SAP para la documentación.
exports.listarleads = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.listarleads(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}

//Controller para actualizar un cliente.
exports.actualizarclientesap = function (req, res) {
    const body = req.body;

    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.actualizarclientesap(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controller para la obtencion del producto con los datos de la ultima compra del cliente.
exports.obtenerinformacionproducto = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Crm.obtenerproducto(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.status(200).send(respuesta)
        });
    }
}
//Controller para la obtencion de los productos con los lotes
exports.obtenerproductosconlotes = function (req, res) {
    Crm.obtenerproductosconlote(function (err, respuesta) {
        if (err)
            res.send(err);
        res.status(200).send(respuesta)
    });
}

//Controller para obtencion de los datos para generar una visita
exports.obtenerinforacionparavisita = function(req, res){
    Crm.obtenerinformacionreunion(function (err, respuesta){
        if (err)
            res.send(err);
        res.status(200).send(respuesta)
    });
}