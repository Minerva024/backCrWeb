
const express = require('express')
const router = express.Router()
const crmController = require('../controllers/crm.controller');
const jwt = require('jsonwebtoken');
const { clavejwtbeartoke } = require('../../config/configvariables');

router.post('/loginusuario',crmController.loginusuario);
router.get('/verificartoken',auxverifyToken);
router.get('/pruebacrm', crmController.procesoalmacenado);
router.get('/obtenciondatoscreacioncliente', crmController.obtenciondatoscreacioncliente);
router.get('/obtencionterritoriossap', crmController.obtencionterritoriossap);
router.get('/obtencionindustriassap', crmController.obtencionindustriassap);
router.get('/obtenciongrupossap', crmController.obtenciongrupossap);
router.get('/obtenciontipospersonascontactosap', crmController.obtenciontipospersonascontactosap);
router.post('/ingresarclientesap', crmController.ingresarclientesap);
router.post('/registrardocumentacionclientesap', crmController.registrardocumentacionsap);
router.post('/listarclientessapdocumentacion', crmController.listarclientescondocumentacionsap);
router.post('/ingresaractualizardocumentacion', crmController.ingresaractualizardocumentacion);
router.post('/obtenerdocumentacioncliente',crmController.obtnerdocumentacioncliente);
router.post('/obtenerclientesap',crmController.obtenerclientesap);
router.post('/obtenerhistorialcompraproductos',crmController.obtenerhistorialcompraproductos);
router.post('/obtenerpresupuestos',crmController.obtenerpresupuestosventas);
router.post('/obtenerfacturabase64',crmController.obtenerfacturabase64);
router.post('/obtenerotrospagos',crmController.obtenerotrospagos);
router.post('/listarcotizacionescrmweb',crmController.listarcotizacionescrmweb);
router.post('/listarcotizacionesxclientecrmweb',crmController.listarcotizacionesxclientecrmweb);
router.post('/obtenercotizacionpdfweb',crmController.obtenerpdfcotizacion);
router.post('/listarvisitascalendario',crmController.listarvisitacalendario);
router.post('/listarvisitascalendarioxfechas',crmController.listarvisitacalendarioxfechas);
router.post('/listarleads', crmController.listarleads);
router.post('/actualizarcliente', crmController.actualizarclientesap);
router.post('/informacionproducto', crmController.obtenerinformacionproducto);
router.get('/obtenerproductoslotes', crmController.obtenerproductosconlotes);
//Rutas con autorizacion.
router.post('/obtenerpermisosbanner',verifyToken, crmController.obtenerpermisos);
router.get('/obtenerinformacionreunion',crmController.obtenerinforacionparavisita);



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

//Funcion para verificar la validez del token
function auxverifyToken(req, res, next) {
    //console.log(req);
    
    if (req.headers['authorization'] != undefined) {
        const token = req.headers['authorization'].split(' ')[1];
        if (!token || token == undefined) {
            return res.status(403).json({ error: 'Token requerido' });
        }
        jwt.verify(token, clavejwtbeartoke, (err, decoded) => {
            if (err) {
                //console.log(err);

                return res.status(401).json({ error: 'Token inválido o expirado' });
            }
            return res.status(200).json({ exito: 'Token válido' });
                
        });
    }else{
        return res.status(403).json({ error: 'Token requerido' });
    }

}