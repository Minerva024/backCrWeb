const express = require('express')
const router = express.Router()
const vendedorController = require('../controllers/vendedor.controller');


//Ruta para los empleados
router.post('/login', vendedorController.login);
router.post('/listarclientes', vendedorController.listarclientes);
router.get('/listarproductos', vendedorController.listarproductos);
router.post('/ingresarofertaventa', vendedorController.ingresarofertventa);
router.post('/ingresarcotizacion', vendedorController.ingresarcotizacion);
router.post('/obtenercliente', vendedorController.obtenercliente);
router.post('/obtenercartera', vendedorController.obtenercartera);
router.post('/obtenerproductosxcliente', vendedorController.productoxcliente);
router.post('/obtenercomprasxproductosxcliente', vendedorController.comprasxproductoxcliente);
router.post('/obtenerpagos', vendedorController.obtenerpagoscliente);
router.post('/obtenerproducto', vendedorController.obtenerproducto);
router.post('/obtenerimportacionesproducto', vendedorController.obtenerimportacionesproducto);
router.post('/obtenerventas', vendedorController.obtenerventas);
router.post('/ingresarvisita', vendedorController.ingresarvisita); //Endpoint para agendar una reunion V1
router.post('/ingresarvisitan', vendedorController.ingresarvisitan); //Endpoint para agendar una reunion v2, con tipo reunion, asunto, etc.
router.post('/listarvisitas', vendedorController.listarvisitas);
router.post('/agregarcomentario', vendedorController.agregarcomentario); //Endpoint para agregar un comentario a una visita
router.post('/agregardetallereunion', vendedorController.agregardetallereunion); //Endpoint para agregar un detalle de una visita.
router.post('/eliminarvisita', vendedorController.eliminarvisita);
router.post('/agregarubicacionvisita', vendedorController.ingresarubicacionvisita);
router.post('/listarcomentarios', vendedorController.listarcomentarios);
router.post('/listarvisitasxcliente', vendedorController.listarvisitasxvendedorxcliente); //Endpoint para listar las visitas de un cliente de forma antigua
router.post('/listarvisitasxclienten', vendedorController.listarvisitasxvendedorxclienten); //Endpoint para listas las visitas de un cliente con id de asunto y tipo reunion
//router.post('/listarvisitasxclienten', vendedorController.listarvisitasxvendedorxclienten);
router.get('/listarvendedores', vendedorController.listarvendedores);
router.post('/listarofertasventas', vendedorController.listarofertasventa);
router.post('/listaritemsofertaventa', vendedorController.listaritemsofertasventa);
router.post('/informeusoapp', vendedorController.informeuso);
router.post('/ingresoleadferia', vendedorController.ingresoleadferia);
router.post('/listarcotizaciones', vendedorController.listarcotizaciones);
router.post('/generarcotizacionpdf', vendedorController.obtenerpdfcotizacion);
router.post('/listarpedidosstatus', vendedorController.obtenerpedidosstatusautorizacion);
router.post('/rechazarcotizacion', vendedorController.rechazarcotizacion);
router.post('/aceptarcotizacion', vendedorController.aceptarcotizacion);
router.get('/listadeventasxmesxvendedor', vendedorController.listaventasxmesxvendedor);
router.get('/obtenerpresupuestos', vendedorController.obtenerpresupuestos);
router.get('/procesoalmacenado', vendedorController.procesoalmacenado);
router.get('/obtenerinformacionreunion',vendedorController.obtenerinforacionparavisita);
router.get('/libroslegales', vendedorController.obtenerlibroslegales);
router.get('/libroslegalescrismo', vendedorController.obtenerlibroslegalescrismo);
module.exports = router;
