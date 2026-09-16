'use strict';

const moment = require('moment');
moment.locale('es');
const { ingresarofertadeventa, registrarcliente, actualizarclientedocumentacion, actualizarcliente, obtenerclientesap, ingresarordendecompra, obtenerordendecompra, actualizarordendecompra } = require('../conexionservicelayersap/solicitudessap');
var dbConnMySQL = require('./../../config/configMySQL');
var dbConnMySQLImpor = require('./../../config/configMySQLImpor');
var dbConnHana = require('./../../config/configSapHana');
const hana = require('@sap/hana-client');
const mailer = require('./../templates/ofertaventa');
const configsql = require('../../config/configsql');
const jwt = require('jsonwebtoken');
const bwipjs = require('bwip-js');
const puppeteer = require('puppeteer');
const { clavejwtbeartoke } = require('../../config/configvariables');
const { enviarnotificacion } = require('../ConexionFireBase/notificacionespush');
const { enviar_ingreso_muestra, enviar_estado_muestra, enviar_preparar_muestra, enviar_registro_muestra } = require('../templates/notificacionesmuestras');
const axios = require('axios');

var muestras = function () { }

//Funcion para el ingreso de un nuevo producto de muestras
muestras.ingresoproducto = async function (auxproducto, result) {
    try {
        var queryconsultamysql = "CALL mm_crearproductocrm(?,?)";
        const params = [
            auxproducto.nombreproducto,
            auxproducto.idcategoriasap
        ];

        dbConnMySQL.query(queryconsultamysql, params, function (err, res) {
            if (err) {
                console.error("Error MySQL:", err);
                return result(err, null);
            }
            const json = JSON.parse(JSON.stringify(res));
            result(null, json);
        });
    } catch (error) {
        console.error("Error general:", error);
        result(error, null);
    }
};
//Funcion para obtener el listado de los grupos de los productos de SAP.
muestras.obtenergruposproductos = function (aux, result) {
    const query = `
        SELECT 
            "ItmsGrpCod" AS "CodigoGrupo",
            "ItmsGrpNam" AS "NombreGrupo"
        FROM "EC_SBO_MINERVA_PRO".OITB
        ORDER BY "ItmsGrpNam";
    `;

    const conn = hana.createConnection();

    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.error('Error conectando a SAP HANA:', err);
            return result(err, null);
        }

        console.log('✅ Conectado a SAP HANA - Obtener grupos de productos');

        conn.exec(query, function (err, res) {
            if (err) {
                console.error('Error ejecutando la consulta:', err);
                conn.disconnect();
                return result(err, null);
            }

            conn.disconnect((err) => {
                if (err) {
                    console.error('Error cerrando la conexión:', err);
                } else {
                    console.log('🔒 Conexión HANA cerrada correctamente.');
                }
            });

            // Devolver resultados
            result(null, res);
        });
    });
};
//Funcion para el registro de un nuevo proveedor.
muestras.ingresoproveedor = async function (auxproveedor, result) {
    try {
        var queryconsultamysql = "CALL mm_crearproveedor(?)";
        const params = [
            auxproveedor.nombre
        ];
        dbConnMySQL.query(queryconsultamysql, params, function (err, res) {
            if (err) {
                console.error("Error MySQL:", err);
                return result(err, null);
            }

            const json = JSON.parse(JSON.stringify(res));
            result(null, json);
        });
    } catch (error) {
        console.error("Error general:", error);
        result(error, null);
    }
}
//Funcion para obtener los proveedores de las posibles muestras.
function listarproveedoressap(aux, result) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                T0."CardCode"   AS "codigo",
                T0."CardName"   AS "nombre",
                'SAP'           AS "origen"
            FROM "EC_SBO_MINERVA_PRO".OCRD T0
            WHERE T0."GroupCode" = 102
            and T0."validFor" = 'Y';
        `;

        const conn = hana.createConnection();

        conn.connect(dbConnHana, (err) => {
            if (err) return reject(err);

            conn.exec(query, (err, res) => {
                conn.disconnect();
                if (err) return reject(err);
                resolve(res);
            });
        });
    });
};
//Funcion para listar los proveedores del CRM.
function obtenerProveedoresCRM() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                idmm_proveedor     AS codigo,
                nombre AS nombre,
                'CRM'           AS origen
            FROM mm_proveedor 
            WHERE (issap = 0 OR issap IS NULL) AND (activo = 1 OR activo IS NULL);
        `;

        dbConnMySQL.query(query, (err, res) => {
            if (err) return reject(err);
            resolve(JSON.parse(JSON.stringify(res)));
        });
    });
}
//Funcion para listar los proveedores del CRM.
function obtenerempaquesproductos() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                *
            FROM mm_empaques;
        `;

        dbConnMySQL.query(query, (err, res) => {
            if (err) return reject(err);
            resolve(JSON.parse(JSON.stringify(res)));
        });
    });
}
//Funcion para lsitar las ubicaciones de las bodegas de las muestras.
function obtenerubicacionesbodega(auxciudad) {
    return new Promise((resolve, reject) => {
        var query = "CALL mm_listarubicacionesbodega(?);";
        const params = [
            auxciudad.ciudad
        ]
        dbConnMySQL.query(query, params, (err, res) => {
            if (err) return reject(err);
            resolve(JSON.parse(JSON.stringify(res[0])));
        });
    });
}
//Funcion para obtener los items de SAP.
function listarproductossap(aux, result) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT T0."ItemCode" as "codigo", 
            T0."ItemName" as "nombre",
            (SELECT T1."Price" FROM "EC_SBO_MINERVA_PRO"."ITM1" T1 WHERE T1."PriceList" = 2 and T1."ItemCode" = T0."ItemCode"  ) as PVPMIN,
            T1."Rate", 
            T1."Code",
	    T0."AvgPrice"/0.85 as COSTO, 
            'SAP' as "origen" 
            FROM "EC_SBO_MINERVA_PRO".OITM T0
            INNER JOIN "EC_SBO_MINERVA_PRO"."OSTC" T1 on T0."TaxCodeAR"=T1."Code"   
            WHERE T0."validFor" =  'Y' 
        AND (
        T0."ItmsGrpCod" IN (
            101,112,125,102,126,113,128,
            114,115,129,116,127,123,124
        )
        AND T0."SellItem"='Y'
        OR T0."ItemCode" IN (
            'MAP002','MAP004','MAP006'
        )
    ) 
            ORDER BY T0."ItemName" asc;
        `;
        //Query de pruebas:
        /*const query = `
            SELECT T0."ItemCode" as "codigo", 
            T0."ItemName" as "nombre",
            (SELECT T1."Price" FROM "PRUEBAS_CRM"."ITM1" T1 WHERE T1."PriceList" = 2 and T1."ItemCode" = T0."ItemCode"  ) as PVPMIN,
            T1."Rate", 
            T1."Code", 
            'SAP' as "origen" 
            FROM "PRUEBAS_CRM".OITM T0
            INNER JOIN "PRUEBAS_CRM"."OSTC" T1 on T0."TaxCodeAR"=T1."Code"   
            WHERE T0."validFor" =  'Y' 
            AND (
        T0."ItmsGrpCod" IN (
            101,112,125,102,126,113,128,
            114,115,129,116,127,123,124
        )
        OR T0."ItemCode" IN (
            'MAP002','MAP004','MAP005','MAP006'
        )
    ) 
            ORDER BY T0."ItemName" asc;
        `;*/

        const conn = hana.createConnection();

        conn.connect(dbConnHana, (err) => {
            if (err) return reject(err);

            conn.exec(query, (err, res) => {
                conn.disconnect();
                if (err) return reject(err);
                resolve(res);
            });
        });
    });
};
//Funcion para listar los productos del CRM activos.
function obtenerproductosCRM() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
            idproductocrm as "codigo",
            nombreproducto as "nombre",
            'CRM' as "origen"
             FROM mm_productocrm 
             WHERE issap=false AND itemcodesap IS NULL;
        `;

        dbConnMySQL.query(query, (err, res) => {
            if (err) return reject(err);
            resolve(JSON.parse(JSON.stringify(res)));
        });
    });
}
function listamuestrasubicacion(auxciudad) {

    return new Promise((resolve, reject) => {
        var query = "CALL mm_listarmuestrasubicar(?)";
        const params = [
            auxciudad.ciudad
        ];
        dbConnMySQL.query(query, params, (err, res) => {
            if (err) return reject(err);
            let filas = JSON.parse(JSON.stringify(res[0]));
            return resolve(filas || []);
        });
    });
}
function registrarmuestra(auxmuestra) {
    return new Promise((resolve, reject) => {
        var query = "CALL mm_registrarmuestra(?,?,?,?,?,?,?,?)";
        const responsable = auxmuestra.responsableingreso || auxmuestra.responsable || auxmuestra.usuario || null;
        const params = [
            auxmuestra.idproveedorcrm,
            auxmuestra.idproveedorsap,
            auxmuestra.idproductocrm,
            auxmuestra.idproductosap,
            responsable,
            auxmuestra.cantidad,
            auxmuestra.nombrereferencial,
            auxmuestra.ciudad
        ]
        dbConnMySQL.query(query, params, (err, res) => {
            if (err) return reject(err);
            resolve(JSON.parse(JSON.stringify(res[0][0])));
        });
    });
}
//Funcion para realizar el registro de la muestra por parte del departamento de compras.
muestras.registrarmuestra = async function (auxmuestra, result) {
    try {
        console.log(auxmuestra);

        const respuesta = await registrarmuestra(auxmuestra);

        if (respuesta.isregis) {
            // Persistir fraccionar y comentario_fraccionar en mm_muestra
            const fraccionarVal = auxmuestra.fraccionar === 'SI' ? 'SI' : 'NO';
            const comentarioVal = auxmuestra.fraccionar === 'SI' ? (auxmuestra.comentario_fraccionar || auxmuestra.comentario || '') : null;
            
            const queryUpdate = `
                UPDATE mm_muestra 
                SET fraccionar = ?, comentario_fraccionar = ? 
                WHERE idmm_muestra = (SELECT idmm_muestra FROM (SELECT MAX(idmm_muestra) as idmm_muestra FROM mm_muestra) as t)
            `;
            const idTarget = respuesta.id || respuesta.idmm_muestra;
            if (idTarget) {
                dbConnMySQL.query("UPDATE mm_muestra SET fraccionar = ?, comentario_fraccionar = ? WHERE idmm_muestra = ?", [fraccionarVal, comentarioVal, idTarget], (errUpd) => {
                    if (errUpd) console.error("⚠️ [MYSQL] Error actualizando campos de fraccionar en mm_muestra:", errUpd);
                });
            } else {
                dbConnMySQL.query(queryUpdate, [fraccionarVal, comentarioVal], (errUpd) => {
                    if (errUpd) console.error("⚠️ [MYSQL] Error actualizando campos de fraccionar en mm_muestra:", errUpd);
                });
            }

            result(null, { isregis: true, mess: respuesta.message });
        } else {
            result(null, { isregis: false, mess: respuesta.message });
        }

    } catch (error) {
        console.error('❌ Error registrando la muestra', error);
        result(error, null);
    }
}
//Funcion para obtener todos los proveedores tanto de SAP como de CRM
muestras.listarProveedores = async function (aux, result) {
    try {
        const proveedoresSAP = await listarproveedoressap();
        const proveedoresCRM = await obtenerProveedoresCRM();
        //const empaques = await obtenerempaquesproductos();
        const productossap = await listarproductossap();
        const productoscrm = await obtenerproductosCRM();

        const listadoproveedores = [
            ...proveedoresSAP,
            ...proveedoresCRM
        ];
        const listadoproductos = [
            ...productossap,
            ...productoscrm
        ]
        const datos = {
            listadoproveedores,
            listadoproductos,
        }

        result(null, datos);
    } catch (error) {
        console.error('❌ Error obteniendo proveedores:', error);
        result(error, null);
    }
};
//Funcion para agregar un lote de una nueva muestra.
muestras.ingresolotemuestra = async function (auxlotemuestra, result) {
    try {
        console.log(auxlotemuestra);

        var queryconsultamysql = "CALL mm_registrarmuestralote(?,?,?,?,?,?,?,?,?,?,?)";
        const params = [
            auxlotemuestra.lote,
            auxlotemuestra.fechaelaboracion,
            auxlotemuestra.fechavencimiento,
            auxlotemuestra.idproductocrm,
            auxlotemuestra.idproductosap,
            auxlotemuestra.idproveedorcrm,
            auxlotemuestra.idproveedorsap,
            auxlotemuestra.responsable,
            auxlotemuestra.cantidad,
            auxlotemuestra.nombrereferencial,
            auxlotemuestra.ciudad
        ];
        dbConnMySQL.query(queryconsultamysql, params, function (err, res) {
            if (err) {
                console.error("Error MySQL:", err);
                return result(err, null);
            }

            const json = JSON.parse(JSON.stringify(res));
            result(null, json);
        });
    } catch (error) {
        console.error("Error general:", error);
        result(error, null);
    }
}
function obtenerProveedoresHistoricosPorProducto() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT idproductocrm, idproductosap, idproveedorcrm, idproveedorsap 
            FROM mm_muestra 
            WHERE (idproductocrm IS NOT NULL OR idproductosap IS NOT NULL) 
              AND (idproveedorcrm IS NOT NULL OR idproveedorsap IS NOT NULL)
            GROUP BY idproductocrm, idproductosap, idproveedorcrm, idproveedorsap
        `;
        dbConnMySQL.query(query, (err, res) => {
            if (err) return reject(err);
            resolve(JSON.parse(JSON.stringify(res || [])));
        });
    });
}

