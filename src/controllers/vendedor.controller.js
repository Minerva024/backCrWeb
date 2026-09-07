const Vendedor = require('../models/vendedor.model');

exports.login = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.loginvendedor(body, function (err, vendedor) {
            if (err)
                res.send(err);
            res.json(vendedor);
        })
    }
}

exports.listarclientes = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarclientesvendedor(body["slpcode"], function (err, clientes) {
            if (err)
                res.send(err);
            res.json(clientes);
        })
    }
}

exports.listarproductos = function (req, res) {
    Vendedor.listarproductos(function (err, productos) {
        if (err)
            res.send(err);
        res.json(productos);
    })
}

exports.listarvendedores = function (req, res) {
    Vendedor.listarvendedores(function (err, vendedores) {
        if (err)
            res.send(err);
        res.json(vendedores);
    })
}

exports.obtenerproducto = function (req, res) {
    let aux = req.body;
    console.log(aux);
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.obtenerproducto(aux["ItemCode"], function (err, result) {
            if (err)
                res.send(err);
            res.json(result);
        })
    }
}

exports.obtenerimportacionesproducto = function (req, res) {
    let aux = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.obtenerimportacionesproducto(aux["ItemCode"], function (err, result) {
            if (err)
                res.send(err);
            res.json(result);
        })
    }
}

exports.ingresarofertventa = function (req, res) {
    let ofertaventa = req.body;
    console.log(req);

    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.ingresareoferta(ofertaventa, function (err, result) {
            res.json(result);
        })
    }
}

exports.ingresarcotizacion = function (req, res) {
    let ofertaventa = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.ingresarcotizacion(ofertaventa, function (err, result) {
            res.json(result);
        })
    }
}

exports.obtenercliente = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.obtenercliente(body["CardCode"], function (err, vendedor) {
            if (err)
                res.send(err);
            res.json(vendedor);
        })
    }
}

exports.obtenercartera = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.obtenercartera(body["CardCode"], function (err, cartera) {
            if (err)
                res.send(err);
            res.json(cartera);
        })
    }
}

exports.productoxcliente = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.obtenerproductosxcliente(body["CardCode"], function (err, productos) {
            if (err)
                res.send(err);
            res.json(productos);
        })
    }
}

exports.comprasxproductoxcliente = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.obtenerultimascomprasproductocliente(body, function (err, productos) {
            if (err)
                res.send(err);
            res.json(productos);
        })
    }
}

exports.obtenerpagoscliente = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarpagosrecibidos(body["CardCode"], function (err, pagos) {
            if (err)
                res.send(err);
            res.json(pagos);
        })
    }
}

exports.obtenerventas = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.obtenerventas(body["SlpCode"], function (err, cartera) {
            if (err)
                res.send(err);
            res.json(cartera);
        })
    }
}

//Controller para obtencion de los datos para generar una visita
exports.obtenerinforacionparavisita = function(req, res){
    Vendedor.obtenerinformacionreunion(function (err, respuesta){
        if (err)
            res.send(err);
        res.status(200).send(respuesta)
    });
}

/*
Controlador para ingresar una visita se tienen dos controladores para una visita de la v1 
y un sengundo controlador para el ingreso de la visita
con tipo reunion y tipo de asunto de reunion cambios solicitador por PDR 
*/
exports.ingresarvisita = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.agendarvisita(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}
exports.ingresarvisitan = function (req, res) {
    const body = req.body;    
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.agendarvisitan(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}
/******************************************************************************************** */
exports.ingresarubicacionvisita = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.agregarubicacionvisita(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.listarvisitas = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarvisitas(body, function (err, respuesta) {
            if (err)
                res.send(err);
            console.log(respuesta[0]);

            if (respuesta[0].length != 0) {
                res.json(respuesta[0]);
            } else {
                res.json([]);
            }
        })
    }
}

