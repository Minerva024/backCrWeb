const express = require('express')
const router = express.Router()
const muestrasController = require('../controllers/muestras.controller');
const jwt = require('jsonwebtoken');
const { clavejwtbeartoke } = require('../../config/configvariables');


router.post('/ingresarproductocrm',muestrasController.ingresarproducto); //Ruta para el registro de un producto de CRM
router.post('/ingresarproveedor',muestrasController.ingresarproveedor); //Ruta para el registro de un proveedor de CRM
router.get('/categoriasproductossap',muestrasController.obtenercategoriasproductossap); //Ruta para obtener las categorias de los productos de SAP.
router.get('/listarproveedores',muestrasController.obtenerproveedores); //Ruta para obtener los proveedores de SAP y CRM.
router.post('/ingresarmuestra',muestrasController.ingresarmuestra); //Ruta para ingresar una nueva muestra para ubicacion y seleccionar el tipo de empaque.
router.post('/ingresarmuestralote',muestrasController.ingresarlotemuestra); //Ruta para ingresar una nueva muestra al inventario para ubicacion y seleccionar el tipo de empaque.
router.post('/listarmuestrasubicar',muestrasController.listarmuestrasubicacion); //Ruta para realizar la lista de las muestras a ubicar.
router.post('/guardarinfoubicacionempaques',muestrasController.actualizarinfoempaqueubicacion); //Ruta para actualizar la informacion de los empaques y ubicaciones de las muestra e ingreso de la cantidad al stock.
router.post('/listardatosformulariosolicituddemuestras',muestrasController.datosformulariosolicitudmuestras); //Obtener datos para el formulario de solicitud de muestras.
router.post('/ingresarsolicitudmuestra',muestrasController.ingresarsolicitudesdemuestras); //Ruta para realizar el ingreso de las solicitudes de la muestras.
router.post('/listarsolicitudesmuestrasxestado',muestrasController.listarsolicitudesmuestrasxestado); //Ruta para listar las muestras por el estado en que se encuentran.
router.post('/obtenerstockproducto',muestrasController.obtenerstocksproducto); //ruta para obtener el stock del producto de la muestra.
router.post('/aprobarrechazarmuestra',muestrasController.aprobacionrechazomuestra); //Ruta para realizar la aprobacion o rechazo de la muestra.
router.post('/listarmuestrapreparar',muestrasController.listadomuestraspreparar); //Ruta para realizar el listado de las muestras para preparar.
router.post('/prepararmuestra',muestrasController.prepararmuestra); //Ruta para realizar la preparacion de la muestra.
router.post('/despacharmuestra',muestrasController.despacharmuestra); //Ruta para realizar el despacho de una muestra.
router.post('/listarmuestrasconestado',muestrasController.listarmuestrasconestado); //Ruta para listar las muestras con el estado.
router.get('/obtnerstockmuestras',muestrasController.obtenerlistadostockmuestras); //Ruta para listar las muestras con el estado.
router.post('/obtenerroadmap',muestrasController.obtenerroadmapsolicitud); //Ruta para listar las muestras con el estado.
router.post('/listarmuestrasdespachadas',muestrasController.listarmuestrasdespachadas); //Ruta para listar las muestras con el estado.
router.post('/actualizarestadomuestra',muestrasController.actualizarestadomuestra); //Ruta para listar las muestras con el estado.
router.post('/listarmuestrasfacturacion',muestrasController.listarmuestrasfacturacion); //Ruta para listar las muestras con el estado.
router.get('/listarproductosmillares',muestrasController.listarproductosmillares); //Ruta para listar las muestras con el estado.
router.get('/obtenermuestraxid/:id', muestrasController.obtenermuestraxid); //Ruta para obtener los datos de una muestra por ID para modo edicion.
router.post('/obtenermuestraxid/:id', muestrasController.obtenermuestraxid);
router.post('/obtenermuestraxid', muestrasController.obtenermuestraxid);
router.put('/actualizarmuestra/:id', muestrasController.actualizarmuestra); //Ruta para actualizar los datos de una muestra (PUT).
router.patch('/actualizarmuestra/:id', muestrasController.actualizarmuestra); //Ruta para actualizar los datos de una muestra (PATCH).
router.put('/actualizarmuestra', muestrasController.actualizarmuestra);
router.patch('/actualizarmuestra', muestrasController.actualizarmuestra);
router.post('/actualizarmuestra', muestrasController.actualizarmuestra);
module.exports = router;
// Middleware para verificar el token
function verifyToken(req, res, next) {
    //console.log(req);
    
    if (req.headers['authorization'] != undefined) {
        const token = req.headers['authorization'].split(' ')[1];
        if (!token || token == undefined) {
            return res.status(403).json({ error: 'Token requerido' });
        }
        jwt.verify(token, clavejwtbeartoke, (err, decoded) => {
            if (err) {
                console.log(err);

                return res.status(401).json({ error: 'Token inválido o expirado' });
            }
            req.user = decoded;
            next();
        });
    }else{
        return res.status(403).json({ error: 'Token requerido' });
    }

}