//Funcion para agregar un lote de una nueva muestra.
muestras.listarmuestrasubicar = async function (auxciudad, result) {
    try {
        const listadomuestras = await listamuestrasubicacion(auxciudad);
        const listadoproductossap = await listarproductossap();
        const listaproveedoressap = await listarproveedoressap();
        const listaproveedorescrm = await obtenerProveedoresCRM();
        const empaques = await obtenerempaquesproductos();
        const ubicaciones = await obtenerubicacionesbodega(auxciudad);
        const historicoProveedores = await obtenerProveedoresHistoricosPorProducto();

        const todosLosProveedores = [
            ...(listaproveedoressap || []).map(p => ({ codigo: p.codigo, nombre: p.nombre, origen: 'SAP' })),
            ...(listaproveedorescrm || []).filter(p => p.activo === 1 || p.activo == null).map(p => ({ codigo: p.codigo, nombre: p.nombre, origen: 'CRM' }))
        ];

        const muestrasubicacion = [];
        const datos = [
            muestrasubicacion,
            ubicaciones,
            empaques,
            todosLosProveedores
        ];
        for (let i = 0; i < listadomuestras.length; i++) {
            const element = listadomuestras[i];
            if (element.idproductosap != null) {
                const producto = listadoproductossap.find(
                    p => p.codigo === element.idproductosap
                );
                if (producto) {
                    element.nombreproducto = producto.nombre;
                }
            }
            let nombreproveedor = '';
            if (element.idproveedorsap != null) {
                const prov = listaproveedoressap.find(
                    p => String(p.codigo) === String(element.idproveedorsap)
                );
                if (prov) {
                    nombreproveedor = prov.nombre;
                }
            } else if (element.idproveedorcrm != null) {
                const prov = listaproveedorescrm.find(
                    p => String(p.codigo) === String(element.idproveedorcrm)
                );
                if (prov) {
                    nombreproveedor = prov.nombre;
                }
            }

            // Buscar proveedores relacionados al producto (históricos)
            const proveedoresRelacionados = [];
            const vistos = new Set();
            const currentKey = element.idproveedorsap ? `SAP_${element.idproveedorsap}` : (element.idproveedorcrm ? `CRM_${element.idproveedorcrm}` : null);
            if (currentKey) vistos.add(currentKey);

            historicoProveedores.forEach(hp => {
                const coincideProducto = (element.idproductocrm != null && String(hp.idproductocrm) === String(element.idproductocrm)) ||
                                         (element.idproductosap != null && String(hp.idproductosap) === String(element.idproductosap));
                if (coincideProducto) {
                    if (hp.idproveedorsap != null) {
                        const k = `SAP_${hp.idproveedorsap}`;
                        if (!vistos.has(k)) {
                            vistos.add(k);
                            const prov = listaproveedoressap.find(p => String(p.codigo) === String(hp.idproveedorsap));
                            if (prov) {
                                proveedoresRelacionados.push({
                                    codigo: prov.codigo,
                                    nombre: prov.nombre,
                                    origen: 'SAP'
                                });
                            }
                        }
                    } else if (hp.idproveedorcrm != null) {
                        const k = `CRM_${hp.idproveedorcrm}`;
                        if (!vistos.has(k)) {
                            vistos.add(k);
                            const prov = listaproveedorescrm.find(p => String(p.codigo) === String(hp.idproveedorcrm));
                            if (prov) {
                                proveedoresRelacionados.push({
                                    codigo: prov.codigo,
                                    nombre: prov.nombre,
                                    origen: 'CRM'
                                });
                            }
                        }
                    }
                }
            });

            //Armo el listado final con los campos necesarios para mostrar
            let auxmuestra = {
                id: element.idmm_muestra,
                fechaingreso: element.fechahoraingreso,
                producto: element.nombreproducto,
                proveedor: nombreproveedor || 'Sin proveedor',
                cantidadregistrada: element.cantidad,
                nombrereferencial: element.nombrereferencial,
                ciudad: element.ciudad,
                idproductosap: element.idproductosap,
                idproductocrm: element.idproductocrm,
                idproveedorsap: element.idproveedorsap,
                idproveedorcrm: element.idproveedorcrm,
                responsableingreso: element.responsableingreso || '',
                proveedores_relacionados: proveedoresRelacionados,
                fraccionar: element.fraccionar || 'NO',
                comentario_fraccionar: element.comentario_fraccionar || '',
                lotes: []
            };
            muestrasubicacion.push(auxmuestra);
        }


        result(null, datos);
    } catch (error) {
        console.error('❌ Error obteniendo listado de muestras:', error);
        result(error, null);
    }
};
//Funcion para realizar la actualizacion de los campos de ubicacion y empaque de los lotes de muestras, aqui tambien  se realizar el ingreso al stock del inventario de las muestras.
function actualizarubicacionempaque(item) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_actualizarinforubicacionempaque(?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [
                item.lote,
                item.fechaelaboracion,
                item.fechavencimiento,
                item.idtipoempaque,
                item.idubicacion,
                item.idproductocrm,
                item.idproductosap,
                item.idproveedorsap,
                item.idproveedorcrm,
                item.responsableingreso,
                item.cantidadrecibida,
                item.id,
                item.comentario
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res);
            }
        );
    });
}
muestras.actualizarinformacionmuestralote = async function (auxproducto, result) {
    try {
        console.log(auxproducto);

        for (const item of auxproducto.lotes) {
            let auxmuestra = {
                lote: item.lote,
                fechaelaboracion: item.fechaelaboracion,
                fechavencimiento: item.fechavencimiento,
                idtipoempaque: item.idpresentacion,
                idubicacion: item.idubicacion,
                idproductocrm: auxproducto.idproductocrm,
                idproductosap: auxproducto.idproductosap,
                idproveedorsap: (item.idproveedorsap !== undefined && item.idproveedorsap !== null) ? item.idproveedorsap : auxproducto.idproveedorsap,
                idproveedorcrm: (item.idproveedorcrm !== undefined && item.idproveedorcrm !== null) ? item.idproveedorcrm : auxproducto.idproveedorcrm,
                responsableingreso: auxproducto.responsableingreso,
                cantidadrecibida: item.cantidad,
                id: auxproducto.id,
                comentario: item.comentario

            }
            await actualizarubicacionempaque(auxmuestra);

        }
        enviar_registro_muestra(auxproducto.lotes, auxproducto.producto, auxproducto.cantidadregistrada);
        result(null, { respuesta: true })
    } catch (error) {
        console.error('❌ Error actualizando la informacion de las muestras ingresadas:', error);
        result(error, null);
    }
}
//Funciones para listar todos los datos necesarios para el formulario de solicitudes de muestras.
function listarclientesap(auxslpcode) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                T0."CardCode", 
                T0."SlpCode", 
                T0."CreateDate", 
                T0."CardType", 
                T0."CardName", 
                T0."Phone1", 
                T0."Cellular",
                T0."QryGroup13",
                T0."QryGroup14",
                T0."QryGroup15",
                T0."QryGroup16",
                T0."QryGroup17",
                T0."U_TIPO_RUC"  
            FROM "EC_SBO_MINERVA_PRO".OCRD T0 
            INNER JOIN "EC_SBO_MINERVA_PRO".OSLP T1 
                ON T0."SlpCode" = T1."SlpCode"
            WHERE 
                T0."validFor" = 'Y'
                AND (T0."CardType" = 'C' OR T0."CardType" = 'L')
        `;

        const params = [];

        if (auxslpcode != 0) {
            query += ` AND T0."SlpCode" = ` + auxslpcode;
            //params.push(auxslpcode);
        }

        query += ` ORDER BY T0."CreateDate" DESC `;

        const conn = hana.createConnection();

        conn.connect(dbConnHana, (err) => {
            if (err) return reject(err);

            conn.exec(query, params, (err, res) => {
                conn.disconnect();
                if (err) return reject(err);
                resolve(res);
            });
        });
    });
}
function listarclientesapconinactivos(auxslpcode) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                T0."CardCode", 
                T0."SlpCode", 
                T0."CreateDate", 
                T0."CardType", 
                T0."CardName", 
                T0."Phone1", 
                T0."Cellular",
                T0."QryGroup13",
                T0."QryGroup14",
                T0."QryGroup15",
                T0."QryGroup16",
                T0."QryGroup17",
                T0."U_TIPO_RUC"  
            FROM "EC_SBO_MINERVA_PRO".OCRD T0 
            INNER JOIN "EC_SBO_MINERVA_PRO".OSLP T1 
                ON T0."SlpCode" = T1."SlpCode"
            WHERE 
                (T0."CardType" = 'C' OR T0."CardType" = 'L')
        `;

        const params = [];

        if (auxslpcode != 0) {
            query += ` AND T0."SlpCode" = ` + auxslpcode;
            //params.push(auxslpcode);
        }

        query += ` ORDER BY T0."CreateDate" DESC `;

        const conn = hana.createConnection();

        conn.connect(dbConnHana, (err) => {
            if (err) return reject(err);

            conn.exec(query, params, (err, res) => {
                conn.disconnect();
                if (err) return reject(err);
                resolve(res);
            });
        });
    });
}
muestras.listardatossolicitudmuestras = async function (auxslpcode, result) {
    try {

        const listadocliente = await listarclientesap(auxslpcode.slpcode);
        const productossap = await listarproductossap();
        const productoscrm = await obtenerproductosCRM();

        const listadoproductos = [
            ...productossap,
            ...productoscrm
        ];
        const datos = [
            listadocliente,
            listadoproductos
        ];

        result(null, datos);
    } catch (error) {
        console.error('❌ Error obteniendo los datos para el formulario de solicitud de muestras:', error);
        result(error, null);
    }
}
//Funciones para el ingreso de la solicitud de muestras
function ingresolicitudmuestra(item) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_ingresarsolicutdemuestra(?,?,?,?,?,?,?,?)',
            [
                item.cliente.CardCode,
                item.producto.origen == 'SAP' ? item.producto.codigo : null,
                item.producto.origen == 'CRM' ? item.producto.codigo : null,
                item.cliente.SlpCode,
                item.solicitante,
                item.comentario,
                item.tiporetiro,
                item.cantidad
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res);
            }
        );
    });
}

