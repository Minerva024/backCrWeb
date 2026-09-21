const muestras = require('../models/muestras.model');

//Controller para realizar el ingreso de un producto.
exports.ingresarproducto = function (req, res) {
    try {
        const aux = req.body;

        //Valido si el body de la peticion esta vacio.
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({
                error: true,
                message: "El cuerpo de la solicitud está vacío."
            });
        }
        //Valido que los campos se encuentren dentro del body
        if (!aux.nombreproducto || !aux.idcategoriasap) {
            return res.status(400).json({
                error: true,
                message: "Faltan campos obligatorios."
            });
        }
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.ingresoproducto(aux, function (err, respuesta) {
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

//Controller para obtener el listado de las categorias de SAP.
exports.obtenercategoriasproductossap = function (req, res) {
    try {
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.obtenergruposproductos(req, function (err, respuesta) {
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
        console.log(error);

        return res.status(500).json({
            error: true,
            message: "Error inesperado del servidor"
        });
    }
}

//Controller para realizar el ingreso de un proveedor.
exports.ingresarproveedor = function (req, res) {
    try {
        const aux = req.body;

        //Valido si el body de la peticion esta vacio.
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({
                error: true,
                message: "El cuerpo de la solicitud está vacío."
            });
        }
        console.log(aux.nombre);

        //Valido que los campos se encuentren dentro del body
        if (!aux.nombre) {
            return res.status(400).json({
                error: true,
                message: "Faltan campos obligatorios."
            });
        }
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.ingresoproveedor(aux, function (err, respuesta) {
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

//Controller para obtener el listado de los proveedores.
exports.obtenerproveedores = function (req, res) {
    try {
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.listarProveedores(req, function (err, respuesta) {
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
        console.log(error);

        return res.status(500).json({
            error: true,
            message: "Error inesperado del servidor"
        });
    }
}

//Controller para realizar el ingreso de una muestra por parte del departamento de compras.
exports.ingresarmuestra = function (req, res) {
    try {
        const aux = req.body;

        //Valido si el body de la peticion esta vacio.
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({
                error: true,
                message: "El cuerpo de la solicitud está vacío."
            });
        }

        // Validación de fraccionamiento obligatorio
        if (aux.fraccionar === 'SI' && (!aux.comentario_fraccionar || !aux.comentario_fraccionar.trim())) {
            return res.status(400).json({
                error: true,
                message: "El comentario de fraccionamiento es obligatorio cuando la muestra se marca para fraccionar."
            });
        }

        //LLamo al metodo del modelo y lo ejecuto.
        muestras.registrarmuestra(aux, function (err, respuesta) {
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

//Controller para realizar el ingreso de un proveedor.
exports.ingresarlotemuestra = function (req, res) {
    try {
        const aux = req.body;

        //Valido si el body de la peticion esta vacio.
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({
                error: true,
                message: "El cuerpo de la solicitud está vacío."
            });
        }
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.ingresolotemuestra(aux, function (err, respuesta) {
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

//Controller para listar las muestras que requieren ubicacion y tipo de empaque.
exports.listarmuestrasubicacion = function (req, res) {
    try {
        const aux = req.body;
        //Valido si el body de la peticion esta vacio.
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({
                error: true,
                message: "El cuerpo de la solicitud está vacío."
            });
        }
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.listarmuestrasubicar(aux, function (err, respuesta) {
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

//Controller para actualizar la informacion de los lotes de muestras y de ingresar la cantidad al inventario.
exports.actualizarinfoempaqueubicacion = function (req, res) {
    try {
        const aux = req.body;
        //Valido si el body de la peticion esta vacio.
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({
                error: true,
                message: "El cuerpo de la solicitud está vacío."
            });
        }
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.actualizarinformacionmuestralote(aux, function (err, respuesta) {
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

//Controller para obtener todos los datos para el formulario de solicitar muestras
exports.datosformulariosolicitudmuestras = function (req, res) {
    try {
        const aux = req.body;
        //Valido si el body de la peticion esta vacio.
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({
                error: true,
                message: "El cuerpo de la solicitud está vacío."
            });
        }
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.listardatossolicitudmuestras(aux, function (err, respuesta) {
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

//Controller para realizar el ingreso de las solicitudes de muestras.
exports.ingresarsolicitudesdemuestras = function (req, res) {
    try {
        const aux = req.body;
        //Valido si el body de la peticion esta vacio.
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({
                error: true,
                message: "El cuerpo de la solicitud está vacío."
            });
        }
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.ingresarsolicitudesmuestras(aux, function (err, respuesta) {
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

//Controller para obtener el listado de las muestras x estado
exports.listarsolicitudesmuestrasxestado = function (req, res) {
    try {
        const aux = req.body;
        //Valido si el body de la peticion esta vacio.
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({
                error: true,
                message: "El cuerpo de la solicitud está vacío."
            });
        }
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.listarsolicitudesdemuestrasxestado(aux, function (err, respuesta) {
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

//Controllor para obtener el stock del producto de la muestra.
exports.obtenerstocksproducto = function (req, res) {
    try {
        const aux = req.body;
        //Valido si el body de la peticion esta vacio.
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({
                error: true,
                message: "El cuerpo de la solicitud está vacío."
            });
        }
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.obtenerdatosstockproductos(aux, function (err, respuesta) {
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
//Controller para realizar la aprobacion o rechazo de un muestra.
exports.aprobacionrechazomuestra = function (req, res) {
    try {
        const aux = req.body;
        //Valido si el body de la peticion esta vacio.
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({
                error: true,
                message: "El cuerpo de la solicitud está vacío."
            });
        }
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.aprobarrecharsolicitudmuestra(aux, function (err, respuesta) {
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

//controller para obtener las solicitudes de muestras para preparar.
exports.listadomuestraspreparar = function (req, res) {
    try {
        const aux = req.body;
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.listarsolicitudesapreparar(aux, function (err, respuesta) {
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

//controller para registrar la salida del stock de la muestra.
exports.prepararmuestra = function (req, res) {
    try {
        const aux = req.body;
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.registrarsalidastock(aux, function (err, respuesta) {
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

//Controller para despachar una muestra
exports.despacharmuestra = function (req, res) {
    try {
        const aux = req.body;
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.despacharmuestra(aux, function (err, respuesta) {
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
exports.listarmuestrasconestado = function (req, res) {
    try {
        const aux = req.body;
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.listarmuestrasconestado(aux, function (err, respuesta) {
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
exports.obtenerlistadostockmuestras = function (req, res) {
    try {
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.listarstockmuestras(req, function (err, respuesta) {
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

//Controller para obtener el roadmap de la solicitud de muestra
exports.obtenerroadmapsolicitud = function (req, res) {
    try {
        const aux = req.body;
        console.log(aux);
        
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.obtenerroadmap(aux.idsolicitudmuestra, function (err, respuesta) {
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

//Controller para obtener el roadmap de la solicitud de muestra
exports.listarmuestrasdespachadas = function (req, res) {
    try {
        const aux = req.body;
        console.log(aux);
        
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.listarmuestrasdespachadasbodega(aux.ciudad, function (err, respuesta) {
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

//Controller para actualizar el estado de la solicitud de muestra
exports.actualizarestadomuestra = function (req, res) {
    try {
        const aux = req.body;
        console.log(aux);
        
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.cambiarestadomuestra(aux, function (err, respuesta) {
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

//Controller para actualizar el estado de la solicitud de muestra
exports.listarmuestrasfacturacion = function (req, res) {
    try {
        const aux = req.body;
        console.log(aux);
        
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.listarmuestrasfacturacion(aux.ciudad, function (err, respuesta) {
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

//Controller para ingresar el pedido de una muestra
exports.ingresarpedido = function (req, res) {
    try {
        const aux = req.body;
        console.log(aux);
        
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.ingresarpedido(aux, function (err, respuesta) {
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

//Controller para ingresar el pedido de una muestra
exports.listarproductosmillares = function (req, res) {
    try {
        
        //LLamo al metodo del modelo y lo ejecuto.
        muestras.listarproductosmillares(function (err, respuesta) {
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

// Controller para obtener los datos de una muestra por ID para modo edición
exports.obtenermuestraxid = function (req, res) {
    try {
        const id = req.params.id || req.body?.id || req.body?.idmm_muestra;
        if (!id) {
            return res.status(400).json({
                error: true,
                message: "ID de muestra no proporcionado"
            });
        }
        muestras.obtenermuestraxid(id, function (err, respuesta) {
            if (err) {
                console.error("Error al obtener muestra por id:", err);
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

// Controller para actualizar una muestra (PUT/PATCH)
exports.actualizarmuestra = function (req, res) {
    try {
        const id = req.params.id || req.body?.id || req.body?.idmm_muestra;
        const aux = req.body;
        console.log("➡️ [BACKEND] Petición actualizarmuestra recibida para ID:", id);
        console.log("📦 [BACKEND] Payload recibido:", JSON.stringify(aux));
        if (!id) {
            return res.status(400).json({
                error: true,
                message: "ID de muestra no proporcionado"
            });
        }

        // Validación de fraccionamiento obligatorio
        if (aux.fraccionar === 'SI' && (!aux.comentario_fraccionar || !aux.comentario_fraccionar.trim())) {
            return res.status(400).json({
                error: true,
                message: "El comentario de fraccionamiento es obligatorio cuando la muestra se marca para fraccionar."
            });
        }

        muestras.actualizarmuestra(id, aux, function (err, respuesta) {
            if (err) {
                console.error("❌ [BACKEND] Error al actualizar muestra:", err);
                return res.status(500).json({
                    error: true,
                    message: "Error interno del servidor"
                });
            }
            console.log("✅ [BACKEND] Muestra actualizada en BD con éxito:", respuesta);
            return res.status(200).json({
                error: false,
                data: respuesta
            });
        });
    } catch (error) {
        console.error("❌ [BACKEND] Error inesperado:", error);
        return res.status(500).json({
            error: true,
            message: "Error inesperado del servidor"
        });
    }
}

// Controller para anular / eliminar lógicamente una muestra
exports.anularmuestra = function (req, res) {
    try {
        const id = req.params.id || req.body?.id || req.body?.idmm_muestra || req.body?.idmuestra;
        const body = req.body || {};
        body.id = id;

        if (!id) {
            return res.status(400).json({
                error: true,
                message: "ID de muestra no proporcionado"
            });
        }

        console.log("➡️ [BACKEND] Petición anularmuestra recibida para ID:", id, body);
        muestras.anularmuestra(body, function (err, respuesta) {
            if (err) {
                console.error("❌ [BACKEND] Error al anular muestra:", err);
                return res.status(500).json({
                    error: true,
                    message: "Error interno del servidor al anular la muestra"
                });
            }
            return res.status(200).json({
                error: false,
                data: respuesta
            });
        });
    } catch (error) {
        console.error("❌ [BACKEND] Error inesperado en anularmuestra:", error);
        return res.status(500).json({
            error: true,
            message: "Error inesperado del servidor"
        });
    }
}

// Controller para eliminar un producto de CRM según regla 1: solo si no pertenece a mm_muestra
exports.eliminarproductocrm = function (req, res) {
    try {
        const id = req.params.id || req.body?.id || req.body?.idproductocrm;
        const body = req.body || {};
        body.idproductocrm = id;

        if (!id) {
            return res.status(400).json({
                error: true,
                message: "ID de producto CRM no proporcionado"
            });
        }

        console.log("➡️ [BACKEND] Petición eliminarproductocrm recibida para ID:", id, body);
        muestras.eliminarproductocrm(body, function (err, respuesta) {
            if (err) {
                console.error("❌ [BACKEND] Error al eliminar producto CRM:", err);
                return res.status(500).json({
                    error: true,
                    message: "Error interno del servidor al eliminar el producto CRM"
                });
            }
            return res.status(200).json({
                error: false,
                data: respuesta
            });
        });
    } catch (error) {
        console.error("❌ [BACKEND] Error inesperado en eliminarproductocrm:", error);
        return res.status(500).json({
            error: true,
            message: "Error inesperado del servidor"
        });
    }
};

// Controller para listar productos CRM con conteo de muestras
exports.listarproductoscrmcompleto = function (req, res) {
    try {
        muestras.listarproductoscrmcompleto(function (err, productos) {
            if (err) {
                console.error("❌ [BACKEND] Error en listarproductoscrmcompleto:", err);
                return res.status(500).json({ error: true, message: err.sqlMessage || err.message || "Error al listar productos CRM" });
            }
            return res.status(200).json({ error: false, data: productos });
        });
    } catch (error) {
        console.error("❌ [BACKEND] Error inesperado:", error);
        return res.status(500).json({ error: true, message: error.message || "Error inesperado del servidor" });
    }
};

// Controller para actualizar un producto CRM
exports.actualizarproductocrm = function (req, res) {
    try {
        const id = req.params.id || req.body?.id || req.body?.idproductocrm;
        const body = req.body || {};
        muestras.actualizarproductocrm(id, body, function (err, respuesta) {
            if (err) {
                console.error("❌ [BACKEND] Error en actualizarproductocrm:", err);
                return res.status(500).json({ error: true, message: err.sqlMessage || err.message || "Error al actualizar producto CRM" });
            }
            return res.status(200).json({ error: false, data: respuesta });
        });
    } catch (error) {
        console.error("❌ [BACKEND] Error inesperado:", error);
        return res.status(500).json({ error: true, message: error.message || "Error inesperado del servidor" });
    }
};

// Controller para listar proveedores CRM con conteo de muestras
exports.listarproveedorescrmcompleto = function (req, res) {
    try {
        muestras.listarproveedorescrmcompleto(function (err, proveedores) {
            if (err) {
                console.error("❌ [BACKEND] Error en listarproveedorescrmcompleto:", err);
                return res.status(500).json({ error: true, message: err.sqlMessage || err.message || "Error al listar proveedores CRM" });
            }
            return res.status(200).json({ error: false, data: proveedores });
        });
    } catch (error) {
        console.error("❌ [BACKEND] Error inesperado:", error);
        return res.status(500).json({ error: true, message: error.message || "Error inesperado del servidor" });
    }
};

// Controller para actualizar un proveedor CRM
exports.actualizarproveedorcrm = function (req, res) {
    try {
        const id = req.params.id || req.body?.id || req.body?.idmm_proveedor;
        const body = req.body || {};
        muestras.actualizarproveedorcrm(id, body, function (err, respuesta) {
            if (err) {
                console.error("❌ [BACKEND] Error en actualizarproveedorcrm:", err);
                return res.status(500).json({ error: true, message: err.sqlMessage || err.message || "Error al actualizar proveedor CRM" });
            }
            return res.status(200).json({ error: false, data: respuesta });
        });
    } catch (error) {
        console.error("❌ [BACKEND] Error inesperado:", error);
        return res.status(500).json({ error: true, message: error.message || "Error inesperado del servidor" });
    }
};

// Controller para inactivar un proveedor CRM con motivo
exports.inactivarproveedorcrm = function (req, res) {
    try {
        const id = req.params.id || req.body?.id || req.body?.idmm_proveedor;
        const body = req.body || {};
        body.idmm_proveedor = id;

        muestras.inactivarproveedorcrm(body, function (err, respuesta) {
            if (err) {
                console.error("❌ [BACKEND] Error en inactivarproveedorcrm:", err);
                return res.status(500).json({ error: true, message: err.sqlMessage || err.message || "Error al inactivar proveedor CRM" });
            }
            return res.status(200).json({ error: false, data: respuesta });
        });
    } catch (error) {
        console.error("❌ [BACKEND] Error inesperado:", error);
        return res.status(500).json({ error: true, message: error.message || "Error inesperado del servidor" });
    }
};

// Controller para reactivar un proveedor CRM con motivo
exports.reactivarproveedorcrm = function (req, res) {
    try {
        const id = req.params.id || req.body?.id || req.body?.idmm_proveedor;
        const body = req.body || {};
        body.idmm_proveedor = id;

        muestras.reactivarproveedorcrm(body, function (err, respuesta) {
            if (err) {
                console.error("❌ [BACKEND] Error en reactivarproveedorcrm:", err);
                return res.status(500).json({ error: true, message: err.sqlMessage || err.message || "Error al reactivar proveedor CRM" });
            }
            return res.status(200).json({ error: false, data: respuesta });
        });
    } catch (error) {
        console.error("❌ [BACKEND] Error inesperado:", error);
        return res.status(500).json({ error: true, message: error.message || "Error inesperado del servidor" });
    }
};

// Controller para eliminar un proveedor CRM
exports.eliminarproveedorcrm = function (req, res) {
    try {
        const id = req.params.id || req.body?.id || req.body?.idmm_proveedor;
        const body = req.body || {};
        body.idmm_proveedor = id;

        muestras.eliminarproveedorcrm(body, function (err, respuesta) {
            if (err) {
                console.error("❌ [BACKEND] Error en eliminarproveedorcrm:", err);
                return res.status(500).json({ error: true, message: err.sqlMessage || err.message || "Error al eliminar proveedor CRM" });
            }
            return res.status(200).json({ error: false, data: respuesta });
        });
    } catch (error) {
        console.error("❌ [BACKEND] Error inesperado:", error);
        return res.status(500).json({ error: true, message: error.message || "Error inesperado del servidor" });
    }
};

// Controller para obtener detalle completo de un producto CRM (lotes, proveedores, fechas, stock)
exports.obtenerDetalleProductoCRM = function (req, res) {
    try {
        const id = req.params.id || req.body?.id || req.body?.idproductocrm;
        if (!id) {
            return res.status(400).json({ error: true, message: "ID de producto CRM es requerido" });
        }

        muestras.obtenerDetalleProductoCRM(id, function (err, detalle) {
            if (err) {
                console.error("❌ [BACKEND] Error en obtenerDetalleProductoCRM:", err);
                return res.status(500).json({ error: true, message: err.sqlMessage || err.message || "Error al obtener detalle del producto CRM" });
            }
            return res.status(200).json({ error: false, data: detalle });
        });
    } catch (error) {
        console.error("❌ [BACKEND] Error inesperado:", error);
        return res.status(500).json({ error: true, message: error.message || "Error inesperado del servidor" });
    }
};exports.recibirtransferencia = function (req, res) {
    try {
        const aux = req.body;
        if (!aux || Object.keys(aux).length === 0) {
            return res.status(400).json({ error: true, message: "El cuerpo de la solicitud est� vac�o." });
        }
        muestras.recibirtransferencia(aux, function (err, respuesta) {
            if (err) return res.status(500).json({ error: true, message: "Error interno del servidor" });
            return res.status(200).json({ error: false, data: respuesta });
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Error en el servidor" });
    }
};

exports.obtenerdetallesolicitud = function (req, res) {
    muestras.obtenerdetallesolicitud(req.params.id, function (err, data) {
        if (err) return res.status(500).send(err);
        res.status(200).send({ data: data });
    });
};