exports.agregarcomentario = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.agregarcomentario(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.agregardetallereunion = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.agregardetallereunion(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.listarcomentarios = function (req, res) {
    const body = req.body;
    console.log(body);
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarcomentarios(body["idevento"], function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.eliminarvisita = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.eliminarvisita(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}
/*
Contronladores para el listar las visitas de un cliente
Se encuentra sin valores en los campos de idtiporeunion y idasuntoreunion, etc
Y la nueva forma con esos nuevos campos.
 */
exports.listarvisitasxvendedorxcliente = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarvisitasxclientexvendedor(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.listarvisitasxvendedorxclienten = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarvisitasxclientexvendedorn(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.listarvisitasxvendedorxclienten = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarvisitasxclientexvendedorn(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.listarofertasventa = function (req, res) {
    const body = req.body;
    console.log(body);
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarofertasventa(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.listaritemsofertasventa = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listaritemsofertaventa(body["idofertaventa"], function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.informeuso = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.informeuosapp(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.ingresoleadferia = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.ingresarleadferia(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.listarcotizaciones = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarcotizaciones(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.obtenerpdfcotizacion = function (req, res) {
    const body = req.body;
    let idcotizacion = body['idcotizacion'];
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.generarcotizacion(idcotizacion, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}

exports.obtenerpedidosstatusautorizacion = function (req, res) {
    const body = req.body;
    let slpcode = body['SlpCode'];
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarpedidosstatusautorizacion(slpcode, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}
//Controller para rechazar una cotizacion.
exports.rechazarcotizacion = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.rechazarcotizacion(body, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}
//Controller para aceptar una cotizacion.
exports.aceptarcotizacion = function (req, res) {
    const body = req.body;
    let idcotizacion = body["idcotizacion"];
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.aprobarcotizacion(idcotizacion, function (err, respuesta) {
            if (err)
                res.send(err);
            res.json(respuesta);
        })
    }
}
//Controller para listar ventas x mes x vendedor.
exports.listaventasxmesxvendedor = function (req, res) {

    Vendedor.listarventaspormesesxvendedor(function (err, respuesta) {
        if (err)
            res.send(err);
        res.json(respuesta);
    })
}

//Controller para listar ventas x mes x vendedor.
exports.obtenerpresupuestos = function (req, res) {

    Vendedor.obtenerpresupuestos(function (err, respuesta) {
        if (err)
            res.send(err);
        res.json(respuesta);
    })
}

//Controller para proceso almacenado.
exports.procesoalmacenado = function (req, res) {
    Vendedor.procesoalmacenado(function (err, respuesta) {
        if (err)
            res.send(err);
        res.json(respuesta);
    })
}

//Controller para listar las muestras con estado
exports.obtenerlibroslegales = function (req, res) {
    try {
        //LLamo al metodo del modelo y lo ejecuto.
        Vendedor.libroslegales(req, function (err, respuesta) {
            if (err) {
                console.error("Error al ingresar producto:", err);
                return res.status(500).json({
                    error: true,
                    message: "Error interno del servidor"
                });
            }
            return res.status(200).json({
                error: false,
                data: respuesta
            });
        });
    } catch (error) {
        console.error("Error inesperado:", error);
        return res.status(500).json({
            error: true,
            message: "Error inesperado del servidor"
        });
    }
}

//Controller para listar las muestras con estado
exports.obtenerlibroslegalescrismo = function (req, res) {
    try {
        //LLamo al metodo del modelo y lo ejecuto.
        Vendedor.libroslegalescrismo(req, function (err, respuesta) {
            if (err) {
                console.error("Error al ingresar producto:", err);
                return res.status(500).json({
                    error: true,
                    message: "Error interno del servidor"
                });
            }
            return res.status(200).json({
                error: false,
                data: respuesta
            });
        });
    } catch (error) {
        console.error("Error inesperado:", error);
        return res.status(500).json({
            error: true,
            message: "Error inesperado del servidor"
        });
    }
}