function obtenerdatosvendedor(auxslpcode) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'SELECT * FROM usuarios WHERE slpcode =' + auxslpcode,

            (err, res) => {
                if (err) return reject(err);
                resolve(res);
            }
        );
    });
}
muestras.ingresarsolicitudesmuestras = async function (listadosolicitudes, result) {
    try {

        for (const item of listadosolicitudes) {
            let res = await ingresolicitudmuestra(item);
            console.log(res);
            const token = await obtenertokendispositivo(item.cliente.SlpCode);
            const rv = await obtenerdatosvendedor(item.cliente.SlpCode);
            console.log(rv);
            enviar_ingreso_muestra(rv[0].mail, rv[0].nombres + " " + rv[0].apellidos, item.cliente.CardName, item.producto.nombre, (item.cantidad / 1000) + "Kg");
            let bodymess = "Ha realizado la solicitud de: " + (item.cantidad / 1000) + " Kg - " + item.producto.nombre + " para el cliente: " + item.cliente.CardName;
            //await enviarnotificacion(rv[0].tokenfirebase, "Solicitud de muestra", bodymess);
            //await registrarnotificacion(item.cliente.SlpCode, "Solicitud de muestra", bodymess);
            enviarmensajewaha(rv[0].telefono, bodymess);
        }
        result(null, { respuesta: true })
    } catch (error) {
        console.error('❌ Error ingresando las solicitudes de muestras:', error);
        result(error, null);
    }
}
//Funcion para obtener las muestras segun los estados:
/* Estados posibles de las muestras con el id para la busqueda.
1	INGRESADO
2	PENDIENTE AUTORIZACION CANTIDAD Y STOCK
3	AUTORIZADO POR CANTIDAD Y STOCK
4	PENDIENTE AUTORIZACION X FRACCIONAMIENTO
5	PREPARADA
6	DESPACHADA
7	PENDIENTE CONFIRMACION ENTREGA
8	ACEPTADA
9	RECHAZADA
10	DEVUELTA
11	AUTORIZADO X FRACCIONAMIENTO
12	PENDIENTE DE PREPARAR
*/
function obtenerlistadodemuestras(estadomuestras, slpcode) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_solicitudmuestraxestado(?,?)',
            [
                estadomuestras,
                slpcode
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res[0]);
            }
        );
    });
}
muestras.listarsolicitudesdemuestrasxestado = async function (params, result) {
    try {
        const productosSAP = await listarproductossap();
        //Listo las solicitudes de muestras.
        const listadosolicitudes = await obtenerlistadodemuestras(params.estado, params.slpcode);
        const listadoclientes = await listarclientesapconinactivos(params.slpcode);

        for (let index = 0; index < listadosolicitudes.length; index++) {
            const element = listadosolicitudes[index];

            if (element.idproductosap != null) {
                const producto = productosSAP.find(
                    p => p.codigo === element.idproductosap
                );
                if (producto) {
                    element.nombreproducto = producto.nombre;
                }
            }
            element.CardName = listadoclientes.find(p => p.CardCode === element.cardcode).CardName;

        }
        const datos = [
            listadosolicitudes
        ];

        result(null, datos);
    } catch (error) {
        console.error('❌ Error obteniendo listado de muestras x estado:', error);
        result(error, null);
    }

}
//Funcion para obtener el stock de la bodega de sap y las importaciones.
function stockproductosap(itemcode) {
    return new Promise((resolve, reject) => {
        let query = `
           SELECT T0."ItemCode", 
           T0."ItemName", 
           (SELECT (T2."OnHand" - T2."IsCommited")  FROM "EC_SBO_MINERVA_PRO".OITW T2 where T2."ItemCode" = T0."ItemCode" and T2."WhsCode" = 'Q01') as BUIO, 
           (SELECT (T2."OnHand" - T2."IsCommited") FROM "EC_SBO_MINERVA_PRO".OITW T2 where T2."ItemCode" = T0."ItemCode" and T2."WhsCode" = 'G01') as BGYE, 
           (SELECT (T2."OnHand" - T2."IsCommited")  FROM "EC_SBO_MINERVA_PRO".OITW T2 where T2."ItemCode" = T0."ItemCode" and T2."WhsCode" = 'RQ1') as RUIO, 
           (SELECT (T2."OnHand" - T2."IsCommited")  FROM "EC_SBO_MINERVA_PRO".OITW T2 where T2."ItemCode" = T0."ItemCode" and T2."WhsCode" = 'RG1') as RGYE
           FROM "EC_SBO_MINERVA_PRO".OITM T0 
           INNER JOIN "EC_SBO_MINERVA_PRO"."OITB" T3 on T3."ItmsGrpCod" = T0."ItmsGrpCod" 
           INNER JOIN "EC_SBO_MINERVA_PRO"."OSTC" T1 on T0."TaxCodeAR"=T1."Code"
        `;
        /*let query = `
           SELECT T0."ItemCode", 
           T0."ItemName", 
           (SELECT (T2."OnHand" - T2."IsCommited")  FROM "PRUEBAS_CRM".OITW T2 where T2."ItemCode" = T0."ItemCode" and T2."WhsCode" = 'Q01') as BUIO, 
           (SELECT (T2."OnHand" - T2."IsCommited") FROM "PRUEBAS_CRM".OITW T2 where T2."ItemCode" = T0."ItemCode" and T2."WhsCode" = 'G01') as BGYE, 
           (SELECT (T2."OnHand" - T2."IsCommited")  FROM "PRUEBAS_CRM".OITW T2 where T2."ItemCode" = T0."ItemCode" and T2."WhsCode" = 'RQ1') as RUIO, 
           (SELECT (T2."OnHand" - T2."IsCommited")  FROM "PRUEBAS_CRM".OITW T2 where T2."ItemCode" = T0."ItemCode" and T2."WhsCode" = 'RG1') as RGYE
           FROM "PRUEBAS_CRM".OITM T0 
           INNER JOIN "PRUEBAS_CRM"."OITB" T3 on T3."ItmsGrpCod" = T0."ItmsGrpCod" 
           INNER JOIN "PRUEBAS_CRM"."OSTC" T1 on T0."TaxCodeAR"=T1."Code"
        `;*/

        const params = [];

        query += `WHERE T0."ItemCode" = '` + itemcode + `';`;
        const conn = hana.createConnection();

        conn.connect(dbConnHana, (err) => {
            if (err) return reject(err);

            conn.exec(query, params, (err, res) => {
                conn.disconnect();
                if (err) return reject(err);
                resolve(res);
            });
        });
    });
}
function importacionesproductosap(itemcode) {
    return new Promise((resolve, reject) => {
        let query = `
           SELECT T0."NumAtCard" AS MI, 
           T1."ItemCode" AS CODIGO_ARTICULO, 
           T2."ItemName" AS ARTICULO, 
           T1. "Quantity" AS CANTIDAD_UN, 
           T0."DocDueDate" AS FECHA_BODEGA, 
           T0."U_Comment" AS TIPO_FECHA, 
           T0."U_DESTINY" AS DESTINO 
           FROM "EC_SBO_MINERVA_PRO".OPOR T0 
           INNER JOIN "EC_SBO_MINERVA_PRO".POR1 T1 ON T0."DocEntry" = T1."DocEntry" 
           INNER JOIN "EC_SBO_MINERVA_PRO".OITM T2 ON T1."ItemCode" = T2."ItemCode" 
           WHERE T0."DocStatus" = 'O' and CAST(T0."U_Comment" as NVARCHAR) = 'FC'  
        `;

        const params = [];

        query += ` and T1."ItemCode" ='` + itemcode + `' ORDER BY T0."DocDueDate" asc;`;

        const conn = hana.createConnection();

        conn.connect(dbConnHana, (err) => {
            if (err) return reject(err);

            conn.exec(query, params, (err, res) => {
                conn.disconnect();
                if (err) return reject(err);
                resolve(res);
            });
        });
    });
}
function stockproductocrm(idproductosap, idproductocrm) {

    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_obtenerstockproducto(?,?)',
            [
                idproductosap,
                idproductocrm
            ],
            (err, res) => {
                if (err) return reject(err);

                resolve(res[0]);
            }
        );
    });
}
muestras.obtenerdatosstockproductos = async function (producto, result) {
    try {
        let stocksap = [];
        let stockcrm = [];
        let importacionsap = [];
        if (producto.idproductosap != null) {
            stocksap = await stockproductosap(producto.idproductosap);
            stockcrm = await stockproductocrm(producto.idproductosap, producto.idproductocrm);
            importacionsap = await importacionesproductosap(producto.idproductosap)
        } else {
            stockcrm = await stockproductocrm(producto.idproductosap, producto.idproductocrm);
        }

        /*Si el origen es SAP:
        Se debe buscar en la bodegas de SAP y CRM si existe stock del producto 
        Si el origen es CRM  solo debo buscar el stock de la bodeha de CRM */
        let datos = {
            sap: stocksap,
            impo: importacionsap,
            crm: stockcrm
        };

        result(null, datos);
    } catch (error) {
        console.error('❌ Error obteniendo el stock de los productos:', error);
        result(error, null);
    }
}
//Funcion para realizar la aprobacion, rechazo o paso del estado de la solicitud a pendiente autorización por fraccionamiento.
function actualizarsolicitudmuestra(auxdatos) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_aprobarrechazarsolicitudmuestra(?,?,?,?,?,?,?,?)',
            [
                auxdatos.aprobador,
                auxdatos.bodegadespacho,
                auxdatos.ciudaddespacho,
                auxdatos.comentario,
                auxdatos.cantidadaprobada,
                auxdatos.idsolicitud,
                auxdatos.isaprobado,
                auxdatos.isfraccionable
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res);
            }
        );
    });
}
muestras.aprobarrecharsolicitudmuestra = async function (auxdatos, result) {
    try {
        const respuesta = await actualizarsolicitudmuestra(auxdatos);
        //En la ejecucion de este metodo es donde debo realizar el envio del correo al vendedor para saber que la muestra ha sido aprobada.
        if (!auxdatos.isaprobado) {
            const token = await obtenertokendispositivo(auxdatos.slpcode);
            const rv = await obtenerdatosvendedor(auxdatos.slpcode);
            console.log(auxdatos);
            //enviar_estado_muestra(rv[0].mail, rv[0].nombres + " " + rv[0].apellidos, auxdatos.cardname, auxdatos.nombreproducto, auxdatos.cantidadaprobada, "Rechazado");
            let bodymess = "La solicitud de: " + auxdatos.nombreproducto + " para el cliente: " + auxdatos.cardname + ", ha sido rechazada debido a: " + auxdatos.comentario;

            //enviarnotificacion(rv[0].tokenfirebase, "Muestra preparada", bodymess);
            //enviarmensajewaha(rv[0].telefono,bodymess);

        } else {
            //enviar_preparar_muestra(rv[0].mail, rv[0].nombres + " " + rv[0].apellidos, auxdatos.cardname, auxdatos.nombreproducto, auxdatos.cantidadaprobada, auxdatos.ciudaddespacho);
        }



        result(null, respuesta);
    } catch (error) {
        console.error('❌ Error obteniendo el stock de los productos:', error);
        result(error, null);
    }
}
//Funcion para listar las solicitudes de muestras con el estado de AUTORIZADO POR CANTIDAD Y STOCK(3) y AUTORIZADO X FRACCIONAMIENTO(11)
function obtenerstockproductossap(auxcardcode, auxbodega, auxbodegar, result) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT
    T2."ItemCode" AS "idproductosap",
    T3."ItemName" AS "nombreproducto",
    T2."WhsCode" AS "ubicacionbodega",
    T1."DistNumber" AS "lote",
    T2."Quantity" AS "stock_lote",
    COALESCE(T0."ExpDate", T1."ExpDate") AS "fechavencimiento",
    T0."PrdDate" AS "fechaelaboracion"

FROM "EC_SBO_MINERVA_PRO".OBTQ T2
INNER JOIN "EC_SBO_MINERVA_PRO".OBTN T1 ON T2."ItemCode" = T1."ItemCode" AND T2."SysNumber" = T1."SysNumber"
LEFT JOIN "EC_SBO_MINERVA_PRO"."OIBT" T0 ON T0."ItemCode" = T1."ItemCode" AND T0."BatchNum" = T1."DistNumber" AND T0."WhsCode" = T2."WhsCode"
LEFT JOIN "EC_SBO_MINERVA_PRO"."OCRD" T4 ON T0."CardCode" = T4."CardCode"
INNER JOIN "EC_SBO_MINERVA_PRO"."OITM" T3 ON T2."ItemCode" = T3."ItemCode"
INNER JOIN "EC_SBO_MINERVA_PRO"."OITB" T5 ON T3."ItmsGrpCod" = T5."ItmsGrpCod"

