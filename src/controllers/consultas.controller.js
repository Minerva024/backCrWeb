const consultas = require('../models/consultas.model');

//Controller para obtencion de los consulta para DCH
exports.consultadeinfocrm = function (req, res) {
    try {
        //LLamo al metodo del modelo y lo ejecuto.
       consultas.consultareporteDCH(function (err, respuesta) {
            if (err) {
                console.error("Error al realizar la consulta:", err);
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