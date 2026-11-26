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

// --- Control anti-duplicados por ráfagas de clics (Debounce / Idempotencia en memoria) ---
const peticionesActivas = new Map();

function ejecutarConAntiDuplicado(key, accionFn, ttlMs, callback) {
    if (!key) {
        return accionFn(callback);
    }

    const ahora = Date.now();
    const existente = peticionesActivas.get(key);

    if (existente) {
        // Caso 1: La petición todavía está ejecutándose en la base de datos
        if (existente.status === 'PENDING') {
            console.log(`[ANTI-DUPLICADO] Ráfaga concurrente bloqueada para: ${key}. Esperando resultado en curso.`);
            existente.waiters.push(callback);
            return;
        }

        // Caso 2: Terminó hace menos de ttlMs (ej. 15 segundos)
        if (existente.status === 'COMPLETED' && (ahora - existente.timestamp) < ttlMs) {
            console.log(`[ANTI-DUPLICADO] Petición duplicada descartada para: ${key} (dentro de los ${ttlMs / 1000}s). Retornando resultado previo.`);
            return callback(null, existente.result);
        }
    }

    const tracker = {
        status: 'PENDING',
        timestamp: ahora,
        waiters: [callback],
        result: null
    };
    peticionesActivas.set(key, tracker);

    accionFn((err, res) => {
        if (err) {
            peticionesActivas.delete(key);
            tracker.waiters.forEach(cb => cb(err, null));
        } else {
            tracker.status = 'COMPLETED';
            tracker.timestamp = Date.now();
            tracker.result = res;
            tracker.waiters.forEach(cb => cb(null, res));

            setTimeout(() => {
                if (peticionesActivas.get(key) === tracker) {
                    peticionesActivas.delete(key);
                }
            }, ttlMs);
        }
    });
}

exports.ingresarofertventa = function (req, res) {
    let ofertaventa = req.body;
    console.log(req);

    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        const key = (ofertaventa.SlpCode && ofertaventa.CardCode)
            ? `oferta_${ofertaventa.SlpCode}_${ofertaventa.CardCode}`
            : null;

        ejecutarConAntiDuplicado(key, (cb) => {
            Vendedor.ingresareoferta(ofertaventa, cb);
        }, 15000, function (err, result) {
            if (err)
                res.send(err);
            res.json(result);
        });
    }
}

exports.ingresarcotizacion = function (req, res) {
    let ofertaventa = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        const key = (ofertaventa.SlpCode && ofertaventa.CardCode)
            ? `cotizacion_${ofertaventa.SlpCode}_${ofertaventa.CardCode}`
            : null;

        ejecutarConAntiDuplicado(key, (cb) => {
            Vendedor.ingresarcotizacion(ofertaventa, cb);
        }, 15000, function (err, result) {
            if (err)
                res.send(err);
            res.json(result);
        });
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
        return res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarcotizaciones(body, function (err, respuesta) {
            if (err)
                return res.status(500).send(err);
            return res.json(respuesta);
        })
    }
}

exports.obtenerpdfcotizacion = function (req, res) {
    const body = req.body;
    let idcotizacion = body['idcotizacion'];
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        return res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.generarcotizacion(idcotizacion, function (err, respuesta) {
            if (err)
                return res.status(500).send(err);
            return res.json(respuesta);
        })
    }
}

exports.obtenerpedidosstatusautorizacion = function (req, res) {
    const body = req.body;
    let slpcode = body['SlpCode'];
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        return res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.listarpedidosstatusautorizacion(slpcode, function (err, respuesta) {
            if (err)
                return res.status(500).send(err);
            return res.json(respuesta);
        })
    }
}
//Controller para rechazar una cotizacion.
exports.rechazarcotizacion = function (req, res) {
    const body = req.body;
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        return res.status(400).send({ error: true, message: 'Por favor ingrese todos los campos.' });
    } else {
        Vendedor.rechazarcotizacion(body, function (err, respuesta) {
            if (err)
                return res.status(500).send(err);
            return res.json(respuesta);
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

// Obtener versión oficial de la aplicación móvil
exports.obtenerversion = function (req, res) {
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    res.json({
        versionCode: 20261125,
        versionName: "2026.11.25",
        urlApk: `${protocol}://${host}/api/v1/vendedor/descargar-apk`,
        mensaje: "Nueva versión oficial disponible con Biometría, Bodega Gualo y Costo Futuro.",
        obligatorio: false
    });
};

// Descargar archivo APK oficial
const path = require('path');
const fs = require('fs');

exports.descargarApk = function (req, res) {
    // Busca el APK en carpetas estándar tanto en producción como en desarrollo
    const candidateDirs = [
        path.resolve(__dirname, '../../uploads/apk'),
        path.resolve(__dirname, '../../apk'),
        path.resolve(__dirname, '../../'),               // /home/minerva/backcrmweb/
        path.resolve(__dirname, '../../../APKs_Generadas')
    ];

    let apkFile = null;

    // 1. Buscar primero archivos con nombres conocidos en orden de versión descendente
    const prioritizedNames = [
        'MinervaSalesPro-v2026.11.25.apk',
        'MinervaSalesPro-v2026.11.24.apk',
        'MinervaSalesPro.apk',
        'app-release.apk',
        'MinervaSalesPro-v2026.11.18.apk',
        'MinervaSalesPro-v2026.11.18-QA.apk'
    ];

    for (const dir of candidateDirs) {
        if (!fs.existsSync(dir)) continue;
        for (const name of prioritizedNames) {
            const p = path.join(dir, name);
            if (fs.existsSync(p)) {
                apkFile = p;
                break;
            }
        }
        if (apkFile) break;
    }

    // 2. Si no coincide el nombre exacto, toma el archivo .apk que encuentre en alguna de esas carpetas
    if (!apkFile) {
        for (const dir of candidateDirs) {
            if (!fs.existsSync(dir)) continue;
            try {
                const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.apk'));
                if (files.length > 0) {
                    apkFile = path.join(dir, files[0]);
                    break;
                }
            } catch (e) {}
        }
    }

    if (apkFile && fs.existsSync(apkFile)) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        return res.download(apkFile, 'MinervaSalesPro.apk');
    } else {
        return res.status(404).json({ error: true, message: 'Archivo APK no encontrado en el servidor en backCrWeb/uploads/apk/' });
    }
};