WHERE T2."Quantity" > 0 and T2."ItemCode" ='`+ auxcardcode + `' and (T2."WhsCode"='` + auxbodega + `' or T2."WhsCode"='` + auxbodegar + `')
ORDER BY T2."ItemCode", T2."WhsCode", T1."DistNumber";
        `;


        const conn = hana.createConnection();

        conn.connect(dbConnHana, (err) => {
            if (err) return reject(err);

            conn.exec(query, (err, res) => {
                conn.disconnect();
                if (err) return reject(err);
                resolve(res);
            });
        });
    });
}
function obtenerstockproductoscrm(auxcardcode, auxciudad) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_obtenerstockxlotexciudad(?,?)',
            [
                auxcardcode,
                auxciudad
            ],
            (err, res) => {
                if (err) return reject(err);

                resolve(res[0]);
            }
        );
    });
}
function obtenerlotesdespachados(idsolicitudmuestra, auxbodegadespacho) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_obtenerlotesdespachados(?,?)',
            [
                idsolicitudmuestra,
                auxbodegadespacho
            ],
            (err, res) => {
                if (err) return reject(err);

                resolve(res[0]);
            }
        );
    });
}
muestras.listarsolicitudesapreparar = async function (datos, result) {
    try {
        const listadoestadotres = await obtenerlistadodemuestras(3, datos.slpcode);
        const listadoestadoonce = await obtenerlistadodemuestras(11, datos.slpcode);
        const listadoestadocinco = await obtenerlistadodemuestras(5, datos.slpcode);
        const listadoclientes = await listarclientesap(0);
        const productossap = await listarproductossap();
        //const productoscrm = await obtenerproductosCRM();

        let listado = {
            listadopreparacion: [],
            listadodespachar: []
        };

        //Recorro los resultado y voy a gregando las solicitudes de muestras dependiendo de la ciudad y slp code
        for (let item of listadoestadotres) {
            if (item.ciudadsalida == datos.ciudad) {
                item.cardname = listadoclientes.find(p => p.CardCode === item.cardcode).CardName;
                //Busco el nombre del producto si es productosap y asigno los lotes disponibles.
                if (item.idproductocrm == null) {
                    item.nombreproducto = productossap.find(p => p.codigo === item.idproductosap).nombre;
                }
                //Se revisa de que bodega se va a realizar el despacho y de que ciudad
                if (item.ciudadsalida == 'UIO') {
                    if (item.bodegadespacho == 'SAP') {
                        item.listadolotes = await obtenerstockproductossap(item.idproductosap, 'Q01', 'RQ1');
                    } else if (item.bodegadespacho == 'CRM') {
                        if (item.idproductosap != null) {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductosap, item.ciudadsalida);
                        } else {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductocrm, item.ciudadsalida);
                        }

                    }
                } else if (item.ciudadsalida == 'GYE') {
                    if (item.bodegadespacho == 'SAP') {
                        item.listadolotes = await obtenerstockproductossap(item.idproductosap, 'G01', 'RG1');
                    } else if (item.bodegadespacho == 'CRM') {
                        if (item.idproductosap != null) {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductosap, item.ciudadsalida);
                        } else {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductocrm, item.ciudadsalida);
                        }
                    }
                }

                listado.listadopreparacion.push(item);
            }
            if (datos.ciudad == 'TODO') {
                item.cardname = listadoclientes.find(p => p.CardCode === item.cardcode).CardName;
                //Busco el nombre del producto si es productosap y asigno los lotes disponibles.
                if (item.idproductocrm == null) {
                    item.nombreproducto = productossap.find(p => p.codigo === item.idproductosap).nombre;
                }
                //Se revisa de que bodega se va a realizar el despacho y de que ciudad
                if (item.ciudadsalida == 'UIO') {
                    if (item.bodegadespacho == 'SAP') {
                        item.listadolotes = await obtenerstockproductossap(item.idproductosap, 'Q01', 'RQ1');
                    } else if (item.bodegadespacho == 'CRM') {
                        if (item.idproductosap != null) {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductosap, item.ciudadsalida);
                        } else {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductocrm, item.ciudadsalida);
                        }

                    }
                } else if (item.ciudadsalida == 'GYE') {
                    if (item.bodegadespacho == 'SAP') {
                        item.listadolotes = await obtenerstockproductossap(item.idproductosap, 'G01', 'RG1');
                    } else if (item.bodegadespacho == 'CRM') {
                        if (item.idproductosap != null) {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductosap, item.ciudadsalida);
                        } else {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductocrm, item.ciudadsalida);
                        }
                    }
                }

                listado.listadopreparacion.push(item);
            }
        }
        //Recorrido de las solicitudes de muestras que se encuentran en el estado de autorizado por fraccionamiento
        for (let item of listadoestadoonce) {
            if (item.ciudadsalida == datos.ciudad) {
                item.cardname = listadoclientes.find(p => p.CardCode === item.cardcode).CardName;
                //Busco el nombre del producto si es productosap y asigno los lotes disponibles.
                if (item.idproductocrm == null) {
                    item.nombreproducto = productossap.find(p => p.codigo === item.idproductosap).nombre;
                }
                //Se revisa de que bodega se va a realizar el despacho y de que ciudad
                if (item.ciudadsalida == 'UIO') {
                    if (item.bodegadespacho == 'SAP') {
                        item.listadolotes = await obtenerstockproductossap(item.idproductosap, 'Q01', 'RQ1');
                    } else if (item.bodegadespacho == 'CRM') {
                        if (item.idproductosap != null) {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductosap, item.ciudadsalida);
                        } else {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductocrm, item.ciudadsalida);
                        }

                    }
                } else if (item.ciudadsalida == 'GYE') {
                    if (item.bodegadespacho == 'SAP') {
                        item.listadolotes = await obtenerstockproductossap(item.idproductosap, 'G01', 'RG1');
                    } else if (item.bodegadespacho == 'CRM') {
                        if (item.idproductosap != null) {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductosap, item.ciudadsalida);
                        } else {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductocrm, item.ciudadsalida);
                        }
                    }
                }

                listado.listadopreparacion.push(item);
            }
            if (datos.ciudad == 'TODO') {
                item.cardname = listadoclientes.find(p => p.CardCode === item.cardcode).CardName;
                //Busco el nombre del producto si es productosap y asigno los lotes disponibles.
                if (item.idproductocrm == null) {
                    item.nombreproducto = productossap.find(p => p.codigo === item.idproductosap).nombre;
                }
                //Se revisa de que bodega se va a realizar el despacho y de que ciudad
                if (item.ciudadsalida == 'UIO') {
                    if (item.bodegadespacho == 'SAP') {
                        item.listadolotes = await obtenerstockproductossap(item.idproductosap, 'Q01', 'RQ1');
                    } else if (item.bodegadespacho == 'CRM') {
                        if (item.idproductosap != null) {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductosap, item.ciudadsalida);
                        } else {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductocrm, item.ciudadsalida);
                        }

                    }
                } else if (item.ciudadsalida == 'GYE') {
                    if (item.bodegadespacho == 'SAP') {
                        item.listadolotes = await obtenerstockproductossap(item.idproductosap, 'G01', 'RG1');
                    } else if (item.bodegadespacho == 'CRM') {
                        if (item.idproductosap != null) {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductosap, item.ciudadsalida);
                        } else {
                            item.listadolotes = await obtenerstockproductoscrm(item.idproductocrm, item.ciudadsalida);
                        }
                    }
                }

                listado.listadopreparacion.push(item);
            }
        }

        //------------------     APARTADO PARA REALIZAR EL LISTADO DE LAS SOLICITUDES DE MUESTRAS LISTAR PARA DESPACHAR --------------------
        if (datos.ciudad == "TODO") {
            for (let item of listadoestadocinco) {
                item.cardname = listadoclientes.find(p => p.CardCode === item.cardcode).CardName;
                if (item.idproductocrm == null) {
                    item.nombreproducto = productossap.find(p => p.codigo === item.idproductosap).nombre;
                }
                item.lotes = await obtenerlotesdespachados(item.idmm_solicitudmuestra, item.bodegadespacho);
                listado.listadodespachar.push(item);
            }
        } else {
            for (let item of listadoestadocinco) {
                if (item.ciudadsalida == datos.ciudad) {
                    item.cardname = listadoclientes.find(p => p.CardCode === item.cardcode).CardName;
                    if (item.idproductocrm == null) {
                        item.nombreproducto = productossap.find(p => p.codigo === item.idproductosap).nombre;
                    }
                    item.lotes = await obtenerlotesdespachados(item.idmm_solicitudmuestra, item.bodegadespacho);
                    listado.listadodespachar.push(item);
                }
            }
        }

        result(null, listado);
    } catch (error) {
        console.error('❌ Error obteniendo el listado de solicitudes a preparar:', error);
        result(error, null);
    }
}
//Funcion para realizar el registro de la muestra para facturar si la bodega de despacho es del SAP o descontar del stock si es una muestra del CRM
function registrarsalidastockmuestra(datos, lote, cantidad) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_registrarsalidastock(?,?,?,?,?,?,?)',
            [
                datos.bodegadespacho,
                datos.ciudadsalida,
                datos.idproductosap,
                cantidad*1000,
                lote,
                datos.aprobador,
                datos.idmm_solicitudmuestra
            ],
            (err, res) => {
                if (err) return reject(err);

                resolve(res[0]);
            }
        );
    });
}
function obtenertokendispositivo(slpcode) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'select tokenfirebase from usuarios where slpcode = ?',
            [
                slpcode,
            ],
            (err, res) => {
                if (err) return reject(err);

                resolve(res[0]);
            }
        );
    });
}
function registrarnotificacion(slpcode, titulo, cuerpo) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL app_registrarnotificacion(?,?,?)',
            [
                slpcode,
                titulo,
                cuerpo
            ],
            (err, res) => {
                if (err) return reject(err);

                resolve(res[0]);
            }
        );
    });
}
muestras.registrarsalidastock = async function (datos, result) {
    try {
        let ingresado = false;
        //Debo realizar el ingreso de los productos de las muestras en el pedido.
        if (datos.bodegadespacho == 'SAP') {
            const productossap = await listarproductossap();
	    const producto = productossap.find(p => p.codigo === datos.idproductosap);
            let aux = {
                "ItemCode": datos.idproductosap,
                "Quantity": datos.cantidadaprobada/1000,
                "TaxCode": productossap.find(p => p.codigo === datos.idproductosap).Code,
                "UnitPrice": producto
                    ? (producto.PVPMIN > 0 ? producto.PVPMIN : producto.COSTO)
                    : 0,
                "WarehouseCode": datos.ciudadsalida == 'UIO' ? 'Q01' : 'G01'
            }
            console.log(aux);

           let response = await ingresaractualizarpedido(aux, datos.ciudadsalida);
            console.log("Respuesta de actualizar o crear un pedido: " + response);
            //let response='';
            if (response == 204 || response == 201) {
                for (let item of datos.loteseleccionados) {
                    let resp = await registrarsalidastockmuestra(datos, item.lote, item.cantidad);
                    if (resp[0].respuesta == true) {
                        ingresado = true;
                    } else {
                        ingresado = false;
                        break;
                    }
                }
            }
        } else {
            for (let item of datos.loteseleccionados) {
                let resp = await registrarsalidastockmuestra(datos, item.lote, item.cantidad);
                if (resp[0].respuesta == true) {
                    ingresado = true;
                } else {
                    ingresado = false;
                    break;
                }
            }
        }
        if (ingresado) {
            //Debo realizar la consulta del token del dispositivo para realizar el envío de la notificacion.
            const token = await obtenertokendispositivo(datos.slpcode);
            //let bodymess = "Su muestra de: " + datos.nombreproducto + " para el cliente: " + datos.cardname + ", se encuentra preparada y lista para retirar";
            let bodymess = `Estimado/a, 
            Le informamos que la muestra del producto ${datos.nombreproducto} solicitada para el cliente ${datos.cardname} ya se encuentra preparada y disponible para su retiro.
            En caso de requerir envío, la muestra será despachada en el próximo transporte programado.

            Saludos cordiales.`;
            const rv = await obtenerdatosvendedor(datos.slpcode);
            //enviar_estado_muestra(rv[0].mail, rv[0].nombres + " " + rv[0].apellidos, datos.cardname, datos.nombreproducto, datos.cantidadaprobada, "Muestra preparada y lista para ser retirada o enviada.");
            //enviarnotificacion(rv[0].tokenfirebase, "Muestra preparada", bodymess)
            //registrarnotificacion(datos.slpcode, "Muestra preparada", bodymess);
            enviarmensajewaha(rv[0].telefono, bodymess);
        }
        result(null, ingresado)
    } catch (error) {
        console.log("No se ha podido realizar el registro de las salidas de stock");
        result(error, null);
    }
}
///********************************************PROCESO DE FACTURACION DE LAS MUESTRAS A FIN DE MES *********************** */
//Funcion para realizar el registro de la muestra en un  pedido para comprometer el stock
async function ingresaractualizarpedido(producto, auxciudad) {
    // Último día del mes actual
    const fechaFin = moment()
        .endOf('month')
        .format('YYYY-MM-DD');
    //console.log(datos);

    let datosempresa = {
        "CardCode": "C1790038033001",
        "DocDueDate": fechaFin,
        "Series": auxciudad === 'UIO' ? 246 : 247,
        "DocumentLines": [
        ]
    }
    datosempresa.DocumentLines.push(producto);

    //Primero debo revisar si existe un pedido abierto de esa serie
    const iddocumento = await obteneridpedidodemuestras(auxciudad);
    //Si existe un documento abierto debo actualizar el documento la lineas de los productos
    if (iddocumento.length != 0) {
        //Listo los productos de sap para revisar si el pvp min no ha cambiado para que no existan problemas.
        const productossap = await listarproductossap();
        //Obtengo el pedido que ya se encuentra registrado
        const pedidoregistrado = await obtenerordendecompra(iddocumento[0]["DocEntry"]);
        //Busco dentro de la pedido registrado si ya existe el producto que quiero ingresar.
        const productoregistrado = pedidoregistrado.DocumentLines.find(p => p.ItemCode === datosempresa.DocumentLines[0].ItemCode);
        //Recorro el DocumentLines para ver si existe,
        // el producto debo ver la cantidad que estaba registrada y modificar con la nueva cantidad.

        if (productoregistrado) {
            for (let item of pedidoregistrado.DocumentLines) {
                item.UnitPrice = productossap.find(p => p.codigo === item.ItemCode).PVPMIN; //Actualizo el precio Minimo de las lineas ingresadas por si acaso haya cambiado la lista de precios.
                if (item.ItemCode == datosempresa.DocumentLines[0].ItemCode) {
                    item.Quantity += (datosempresa.DocumentLines[0].Quantity); //Encuentro la coincidencia dentro de la orden de venta y su la cantidad del producto.
                }
            }
            datosempresa.DocumentLines = pedidoregistrado.DocumentLines;
        } else {
           
            for (let item of pedidoregistrado.DocumentLines) {
                if (item.ItemCode != datosempresa.DocumentLines[0].ItemCode) {
                    item.UnitPrice = productossap.find(p => p.codigo === item.ItemCode).PVPMIN;
                    datosempresa.DocumentLines.push(item);
                }
            }
            //Debo reordenar la fila para evitar error en sap:
            datosempresa.DocumentLines = datosempresa.DocumentLines.sort((a, b) => {
                if (a.LineNum === undefined) return 1;
                if (b.LineNum === undefined) return -1;
                return a.LineNum - b.LineNum;
            });
        }
        //Debo revisar que el item a ingresar ya no se encuentre creado.
        const actualizarpedido = await actualizarordendecompra(iddocumento[0]["DocEntry"], datosempresa)

        return actualizarpedido;

    } else {
        console.log("Debo registrar la orden de compra");
        datosempresa.DocumentLines[0].Quantity =
            (datosempresa.DocumentLines[0].Quantity )
        const respuesta = await ingresarordendecompra(datosempresa);
        //console.log(respuesta);

        return respuesta.status;
    }
}
function obteneridpedidodemuestras(auxciudad, result) {
    return new Promise((resolve, reject) => {
        //console.log(auxciudad);

        let query = '';
        if (auxciudad == 'UIO') {
            query = `SELECT T0."DocEntry" FROM "EC_SBO_MINERVA_PRO"."ORDR"T0 WHERE T0."DocStatus" ='O' and T0."Series"=246`;
        } else {
            query = `SELECT T0."DocEntry" FROM "EC_SBO_MINERVA_PRO"."ORDR"T0 WHERE T0."DocStatus" ='O' and T0."Series"=247`;
        }

        const conn = hana.createConnection();

        conn.connect(dbConnHana, (err) => {
            if (err) return reject(err);

            conn.exec(query, (err, res) => {
                conn.disconnect();
                if (err) return reject(err);
                resolve(res);
            });
        });
    });
}
muestras.ingresarpedido = async function (datos, result) {
    const response = await ingresaractualizarpedido(datos);
}

//************************************************************************************************************************ */
//Funcion para realizar el despacho de las muestras
function despacharmuestra(datos) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_despacharmuestra(?,?,?)',
            [
                datos.idmm_solicitudmuestra,
                datos.auxcomentario,
                datos.aprobador
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res[0][0]);
            }
        );
    });
}
muestras.despacharmuestra = async function (datos, result) {
    try {
        console.log(datos);

        const resps = await despacharmuestra(datos);
        console.log(resps);

        if (resps.respuesta) {
            result(null, { isvalid: true, respuesta: "Se ha despachado con éxito la muestra." });
        } else {
            result(null, { isvalid: false, respuesta: "Hubo un problema al despachar la muestra." });
        }
    } catch (error) {
        console.log("Error al despachar la muestra");
        result(error, null);
    }
}
function listarmuestrasconestado(auxslpcode) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_listarsolicitudesmuestraconestado(?)',
            [
                auxslpcode
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res[0]);
            }
        );
    });
}
function listarrepresentanteventas() {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            `SELECT concat(nombres,' ', apellidos) as nombre, slpcode FROM usuarios where isactive = 1 and slpcode != 0;`,
            (err, res) => {
                if (err) return reject(err);
                resolve(res);
            }
        );
    });
}
muestras.listarmuestrasconestado = async function (datos, result) {
    try {
        const listado = await listarmuestrasconestado(datos.slpcode);
        const listadoclientes = await listarclientesapconinactivos(0);
        const productossap = await listarproductossap();
        const productoscrm = await obtenerproductosCRM();
        const listadovendedores = await listarrepresentanteventas();
        let respuesta = []
        for (let item of listado) {
            item.cardname = listadoclientes.find(p => p.CardCode === item.cardcode).CardName;
            if (item.idproductocrm == null) {

                item.nombreproducto = productossap.find(p => p.codigo === item.idproductosap)?.nombre;
            }
        }

        datos = {
            listadomuestras: listado,
            listadoproductos: [
                ...[{ codigo: 'TODO', nombre: 'TODO', origen: 'SAP-CRM' }],
                ...productossap,
                ...productoscrm
            ],
            listadoestados: [
                { idestado: 0, estado: "TODO" },
                { idestado: 1, estado: "INGRESADO" },
                { idestado: 1, estado: "PENDIENTE AUTORIZACION CANTIDAD Y STOCK" },
                { idestado: 1, estado: "AUTORIZADO POR CANTIDAD Y STOCK" },
                { idestado: 1, estado: "PENDIENTE AUTORIZACION X FRACCIONAMIENTO" },
                { idestado: 1, estado: "PREPARADA" },
                { idestado: 1, estado: "DESPACHADA" },
                { idestado: 1, estado: "PENDIENTE CONFIRMACION ENTREGA" },
                { idestado: 1, estado: "ACEPTADA" },
                { idestado: 1, estado: "RECHAZADA" },
                { idestado: 1, estado: "DEVUELTA" },
                { idestado: 1, estado: "AUTORIZADO X FRACCIONAMIENTO" },
                { idestado: 1, estado: "PENDIENTE DE PREPARAR" },
		{ idestado: 1, estado: "ENTREGADO" },
            ],
            vendedores: [...[{ nombre: 'TODO', slpcode: 0 }], ...listadovendedores,]
        }

        result(null, datos);
    } catch (error) {
        console.error("No se ha podido consultar las solicitudes de muestras:", error);
        result(error, null);
    }
}
muestras.listarstockmuestras = async function (aux, result) {
    try {
        const productossap = await listarproductossap();
        const productoscrm = await obtenerproductosCRM();
        //Teniendo el listado de productos ahora voy a obtener el stock de los productos.
        let listadoproductos = [];
        for (let item of productossap) {
            item.stock = await stockproductocrm(item.codigo, null);
            item.lotesuio = await obtenerstockproductoscrm(item.codigo, 'UIO');
            item.lotesgye = await obtenerstockproductoscrm(item.codigo, 'GYE');
        }
        for (let item of productoscrm) {
            item.stock = await stockproductocrm(null, item.codigo);
            //Obtengo los lotes del producto
            item.lotesuio = await obtenerstockproductoscrm(item.codigo, 'UIO');
            item.lotesgye = await obtenerstockproductoscrm(item.codigo, 'GYE');
        }
        let datos = [
            ...productossap,
            ...productoscrm
        ]
        result(null, datos);
        //console.log(productossap[1]);
    } catch (error) {
        console.error("No se ha podido consultar el stock de las muestras:", error);
        result(error, null);
    }
}
function obtenerroadmapsolicitud(auxidsolicitud) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_roadmapsolicitud(?)',
            [
                auxidsolicitud
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res[0]);
            }
        );
    });
}
muestras.obtenerroadmap = async function (aux, result) {
    try {
        const roadmap = await obtenerroadmapsolicitud(aux);

        result(null, roadmap);
    } catch (error) {
        console.error("No se ha podido consultar el stock de las muestras:", error);
        result(error, null);
    }
}
function obtenermuestrasdespachadas(auxciudad) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_listarmuestrasdespachadas(?)',
            [
                auxciudad
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res[0]);
            }
        );
    });
}
muestras.listarmuestrasdespachadasbodega = async function (auxciudad, result) {
    try {
        const listado = await obtenermuestrasdespachadas(auxciudad);
        const listadoclientes = await listarclientesap(0);
        const productossap = await listarproductossap();

        for (let item of listado) {
            item.cardname = listadoclientes.find(p => p.CardCode === item.cardcode).CardName;
            if (item.idproductocrm == null) {
                item.nombreproducto = productossap.find(p => p.codigo === item.idproductosap).nombre;
            }
            item.lotes = await obtenerlotesdespachados(item.idmm_solicitudmuestra, item.bodegadespacho);
            //listado.listadodespachar.push(item);
        }
        //console.log(listado);

        result(null, listado);
    } catch (error) {
        console.error("No se ha podido consultar el stock de las muestras:", error);
        result(error, null);
    }
}

function cambiarestadomuestra(auxestado, auxidsolicitud, auxcomentario, auxresponsable) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_actualizarestado(?,?,?,?)',
            [
                auxestado,
                auxcomentario,
                auxidsolicitud,
                auxresponsable
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res[0]);
            }
        );
    });
}

muestras.cambiarestadomuestra = async function (auxdatos, result) {
    try {
        const resp = await cambiarestadomuestra(auxdatos.estado, auxdatos.idsolicitud, auxdatos.comentario, auxdatos.responsable);
        //console.log(resp);

        let dat = {
            ingresado: resp[0].respuesta,
            mess: resp[0].mess
        }
        result(null, dat);
    } catch (err) {
        console.error("No se ha podido actualizar el estado:", err);
        result(err, null);
    }
}

function listarmuestrasfacturacion(auxciudad) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_listarmuestrasfacturacion(?)',
            [
                auxciudad
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res[0]);
            }
        );
    });
}

muestras.listarmuestrasfacturacion = async function (auxdatos, result) {
    try {
        const listado = await listarmuestrasfacturacion(auxdatos);
        const listadoclientes = await listarclientesap(0);
        const productossap = await listarproductossap();

        for (let item of listado) {
            item.cardname = listadoclientes.find(p => p.CardCode === item.cardcode).CardName;
            item.isselect = false;

            if (item.idproductocrm == null) {
                item.nombreproducto = productossap.find(p => p.codigo === item.idproductosap).nombre;
                item.pvpmin = productossap.find(p => p.codigo === item.idproductosap).PVPMIN;
                item.rate = productossap.find(p => p.codigo === item.idproductosap).Rate;
            }
            item.lotes = await obtenerlotesdespachados(item.idmm_solicitudmuestra, item.bodegadespacho);
            //listado.listadodespachar.push(item);
        }
        result(null, listado);
    } catch (err) {
        console.error("No se ha podido actualizar el estado:", err);
        result(err, null);
    }
}

function actualizarmuestrasfacturacion(auxidmuestras) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            'CALL mm_actualizarmuestrasfacturacion(?)',
            [
                auxidmuestras
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res[0]);
            }
        );
    });
}

muestras.actualizarmuestrasfacturacion = async function (auxmuestrasfacturar, result) {
    try {
        const listado = await listarmuestrasfacturacion(auxdatos);



        for (let item of listado) {
            item.cardname = listadoclientes.find(p => p.CardCode === item.cardcode).CardName;
            item.isselect = false;

            if (item.idproductocrm == null) {
                item.nombreproducto = productossap.find(p => p.codigo === item.idproductosap).nombre;
                item.pvpmin = productossap.find(p => p.codigo === item.idproductosap).PVPMIN;
                item.rate = productossap.find(p => p.codigo === item.idproductosap).Rate;
            }
            item.lotes = await obtenerlotesdespachados(item.idmm_solicitudmuestra, item.bodegadespacho);
            //listado.listadodespachar.push(item);
        }
        result(null, listado);
    } catch (err) {
        console.error("No se ha podido actualizar el estado:", err);
        result(err, null);
    }
}

async function enviarmensajewaha(auxtelefone, message) {
    try {
        console.log("Voy a enviar la notificacion por whatsapp");

        const response = await axios.post(
            'http://192.168.40.2:3000/api/sendText',
            {
                session: 'default',
                chatId: auxtelefone + '@c.us',
                text: message
            },
            {
                headers: {
                    'X-Api-Key': 'c004fcfdc9a74621b315518436b6937f'
                }
            }
        );
    } catch (err) {
        console.log(err);

    }
}
//Funcion para listar los productos que se deben considerar con conteo por millares.
function obteneritemcodeprodmillarsap(result) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT T0."ItemCode" FROM "EC_SBO_MINERVA_PRO".OITM T0 WHERE T0."SalUnitMsr" ='MIL' and T0."validFor" =  'Y';
        `;
        const conn = hana.createConnection();

        conn.connect(dbConnHana, (err) => {
            if (err) return reject(err);

            conn.exec(query, (err, res) => {
                conn.disconnect();
                if (err) return reject(err);
                resolve(res);
            });
        });
    });
}
muestras.listarproductosmillares = async function (result) {
    try{
        const list = await obteneritemcodeprodmillarsap();

        result(null, list);
    }catch(error){
        console.log(error);
        result(error, null);
    }
}

// Función para obtener los datos de una muestra por ID para modo edición
muestras.obtenermuestraxid = async function (idmuestra, result) {
    try {
        const query = "SELECT * FROM mm_muestra WHERE idmm_muestra = ?";
        dbConnMySQL.query(query, [idmuestra], async function (err, res) {
            if (err) {
                console.error("Error MySQL obtenermuestraxid:", err);
                return result(err, null);
            }
            const json = JSON.parse(JSON.stringify(res));
            if (!json || json.length === 0) {
                return result(null, null);
            }

            const element = json[0];
            let nombreproducto = '';
            let codigoproducto = element.idproductosap || element.idproductocrm || '';

            if (element.idproductosap != null) {
                try {
                    const listadoproductossap = await listarproductossap();
                    const prod = listadoproductossap.find(p => p.codigo === element.idproductosap);
                    if (prod) {
                        nombreproducto = prod.nombre;
                    }
                } catch (e) {
                    console.error("Error obteniendo producto SAP:", e);
                }
            } else if (element.idproductocrm != null) {
                try {
                    const listadoproductoscrm = await obtenerproductosCRM();
                    const prod = listadoproductoscrm.find(p => p.codigo === element.idproductocrm);
                    if (prod) {
                        nombreproducto = prod.nombre;
                    }
                } catch (e) {
                    console.error("Error obteniendo producto CRM:", e);
                }
            }

            let proveedor = null;
            if (element.idproveedorsap != null) {
                proveedor = {
                    codigo: element.idproveedorsap,
                    origen: 'SAP'
                };
            } else if (element.idproveedorcrm != null) {
                proveedor = {
                    codigo: element.idproveedorcrm,
                    origen: 'CRM'
                };
            }

            const data = {
                idmm_muestra: element.idmm_muestra,
                nombreproducto: nombreproducto || element.nombrereferencial || '',
                codigoproducto: codigoproducto,
                idproductocrm: element.idproductocrm,
                idproductosap: element.idproductosap,
                idproveedorcrm: element.idproveedorcrm,
                idproveedorsap: element.idproveedorsap,
                proveedor: proveedor,
                cantidad: element.cantidad,
                unidad: 2,
                ciudad: element.ciudad,
                nombrereferencial: element.nombrereferencial,
                fraccionar: element.fraccionar || 'NO',
                comentario_fraccionar: element.comentario_fraccionar || ''
            };

            result(null, data);
        });
    } catch (error) {
        console.error("Error obtenermuestraxid:", error);
        result(error, null);
    }
};

// Función para actualizar una muestra por ID (PUT/PATCH)
muestras.actualizarmuestra = function (idmuestra, aux, result) {
    try {
        const query = `
            UPDATE mm_muestra 
            SET idproveedorcrm = ?, 
                idproveedorsap = ?, 
                cantidad = ?, 
                ciudad = ?, 
                nombrereferencial = ?,
                fraccionar = ?,
                comentario_fraccionar = ?
            WHERE idmm_muestra = ?
        `;
        const params = [
            aux.idproveedorcrm !== undefined ? aux.idproveedorcrm : null,
            aux.idproveedorsap !== undefined ? aux.idproveedorsap : null,
            aux.cantidad,
            aux.ciudad,
            aux.nombrereferencial || aux.nombreproducto || null,
            aux.fraccionar === 'SI' ? 'SI' : 'NO',
            aux.fraccionar === 'SI' ? (aux.comentario_fraccionar || aux.comentario || '') : null,
            idmuestra
        ];

        console.log("⚡ [MYSQL] Ejecutando UPDATE mm_muestra con parámetros:", params);
        dbConnMySQL.query(query, params, function (err, res) {
            if (err) {
                console.error("❌ [MYSQL] Error en UPDATE mm_muestra:", err);
                return result(err, null);
            }
            console.log("⚡ [MYSQL] Resultado UPDATE mm_muestra:", res);
            if (res.affectedRows === 0) {
                console.warn(`⚠️ [MYSQL] No se encontró ninguna muestra con idmm_muestra = ${idmuestra}`);
                return result(null, { respuesta: false, message: `No se encontró la muestra con ID ${idmuestra}` });
            }

            // Si se envió un nuevo nombre de producto, verificar si la muestra está asociada a un producto CRM (mm_productocrm)
            if (aux.nombreproducto) {
                const queryProd = `
                    UPDATE mm_productocrm p
                    INNER JOIN mm_muestra m ON m.idproductocrm = p.idproductocrm
                    SET p.nombreproducto = ?
                    WHERE m.idmm_muestra = ?
                `;
                dbConnMySQL.query(queryProd, [aux.nombreproducto, idmuestra], function (errProd, resProd) {
                    if (errProd) {
                        console.error("⚠️ [MYSQL] Error al actualizar mm_productocrm:", errProd);
                    } else {
                        console.log("⚡ [MYSQL] Resultado UPDATE mm_productocrm:", resProd);
                    }
                    return result(null, { respuesta: true, message: "Muestra actualizada correctamente", affectedRows: res.affectedRows });
                });
            } else {
                return result(null, { respuesta: true, message: "Muestra actualizada correctamente", affectedRows: res.affectedRows });
            }
        });
    } catch (error) {
        console.error("Error actualizarmuestra:", error);
        result(error, null);
    }
};

// Helper para registrar auditoría de eliminaciones catalogada por módulos
function registrarAuditoriaEliminacion(datosAuditoria) {
    return new Promise((resolve) => {
        // Asegurar que la tabla auditoria_eliminaciones exista
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS auditoria_eliminaciones (
                idauditoria INT AUTO_INCREMENT PRIMARY KEY,
                modulo VARCHAR(50) NOT NULL COMMENT 'Módulo de origen',
                tipo_registro VARCHAR(100) NOT NULL COMMENT 'ELIMINACION_MUESTRA, ELIMINACION_PRODUCTO_CRM, ELIMINACION_PROVEEDOR_CRM',
                id_referencia INT NOT NULL COMMENT 'ID del registro principal (idmm_muestra, idproductocrm)',
                codigo_referencia VARCHAR(100) NULL COMMENT 'Código SAP (ItemCode) o Código CRM',
                nombre_referencia VARCHAR(255) NULL COMMENT 'Nombre de la muestra o producto',
                usuario VARCHAR(100) NOT NULL COMMENT 'Usuario que ejecutó la acción',
                fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora exacta',
                motivo TEXT NULL COMMENT 'Motivo u observación ingresada',
                detalle JSON NULL COMMENT 'Snapshot con datos complementarios (proveedor, cantidad, ciudad, etc.)'
            );
        `;
        dbConnMySQL.query(createTableQuery, (errTable) => {
            if (errTable) {
                console.error("⚠️ [AUDITORIA] Error verificando tabla auditoria_eliminaciones:", errTable);
            }
            const queryInsert = `
                INSERT INTO auditoria_eliminaciones 
                (modulo, tipo_registro, id_referencia, codigo_referencia, nombre_referencia, usuario, fecha_hora, motivo, detalle)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
            `;
            const params = [
                datosAuditoria.modulo || 'MUESTRAS',
                datosAuditoria.tipo_registro,
                datosAuditoria.id_referencia,
                datosAuditoria.codigo_referencia || null,
                datosAuditoria.nombre_referencia || null,
                datosAuditoria.usuario || 'desconocido',
                datosAuditoria.motivo || null,
                datosAuditoria.detalle ? (typeof datosAuditoria.detalle === 'string' ? datosAuditoria.detalle : JSON.stringify(datosAuditoria.detalle)) : null
            ];
            dbConnMySQL.query(queryInsert, params, (errInsert, resInsert) => {
                if (errInsert) {
                    console.error("⚠️ [AUDITORIA] Error registrando en auditoria_eliminaciones:", errInsert);
                } else {
                    console.log(`✅ [AUDITORIA] Registro guardado en auditoria_eliminaciones ID ${resInsert.insertId}: [${datosAuditoria.tipo_registro}]`);
                }
                resolve(true);
            });
        });
    });
}

// Función para eliminar directamente el ingreso de la muestra en mm_muestra (si iscomplete = 0)
// Regla 2: No afecta ni elimina al producto en CRM
muestras.anularmuestra = function (datos, result) {
    try {
        const idmuestra = Number(datos.id || datos.idmuestra || datos.idmm_muestra);
        const usuarioEliminacion = datos.usuario || datos.usuario_eliminacion || datos.responsable || 'desconocido';
        const motivoEliminacion = (datos.motivo || datos.motivo_eliminacion || '').toString().trim();

        console.log("➡️ [BACKEND] anularmuestra datos recibidos:", { idmuestra, usuarioEliminacion, motivoEliminacion });

        if (!idmuestra || isNaN(idmuestra)) {
            console.error("❌ [BACKEND] ID de muestra inválido:", datos);
            return result({ message: "ID de muestra no proporcionado o inválido" }, null);
        }

        if (!motivoEliminacion) {
            console.warn("⚠️ [BACKEND] Motivo de eliminación de muestra no proporcionado");
            return result(null, { respuesta: false, message: "El motivo de eliminación es obligatorio para anular la muestra." });
        }

        // 1. Validar que la muestra exista y verificar su estado y origen
        const queryCheck = "SELECT * FROM mm_muestra WHERE idmm_muestra = ?";
        dbConnMySQL.query(queryCheck, [idmuestra], async function (errCheck, resCheck) {
            if (errCheck) {
                console.error("❌ [MYSQL] Error verificando muestra:", errCheck);
                return result(errCheck, null);
            }

            if (!resCheck || resCheck.length === 0) {
                console.warn(`⚠️ [MYSQL] No se encontró la muestra con ID ${idmuestra}`);
                return result(null, { respuesta: false, message: `No se encontró la muestra con ID ${idmuestra}` });
            }

            const muestraData = resCheck[0];
            const isComplete = muestraData.iscomplete === 1 || muestraData.iscomplete === true || muestraData.iscomplete === '1';

            // Regla 2: Solo eliminar muestras en iscomplete = 0. Si iscomplete = 1, emitir alerta de restricción.
            if (isComplete) {
                console.warn(`⚠️ [MYSQL] Muestra ID ${idmuestra} tiene iscomplete = 1 (ya ubicada / enlazada a transacciones).`);
                return result(null, {
                    respuesta: false,
                    message: "No se puede eliminar porque la muestra ya está enlazada a transacciones (ya fue ubicada)."
                });
            }

            const idproductocrm = muestraData.idproductocrm;
            const idproductosap = muestraData.idproductosap;
            const nombreProducto = datos.producto || muestraData.nombrereferencial || 'Muestra sin nombre';
            const codigoProducto = idproductosap || (idproductocrm ? `CRM-${idproductocrm}` : null);

            // 2. Registrar auditoría de la eliminación de muestra en auditoria_eliminaciones
            await registrarAuditoriaEliminacion({
                modulo: 'MUESTRAS',
                tipo_registro: 'ELIMINACION_MUESTRA',
                id_referencia: idmuestra,
                codigo_referencia: codigoProducto,
                nombre_referencia: nombreProducto,
                usuario: usuarioEliminacion,
                motivo: motivoEliminacion,
                detalle: {
                    idmuestra: idmuestra,
                    producto: nombreProducto,
                    codigo: codigoProducto,
                    cantidad: datos.cantidad || muestraData.cantidad || null,
                    ciudad: datos.ciudad || muestraData.ciudad || null,
                    proveedor: datos.proveedor || null,
                    origen: idproductosap ? 'SAP' : 'CRM'
                }
            });

            // 3. Regla 2: Eliminación directa de la muestra en mm_muestra (SIN tocar mm_productocrm)
            const queryEliminarMuestra = "DELETE FROM mm_muestra WHERE idmm_muestra = ?";
            console.log(`⚡ [MYSQL] Eliminando directamente muestra ID ${idmuestra} (iscomplete = 0)`);

            dbConnMySQL.query(queryEliminarMuestra, [idmuestra], function (errDel, resDel) {
                if (errDel) {
                    console.error("❌ [MYSQL] Error al eliminar muestra de mm_muestra:", errDel);
                    return result(errDel, null);
                }

                console.log(`✅ [MYSQL] Resultado DELETE mm_muestra:`, resDel);
                if (resDel.affectedRows === 0) {
                    return result(null, {
                        respuesta: false,
                        message: "No se encontró o no se pudo eliminar la muestra."
                    });
                }

                return result(null, {
                    respuesta: true,
                    message: "Ingreso de muestra eliminado correctamente. El catálogo de productos no ha sido afectado.",
                    affectedRows: resDel.affectedRows
                });
            });
        });
    } catch (error) {
        console.error("Error en anularmuestra:", error);
        result(error, null);
    }
};

// Regla 1: Eliminar un producto de CRM siempre y cuando no esté referenciado en mm_muestra
muestras.eliminarproductocrm = function (datos, result) {
    try {
        const idproductocrm = Number(datos.id || datos.idproductocrm);
        const usuarioEliminacion = datos.usuario || datos.responsable || 'desconocido';
        const motivoEliminacion = (datos.motivo || '').toString().trim();

        console.log("➡️ [BACKEND] eliminarproductocrm datos recibidos:", { idproductocrm, usuarioEliminacion, motivoEliminacion });

        if (!idproductocrm || isNaN(idproductocrm)) {
            console.error("❌ [BACKEND] ID de producto CRM inválido:", datos);
            return result({ message: "ID de producto CRM no proporcionado o inválido" }, null);
        }

        if (!motivoEliminacion) {
            console.warn("⚠️ [BACKEND] Motivo de eliminación de producto CRM no proporcionado");
            return result(null, { respuesta: false, message: "El motivo de eliminación es obligatorio para eliminar el producto." });
        }

        // 1. Validar que el producto no esté referenciado en mm_muestra (solicitada o ingresada para ubicación)
        const queryCheckMuestra = "SELECT COUNT(*) AS total FROM mm_muestra WHERE idproductocrm = ?";
        dbConnMySQL.query(queryCheckMuestra, [idproductocrm], function (errMuestra, resMuestra) {
            if (errMuestra) {
                console.error("❌ [MYSQL] Error verificando referencias en mm_muestra:", errMuestra);
                return result(errMuestra, null);
            }

            const totalMuestras = resMuestra && resMuestra[0] ? resMuestra[0].total : 0;
            if (totalMuestras > 0) {
                console.warn(`⚠️ [MYSQL] No se puede eliminar producto CRM ${idproductocrm} porque tiene ${totalMuestras} muestras asociadas.`);
                return result(null, {
                    respuesta: false,
                    message: `No se puede eliminar el producto porque tiene ${totalMuestras} muestra(s) solicitada(s) o ingresada(s) para ubicación.`
                });
            }

            // 2. Obtener datos del producto para la auditoría
            const queryGetProd = "SELECT nombreproducto FROM mm_productocrm WHERE idproductocrm = ?";
            dbConnMySQL.query(queryGetProd, [idproductocrm], async function (errProd, resProd) {
                if (errProd) {
                    console.error("❌ [MYSQL] Error consultando producto CRM:", errProd);
                    return result(errProd, null);
                }

                if (!resProd || resProd.length === 0) {
                    return result(null, {
                        respuesta: false,
                        message: `No se encontró el producto CRM con ID ${idproductocrm}`
                    });
                }

                const nombreProducto = resProd[0].nombreproducto;

                // 3. Registrar auditoría en auditoria_eliminaciones
                await registrarAuditoriaEliminacion({
                    modulo: 'MUESTRAS',
                    tipo_registro: 'ELIMINACION_PRODUCTO_CRM',
                    id_referencia: idproductocrm,
                    codigo_referencia: `CRM-${idproductocrm}`,
                    nombre_referencia: nombreProducto,
                    usuario: usuarioEliminacion,
                    motivo: motivoEliminacion,
                    detalle: {
                        accion: 'ELIMINACION_DEFINITIVA_CATALOGO',
                        total_muestras_asociadas: 0
                    }
                });

                // 4. Eliminar directamente de mm_productocrm
                const queryDeleteProd = "DELETE FROM mm_productocrm WHERE idproductocrm = ?";
                dbConnMySQL.query(queryDeleteProd, [idproductocrm], function (errDel, resDel) {
                    if (errDel) {
                        console.error("❌ [MYSQL] Error al eliminar producto en mm_productocrm:", errDel);
                        return result(errDel, null);
                    }

                    console.log(`✅ [MYSQL] Producto CRM ID ${idproductocrm} eliminado correctamente.`);
                    return result(null, {
                        respuesta: true,
                        message: `Producto "${nombreProducto}" eliminado correctamente del catálogo CRM.`,
                        affectedRows: resDel.affectedRows
                    });
                });
            });
        });
    } catch (error) {
        console.error("Error en eliminarproductocrm:", error);
        result(error, null);
    }
};

// Función para listar todos los productos creados en CRM con conteo de muestras vinculadas
muestras.listarproductoscrmcompleto = function (result) {
    try {
        dbConnMySQL.query("SHOW COLUMNS FROM mm_productocrm", (errCols, resCols) => {
            const columnas = (!errCols && resCols && Array.isArray(resCols))
                ? resCols.map(c => c.Field.toLowerCase())
                : [];

            let campoCategoria = 'NULL AS idcategoriasap';
            if (columnas.includes('idtipocategoria')) {
                campoCategoria = 'p.idtipocategoria AS idcategoriasap';
            } else if (columnas.includes('idcategoriasap')) {
                campoCategoria = 'p.idcategoriasap';
            } else if (columnas.includes('idcategoria')) {
                campoCategoria = 'p.idcategoria AS idcategoriasap';
            } else if (columnas.includes('categoria')) {
                campoCategoria = 'p.categoria AS idcategoriasap';
            }

            let campoUsuarioAct = columnas.includes('usuario_actualizacion') ? 'p.usuario_actualizacion' : 'NULL AS usuario_actualizacion';
            let campoFechaAct = columnas.includes('fecha_actualizacion') ? 'p.fecha_actualizacion' : 'NULL AS fecha_actualizacion';
            let campoMotivoAct = columnas.includes('motivo_actualizacion') ? 'p.motivo_actualizacion' : 'NULL AS motivo_actualizacion';

            let whereClauses = [];
            if (columnas.includes('issap')) {
                whereClauses.push('(p.issap = false OR p.issap = 0 OR p.issap IS NULL)');
            }
            if (columnas.includes('itemcodesap')) {
                whereClauses.push('(p.itemcodesap IS NULL OR p.itemcodesap = "")');
            }
            const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

            const query = `
                SELECT 
                    p.idproductocrm,
                    p.nombreproducto,
                    ${campoCategoria},
                    ${campoUsuarioAct},
                    ${campoFechaAct},
                    ${campoMotivoAct},
                    COALESCE((
                        SELECT GROUP_CONCAT(DISTINCT m.ciudad SEPARATOR ', ')
                        FROM mm_muestra m
                        WHERE m.idproductocrm = p.idproductocrm AND m.ciudad IS NOT NULL AND m.ciudad != ''
                    ), 'Sin bodega') AS bodega,
                    COALESCE((
                        SELECT m.cantidad
                        FROM mm_muestra m
                        WHERE m.idproductocrm = p.idproductocrm
                        ORDER BY m.idmm_muestra DESC
                        LIMIT 1
                    ), 0) AS peso_muestra,
                    (
                        COALESCE((
                            SELECT SUM(os.cantidad)
                            FROM mm_lotemuestra lm
                            INNER JOIN mm_operacionstock os ON lm.idmm_lotemuestra = os.idingresolotemuestra
                            WHERE lm.idproductocrm = p.idproductocrm AND lm.ciudadarribo = 'UIO' AND os.idtipooperacionstock = 1
                        ), 0)
                        -
                        COALESCE((
                            SELECT SUM(os.cantidad)
                            FROM mm_solicitudmuestra sm
                            INNER JOIN mm_operacionstock os ON sm.idmm_solicitudmuestra = os.idsolicitudmuestra
                            WHERE sm.idproductocrm = p.idproductocrm AND sm.ciudadsalida = 'UIO' AND os.idtipooperacionstock IN (2, 3)
                        ), 0)
                    ) AS stock_uio,
                    (
                        COALESCE((
                            SELECT SUM(os.cantidad)
                            FROM mm_lotemuestra lm
                            INNER JOIN mm_operacionstock os ON lm.idmm_lotemuestra = os.idingresolotemuestra
                            WHERE lm.idproductocrm = p.idproductocrm AND lm.ciudadarribo = 'GYE' AND os.idtipooperacionstock = 1
                        ), 0)
                        -
                        COALESCE((
                            SELECT SUM(os.cantidad)
                            FROM mm_solicitudmuestra sm
                            INNER JOIN mm_operacionstock os ON sm.idmm_solicitudmuestra = os.idsolicitudmuestra
                            WHERE sm.idproductocrm = p.idproductocrm AND sm.ciudadsalida = 'GYE' AND os.idtipooperacionstock IN (2, 3)
                        ), 0)
                    ) AS stock_gye,
                    (
                        (
                            COALESCE((
                                SELECT SUM(os.cantidad)
                                FROM mm_lotemuestra lm
                                INNER JOIN mm_operacionstock os ON lm.idmm_lotemuestra = os.idingresolotemuestra
                                WHERE lm.idproductocrm = p.idproductocrm AND lm.ciudadarribo = 'UIO' AND os.idtipooperacionstock = 1
                            ), 0)
                            -
                            COALESCE((
                                SELECT SUM(os.cantidad)
                                FROM mm_solicitudmuestra sm
                                INNER JOIN mm_operacionstock os ON sm.idmm_solicitudmuestra = os.idsolicitudmuestra
                                WHERE sm.idproductocrm = p.idproductocrm AND sm.ciudadsalida = 'UIO' AND os.idtipooperacionstock IN (2, 3)
                            ), 0)
                        )
                        +
                        (
                            COALESCE((
                                SELECT SUM(os.cantidad)
                                FROM mm_lotemuestra lm
                                INNER JOIN mm_operacionstock os ON lm.idmm_lotemuestra = os.idingresolotemuestra
                                WHERE lm.idproductocrm = p.idproductocrm AND lm.ciudadarribo = 'GYE' AND os.idtipooperacionstock = 1
                            ), 0)
                            -
                            COALESCE((
                                SELECT SUM(os.cantidad)
                                FROM mm_solicitudmuestra sm
                                INNER JOIN mm_operacionstock os ON sm.idmm_solicitudmuestra = os.idsolicitudmuestra
                                WHERE sm.idproductocrm = p.idproductocrm AND sm.ciudadsalida = 'GYE' AND os.idtipooperacionstock IN (2, 3)
                            ), 0)
                        )
                    ) AS stock_total,
                    (SELECT COUNT(*) FROM mm_muestra m WHERE m.idproductocrm = p.idproductocrm) AS total_muestras
                FROM mm_productocrm p
                ${whereSQL}
                ORDER BY p.idproductocrm DESC;
            `;

            dbConnMySQL.query(query, (err, res) => {
                if (err) {
                    console.error("❌ [MYSQL] Error en query principal listarproductoscrmcompleto:", err);
                    // Fallback sin subquery por si mm_muestra tiene alguna inconsistencia
                    const fallbackQuery = `
                        SELECT 
                            p.idproductocrm,
                            p.nombreproducto,
                            ${campoCategoria},
                            ${campoUsuarioAct},
                            ${campoFechaAct},
                            ${campoMotivoAct},
                            'Sin bodega' AS bodega,
                            0 AS peso_muestra,
                            0 AS stock_uio,
                            0 AS stock_gye,
                            0 AS stock_total,
                            0 AS total_muestras
                        FROM mm_productocrm p
                        ${whereSQL}
                        ORDER BY p.idproductocrm DESC;
                    `;
                    return dbConnMySQL.query(fallbackQuery, (errFb, resFb) => {
                        if (errFb) {
                            console.error("❌ [MYSQL] Error en fallback query:", errFb);
                            return result(errFb, null);
                        }
                        return result(null, JSON.parse(JSON.stringify(resFb)));
                    });
                }
                return result(null, JSON.parse(JSON.stringify(res)));
            });
        });
    } catch (error) {
        console.error("Error en listarproductoscrmcompleto:", error);
        result(error, null);
    }
};

// Función para actualizar los datos de un producto CRM (nombre, categoría SAP y auditoría)
muestras.actualizarproductocrm = function (id, datos, result) {
    try {
        const idproductocrm = Number(id || datos.idproductocrm || datos.id);
        const nombreproducto = (datos.nombreproducto || '').trim().toUpperCase();
        const idcategoriasap = (datos.idcategoriasap !== undefined && datos.idcategoriasap !== null && datos.idcategoriasap !== '') 
            ? Number(datos.idcategoriasap) 
            : null;
        const usuario_actualizacion = (datos.usuario_actualizacion || datos.usuario || datos.responsable || 'desconocido').toString().trim();
        const motivo_actualizacion = (datos.motivo_actualizacion || datos.motivo || '').toString().trim();

        if (!idproductocrm || !nombreproducto) {
            return result({ message: "ID y nombre del producto son requeridos" }, null);
        }

        if (!motivo_actualizacion) {
            return result(null, { respuesta: false, message: "El motivo de actualización es obligatorio." });
        }

        dbConnMySQL.query("SHOW COLUMNS FROM mm_productocrm", (errCols, resCols) => {
            const columnas = (!errCols && resCols && Array.isArray(resCols))
                ? resCols.map(c => c.Field.toLowerCase())
                : [];

            let updateFields = ["nombreproducto = ?"];
            let params = [nombreproducto];

            if (columnas.includes('idtipocategoria')) {
                updateFields.push("idtipocategoria = ?");
                params.push(idcategoriasap);
            } else if (columnas.includes('idcategoriasap')) {
                updateFields.push("idcategoriasap = ?");
                params.push(idcategoriasap);
            } else if (columnas.includes('idcategoria')) {
                updateFields.push("idcategoria = ?");
                params.push(idcategoriasap);
            }

            if (columnas.includes('usuario_actualizacion')) {
                updateFields.push("usuario_actualizacion = ?");
                params.push(usuario_actualizacion);
            }
            if (columnas.includes('fecha_actualizacion')) {
                updateFields.push("fecha_actualizacion = NOW()");
            }
            if (columnas.includes('motivo_actualizacion')) {
                updateFields.push("motivo_actualizacion = ?");
                params.push(motivo_actualizacion);
            }

            params.push(idproductocrm);
            const query = `UPDATE mm_productocrm SET ${updateFields.join(', ')} WHERE idproductocrm = ?`;

            console.log("⚡ [MYSQL] Ejecutando UPDATE mm_productocrm con parámetros:", params);
            dbConnMySQL.query(query, params, (err, res) => {
                if (err) {
                    console.error("❌ [MYSQL] Error al actualizar producto CRM:", err);
                    return result(err, null);
                }
                if (res.affectedRows === 0) {
                    return result(null, { respuesta: false, message: "No se encontró el producto a actualizar." });
                }
                return result(null, {
                    respuesta: true,
                    message: "Producto CRM actualizado correctamente.",
                    affectedRows: res.affectedRows
                });
            });
        });
    } catch (error) {
        console.error("Error en actualizarproductocrm:", error);
        result(error, null);
    }
};

// Listar proveedores de CRM con conteo de muestras vinculadas y datos de auditoría
muestras.listarproveedorescrmcompleto = function (result) {
    try {
        const query = `
            SELECT 
                p.idmm_proveedor,
                p.nombre,
                COALESCE(p.activo, 1) AS activo,
                p.usuario_inactiva,
                p.fecha_inactiva,
                p.motivo_inactiva,
                p.usuario_reactiva,
                p.fecha_reactiva,
                p.motivo_reactiva,
                'CRM' AS origen,
                (SELECT COUNT(*) FROM mm_muestra m WHERE m.idproveedorcrm = p.idmm_proveedor) AS total_muestras
            FROM mm_proveedor p
            WHERE (p.issap = 0 OR p.issap IS NULL OR p.issap = false)
            ORDER BY COALESCE(p.activo, 1) DESC, p.idmm_proveedor DESC;
        `;
        dbConnMySQL.query(query, (err, res) => {
            if (err) {
                console.error("❌ [MYSQL] Error al listar proveedores CRM completos:", err);
                return result(err, null);
            }
            return result(null, JSON.parse(JSON.stringify(res)));
        });
    } catch (error) {
        console.error("Error en listarproveedorescrmcompleto:", error);
        result(error, null);
    }
};

// Inactivar un proveedor de CRM guardando usuario, fecha y motivo
muestras.inactivarproveedorcrm = function (datos, result) {
    try {
        const idmm_proveedor = Number(datos.id || datos.idmm_proveedor || datos.idproveedorcrm);
        const usuario = (datos.usuario || datos.responsable || 'desconocido').toString().trim();
        const motivo = (datos.motivo || '').toString().trim();

        console.log("➡️ [BACKEND] inactivarproveedorcrm datos recibidos:", { idmm_proveedor, usuario, motivo });

        if (!idmm_proveedor || isNaN(idmm_proveedor)) {
            return result({ message: "ID de proveedor CRM no proporcionado o inválido" }, null);
        }

        if (!motivo) {
            return result(null, { respuesta: false, message: "El motivo de inactivación es obligatorio." });
        }

        const query = `
            UPDATE mm_proveedor 
            SET activo = 0, 
                usuario_inactiva = ?, 
                fecha_inactiva = NOW(), 
                motivo_inactiva = ? 
            WHERE idmm_proveedor = ? AND (issap = 0 OR issap IS NULL)
        `;

        dbConnMySQL.query(query, [usuario, motivo, idmm_proveedor], (err, res) => {
            if (err) {
                console.error("❌ [MYSQL] Error al inactivar proveedor CRM:", err);
                return result(err, null);
            }
            if (res.affectedRows === 0) {
                return result(null, { respuesta: false, message: "No se encontró el proveedor a inactivar." });
            }
            return result(null, {
                respuesta: true,
                message: "Proveedor inactivado correctamente.",
                affectedRows: res.affectedRows
            });
        });
    } catch (error) {
        console.error("Error en inactivarproveedorcrm:", error);
        result(error, null);
    }
};

// Reactivar un proveedor de CRM guardando usuario, fecha y motivo
muestras.reactivarproveedorcrm = function (datos, result) {
    try {
        const idmm_proveedor = Number(datos.id || datos.idmm_proveedor || datos.idproveedorcrm);
        const usuario = (datos.usuario || datos.responsable || 'desconocido').toString().trim();
        const motivo = (datos.motivo || '').toString().trim();

        console.log("➡️ [BACKEND] reactivarproveedorcrm datos recibidos:", { idmm_proveedor, usuario, motivo });

        if (!idmm_proveedor || isNaN(idmm_proveedor)) {
            return result({ message: "ID de proveedor CRM no proporcionado o inválido" }, null);
        }

        if (!motivo) {
            return result(null, { respuesta: false, message: "El motivo de reactivación es obligatorio." });
        }

        const query = `
            UPDATE mm_proveedor 
            SET activo = 1, 
                usuario_reactiva = ?, 
                fecha_reactiva = NOW(), 
                motivo_reactiva = ? 
            WHERE idmm_proveedor = ? AND (issap = 0 OR issap IS NULL)
        `;

        dbConnMySQL.query(query, [usuario, motivo, idmm_proveedor], (err, res) => {
            if (err) {
                console.error("❌ [MYSQL] Error al reactivar proveedor CRM:", err);
                return result(err, null);
            }
            if (res.affectedRows === 0) {
                return result(null, { respuesta: false, message: "No se encontró el proveedor a reactivar." });
            }
            return result(null, {
                respuesta: true,
                message: "Proveedor reactivado correctamente.",
                affectedRows: res.affectedRows
            });
        });
    } catch (error) {
        console.error("Error en reactivarproveedorcrm:", error);
        result(error, null);
    }
};

// Actualizar el nombre de un proveedor de CRM
muestras.actualizarproveedorcrm = function (id, datos, result) {
    try {
        const idmm_proveedor = Number(id || datos.idmm_proveedor || datos.id);
        const nombre = (datos.nombre || '').trim().toUpperCase();

        if (!idmm_proveedor || !nombre) {
            return result({ message: "ID y nombre del proveedor son requeridos" }, null);
        }

        const query = "UPDATE mm_proveedor SET nombre = ? WHERE idmm_proveedor = ?";
        dbConnMySQL.query(query, [nombre, idmm_proveedor], (err, res) => {
            if (err) {
                console.error("❌ [MYSQL] Error al actualizar proveedor CRM:", err);
                return result(err, null);
            }
            if (res.affectedRows === 0) {
                return result(null, { respuesta: false, message: "No se encontró el proveedor a actualizar." });
            }
            return result(null, {
                respuesta: true,
                message: "Proveedor CRM actualizado correctamente.",
                affectedRows: res.affectedRows
            });
        });
    } catch (error) {
        console.error("Error en actualizarproveedorcrm:", error);
        result(error, null);
    }
};

// Eliminar un proveedor de CRM siempre y cuando no esté referenciado en mm_muestra
muestras.eliminarproveedorcrm = function (datos, result) {
    try {
        const idproveedorcrm = Number(datos.id || datos.idmm_proveedor || datos.idproveedorcrm);
        const usuarioEliminacion = datos.usuario || datos.responsable || 'desconocido';
        const motivoEliminacion = (datos.motivo || '').toString().trim();

        console.log("➡️ [BACKEND] eliminarproveedorcrm datos recibidos:", { idproveedorcrm, usuarioEliminacion, motivoEliminacion });

        if (!idproveedorcrm || isNaN(idproveedorcrm)) {
            return result({ message: "ID de proveedor CRM no proporcionado o inválido" }, null);
        }

        if (!motivoEliminacion) {
            return result(null, { respuesta: false, message: "El motivo de eliminación es obligatorio para eliminar el proveedor." });
        }

        // 1. Validar que el proveedor no esté referenciado en mm_muestra
        const queryCheckMuestra = "SELECT COUNT(*) AS total FROM mm_muestra WHERE idproveedorcrm = ?";
        dbConnMySQL.query(queryCheckMuestra, [idproveedorcrm], function (errMuestra, resMuestra) {
            if (errMuestra) {
                console.error("❌ [MYSQL] Error verificando referencias en mm_muestra:", errMuestra);
                return result(errMuestra, null);
            }

            const totalMuestras = resMuestra && resMuestra[0] ? resMuestra[0].total : 0;
            if (totalMuestras > 0) {
                return result(null, {
                    respuesta: false,
                    message: `No se puede eliminar el proveedor porque tiene ${totalMuestras} muestra(s) asociada(s).`
                });
            }

            // 2. Obtener datos del proveedor para la auditoría
            const queryGetProv = "SELECT nombre FROM mm_proveedor WHERE idmm_proveedor = ?";
            dbConnMySQL.query(queryGetProv, [idproveedorcrm], async function (errProv, resProv) {
                if (errProv) {
                    return result(errProv, null);
                }

                if (!resProv || resProv.length === 0) {
                    return result(null, {
                        respuesta: false,
                        message: `No se encontró el proveedor con ID ${idproveedorcrm}`
                    });
                }

                const nombreProveedor = resProv[0].nombre;

                // 3. Registrar auditoría en auditoria_eliminaciones
                await registrarAuditoriaEliminacion({
                    modulo: 'MUESTRAS',
                    tipo_registro: 'ELIMINACION_PROVEEDOR_CRM',
                    id_referencia: idproveedorcrm,
                    codigo_referencia: `PROV-CRM-${idproveedorcrm}`,
                    nombre_referencia: nombreProveedor,
                    usuario: usuarioEliminacion,
                    motivo: motivoEliminacion,
                    detalle: {
                        accion: 'ELIMINACION_DEFINITIVA_PROVEEDOR',
                        total_muestras_asociadas: 0
                    }
                });

                // 4. Eliminar directamente de mm_proveedor
                const queryDeleteProv = "DELETE FROM mm_proveedor WHERE idmm_proveedor = ?";
                dbConnMySQL.query(queryDeleteProv, [idproveedorcrm], function (errDel, resDel) {
                    if (errDel) {
                        return result(errDel, null);
                    }
                    return result(null, {
                        respuesta: true,
                        message: `Proveedor '${nombreProveedor}' eliminado correctamente.`
                    });
                });
            });
        });
    } catch (error) {
        console.error("Error en eliminarproveedorcrm:", error);
        result(error, null);
    }
};

// Obtener detalle completo de un producto CRM con sus lotes, proveedores, fechas y stock
muestras.obtenerDetalleProductoCRM = async function (idproductocrm, result) {
    try {
        const idProd = Number(idproductocrm);
        if (!idProd) {
            return result(new Error("ID de producto CRM inválido"), null);
        }

        const listaproveedoressap = await listarproveedoressap().catch(() => []);

        // 1. Obtener datos del producto
        const queryProducto = `
            SELECT 
                p.idproductocrm,
                p.nombreproducto,
                COALESCE((
                    SELECT GROUP_CONCAT(DISTINCT m.ciudad SEPARATOR ', ')
                    FROM mm_muestra m
                    WHERE m.idproductocrm = p.idproductocrm AND m.ciudad IS NOT NULL AND m.ciudad != ''
                ), 'Sin bodega') AS bodega,
                (
                    COALESCE((
                        SELECT SUM(os.cantidad)
                        FROM mm_lotemuestra lm
                        INNER JOIN mm_operacionstock os ON lm.idmm_lotemuestra = os.idingresolotemuestra
                        WHERE lm.idproductocrm = p.idproductocrm AND lm.ciudadarribo = 'UIO' AND os.idtipooperacionstock = 1
                    ), 0)
                    -
                    COALESCE((
                        SELECT SUM(os.cantidad)
                        FROM mm_solicitudmuestra sm
                        INNER JOIN mm_operacionstock os ON sm.idmm_solicitudmuestra = os.idsolicitudmuestra
                        WHERE sm.idproductocrm = p.idproductocrm AND sm.ciudadsalida = 'UIO' AND os.idtipooperacionstock IN (2, 3)
                    ), 0)
                ) AS stock_uio,
                (
                    COALESCE((
                        SELECT SUM(os.cantidad)
                        FROM mm_lotemuestra lm
                        INNER JOIN mm_operacionstock os ON lm.idmm_lotemuestra = os.idingresolotemuestra
                        WHERE lm.idproductocrm = p.idproductocrm AND lm.ciudadarribo = 'GYE' AND os.idtipooperacionstock = 1
                    ), 0)
                    -
                    COALESCE((
                        SELECT SUM(os.cantidad)
                        FROM mm_solicitudmuestra sm
                        INNER JOIN mm_operacionstock os ON sm.idmm_solicitudmuestra = os.idsolicitudmuestra
                        WHERE sm.idproductocrm = p.idproductocrm AND sm.ciudadsalida = 'GYE' AND os.idtipooperacionstock IN (2, 3)
                    ), 0)
                ) AS stock_gye,
                (SELECT COUNT(*) FROM mm_muestra m WHERE m.idproductocrm = p.idproductocrm) AS total_muestras
            FROM mm_productocrm p
            WHERE p.idproductocrm = ?
        `;

        dbConnMySQL.query(queryProducto, [idProd], (errProd, resProd) => {
            if (errProd) {
                console.error("❌ [MYSQL] Error consultando producto CRM:", errProd);
                return result(errProd, null);
            }

            if (!resProd || resProd.length === 0) {
                return result(null, { respuesta: false, message: "Producto no encontrado" });
            }

            const producto = JSON.parse(JSON.stringify(resProd[0]));

            // 2. Obtener lotes ubicados
            const queryLotes = `
                SELECT 
                    lm.idmm_lotemuestra,
                    lm.idmm_muestra,
                    lm.lote,
                    lm.fechaelaboracion,
                    lm.fechavencimiento,
                    lm.idtipoempaque,
                    COALESCE(e.nombre, 'Sin empaque') AS empaque,
                    lm.idubicacion,
                    COALESCE(ub.nombre, 'Sin ubicación') AS ubicacion,
                    lm.ciudadarribo,
                    lm.cantidadrecibida,
                    lm.fechaubicacionmuestra,
                    lm.comentario,
                    lm.responsableingreso,
                    lm.idproveedorsap,
                    lm.idproveedorcrm,
                    prov_crm.nombre AS nombre_proveedor_crm,
                    'UBICADO' AS estado,
                    (
                        COALESCE(lm.cantidadrecibida, 0)
                        -
                        COALESCE((
                            SELECT SUM(os.cantidad)
                            FROM mm_operacionstock os
                            WHERE (os.idingresolotemuestra = lm.idmm_lotemuestra OR os.lote = lm.lote)
                              AND os.idtipooperacionstock IN (2, 3)
                        ), 0)
                    ) AS stock_actual
                FROM mm_lotemuestra lm
                LEFT JOIN mm_empaques e ON lm.idtipoempaque = e.idmm_empaques
                LEFT JOIN mm_ubicacionesbodega ub ON lm.idubicacion = ub.idmm_ubicacionesbodega
                LEFT JOIN mm_proveedor prov_crm ON lm.idproveedorcrm = prov_crm.idmm_proveedor
                WHERE lm.idproductocrm = ?
                ORDER BY lm.idmm_lotemuestra DESC
            `;

            dbConnMySQL.query(queryLotes, [idProd], (errLotes, resLotes) => {
                if (errLotes) {
                    console.error("❌ [MYSQL] Error consultando lotes de producto CRM:", errLotes);
                    return result(errLotes, null);
                }

                const lotesUbicados = JSON.parse(JSON.stringify(resLotes || []));

                // 3. Obtener muestras pendientes de ubicación
                const queryPendientes = `
                    SELECT 
                        m.idmm_muestra,
                        m.fechahoraingreso,
                        m.cantidad,
                        m.nombrereferencial,
                        m.ciudad,
                        m.iscomplete,
                        m.responsableingreso,
                        m.idproveedorsap,
                        m.idproveedorcrm,
                        prov_crm.nombre AS nombre_proveedor_crm
                    FROM mm_muestra m
                    LEFT JOIN mm_proveedor prov_crm ON m.idproveedorcrm = prov_crm.idmm_proveedor
                    WHERE m.idproductocrm = ? AND (m.iscomplete = 0 OR m.iscomplete IS NULL)
                    ORDER BY m.idmm_muestra DESC
                `;

                dbConnMySQL.query(queryPendientes, [idProd], (errPend, resPend) => {
                    if (errPend) {
                        console.error("❌ [MYSQL] Error consultando muestras pendientes:", errPend);
                    }

                    const muestrasPendientes = (!errPend && resPend) ? JSON.parse(JSON.stringify(resPend)) : [];

                    // Mapear muestras pendientes a formato de lote limpio
                    const pendientesMapeadas = muestrasPendientes.map(m => ({
                        idmm_lotemuestra: null,
                        idmm_muestra: m.idmm_muestra,
                        lote: '',
                        fechaelaboracion: null,
                        fechavencimiento: null,
                        idtipoempaque: null,
                        empaque: '',
                        idubicacion: null,
                        ubicacion: '',
                        ciudadarribo: m.ciudad || '',
                        cantidadrecibida: m.cantidad,
                        stock_actual: m.cantidad,
                        fechaubicacionmuestra: m.fechahoraingreso,
                        comentario: '',
                        responsableingreso: m.responsableingreso || '',
                        idproveedorsap: m.idproveedorsap,
                        idproveedorcrm: m.idproveedorcrm,
                        nombre_proveedor_crm: m.nombre_proveedor_crm,
                        estado: 'PENDIENTE'
                    }));

                    // Unir todos los registros (lotes ubicados + pendientes)
                    const todosLosRegistros = [...pendientesMapeadas, ...lotesUbicados];

                    // Resolver nombres de proveedores (SAP vs CRM)
                    todosLosRegistros.forEach(r => {
                        if (r.idproveedorsap != null && String(r.idproveedorsap).trim() !== '') {
                            const provSap = listaproveedoressap.find(p => String(p.codigo) === String(r.idproveedorsap));
                            r.proveedor = provSap ? provSap.nombre : `SAP: ${r.idproveedorsap}`;
                            r.origen_proveedor = 'SAP';
                            r.codigo_proveedor = r.idproveedorsap;
                        } else if (r.idproveedorcrm != null) {
                            r.proveedor = r.nombre_proveedor_crm || `CRM-${r.idproveedorcrm}`;
                            r.origen_proveedor = 'CRM';
                            r.codigo_proveedor = r.idproveedorcrm;
                        } else {
                            r.proveedor = 'Sin proveedor';
                            r.origen_proveedor = 'N/A';
                            r.codigo_proveedor = null;
                        }

                        // Asegurar stock_actual no sea negativo
                        if (r.stock_actual < 0) {
                            r.stock_actual = 0;
                        }
                    });

                    return result(null, {
                        respuesta: true,
                        producto: producto,
                        lotes: todosLosRegistros,
                        total_lotes: lotesUbicados.length,
                        total_pendientes: pendientesMapeadas.length
                    });
                });
            });
        });
    } catch (error) {
        console.error("Error en obtenerDetalleProductoCRM:", error);
        result(error, null);
    }
};

module.exports = muestras;
