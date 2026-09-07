'use strict';

const moment = require('moment');
moment.locale('es');
const { ingresarofertadeventa, registrarcliente, actualizarclientedocumentacion, actualizarcliente, obtenerclientesap } = require('../conexionservicelayersap/solicitudessap');
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
//const { chatwithdeepseek } = require('../iadeepseek/iadeepseek');

var crm = function (vendedor) {
    this.slpcode = vendedor.slpcode,
        this.slpname = vendedor.slpname,
        this.email = vendedor.email,
        this.mobil = vendedor.mobil
}

//Funcion para el login de los usuarios.
crm.loginusuario = async function (credenciales, result) {
    const correo = (typeof credenciales === 'object' ? (credenciales.correo || credenciales.usuario || '') : '').trim().toLowerCase();
    const cedula = (typeof credenciales === 'object' ? (credenciales.cedula || credenciales.contrasena || credenciales.password || credenciales) : credenciales).toString().trim();

    var queryconsultamysql = "CALL autorizaringresocrmweb('" + cedula + "')";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            console.log(err);
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));

            if (Object.entries(json).length === 0 || !json[0] || !json[0][0] || json[0][0]["respuesta"] == 0) {
                result(null, false);
            } else {
                const userCorreo = (json[0][0]["correo"] || '').trim().toLowerCase();
                if (correo && userCorreo !== correo) {
                    return result(null, false);
                }

                const token = jwt.sign({ nombres: json[0][0]["nombres"], correo: json[0][0]["correo"] }, clavejwtbeartoke, { expiresIn: '30m' });
                json[0][0]["token"] = token;

                result(null, json[0][0]);
            }
        }
    });

}
//Obtencion de los valores de los campos de usuario.
crm.obtenciondatoscreacioncliente = function (result) {
    var queryconsultahana = `SELECT f."AliasID", v."FldValue", v."Descr" FROM "EC_SBO_MINERVA_PRO"."CUFD" f INNER JOIN "EC_SBO_MINERVA_PRO"."UFD1" v ON f."TableID" = v."TableID" AND f."FieldID" = v."FieldID" WHERE f."TableID" = 'OCRD'`;
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar campos de usuario sap');
            conn.exec(queryconsultahana, function (err, res) {
                if (err) {
                    result(err, null);
                    return console.error('Error ejecutando la consulta: ', err.message, err);
                }
                // Cerrar la conexión
                conn.disconnect((err) => {
                    if (err) {
                        return console.error('Error cerrando la conexión: ', err.message, err);
                    }
                    console.log('Conexión cerrada.');
                });
                let respuesta = [];
                res.forEach(element => {
                    //Si no hay nada en la respuesta creo el primer elemento
                    if (respuesta.length == 0) {
                        //Creo el primer elemento
                        let aux = {
                            Campo: element.AliasID,
                            Opciones: []
                        }
                        res.forEach(element2 => {
                            if (element.AliasID == element2.AliasID) {
                                let aux2 = {
                                    Descripcion: element2.Descr,
                                    Valor: element2.FldValue
                                }
                                aux.Opciones.push(aux2);
                            }
                        });
                        respuesta.push(aux);
                    } else {
                        let existe = false;
                        //Debo verificar que el siguiente elemento no se encuentre ya creado.
                        for (let index = 0; index < respuesta.length; index++) {
                            const element3 = respuesta[index];
                            if (element.AliasID == element3.Campo) {
                                existe = true;
                                break;
                            }
                        }
                        if (!existe) {
                            let aux = {
                                Campo: element.AliasID,
                                Opciones: []
                            }
                            res.forEach(element2 => {
                                if (element.AliasID == element2.AliasID) {
                                    let aux2 = {
                                        Descripcion: element2.Descr,
                                        Valor: element2.FldValue
                                    }
                                    aux.Opciones.push(aux2);
                                }
                            });
                            respuesta.push(aux);
                        }
                    }
                });
                result(null, respuesta);
            });
        }
    });
}
//Obtencion de los territorios de SAP.
crm.obtencionterritorios = function (result) {
    var queryconsultahana = "SELECT *  FROM \"EC_SBO_MINERVA_PRO\".OTER T0";

    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar territorios sap');
            conn.exec(queryconsultahana, function (err, res) {
                if (err) {
                    result(err, null);
                    return console.error('Error ejecutando la consulta: ', err.message, err);
                }
                // Cerrar la conexión
                conn.disconnect((err) => {
                    if (err) {
                        return console.error('Error cerrando la conexión: ', err.message, err);
                    }
                    console.log('Conexión cerrada.');
                });
                let respuesta = [];

                //Bucle para crear las regiones.
                res.forEach(element => {

                    if (element.parent < 0 && element.territryID > 0) {
                        let auxregion = {
                            idterritorio: element.territryID,
                            descripcion: element.descript.replace(/^\S+\s+\S+\s*/, ""),
                            provincias: []
                        }
                        respuesta.push(auxregion);
                    }
                });
                //Bucle para crear las provincias.
                respuesta.forEach(element2 => {
                    res.forEach(element3 => {
                        if (element2.idterritorio == element3.parent) {
                            let aux = {
                                idterritorio: element3.territryID,
                                descripcion: element3.descript.replace(/^\S+\s+\S+\s*/, ""),
                                state: element3.descript.slice(2, 4),
                                cantones: []
                            }
                            element2.provincias.push(aux);
                        }
                    });
                });
                //Bucle para crear los cantones.
                respuesta.forEach(element => {
                    element.provincias.forEach(element2 => {
                        res.forEach(element3 => {
                            if (element3.parent == element2.idterritorio) {
                                let aux = {
                                    idterritorio: element3.territryID,
                                    descripcion: element3.descript.replace(/^\S+\s+\S+\s*/, ""),
                                    parroquias: []
                                }
                                element2.cantones.push(aux);
                            }
                        });
                    });
                });
                //Bucle para crear las parroquias
                respuesta.forEach(element => {
                    element.provincias.forEach(element1 => {
                        element1.cantones.forEach(element2 => {
                            res.forEach(element3 => {
                                if (element3.parent == element2.idterritorio) {
                                    let aux = {
                                        idterritorio: element3.territryID,
                                        descripcion: element3.descript.replace(/^\S+\s+\S+\s*/, "")
                                    }
                                    element2.parroquias.push(aux);
                                }
                            });
                        });
                    });
                });
                //console.log(respuesta);
                let listadoterritorios = [];
                //Forma de escalar a un solo renglon
                respuesta.forEach(element1 => {
                    element1.provincias.forEach(element2 => {
                        element2.cantones.forEach(element3 => {
                            element3.parroquias.forEach(element4 => {
                                let aux = {
                                    "Nombre": element2.descripcion + " | " + element3.descripcion + " | " + element4.descripcion,
                                    "Provincia": element2.descripcion,
                                    "Canton": element3.descripcion,
                                    "Parroquia": element4.descripcion,
                                    "idterritorio": element4.idterritorio,
                                    "State": parseInt(element2.state) === 90 ? 25 : parseInt(element2.state)
                                }
                                listadoterritorios.push(aux);
                            });
                        });
                    });
                });
                result(null, listadoterritorios);
            });
        }
    });
}
//Obtencion de industrias y vendedores.
crm.obtencionindustriasap = function (result) {
    var queryconsultahana = "SELECT * FROM \"EC_SBO_MINERVA_PRO\".OOND T0";

    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar industrias sap');
            conn.exec(queryconsultahana, function (err, res) {
                if (err) {
                    result(err, null);
                    return console.error('Error ejecutando la consulta: ', err.message, err);
                }
                // Cerrar la conexión
                conn.disconnect((err) => {
                    if (err) {
                        return console.error('Error cerrando la conexión: ', err.message, err);
                    }
                    console.log('Conexión cerrada.');
                });
                result(null, res);
            });
        }
    });
}
//Obtencion de los grupo a los que pertenece
crm.obtenciongruposclientes = function (result) {
    var queryconsultahana = "SELECT * FROM \"EC_SBO_MINERVA_PRO\".OCRG T0 ORDER BY T0.\"GroupName\"";
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar industrias sap');
            conn.exec(queryconsultahana, function (err, res) {
                if (err) {
                    result(err, null);
                    return console.error('Error ejecutando la consulta: ', err.message, err);
                }
                // Cerrar la conexión
                conn.disconnect((err) => {
                    if (err) {
                        return console.error('Error cerrando la conexión: ', err.message, err);
                    }
                    console.log('Conexión cerrada.');
                });
                result(null, res);
            });
        }
    });
}
//Obtencion de los tipos de personas de contacto
crm.obtenciontipopersonascontacto = function (result) {
    var queryconsultahana = "SELECT * FROM \"EC_SBO_MINERVA_PRO\".CUVV T0 WHERE T0.\"IndexID\" = 212";
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar industrias sap');
            conn.exec(queryconsultahana, function (err, res) {
                if (err) {
                    result(err, null);
                    return console.error('Error ejecutando la consulta: ', err.message, err);
                }
                // Cerrar la conexión
                conn.disconnect((err) => {
                    if (err) {
                        return console.error('Error cerrando la conexión: ', err.message, err);
                    }
                    console.log('Conexión cerrada.');
                });
                result(null, res);
            });
        }
    });
}
//Realizar el registro de un cliente en SAP
crm.registrarclientesap = async function (auxcliente, result) {

    let aux = await registrarcliente(auxcliente);
    if (aux) {
        result(null, true);
    } else {
        result(null, false);
    }
}
//Realizar la actualizacion de un cliente en SAP
crm.actualizarclientesap = async function (auxcliente, result) {
    let aux = await actualizarcliente(auxcliente);
    //console.log(aux);

    if (aux) {
        result(null, true);
    } else {
        result(null, false);
    }
}
//Realizar el registro de la documentacion de un cliente
crm.registrardocumentacion = async function (aux, result) {
    var queryconsultamysql = "CALL ingresardocumentacion('" + aux["CardCode"] + "','" +
        (aux["formulariocreacioncliente"] == undefined ? null : aux["formulariocreacioncliente"]) + "','" +
        (aux["ruc"] == undefined ? null : aux['ruc']) + "','" +
        (aux["cedula"] == undefined ? null : aux['cedula']) + "','" +
        (aux["nombramiento"] == undefined ? null : aux["nombramiento"]) + "','" +
        (aux["otros"] == undefined ? null : aux["otros"]) + "')";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            //console.log(err);

            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                result(null, true);
            }
        }
    });
}
//Listar los clientes con documentación para el analisis de cartera.
// Listar los clientes de cada vendedor.
crm.listarclientescondocumentacion = function (aux, result) {
    var queryconsultahana = '';
    if (aux.SlpCode == 0) {
        queryconsultahana = "SELECT T0.\"CardCode\", T0.\"SlpCode\", T0.\"CreateDate\", T0.\"CardType\", T0.\"CardName\", T0.\"Phone1\", T0.\"Cellular\",T0.\"QryGroup13\",T0.\"QryGroup14\",T0.\"QryGroup15\",T0.\"QryGroup16\",T0.\"QryGroup17\",T0.\"U_TIPO_RUC\"  FROM \"EC_SBO_MINERVA_PRO\".OCRD T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T1 ON T0.\"SlpCode\" = T1.\"SlpCode\" WHERE T0.\"validFor\"='Y' and (T0.\"CardType\" = 'C' or T0.\"CardType\" = 'L') ORDER BY T0.\"CreateDate\" desc";
        //queryconsultahana = "SELECT T0.\"CardCode\", T0.\"CreateDate\", T0.\"CardType\", T0.\"CardName\", T0.\"Phone1\", T0.\"Cellular\",T0.\"QryGroup13\",T0.\"QryGroup14\",T0.\"QryGroup15\",T0.\"QryGroup16\",T0.\"QryGroup17\",T0.\"U_TIPO_RUC\"  FROM \"PRUEBAS_CRM\".OCRD T0 INNER JOIN \"PRUEBAS_CRM\".OSLP T1 ON T0.\"SlpCode\" = T1.\"SlpCode\" WHERE T0.\"validFor\"='Y' and (T0.\"CardType\" = 'C' or T0.\"CardType\" = 'L') ORDER BY T0.\"CreateDate\" desc";
    } else {
        queryconsultahana = "SELECT T0.\"CardCode\", T0.\"SlpCode\", T0.\"CreateDate\", T0.\"CardType\", T0.\"CardName\", T0.\"Phone1\", T0.\"Cellular\",T0.\"QryGroup13\",T0.\"QryGroup14\",T0.\"QryGroup15\",T0.\"QryGroup16\",T0.\"QryGroup17\",T0.\"U_TIPO_RUC\"  FROM \"EC_SBO_MINERVA_PRO\".OCRD T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T1 ON T0.\"SlpCode\" = T1.\"SlpCode\" WHERE T0.\"SlpCode\" = " + aux.SlpCode + " and T0.\"validFor\"='Y' and (T0.\"CardType\" = 'C' or T0.\"CardType\" = 'L') ORDER BY T0.\"CreateDate\" desc";
    }
    //var queryconsultahana = "SELECT T0.\"CardCode\", T0.\"CardType\", T0.\"CardName\", T0.\"Phone1\", T0.\"Cellular\",T0.\"QryGroup13\",T0.\"QryGroup14\",T0.\"QryGroup15\",T0.\"QryGroup16\",T0.\"QryGroup17\",T0.\"U_TIPO_RUC\"  FROM \"PRUEBAS_CRM\".OCRD T0 INNER JOIN \"PRUEBAS_CRM\".OSLP T1 ON T0.\"SlpCode\" = T1.\"SlpCode\" WHERE T0.\"validFor\"='Y' and T0.\"CardType\" = 'C' ORDER BY T0.\"CardName\" asc";
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar clientes');
            conn.exec(queryconsultahana, function (err, res) {
                if (err) {
                    result(err, null);
                    return console.error('Error ejecutando la consulta: ', err.message, err);
                }
                // Cerrar la conexión
                conn.disconnect((err) => {
                    if (err) {
                        return console.error('Error cerrando la conexión: ', err.message, err);
                    }
                    console.log('Conexión cerrada.');
                });
                result(null, res);
            });
        }
    });
}
//Actualizar o ingresar documentacion del cliente
crm.ingresaractualizardocumentacion = function (aux, result) {
    var queryconsultamysql = "CALL ingresaractualizardocumentacion('" + aux["CardCode"] + "','" +
        (aux["formulariocreacioncliente"] == undefined ? null : aux["formulariocreacioncliente"]) + "','" +
        (aux["ruc"] == undefined ? null : aux['ruc']) + "','" +
        (aux["cedula"] == undefined ? null : aux['cedula']) + "','" +
        (aux["nombramiento"] == undefined ? null : aux["nombramiento"]) + "','" +
        (aux["otros"] == undefined ? null : aux["otros"]) + "')";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            console.log(err);
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {

                result(null, false);
            } else {
                await actualizarclientedocumentacion(aux);
                result(null, true);
            }
        }
    });
}
//Obtener documentacion
crm.obtenerdocumentacioncliente = function (auxcardcode, result) {
    var queryconsultamysql = "CALL obtenerdocumentacion('" + auxcardcode + "')";
    //console.log(queryconsultamysql);

    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            console.log(err);
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {

                result(null, false);
            } else {

                result(null, json[0][0]);
            }
        }
    });
}
//Obtener cliente
crm.obtenercliente = async function (auxcardcode, result) {
    let aux = await obtenerclientesap(auxcardcode);
    result(null, aux);
}
//Listar permisos del banner
crm.obtenerpermisos = async function (auxcardcode, result) {

    var queryconsultamysql = "CALL obtenerpermisoscrmweb('" + auxcardcode + "')";

    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            console.log(err);
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {

                result(null, false);
            } else {
                let respuesta = {
                    modulos: [],
                    opciones: [],
                    subopciones: []
                }
                json[0].forEach(element => {
                    respuesta.modulos.push(element.idmoduloscrmweb)
                });
                json[1].forEach(element => {
                    respuesta.opciones.push(element.idopcioncrmweb)
                });
                json[2].forEach(element => {
                    respuesta.subopciones.push(element.idsubopcioncrmweb)
                });
                result(null, respuesta);
            }
        }
    });
}
//Obtener historial de compras de un producto.
crm.obtenerhistorialcompraproducto = async function (body, result) {
    let fechaactual = (moment().format()).substring(0, (moment().format()).indexOf('T'));
    let fechaantes = ((moment().subtract(2, 'year')).format()).substring(0, ((moment().subtract(2, 'year')).format()).indexOf('T'));
    var queryconsultahana = "SELECT DISTINCT T1.\"ItemCode\", T1.\"Dscription\", T1.\"Price\", T1.\"Quantity\" AS CANTIDAD, (T1.\"Price\"*T1.\"Quantity\") AS VENTA, T0.\"DocDate\" FROM \"EC_SBO_MINERVA_PRO\".OINV T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".INV1 T1 ON T0.\"DocEntry\" = T1.\"DocEntry\" WHERE T1.\"ItemCode\" != ' ' and T0.\"DocType\"  = 'I' and T0.\"CardCode\" = '" + body['CardCode'] + "' and (T0.\"DocDate\" BETWEEN '" + fechaantes + "' AND '" + fechaactual + "') ORDER BY T0.\"DocDate\" desc";
    //console.log(queryconsultahana);

    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Obteniendo productos por cliente.');
            conn.exec(queryconsultahana, function (err, res) {
                if (err) {
                    result(err, null);
                    return console.error('Error ejecutando la consulta: ', err.message, err);
                }
                // Cerrar la conexión
                conn.disconnect((err) => {
                    if (err) {
                        return console.error('Error cerrando la conexión: ', err.message, err);
                    }
                    console.log('Conexión cerrada.');
                });
                let productoscliente = [];
                //Reecorro la respuesta obtenida de SAP
                res.forEach(element => {
                    // Si es el primer objeto agrego sin restriccion
                    if (productoscliente.length == 0) {
                        let auxproducto = {
                            ItemCode: element["ItemCode"],
                            Dscription: element["Dscription"],
                            Compras: []
                            /*Price: element["Price"],
                            Cantidad: element["CANTIDAD"],
                            Venta: element["VENTA"],
                            DocDate: element["DocDate"]*/
                        }
                        //Recorro el listado para setear todas fechas y cantidades de las compras realizadas.
                        res.forEach(element2 => {
                            if (element2["ItemCode"] == element["ItemCode"]) {
                                let aux = {
                                    Fecha: moment(element2["DocDate"]).format('L'),
                                    Cantidad: parseFloat(element["CANTIDAD"]).toFixed(2),
                                    Price: parseFloat(element["Price"]).toFixed(2)
                                }
                                auxproducto.Compras.push(aux);
                            }
                        })
                        productoscliente.push(auxproducto);
                    } else {
                        let existe = false;
                        //Recorro el listado de producto buscando si ya se ha ingresado el producto
                        for (let index = 0; index < productoscliente.length; index++) {
                            if (productoscliente[index]["ItemCode"] == element["ItemCode"]) {
                                existe = true;
                            }
                        }
                        if (!existe) {
                            let auxproducto = {
                                ItemCode: element["ItemCode"],
                                Dscription: element["Dscription"],
                                Compras: []
                                /*Price: element["Price"],
                                Cantidad: element["CANTIDAD"],
                                Venta: element["VENTA"],
                                DocDate: element["DocDate"]*/
                            }
                            //Recorro el listado para setear todas fechas y cantidades de las compras realizadas.
                            res.forEach(element2 => {
                                if (element2["ItemCode"] == element["ItemCode"]) {
                                    let aux = {
                                        Fecha: moment(element2["DocDate"]).format('L'),
                                        Cantidad: parseInt(element["CANTIDAD"]).toFixed(2),
                                        Price: parseFloat(element["Price"]).toFixed(2)
                                    }
                                    auxproducto.Compras.push(aux);
                                }
                            })
                            productoscliente.push(auxproducto);
                        }
                    }
                });

                result(null, productoscliente);
            });
        }
    }

    );
}
//Obtener ventas y presupuesto de los vendedores.
crm.obtenerventasypresupuestos = async function (aux, result) {
    let anio = (new Date().getFullYear());
    let mes = ((new Date().getMonth() + 1).toString().padStart(2, '0'));
    //console.log(anio);
    //console.log(mes);


    let slpcode = aux["slpcode"];
    var queryconsultmysql = '';
    var queryconsultahana = '';
    //Consulta del presupuesto del vendedor
    if (slpcode == 0) {
        queryconsultmysql = "SELECT idvendedor,valor FROM presupuesto WHERE nmes = " + mes + " and anio=" + anio;
        //queryconsultsql = "select idVendedor,monto from vendedor.vnd_meta where mes=" + mes + " and anio=" + anio;
        queryconsultahana = "SELECT  CEDULA, VENDEDOR, CLIENTE, sum(cantidad) - sum (cantidadNC) as \"CANTIDAD\", Sum(TotFac) - SUM(TotNC) as  \"IMPORTE_DE_VENTAS\", Sum(GBrutaFac)-SUM(GbrutaNC) as \"GANANCIA\", Round((Sum(GBrutaFac)-SUM(GbrutaNC)) / case when  (Sum(TotFac) - SUM(TotNC))= 0 then 1 else (Sum(TotFac) - SUM(TotNC)) end  *100,2) as \"MARGEN\", FECHA_VENTA FROM (SELECT T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, T0.\"CardName\" AS CLIENTE, SUM (T1.\"InvQty\") as cantidad, 0 as cantidadNC, Sum(T1.\"LineTotal\") as TotFac, SUM(T1.\"GrssProfit\") as GBrutaFac, 0 as TotNc, 0 as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\" FROM \"EC_SBO_MINERVA_PRO\".OINV T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".INV1 T1  ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE   (T0.\"DocDate\" >='" + (new Date().getFullYear()) + "-" + ((new Date().getMonth() + 1).toString().padStart(2, '0')) + "-" + "01" + "') Group by T4.\"SlpCode\", T4.\"SlpName\",T0.\"CardName\" ,T0.\"DocDate\" Union SELECT  T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, T0.\"CardName\" AS CLIENTE, 0 as cantidad , SUM(T1.\"InvQty\") as cantidadNC, 0 as TotFac, 0 as GBrutaFac, Sum(T1.\"LineTotal\") as TotNc, SUM(T1.\"GrssProfit\") as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\" FROM \"EC_SBO_MINERVA_PRO\".ORIN T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".RIN1 T1  ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE  (T0.\"DocDate\" >='" + (new Date().getFullYear()) + "-" + ((new Date().getMonth() + 1).toString().padStart(2, '0')) + "-" + "01" + "') Group by T4.\"SlpCode\", T4.\"SlpName\",T0.\"CardName\",T0.\"DocDate\") T Group by  CEDULA, VENDEDOR, CLIENTE, FECHA_VENTA ORDER BY FECHA_VENTA;";
    } else {
        queryconsultmysql = "SELECT idvendedor,valor FROM presupuesto WHERE nmes = " + mes + " and anio=" + anio + " and idvendedor=" + slpcode;
        queryconsultahana = "SELECT  CEDULA, VENDEDOR, CLIENTE, sum(cantidad) - sum (cantidadNC) as \"CANTIDAD\", Sum(TotFac) - SUM(TotNC) as  \"IMPORTE_DE_VENTAS\", Sum(GBrutaFac)-SUM(GbrutaNC) as \"GANANCIA\", Round((Sum(GBrutaFac)-SUM(GbrutaNC)) / case when  (Sum(TotFac) - SUM(TotNC))= 0 then 1 else (Sum(TotFac) - SUM(TotNC)) end  *100,2) as \"MARGEN\", FECHA_VENTA FROM (SELECT T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, T0.\"CardName\" AS CLIENTE, SUM (T1.\"InvQty\") as cantidad, 0 as cantidadNC, Sum(T1.\"LineTotal\") as TotFac, SUM(T1.\"GrssProfit\") as GBrutaFac, 0 as TotNc, 0 as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\" FROM \"EC_SBO_MINERVA_PRO\".OINV T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".INV1 T1  ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE   (T0.\"DocDate\" >= '" + (new Date().getFullYear()) + "-" + ((new Date().getMonth() + 1).toString().padStart(2, '0')) + "-" + "01" + "') and T4.\"SlpCode\" = " + slpcode + " Group by T4.\"SlpCode\", T4.\"SlpName\",T0.\"CardName\" ,T0.\"DocDate\" Union SELECT  T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, T0.\"CardName\" AS CLIENTE, 0 as cantidad , SUM(T1.\"InvQty\") as cantidadNC, 0 as TotFac, 0 as GBrutaFac, Sum(T1.\"LineTotal\") as TotNc, SUM(T1.\"GrssProfit\") as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\" FROM \"EC_SBO_MINERVA_PRO\".ORIN T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".RIN1 T1  ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE  (T0.\"DocDate\" >='" + (new Date().getFullYear()) + "-" + ((new Date().getMonth() + 1).toString().padStart(2, '0')) + "-" + "01" + "') and T4.\"SlpCode\" = " + slpcode + " Group by T4.\"SlpCode\", T4.\"SlpName\",T0.\"CardName\",T0.\"DocDate\") T Group by  CEDULA, VENDEDOR, CLIENTE, FECHA_VENTA ORDER BY FECHA_VENTA;";
    }
    let respuesta = [];

    dbConnMySQL.query(queryconsultmysql, async function (err, res) {
        if (err) {
            console.log(err);
            return (err);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            let auxpresupuesto = json;
            //var queryconsultahana = "SELECT  CEDULA, VENDEDOR, CLIENTE, sum(cantidad) - sum (cantidadNC) as \"CANTIDAD\", Sum(TotFac) - SUM(TotNC) as  \"IMPORTE_DE_VENTAS\", Sum(GBrutaFac)-SUM(GbrutaNC) as \"GANANCIA\", Round((Sum(GBrutaFac)-SUM(GbrutaNC)) / case when  (Sum(TotFac) - SUM(TotNC))= 0 then 1 else (Sum(TotFac) - SUM(TotNC)) end  *100,2) as \"MARGEN\", FECHA_VENTA FROM (SELECT T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, T0.\"CardName\" AS CLIENTE, SUM (T1.\"InvQty\") as cantidad, 0 as cantidadNC, Sum(T1.\"LineTotal\") as TotFac, SUM(T1.\"GrssProfit\") as GBrutaFac, 0 as TotNc, 0 as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\" FROM \"EC_SBO_MINERVA_PRO\".OINV T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".INV1 T1  ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE   (T0.\"DocDate\" >='" + (new Date().getFullYear()) + "-" + ((new Date().getMonth() + 1).toString().padStart(2, '0')) + "-" + "01" + "') and T4.\"SlpCode\" = " + slpcode + " Group by T4.\"SlpCode\", T4.\"SlpName\",T0.\"CardName\" ,T0.\"DocDate\" Union SELECT  T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, T0.\"CardName\" AS CLIENTE, 0 as cantidad , SUM(T1.\"InvQty\") as cantidadNC, 0 as TotFac, 0 as GBrutaFac, Sum(T1.\"LineTotal\") as TotNc, SUM(T1.\"GrssProfit\") as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\" FROM \"EC_SBO_MINERVA_PRO\".ORIN T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".RIN1 T1  ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE  (T0.\"DocDate\" >='" + (new Date().getFullYear()) + "-" + ((new Date().getMonth() + 1).toString().padStart(2, '0')) + "-" + "01" + "') and T4.\"SlpCode\" = " + slpcode + " Group by T4.\"SlpCode\", T4.\"SlpName\",T0.\"CardName\",T0.\"DocDate\") T Group by  CEDULA, VENDEDOR, CLIENTE, FECHA_VENTA ORDER BY FECHA_VENTA;";
            console.log(queryconsultahana);
            const conn = hana.createConnection();
            conn.connect(dbConnHana, async function (err) {
                if (err) {
                    console.log(err);
                    result(null, false);
                } else {
                    console.log('Conectado a HANA -- Obtengo las ventas.');
                    conn.exec(queryconsultahana, async function (err, res) {
                        if (err) {
                            result(err, null);
                            return console.error('Error ejecutando la consulta: ', err.message, err);
                        }
                        conn.disconnect((err) => {
                            if (err) {
                                return console.error('Error cerrando la conexión: ', err.message, err);
                            }
                            console.log('Conexión cerrada.');
                        });
                        //Aqui ya tengo la respuesta de SAP debo ir creando los objetos con las ventas y presupuestos.
                        //Recorro la respuesta del presupuesto de cada uno de los vendedores [{idVendedor: slpcode, monto: vpresupuesto}]
                        console.log(auxpresupuesto);
                        auxpresupuesto.forEach(element => {
                            let aux = {
                                SlpCode: element['idvendedor'],
                                Presupuesto: element['valor'],
                                Ganancia: 0,
                                Venta: 0,
                                Margen: 0,
                                Vendedor: ''
                            }

                            //Recorro de la respuesta de SAP para sumar las ventas donde coincida el SLP Code
                            res.forEach(auxelement => {
                                if (auxelement["CEDULA"] == element["idvendedor"]) {
                                    aux.Venta = aux.Venta + parseFloat(auxelement["IMPORTE_DE_VENTAS"]);
                                    aux.Ganancia = aux.Ganancia + parseFloat(auxelement["GANANCIA"]);
                                    aux.Vendedor = auxelement["VENDEDOR"];
                                }
                            });
                            respuesta.push(aux);
                        });
                        //sql.close();
                        result(null, respuesta);
                    });
                }
            });


        }
    });

    /*var sql = require("mssql");
    sql.connect(configsql, async function (err) {
        if (err) {
            console.log(err);
        } else {

            const resultsql = await new sql.Request().query(queryconsultsql);
            let auxpresupuesto = resultsql.recordset;
            //Una vez obtengo los presupuestos de los vendedores, realizo la consulta a SAP.
            const conn = hana.createConnection();
            conn.connect(dbConnHana, async function (err) {
                if (err) {
                    console.log(err);
                    result(null, false);
                } else {
                    console.log('Conectado a HANA -- Obtengo las ventas.');
                    conn.exec(queryconsultahana, async function (err, res) {
                        if (err) {
                            result(err, null);
                            return console.error('Error ejecutando la consulta: ', err.message, err);
                        }
                        conn.disconnect((err) => {
                            if (err) {
                                return console.error('Error cerrando la conexión: ', err.message, err);
                            }
                            console.log('Conexión cerrada.');
                        });
                        //Aqui ya tengo la respuesta de SAP debo ir creando los objetos con las ventas y presupuestos.
                        //Recorro la respuesta del presupuesto de cada uno de los vendedores [{idVendedor: slpcode, monto: vpresupuesto}]
                        auxpresupuesto.forEach(element => {
                            let aux = {
                                SlpCode: element['idVendedor'],
                                Presupuesto: element['monto'],
                                Ganancia: 0,
                                Venta: 0,
                                Margen: 0,
                                Vendedor: ''
                            }
                            //Recorro de la respuesta de SAP para sumar las ventas donde coincida el SLP Code
                            res.forEach(auxelement => {
                                if (auxelement["CEDULA"] == element["idVendedor"]) {
                                    aux.Venta = aux.Venta + parseFloat(auxelement["IMPORTE_DE_VENTAS"]);
                                    aux.Ganancia = aux.Ganancia + parseFloat(auxelement["GANANCIA"]);
                                    aux.Vendedor = auxelement["VENDEDOR"];
                                }
                            });
                            respuesta.push(aux);
                        });
                        sql.close();
                        result(null, respuesta);
                    });
                }
            });

        }
    });*/
}

// Función para generar código de barras como imagen Base64
async function generateBarcode(auxtext) {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer({
            bcid: 'code128',       // Tipo de código de barras (Code 128)
            text: auxtext,  // Texto del código de barras
            scale: 3,              // Escala del código de barras
            height: 10,            // Altura en mm
            includetext: false,     // Incluir texto debajo del código de barras
            textxalign: 'center',  // Alinear texto
        }, (err, png) => {
            if (err) {
                reject(err);
            } else {
                const base64 = png.toString('base64'); // Convertir a base64
                resolve(`data:image/png;base64,${base64}`);
            }
        });
    });
}
// Función para buscar las facturas segun el DocNum de SAP
/*async function buscarfactura(auxDocNum) {
    let fechaactual = (moment().format()).substring(0, (moment().format()).indexOf('T'));
    let fechaantes = (moment()).year() + '-01-01';
    //console.log(fechaantes);

    var queryconsultahana = `SELECT TOP 10 DISTINCT 
T0.\"DocNum\", 
T0.\"DocDate\",
T0.\"DocTime\", 
T0.\"U_SER_EST\", 
T0.\"U_SER_PE\", 
T0.\"FolioNum\", 
T0.\"U_NUM_AUTOR\", 
T0.\"CardCode\", 
T0.\"CardName\", 
T0.\"DocTotal\", 
T0.\"VatSum\", 
T1.\"ItemCode\", 
(SELECT T4.\"Rate\" FROM \"EC_SBO_MINERVA_PRO\".OSTC T4 WHERE T4.\"Code\" = T1.\"TaxCode\" ) as IVA, 
T1.\"Dscription\", 
T3.\"Quantity\", 
T1.\"Price\", 
T1.\"LineTotal\", 
T3.\"BatchNum\" 
FROM \"EC_SBO_MINERVA_PRO\".OINV T0 
INNER JOIN \"EC_SBO_MINERVA_PRO\".INV1 T1 on T0.\"DocEntry\" = T1.\"DocEntry\" 
INNER JOIN \"EC_SBO_MINERVA_PRO\".DLN1 T2 on T1.\"BaseEntry\" = T2.\"DocEntry\" and T1.\"ItemCode\" = T2.\"ItemCode\" 
INNER JOIN \"EC_SBO_MINERVA_PRO\".IBT1 T3 on T2.\"DocEntry\" = T3.\"BaseEntry\" and T2.\"ItemCode\" = T3.\"ItemCode\" 
WHERE T0.\"DocNum\"='${auxDocNum}' and T3.\"BaseType\" = 15 and T3.\"Quantity\" > 0 
ORDER BY T0.\"DocDate\" desc`;
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Obteniendo productos por cliente.');
            conn.exec(queryconsultahana, function (err, res) {
                if (err) {
                    result(err, null);
                    return console.error('Error ejecutando la consulta: ', err.message, err);
                }
                // Cerrar la conexión
                conn.disconnect((err) => {
                    if (err) {
                        return console.error('Error cerrando la conexión: ', err.message, err);
                    }
                    console.log('Conexión cerrada.');
                });
                //let facturasclientes = [];
                //console.log(res);
                
                let respuesta = {};
                //Reecorro la respuesta obtenida de SAP
                for (let index = 0; index < res.length; index++) {
                    const element = res[index];
                    if (index == 0) {
                        let auxfactura = {
                            "fecha": moment(element['DocDate']).format('L'),
                            "nfactura": element['U_SER_EST'] + '-' + element['U_SER_PE'] + '-' + (element['FolioNum']).toString().padStart(9,'0'),
                            "nautorizacion": element['U_NUM_AUTOR'],
                            "razonsocial": element['CardName'],
                            "ruc": (element['CardCode']).substring(1, (element['CardCode']).length),
                            "subtotal": (parseFloat(element['DocTotal']) - parseFloat(element['VatSum'])).toFixed(2),
                            "iva": parseFloat(element['VatSum']).toFixed(2),
                            "total": parseFloat(element['DocTotal']).toFixed(2),
                            "items": []
                        };
                        res.forEach(element2 => {
                            if (element['FolioNum'] == element2['FolioNum']) {
                                let auxproducto = {
                                    "ItemCode": element2['ItemCode'],
                                    "ItemName": element2['Dscription'] + " " + element2['BatchNum'] + "-" + element2['Quantity'],
                                    "Cantidad": parseFloat(element2['Quantity']).toFixed(2),
                                    "UnitPrice": parseFloat(element2['Price']).toFixed(2),
                                    "Total": (parseFloat(element2['Quantity']) * parseFloat(element2['Price'])).toFixed(2),
                                    "iva": parseFloat(element2['IVA']).toFixed(2),
                                    "lote": element2['BatchNum']
                                }
                                auxfactura.items.push(auxproducto);
                            }
                        })
                        //Una vez obtenida la respuesta
                        respuesta = auxfactura;
                        break;
                    }

                }
                //Aqui ya tengo la factura con los datos.

                console.log(respuesta);
                return respuesta;
            });
        }
    });
}*/

function convertirHoraSAP(horaSAP) {
    let str = horaSAP.toString().padStart(4, '0'); // Asegura 4 dígitos
    let horas = str.substring(0, 2);
    let minutos = str.substring(2, 4);
    return `${horas}:${minutos}`;
}
async function buscarfactura(auxDocNum) {
    return new Promise((resolve, reject) => {
        let fechaactual = (moment().format()).substring(0, (moment().format()).indexOf('T'));
        let fechaantes = (moment()).year() + '-01-01';

        /*var queryconsultahana = `
<<<<<<< HEAD
        SELECT 
T0."U_FAC_OC", 
=======
        SELECT
T0."U_FAC_OC",         
>>>>>>> Modulo-Visitas
T0."DocEntry",
T0."DocNum", 
T0."DocDate",
T0."DocDueDate",
T0."DocTime", 
T0."U_SER_EST", 
T0."U_SER_PE", 
T0."FolioNum", 
T0."U_NUM_GUIA",
T0."U_NUM_AUTOR", 
T0."CardCode", 
T0."CardName", 
T0."DocTotal", 
T0."VatSum", 
T1."ItemCode", 
(SELECT T4."Rate" FROM "EC_SBO_MINERVA_PRO".OSTC T4 WHERE T4."Code" = T1."TaxCode" ) as IVA, 
T1."Dscription", 
T3."Quantity",
T1."unitMsr", 
T1."Price", 
T1."LineTotal", 
T3."BatchNum" ,
T0."Address2",
T0."Comments",
T5."Phone1",
T5."E_Mail",
T0."U_ADICIONAL_OV",
(SELECT T6."ExtraDays" FROM "EC_SBO_MINERVA_PRO".OCTG T6 WHERE T6."GroupNum" = T0."GroupNum") as diasextra,
(SELECT T6."PymntGroup" FROM "EC_SBO_MINERVA_PRO".OCTG T6 WHERE T6."GroupNum" = T0."GroupNum") as credito
FROM "EC_SBO_MINERVA_PRO".OINV T0 
INNER JOIN "EC_SBO_MINERVA_PRO".OCRD T5 on T5."CardCode" = T0."CardCode"
INNER JOIN "EC_SBO_MINERVA_PRO".INV1 T1 on T0."DocEntry" = T1."DocEntry" 
INNER JOIN "EC_SBO_MINERVA_PRO".DLN1 T2 on T1."BaseEntry" = T2."DocEntry" and T1."ItemCode" = T2."ItemCode" 
INNER JOIN "EC_SBO_MINERVA_PRO".IBT1 T3 on T2."DocEntry" = T3."BaseEntry" and T2."ItemCode" = T3."ItemCode" 
WHERE T0."DocNum"=${auxDocNum}  and T3."BaseType" = 15 and T3."Quantity" > 0 
ORDER BY T0."DocDate" desc
        `;*/

        var queryconsultahana = `
        SELECT 
    T0."U_FAC_OC", 
    T0."DocEntry",
    T0."DocNum", 
    T0."DocDate",
    T0."DocDueDate",
    T0."DocTime", 
    T0."U_SER_EST", 
    T0."U_SER_PE", 
    T0."FolioNum", 
    T0."U_NUM_GUIA",
    T0."U_NUM_AUTOR", 
    T0."CardCode", 
    T0."CardName", 
    T0."DocTotal", 
    T0."VatSum", 
    T1."ItemCode", 
    T1."Dscription", 
    SUM(T3."Quantity") AS "Quantity",
    T1."unitMsr", 
    T1."Price", 
    T1."LineTotal",
    STRING_AGG(
    T3."BatchNum" || ' - ' || TO_NVARCHAR(ROUND(T3."Quantity", 2),'0.00'),
    ', '
) AS "BatchNum",
    T4."Rate" AS "IVA",
    T0."Address2",
    T0."Comments",
    T5."Phone1",
    T5."E_Mail",
    T0."U_ADICIONAL_OV",
    T6."ExtraDays" AS "diasextra",
    T6."PymntGroup" AS "credito"
FROM "EC_SBO_MINERVA_PRO".OINV T0
INNER JOIN "EC_SBO_MINERVA_PRO".OCRD T5 ON T5."CardCode" = T0."CardCode"
INNER JOIN "EC_SBO_MINERVA_PRO".INV1 T1 ON T0."DocEntry" = T1."DocEntry"
INNER JOIN "EC_SBO_MINERVA_PRO".OSTC T4 ON T4."Code" = T1."TaxCode"
INNER JOIN "EC_SBO_MINERVA_PRO".DLN1 T2 
    ON T1."BaseEntry" = T2."DocEntry" 
    AND T1."ItemCode" = T2."ItemCode"
    AND T1."BaseLine" = T2."LineNum"
INNER JOIN "EC_SBO_MINERVA_PRO".IBT1 T3 
    ON T2."DocEntry" = T3."BaseEntry" 
    AND T2."ItemCode" = T3."ItemCode"
    AND T2."LineNum" = T3."BaseLinNum"
INNER JOIN "EC_SBO_MINERVA_PRO".OCTG T6 ON T6."GroupNum" = T0."GroupNum"
WHERE 
    T0."DocNum" = '${auxDocNum}' 
    AND T3."BaseType" = 15 
    AND T3."Quantity" > 0
GROUP BY 
    T0."U_FAC_OC", T0."DocEntry", T0."DocNum", T0."DocDate", T0."DocDueDate", 
    T0."DocTime", T0."U_SER_EST", T0."U_SER_PE", T0."FolioNum", T0."U_NUM_GUIA", 
    T0."U_NUM_AUTOR", T0."CardCode", T0."CardName", T0."DocTotal", T0."VatSum", 
    T1."ItemCode", T1."Dscription", T1."unitMsr", T1."Price", T1."LineTotal", 
    T4."Rate", T0."Address2", T0."Comments", T5."Phone1", T5."E_Mail", 
    T0."U_ADICIONAL_OV", T6."ExtraDays", T6."PymntGroup"
ORDER BY 
    T0."DocDate" DESC
        `;
        //console.log(queryconsultahana);

        /*var queryconsultahana = `SELECT TOP 10 DISTINCT 
        T0."DocNum", 
        T0."DocDate",
        T0."DocTime", 
        T0."U_SER_EST", 
        T0."U_SER_PE", 
        T0."FolioNum", 
        T0."U_NUM_AUTOR", 
        T0."CardCode", 
        T0."CardName", 
        T0."DocTotal", 
        T0."VatSum", 
        T1."ItemCode", 
        (SELECT T4."Rate" FROM "EC_SBO_MINERVA_PRO".OSTC T4 WHERE T4."Code" = T1."TaxCode" ) as IVA, 
        T1."Dscription", 
        T3."Quantity", 
        T1."Price", 
        T1."LineTotal", 
        T3."BatchNum" 
        FROM "EC_SBO_MINERVA_PRO".OINV T0 
        INNER JOIN "EC_SBO_MINERVA_PRO".INV1 T1 on T0."DocEntry" = T1."DocEntry" 
        INNER JOIN "EC_SBO_MINERVA_PRO".DLN1 T2 on T1."BaseEntry" = T2."DocEntry" and T1."ItemCode" = T2."ItemCode" 
        INNER JOIN "EC_SBO_MINERVA_PRO".IBT1 T3 on T2."DocEntry" = T3."BaseEntry" and T2."ItemCode" = T3."ItemCode" 
        WHERE T0."DocNum"='${auxDocNum}' and T3."BaseType" = 15 and T3."Quantity" > 0 
        ORDER BY T0."DocDate" desc`;*/

        const conn = hana.createConnection();
        conn.connect(dbConnHana, function (err) {
            if (err) {
                console.log(err);
                return reject(err);
            }

            console.log('Conectado a HANA -- Obteniendo productos por cliente.');

            conn.exec(queryconsultahana, function (err, res) {
                conn.disconnect(); // desconectamos sin bloquear
                if (err) {
                    console.error('Error ejecutando la consulta: ', err.message, err);
                    return reject(err);
                }

                let respuesta = {};
                //console.log(res);

                for (let index = 0; index < res.length; index++) {
                    const element = res[index];
                    if (index == 0) {
                        let auxfactura = {
                            "fecha": moment(element['DocDate']).format('L'),
                            "fechavencimiento": moment(element['DocDueDate']).format('L'),
                            "hora": convertirHoraSAP(element['DocTime']),
                            "nfactura": element['U_SER_EST'] + '-' + element['U_SER_PE'] + '-' + (element['FolioNum']).toString().padStart(9, '0'),
                            "nguia": element['U_SER_EST'] + '-' + element['U_SER_PE'] + '-' + (element['U_NUM_GUIA']).toString().padStart(9, '0'),
                            "nautorizacion": element['U_NUM_AUTOR'],
                            "razonsocial": element['CardName'],
                            "ruc": (element['CardCode']).substring(1),
                            "telefono": element['Phone1'],
                            "correo": element['E_Mail'],
                            "comentario": element['Comments'],
                            "credito": element['credito'],
                            "observaciones": element['U_ADICIONAL_OV'] || '',
                            "direccion": element['Address2'],
                            "subtotal": (parseFloat(element['DocTotal']) - parseFloat(element['VatSum'])).toFixed(2),
                            "iva": parseFloat(element['VatSum']).toFixed(2),
                            "total": parseFloat(element['DocTotal']).toFixed(2),
                            "noc": element['U_FAC_OC'] == '' || element['U_FAC_OC'] == null ? 'N/A' : element['U_FAC_OC'],
                            "items": []
                        };
                        res.forEach(element2 => {
                            //console.log(element2);

                            if (element['FolioNum'] == element2['FolioNum']) {
                                let cantidad = 0;
                                //Consideracion de la cantidad para los Peroxido de benzoilo rojo y azul.
                                //Para PEROXIDO DE BENZOILO BP500 AZUL (25g) ADI073 o PEROXIDO DE BENZOILO BP500 ROJO (25g) ADI74
                                //console.log(element2['ItemCode']);

                                if (element2['ItemCode'] == 'ADI073' || element2['ItemCode'] == 'ADI074') {
                                    cantidad = (parseFloat(element2['Quantity']) / 0.025).toFixed(2);
                                } else {
                                    //Para PEROXIDO DE BENZOILO BP500 AZUL (14.5g)
                                    if (element2['ItemCode'] == 'ADI156') {
                                        cantidad = (parseFloat(element2['Quantity']) / 0.0145).toFixed(2);
                                    } else {
                                        cantidad = parseFloat(element2['Quantity']).toFixed(2);
                                    }
                                }
                                //Para 

                                let auxproducto = {
                                    "ItemCode": element2['ItemCode'],
                                    //"ItemName": element2['Dscription'] + "<br>" + element2['BatchNum'] + "-" + parseFloat(element2['Quantity']).toFixed(2),
                                    "ItemName": element2['Dscription'] + "<br>" + element2['BatchNum'],
                                    "Cantidad": cantidad,
                                    "UnitPrice": parseFloat(element2['Price']).toFixed(2),
                                    "Total": (parseFloat(element2['Price']) * parseFloat(cantidad)).toFixed(2),
                                    "iva": parseFloat(element2['IVA']),
                                    "lote": element2['BatchNum']
                                }
                                auxfactura.items.push(auxproducto);
                            }
                        });
                        respuesta = auxfactura;
                        console.log(respuesta);

                        break;
                    }
                }

                // ✅ Resolvemos la promesa con la respuesta
                resolve(respuesta);
            });
        });
    });
}

// Función para 
crm.obtenerfactura = async function (body, result) {

    //console.log(body);
    let aux = await buscarfactura(body.DocNum);
    //console.log(aux);


    //Debo hacer los calculos del iva
    let subtotaliva0 = 0;
    let subtotaliva5 = 0;
    let subtotaliva15 = 0;
    let iva0 = 0;
    let iva5 = 0;
    let iva15 = 0;

    let tablaproducto = '';

    aux['items'].forEach(element => {
        //Armo las filas de los productos de la tabla
        tablaproducto = tablaproducto + `<tr class="tr1">
                        <td class="td1">
                            ${element['ItemCode']}
                        </td>
                        <td class="td1">
                            -
                        </td>
                        <td class="td1" style="text-align: left;">
                        ${element['ItemName']}
                        </td>
                        <td class="td1">
                        ${element['Cantidad']}
                        </td>
                        <td class="td1">
                            N/A
                        </td>
                        <td class="td1" style="text-align: right;">
                            $ ${element['UnitPrice']}
                        </td>
                        <td class="td1" style="text-align: right;">
                            $ 0.00
                        </td>
                        <td class="td1" style="text-align: right;">
                            $ ${element['Total']}
                        </td>
                    </tr>`;

        if (element['iva'] == 0) {
            subtotaliva0 = subtotaliva0 + parseFloat(element['Total']);
        }
        if (element['iva'] == 5) {
            subtotaliva5 = subtotaliva5 + parseFloat(element['Total']);
            iva5 = iva5 + parseFloat(element['Total']) * (0.05)
        }
        if (element['iva'] == 15) {
            subtotaliva15 = subtotaliva15 + parseFloat(element['Total']);
            iva15 = iva15 + parseFloat(element['Total']) * (0.15)
        }
    });
    //console.log(tablaproducto);

    //Generar un codigo de barra:
    const barcodeDataUrl = await generateBarcode(aux["nautorizacion"]);

    let bodyhtml = `
        <head>
    <!-- Enlace al CSS de Bootstrap desde el CDN -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"
        integrity="sha384-pzjw8f+ua7Kw1TIq0v8FqA3dyfP7zLP2OHuQyVf4V9/5u6VxXTQTRB7dXK5yQeI4" crossorigin="anonymous">
</head>

<body>
    <div style="padding: 5%;">
        <table style="width: 100%;">
            <tr>
                <!--Columna de logos y informacion de la empresa-->
                <td style="width: 50%;">
                    <table style="width: 100%;">
                        <tr>
                            <td style="text-align: center;">
                                <img width="50%" height="75px"
                                    src="https://vacaciones.minerva.com.ec:8090/assets/Imagenes/LogoMinerva.png"
                                    alt="" />
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center;">
                                <img width="50%" height="40px"
                                    src="https://vacaciones.minerva.com.ec:8090/assets/Imagenes/minervid.png"
                                    alt="" />
                            </td>
                        </tr>
                    </table>
                    <table style="border: solid 1px; border-color: black; width: 100%;">
                        <tr>
                            <td style="font-size: small;"><b>MINERVA SA</b></td>
                        </tr>
                        <tr>
                            <td>
                                Dir. Matriz
                            </td>
                            <td>
                                QUITO - VICENTE DUQUE N77-325 Y
                                JUAN DE SELIS
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Dir. Sucursal
                            </td>
                            <td>
                                Vicente Duque N77-325 y Juan de Selis
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Contribuyente especial Nro.
                            </td>
                            <td>
                                143
                            </td>
                        </tr>
                        <tr>
                            <td>
                                OBLIGADO A LLEVAR CONTABILIDAD
                            </td>
                            <td>
                                Si
                            </td>
                        </tr>
                    </table>
                </td>
                <!--Columna de la la informacion de la factura-->
                <td style="border: solid 1px; border-color: black; width: 50%; height: 10%;">
                    <table>
                        <tbody>
                            <!--    Fila de RUC de Minerva  -->
                            <tr>
                                <th style="width: 40%; font-size: medium;">
                                    R.U.C:
                                </th>
                                <td style="font-size: medium;">
                                    1790038033001
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <table>
                        <tbody>
                            <!--    Fila para el nombre de Factura Electrónica  -->
                            <tr>
                                <th style="font-size: medium;">
                                    FACTURA ELECTRÓNICA
                                </th>
                            </tr>
                        </tbody>
                    </table>
                    <table>
                        <tbody>
                            <!--    Fila para el número de Factura Electrónica  -->
                            <tr>
                                <td style="width: 40%;"><b>N°.</b></td>
                                <td>${aux["nfactura"]}</td>
                            </tr>
                        </tbody>
                    </table>
                    <table>
                        <tbody>
                            <!--    Fila para la etiqueta del número de autorizacion -->
                            <tr>
                                <th style="font-size: medium;">
                                    NÚMERO DE AUTORIZACIÓN
                                </th>
                            </tr>
                        </tbody>
                    </table>
                    <table>
                        <tbody>
                            <!--    Fila para el número de autorizacion -->
                            <tr>
                                <td>
                                    ${aux["nautorizacion"]}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <table>
                        <tbody>
                            <!--    Fila para LA FECHA Y HORA DE AUTORIZACIÓN -->
                            <tr>
                                <th style="width: 40%;">
                                    FECHA Y HORA DE AUTORIZACIÓN
                                </th>
                                <td style="width: 60%;">${aux["fecha"]} ${aux["hora"]}</td>
                            </tr>
                        </tbody>
                    </table>
                    <table>
                        <tbody>
                            <!--    Fila para el ambiente de produccion -->
                            <tr>
                                <th style="width: 30%;">
                                    AMBIENTE:
                                </th>
                                <td style="width: 70%;">Producción</td>
                            </tr>
                        </tbody>
                    </table>
                    <table>
                        <tbody>
                            <!--    Fila para la emisión -->
                            <tr>
                                <th style="width: 30%;">
                                    EMISIÓN:
                                </th>
                                <td style="width: 70%;">Normal</td>
                            </tr>
                        </tbody>
                    </table>
                    <table>
                        <tbody>
                            <!--    Fila para la etiqueta de clave de acceso -->
                            <tr>
                                <th style="font-size: medium;">
                                    CLAVE DE ACCESO
                                </th>
                            </tr>
                        </tbody>
                    </table>
                    <table style="width: 100%;">
                        <tbody>
                            <!--    Fila para el codigo de barras -->
                            <tr>
                                <td style="text-align: center;">
                                    <img src="${barcodeDataUrl}" style="width:70%" alt="Código de Barras"/>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <table style="width: 100%;">
                        <tbody>
                            <!--    Fila para el codigo de barras -->
                            <tr>
                                <td colspan="3" style="text-align: center;">
                                    ${aux["nautorizacion"]}</td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </table>
        <table style="width: 100%; border: solid 1px; border-color: black;">
            <tbody>
                <tr>
                    <td>
                        <table>
                            <th style="width:20%">Razón Social /Nombres y Apellidos:</th>
                            <td style="width:40%">${aux["razonsocial"]}</td>
                            <th style="width:20%">RUC/CI:</th>
                            <td style="width:20%">${aux["ruc"]}</td>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td>
                        <table style="width: 100%;">
                            <tr>
                                <th style="width:20%">Fecha Emisión:</th>
                                <td style="width:40%">${aux["fecha"]}</td>
                                <th style="width:20%">Guía de Remisión:</th>
                                <td style="width:20%">${aux["nguia"]}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>
        <!----Tabla para la informacion de los productos, en esta tabla se debe realizar el for para poner todos los productos de la factura-->
        <div style="padding-top: 5px;">
            <table class="table1" style="width: 100%;">
                <tbody>
                
                    <tr class="tr1">
                        <th class="th1" style="width: 11%; font-size: 10px;">
                            Cód. Articulo
                        </th>
                        <th class="th1" style="width: 11%; font-size: 10px;">
                            Cód. Auxiliar
                        </th>
                        <th class="th1" style="font-size: 10px;">
                            Descripción
                        </th>
                        <th class="th1" style="width: 10%; font-size: 10px;">
                            Cantidad
                        </th>
                        <th class="th1" style="width: 12%; font-size: 10px;">
                            Unidad Medida
                        </th>
                        <th class="th1" style="width: 11%; font-size: 10px;">
                            Precio Unit
                        </th>
                        <th class="th1" style="width: 11%; font-size: 10px;">
                            Valor Desc.
                        </th>
                        <th class="th1" style="width: 10%; font-size: 10px;">
                            Total
                        </th>
                    </tr>
                    ${tablaproducto}
                    <!--<tr class="tr1">
                        <td class="td1">
                            CON003
                        </td>
                        <td class="td1">
                            -
                        </td>
                        <td class="td1" style="text-align: left;">
                            CEMENTO BLANCO (20 Kg)
                            03-15/11/24-5-HV - 760.00
                        </td>
                        <td class="td1">
                            760.00
                        </td>
                        <td class="td1">
                            N/A
                        </td>
                        <td class="td1" style="text-align: right;">
                            $ 0.48
                        </td>
                        <td class="td1" style="text-align: right;">
                            $ 0.00
                        </td>
                        <td class="td1" style="text-align: right;">
                            $ 364.80
                        </td>
                    </tr>
                    <tr class="tr1">
                        <td class="td1">
                            PIG026
                        </td>
                        <td class="td1">
                            -
                        </td>
                        <td class="td1" style="text-align: left;">
                            DIOXIDO DE TITANIO CR-826
                            HBA41859 - 175.00
                        </td>
                        <td class="td1">
                            175.00
                        </td>
                        <td class="td1">
                            N/A
                        </td>
                        <td class="td1" style="text-align: right;">
                            $ 4.15
                        </td>
                        <td class="td1" style="text-align: right;">
                            $ 0.00
                        </td>
                        <td class="td1" style="text-align: right;">
                            $ 726.25
                        </td>
                    </tr>-->
                </tbody>
            </table>
        </div>
        <div style="padding-top: 5px;">
            <table style="width: 100%;">
                <tbody>
                    <tr>
                        <!--Columna para la parte del pago-->
                        <td style="width: 60%;">
                            <!-- Tabla para la forma de pago-->
                            <table class="table1" style="width: 100%;border-bottom: none;">
                                <tr class="tr1">
                                    <th style="text-align: center;">FORMA DE PAGO</th>
                                </tr>
                                <tr>

                                </tr>
                            </table>
                            <table class="table1" style="width: 100%; border-top: none;">
                                <tr class="tr1">
                                    <th class="th1" style="font-size: 10px; width: 45%;">Forma de pago</th>
                                    <th class="th1" style="font-size: 10px; width: 15%;">Total</th>
                                    <th class="th1" style="font-size: 10px; width: 10%;">Plazo</th>
                                    <th class="th1" style="font-size: 10px; width: 30%;">Unidad de Tiempo</th>
                                </tr>
                                <tr>
                                    <td class="td1" style="text-align: left;">OTROS CON UTILIZACIÓN DEL
                                        SISTEMA FINANCIERO</td>
                                    <td class="td1" style="text-align: right;">$ ${aux["total"]}</td>
                                    <td class="td1"></td>
                                    <td class="td1" style="text-align: right;">Día</td>
                                </tr>
                            </table>
                            <br>
                            <!--  Tabla para la información adicional-->
                            <table class="table1" style="width: 100%; border-bottom: none;">
                                <tbody>
                                    <tr class="tr1" style="text-align: center;">
                                        <th class="th1" style="text-align: center;">Información adicional</th>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="table1" style="width: 100%; border-top: none;">
                                <tbody>
                                    <tr class="tr1" style="text-align: center;border-bottom: none;">
                                        <th style="text-align: left; width: 40%;">TELEFONO</th>
                                        <td style="text-align: left; width: 60%;">: ${aux["telefono"]}</td>
                                    </tr>
                                    <tr class="tr1" style="text-align: center;border-bottom: none;">
                                        <th style="text-align: left; width: 40%;">Email</th>
                                        <td style="text-align: left; width: 60%;">:
                                            ${aux["correo"]}</td>
                                    </tr>
                                    <tr class="tr1" style="text-align: center;border-bottom: none;">
                                        <th style="text-align: left; width: 40%;">COMENTARIO</th>
                                        <td style="text-align: left; width: 60%;">: ${aux["comentario"]}</td>
                                    </tr>
                                    <tr class="tr1" style="text-align: center;border-bottom: none;">
                                        <th style="text-align: left; width: 40%;">CREDITO</th>
                                        <td style="text-align: left; width: 60%;">: ${aux["credito"]}</td>
                                    </tr>
                                    <tr class="tr1" style="text-align: center;border-bottom: none;">
                                        <th style="text-align: left; width: 40%;">FECHA DE VENCIMIENTO</th>
                                        <td style="text-align: left; width: 60%;">: ${aux["fechavencimiento"]}</td>
                                    </tr>
                                    <tr class="tr1" style="text-align: center;border-bottom: none;">
                                        <th style="text-align: left; width: 40%;">OBSERVACION</th>
                                        <td style="text-align: left; width: 60%;">: ${aux["observaciones"]}</td>
                                    </tr>
                                    <tr class="tr1" style="text-align: center;border-bottom: none;">
                                        <th style="text-align: left; width: 40%;">DIRECCION</th>
                                        <td style="text-align: left; width: 60%;">: ${aux["direccion"]}</td>
                                    </tr>
                                    <!--<tr class="tr1" style="text-align: center;border-bottom: none;">
                                        <th style="text-align: left; width: 40%;">LIBERADO POR</th>
                                        <td style="text-align: left; width: 60%;">: FAUSTO PILATAXI</td>
                                    </tr>-->
                                    <tr class="tr1" style="text-align: center;border-bottom: none;">
                                        <th style="text-align: left; width: 40%;">No. OC</th>
                                        <td style="text-align: left; width: 60%;">: ${aux["noc"]}</td>
                                    </tr>
                                    <tr class="tr1" style="text-align: center;border-bottom: none;">
                                        <th style="text-align: left; width: 40%;">Leyenda</th>
                                        <td style="text-align: left; width: 60%;">: Si en un plazo de 30 días no se recibe por escrito una solicitud de rectificación o modificación del presente pedido, se entenderá que el mismo está a completa satisfacción del cliente</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                        <!--Columna para la parte de los valores de la factura-->
                        <td style="width: 40%; vertical-align: top;">
                            <table class="td2" style="width: 100%;">
                                <tbody>
                                    <tr class="tr1">
                                        <td class="td1" style="width: 60%; text-align: left">SUBTOTAL IVA 5%:</td>
                                        <td class="td1" style="width: 40%;text-align: right;">$ ${subtotaliva5.toFixed(2)}</td>
                                    </tr>
                                    <tr class="tr1">
                                        <td class="td1" style="width: 60%; text-align: left">SUBTOTAL IVA 15%:</td>
                                        <td class="td1" style="width: 40%;text-align: right;">$ ${subtotaliva15.toFixed(2)}</td>
                                    </tr>
                                    <tr class="tr1">
                                        <td class="td1" style="width: 60%; text-align: left">SUBTOTAL IVA 0%:</td>
                                        <td class="td1" style="width: 40%;text-align: right;">$ ${subtotaliva0.toFixed(2)}</td>
                                    </tr>
                                    <tr class="tr1">
                                        <td class="td1" style="width: 60%; text-align: left">SUBTOTAL SIN IMPUESTO:</td>
                                        <td class="td1" style="width: 40%;text-align: right;">$ ${aux["subtotal"]}</td>
                                    </tr>
                                    <tr class="tr1">
                                        <td class="td1" style="width: 60%; text-align: left">IVA 5%:</td>
                                        <td class="td1" style="width: 40%;text-align: right;">$ ${iva5.toFixed(2)}</td>
                                    </tr>
                                    <tr class="tr1">
                                        <td class="td1" style="width: 60%; text-align: left">IVA 15%:</td>
                                        <td class="td1" style="width: 40%;text-align: right;">$ ${iva15.toFixed(2)}</td>
                                    </tr>
                                    
                                    <tr class="tr1">
                                        <td class="td1" style="width: 60%; text-align: left">VALOR TOTAL:</td>
                                        <td class="td1" style="width: 40%;text-align: right;">$ ${aux['total']}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</body>

<style>
    td,
    th {
        padding: 3px;
        font-size: 11px;
        text-align: left;
    }

    .table1,
    .td1,
    .th1 {
        border: solid 1px;
        border-color: black;
        border-collapse: collapse;
        text-align: center;

    }

    .td2 {
     border: solid 1px;
        border-color: black;
        border-collapse: collapse;
        
    }
</style>
    `;

    // Iniciar Puppeteer
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ],
    });
    //const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(bodyhtml, { waitUntil: 'networkidle0' });
    // Generar el PDF como un buffer
    const pdfBuffer = await page.pdf({
        format: 'A4', // Formato del PDF
    });

    // Convertir el buffer a Base64
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');;

    //console.log('PDF en Base64:', pdfBase64);

    await browser.close();

    result(null, pdfBase64);
}
crm.obtenerotrospagos = function (auxcardcode, result) {

    var queryconsultahana = "SELECT OVPM.\"DocNum\",  OVPM.\"Comments\",OVPM.\"DocDate\", OVPM.\"CardCode\", OVPM.\"CardName\", OVPM.\"DocTotal\", OVPM.\"TransId\" FROM \"EC_SBO_MINERVA_PRO\".OVPM WHERE OVPM.\"TransId\" NOT IN (SELECT ITR1.\"TransId\" FROM \"EC_SBO_MINERVA_PRO\".ITR1) and OVPM.\"CardCode\"= '" + auxcardcode + "'";

    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar Otros pagos');
            conn.exec(queryconsultahana, function (err, res) {
                if (err) {
                    result(err, null);
                    return console.error('Error ejecutando la consulta: ', err.message, err);
                }
                // Cerrar la conexión
                conn.disconnect((err) => {
                    if (err) {
                        return console.error('Error cerrando la conexión: ', err.message, err);
                    }
                    console.log('Conexión cerrada.');
                });
                result(null, res);
            });
        }
    }

    );
}
//Funcion para listar las cotizaciones del vendedor o administrador.
crm.listarcotizacionescrmweb = function (body, result) {
    var queryconsultamysql = "CALL crmmovil.listarcotizacioncrmweb(" + body["SlpCode"] + ")";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                let respuesta = json;
                //console.log(respuesta);

                let listadocotizaciones = {
                    pendientes: [],
                    aceptadas: [],
                    rechazadas: []
                };
                respuesta[0].forEach(element => {
                    if (listadocotizaciones.length == 0) {
                        let aux = {
                            idcotizacion: element.idcotizacion,
                            vendedor: element.nombres + " " + element.apellidos,
                            slpcode: element.slpcode,
                            cardname: element.cardname,
                            cardcode: element.cardcode,
                            fechaentrega: element.fechaentrega,
                            fechaingreso: element.fechaingreso,
                            isaccepted: element.isaccepted,
                            subtotal: element.subtotal,
                            comentario: element.comentario,
                            items: []
                        }
                        respuesta[0].forEach(auxelement => {
                            if (auxelement.idcotizacion == element.idcotizacion) {
                                let auxitem = {
                                    iditemcotizacion: auxelement.iditemcotizacion,
                                    itemcode: auxelement.itemcode,
                                    itemname: auxelement.itemname,
                                    quantity: auxelement.quantity,
                                    unitprice: auxelement.unitprice,
                                    tax: auxelement.tax,
                                }
                                aux.items.push(auxitem);
                            }
                        });
                        if (aux.isaccepted == 1) {
                            listadocotizaciones.aceptadas.push(aux);
                        }
                        if (aux.isaccepted == 0) {
                            listadocotizaciones.rechazadas.push(aux);
                        }
                        if (aux.isaccepted == null) {
                            listadocotizaciones.pendientes.push(aux);
                        }

                    } else {
                        let existe = false;
                        if (element.isaccepted == 1) {
                            for (let index = 0; index < listadocotizaciones['aceptadas'].length; index++) {
                                const a = listadocotizaciones['aceptadas'][index];
                                if (element.idcotizacion == a.idcotizacion) {
                                    existe = true;
                                    break;
                                }
                            }
                        }
                        if (element.isaccepted == 0) {
                            for (let index = 0; index < listadocotizaciones['rechazadas'].length; index++) {
                                const a = listadocotizaciones['rechazadas'][index];
                                if (element.idcotizacion == a.idcotizacion) {
                                    existe = true;
                                    break;
                                }
                            }
                        }
                        if (element.isaccepted == null) {
                            for (let index = 0; index < listadocotizaciones['pendientes'].length; index++) {
                                const a = listadocotizaciones['pendientes'][index];
                                //console.log(a);

                                if (element.idcotizacion == a.idcotizacion) {
                                    existe = true;
                                    break;
                                }
                            }
                        }

                        if (!existe) {
                            let aux = {
                                idcotizacion: element.idcotizacion,
                                vendedor: element.nombres + " " + element.apellidos,
                                slpcode: element.slpcode,
                                cardname: element.cardname,
                                cardcode: element.cardcode,
                                fechaentrega: element.fechaentrega,
                                fechaingreso: element.fechaingreso,
                                isaccepted: element.isaccepted,
                                subtotal: element.subtotal,
                                comentario: element.comentario,
                                items: []
                            }
                            respuesta[0].forEach(auxelement => {
                                if (auxelement.idcotizacion == element.idcotizacion) {
                                    let auxitem = {
                                        iditemcotizacion: auxelement.iditemcotizacion,
                                        itemcode: auxelement.itemcode,
                                        itemname: auxelement.itemname,
                                        quantity: auxelement.quantity,
                                        unitprice: auxelement.unitprice,
                                        tax: auxelement.tax,
                                    }
                                    aux.items.push(auxitem);
                                }
                            });
                            if (aux.isaccepted == true) {
                                listadocotizaciones.aceptadas.push(aux);
                            }
                            if (aux.isaccepted == 0) {
                                listadocotizaciones.rechazadas.push(aux);
                            }
                            if (aux.isaccepted == null) {
                                listadocotizaciones.pendientes.push(aux);
                            }
                        }
                    }

                });

                result(null, listadocotizaciones);
            }
        }
    });
}
//Funcion para listar las cotizaciones del vendedor o administrador.
crm.listarcotizacionesxclientecrmweb = function (body, result) {
    var queryconsultamysql = "CALL crmmovil.listarcotizacionxclientecrmweb('" + body["CardCode"] + "')";
    //console.log(queryconsultamysql);

    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                let respuesta = json;
                //console.log(respuesta);

                let listadocotizaciones = {
                    pendientes: [],
                    aceptadas: [],
                    rechazadas: []
                };
                respuesta[0].forEach(element => {
                    if (listadocotizaciones.length == 0) {
                        let aux = {
                            idcotizacion: element.idcotizacion,
                            vendedor: element.nombres + " " + element.apellidos,
                            slpcode: element.slpcode,
                            cardname: element.cardname,
                            cardcode: element.cardcode,
                            fechaentrega: element.fechaentrega,
                            fechaingreso: element.fechaingreso,
                            isaccepted: element.isaccepted,
                            subtotal: element.subtotal,
                            comentario: element.comentario,
                            items: []
                        }
                        respuesta[0].forEach(auxelement => {
                            if (auxelement.idcotizacion == element.idcotizacion) {
                                let auxitem = {
                                    iditemcotizacion: auxelement.iditemcotizacion,
                                    itemcode: auxelement.itemcode,
                                    itemname: auxelement.itemname,
                                    quantity: auxelement.quantity,
                                    unitprice: auxelement.unitprice,
                                    tax: auxelement.tax,
                                }
                                aux.items.push(auxitem);
                            }
                        });
                        if (aux.isaccepted == 1) {
                            listadocotizaciones.aceptadas.push(aux);
                        }
                        if (aux.isaccepted == 0) {
                            listadocotizaciones.rechazadas.push(aux);
                        }
                        if (aux.isaccepted == null) {
                            listadocotizaciones.pendientes.push(aux);
                        }

                    } else {
                        let existe = false;
                        if (element.isaccepted == 1) {
                            for (let index = 0; index < listadocotizaciones['aceptadas'].length; index++) {
                                const a = listadocotizaciones['aceptadas'][index];
                                if (element.idcotizacion == a.idcotizacion) {
                                    existe = true;
                                    break;
                                }
                            }
                        }
                        if (element.isaccepted == 0) {
                            for (let index = 0; index < listadocotizaciones['rechazadas'].length; index++) {
                                const a = listadocotizaciones['rechazadas'][index];
                                if (element.idcotizacion == a.idcotizacion) {
                                    existe = true;
                                    break;
                                }
                            }
                        }
                        if (element.isaccepted == null) {
                            for (let index = 0; index < listadocotizaciones['pendientes'].length; index++) {
                                const a = listadocotizaciones['pendientes'][index];
                                //console.log(a);

                                if (element.idcotizacion == a.idcotizacion) {
                                    existe = true;
                                    break;
                                }
                            }
                        }

                        if (!existe) {
                            let aux = {
                                idcotizacion: element.idcotizacion,
                                vendedor: element.nombres + " " + element.apellidos,
                                slpcode: element.slpcode,
                                cardname: element.cardname,
                                cardcode: element.cardcode,
                                fechaentrega: element.fechaentrega,
                                fechaingreso: element.fechaingreso,
                                isaccepted: element.isaccepted,
                                subtotal: element.subtotal,
                                comentario: element.comentario,
                                items: []
                            }
                            respuesta[0].forEach(auxelement => {
                                if (auxelement.idcotizacion == element.idcotizacion) {
                                    let auxitem = {
                                        iditemcotizacion: auxelement.iditemcotizacion,
                                        itemcode: auxelement.itemcode,
                                        itemname: auxelement.itemname,
                                        quantity: auxelement.quantity,
                                        unitprice: auxelement.unitprice,
                                        tax: auxelement.tax,
                                    }
                                    aux.items.push(auxitem);
                                }
                            });
                            if (aux.isaccepted == true) {
                                listadocotizaciones.aceptadas.push(aux);
                            }
                            if (aux.isaccepted == 0) {
                                listadocotizaciones.rechazadas.push(aux);
                            }
                            if (aux.isaccepted == null) {
                                listadocotizaciones.pendientes.push(aux);
                            }
                        }
                    }

                });

                result(null, listadocotizaciones);
            }
        }
    });
}
//Funcion para generar el pdf de una cotización
crm.generarcotizacionweb = function (auxidcotizacion, result) {
    var queryString = "CALL obtenerdatoscotizacion(" + auxidcotizacion + ")";
    dbConnMySQL.query(queryString, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                let respuesta = json;
                //console.log(respuesta[0][0]);

                let subtotal = 0;
                let impuestos = 0;
                let table = "";
                //Genero cada una de las filas de la tabla de los productos.
                respuesta[1].forEach((element) => {
                    let aux = "<tr><td>" + element["itemname"] + "</td><td>" + element["quantity"] + "</td><td>" + element["unitprice"] + "</td><td>" + element["tax"] + "</td><td>" + (parseFloat(element["quantity"]) * parseFloat(element["unitprice"])).toFixed(2) + "</td></tr>";
                    table += aux;
                    impuestos = impuestos + (parseFloat(element["quantity"]) * parseFloat(element["unitprice"]) * (parseFloat(element["tax"]) / 100));
                    subtotal = subtotal + (parseFloat(element["quantity"]) * parseFloat(element["unitprice"]));
                });
                //Declaro toa la estrutura del PDF que se requiere.
                let bodyhtml = `
                <head>
                <style>
                    body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    font-size: 12;
                    }
                    .header {
                    text-align: left;
                    margin-bottom: 20px;
                    font-size: 12;
                    }
                    .footer {
                    text-align: left;
                    margin-bottom: 20px;
                    font-size: 12;
                    }
                    .info  {
                    margin: 20px 0;
                    text-align: left;
                    font-size: 12;
                    }
                    .totals{
                    margin: 20px 0;
                    text-align: right;
                    font-size: 12;
                    }
                    .contact{
                    margin: 20px 0;
                    text-align: right;
                    font-size: 12;
                    }
                    table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-size: 12;
                    }
                    table, th, td {
                    border: 1px solid #000;
                    padding: 8px;
                    text-align: left;
                    font-size: 12;
                    }
                    th {
                    background-color: #f2f2f2;
                    }
                </style>
                </head>
                <body style="padding: 50px;">
                <table style="width: 100%;">
                    <tr style="border-color: white;">
                    <td style="width: 45%; border-right: 0; background-size: contain; background-repeat: no-repeat;">
                    <img width="90%" height="75px"
                                    src="https://vacaciones.minerva.com.ec:8090/assets/Imagenes/LogoMinerva.png"
                                    alt="" />
                    </td>
                    <td style="width: 55%; border-left: 0;">
                        <div class="header">
                        <p><b>Matriz Quito</b><br>
                        Vicente Duque N77-325 y Juan de Selis<br>
                        Teléfonos: (+593) 2600 5636 / (+593) 2247 9329 / (+593) 99 897 1750<br>
                        Call Center ext 101 -102<br>
                        Teléfono GYE: (+593) 98 539 0365</p>
                        </div>
                    </td>
                    </tr>
                </table>
                
                <div>
                <h2 style="text-align: center;">COTIZACIÓN No. `+ respuesta[0][0]['idcotizacion'] + `</h2>
                </div>
                <table style="border-style: hidden;">
                <tr style="border-style: hidden;">
                    <td style="border-style: hidden;">
                    <strong>Fecha del documento:</strong> `+ respuesta[0][0]['fechaingreso'] + `
                    </td>
                    <td style="border-style: hidden;">
                    <strong>Válido hasta:</strong> `+ (moment(respuesta[0][0]['fechaentrega'], 'DDMMYYYY').format()).substring(0, (moment(respuesta[0][0]['fechaentrega'], 'DDMMYYYY').format()).indexOf('T')) + `
                    </td>
                </tr>
                <tr style="border-style: hidden;">
                    <td style="border-style: hidden;">
                    <strong>RUC/CI:</strong> `+ (respuesta[0][0]['cardcode']).substring(1, (respuesta[0][0]['cardcode']).length) + `
                    </td>
                    <td style="border-style: hidden;">
                    <strong>Cliente:</strong> `+ (respuesta[0][0]['cardname']) + `
                    </td>
                </tr>
                <!--<tr style="border-style: hidden;">
                    <td style="border-style: hidden;">
                    <strong>Persona de Contacto:</strong> DIANA MARQUEZ
                    </td>
                    <td style="border-style: hidden;">
                    <strong>Teléfono:</strong> 0984448049
                    </td>
                </tr>
                <tr style="border-style: hidden;">
                    <td style="border-style: hidden;" rowspan="2">
                    <strong>Correo:</strong> facturación.electronicamarineprotein.com.ec
                    </td>
                </tr>-->
                </table>
                
                <table>
                    <tr>
                    <th>DESCRIPCIÓN</th>
                    <th>CANTIDAD</th>
                    <th>P. UNIT</th>
                    <th>% IVA</th>
                    <th>SUBTOTAL</th>
                    </tr>`+ table + `
                </table>

                <div class="totals">
                    <p><strong>SubTotal:</strong> $ `+ subtotal.toFixed(2) + `</p>
                    <p><strong>Impuestos:</strong> $ `+ impuestos.toFixed(2) + `</p>
                    <p><strong>Total:</strong> $ `+ (subtotal + impuestos).toFixed(2) + `</p>
                </div>
                <div class="footer">
                    <p><strong>Comentarios:</strong></p>
                    <p>`+ respuesta[0][0]['nota'] + `</p>
                </div>
                <div class="footer">
                    <p><strong>Representante de Ventas: </strong>`+ respuesta[0][0]["nombres"] + " " + respuesta[0][0]["apellidos"] + ` </p>
                    <p><strong>Correo: </strong>`+ respuesta[0][0]["mail"] + `</p>
                    <p>Esta propuesta tiene validéz de 8 días</p>
                    <p style="text-align: right;">Cotización generada desde el CRM Móvil.</p>
                    <p><b>NOTA:</b> LOS DATOS PERSONALES QUE CONTIENE EL DOCUMENTO SON AUTORIZADOS PARA SU USO POR PARTE DE LOS TITULARES.</p>
                </div>

                </body>`;

                // Iniciar Puppeteer
                //const browser = await puppeteer.launch();
                const browser = await puppeteer.launch({
                     executablePath: '/usr/bin/chromium-browser',
        		headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ],
                });
                const page = await browser.newPage();

                await page.setContent(bodyhtml, { waitUntil: 'networkidle0' });
                // Generar el PDF como un buffer
                const pdfBuffer = await page.pdf({
                    format: 'A4', // Formato del PDF
                });

                // Convertir el buffer a Base64
                const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');;

                //console.log('PDF en Base64:', pdfBase64);

                await browser.close();

                /*let auxresp = {
                    "idcotizacion": respuesta[0][0]['idcotizacion'],
                    "cardname": respuesta[0][0]['cardname'],
                    "codigopdf": bodyhtml
                }*/

                result(null, pdfBase64);
            }
        }
    });
}

//Listar las visitas a los clientes por vendedor
crm.listarvisitascalendario = async function (auxslpcode, result) {
    moment.locale('es');
    //console.log(body);
    let fechafin = new Date();

    var queryconsultamysql = "CALL crmmovil.listarvisitasvendedorescalendario(" + auxslpcode + ",'" + fechafin.getFullYear() + "-01-01','" + fechafin.getFullYear() + "-12-31')";
    //console.log(queryconsultamysql);

    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            //console.log(json[0]);

            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                result(null, json[0]);
            }
        }
    });
}

//Listar las visitas a los clientes por vendedor
crm.listarvisitascalendarioxfecha = async function (auxbody, result) {
    moment.locale('es');
    //console.log(body);

    var queryconsultamysql = "CALL crmmovil.listarvisitasvendedorescalendario(" + auxbody['SlpCode'] + ",'" + auxbody['fechaInicio'] + "','" + auxbody['fechaFin'] + "')";
    //console.log(queryconsultamysql);

    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            //console.log(json[0]);

            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                result(null, json[0]);
            }
        }
    });
}
//Listar los leads de un vendedor o todos para un administrador.
crm.listarleads = function (aux, result) {
    var queryconsultahana = '';
    if (aux.SlpCode == 0) {
        queryconsultahana = "SELECT T0.\"CardCode\", T0.\"CreateDate\", T0.\"CardType\", T0.\"CardName\", T0.\"Phone1\", T0.\"Cellular\",T0.\"QryGroup13\",T0.\"QryGroup14\",T0.\"QryGroup15\",T0.\"QryGroup16\",T0.\"QryGroup17\",T0.\"U_TIPO_RUC\"  FROM \"EC_SBO_MINERVA_PRO\".OCRD T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T1 ON T0.\"SlpCode\" = T1.\"SlpCode\" WHERE T0.\"validFor\"='Y' and T0.\"CardType\" = 'L' ORDER BY T0.\"CreateDate\" desc";
        //queryconsultahana = "SELECT T0.\"CardCode\", T0.\"CreateDate\", T0.\"CardType\", T0.\"CardName\", T0.\"Phone1\", T0.\"Cellular\",T0.\"QryGroup13\",T0.\"QryGroup14\",T0.\"QryGroup15\",T0.\"QryGroup16\",T0.\"QryGroup17\",T0.\"U_TIPO_RUC\"  FROM \"PRUEBAS_CRM\".OCRD T0 INNER JOIN \"PRUEBAS_CRM\".OSLP T1 ON T0.\"SlpCode\" = T1.\"SlpCode\" WHERE T0.\"validFor\"='Y' and T0.\"CardType\" = 'L' ORDER BY T0.\"CreateDate\" desc";
    } else {
        queryconsultahana = "SELECT T0.\"CardCode\", T0.\"CreateDate\", T0.\"CardType\", T0.\"CardName\", T0.\"Phone1\", T0.\"Cellular\",T0.\"QryGroup13\",T0.\"QryGroup14\",T0.\"QryGroup15\",T0.\"QryGroup16\",T0.\"QryGroup17\",T0.\"U_TIPO_RUC\"  FROM \"EC_SBO_MINERVA_PRO\".OCRD T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T1 ON T0.\"SlpCode\" = T1.\"SlpCode\" WHERE T0.\"SlpCode\" = " + aux.SlpCode + " and T0.\"validFor\"='Y' and T0.\"CardType\" = 'L' ORDER BY T0.\"CreateDate\" desc";
    }
    //var queryconsultahana = "SELECT T0.\"CardCode\", T0.\"CardType\", T0.\"CardName\", T0.\"Phone1\", T0.\"Cellular\",T0.\"QryGroup13\",T0.\"QryGroup14\",T0.\"QryGroup15\",T0.\"QryGroup16\",T0.\"QryGroup17\",T0.\"U_TIPO_RUC\"  FROM \"PRUEBAS_CRM\".OCRD T0 INNER JOIN \"PRUEBAS_CRM\".OSLP T1 ON T0.\"SlpCode\" = T1.\"SlpCode\" WHERE T0.\"validFor\"='Y' and T0.\"CardType\" = 'C' ORDER BY T0.\"CardName\" asc";
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar clientes');
            conn.exec(queryconsultahana, function (err, res) {
                if (err) {
                    result(err, null);
                    return console.error('Error ejecutando la consulta: ', err.message, err);
                }
                // Cerrar la conexión
                conn.disconnect((err) => {
                    if (err) {
                        return console.error('Error cerrando la conexión: ', err.message, err);
                    }
                    console.log('Conexión cerrada.');
                });
                result(null, res);
            });
        }
    });
}
//Obtener informacion del producto con los datos de la ultima compra del cliente
// Listado de producto activos de SAP.
crm.obtenerproducto = function (body, result) {
    const conn = hana.createConnection();

    const queryProducto = `
SELECT 
    T0."ItemCode", T0."ItemName", T3."ItmsGrpNam", T1."Code", T1."Rate", T0."AvgPrice",
    (SELECT T2."OnHand" FROM "EC_SBO_MINERVA_PRO".OITW T2 WHERE T2."ItemCode" = T0."ItemCode" AND T2."WhsCode" = 'Q01') AS BUIO,
    (SELECT T2."OnHand" FROM "EC_SBO_MINERVA_PRO".OITW T2 WHERE T2."ItemCode" = T0."ItemCode" AND T2."WhsCode" = 'G01') AS BGYE,
    (SELECT T2."OnHand" FROM "EC_SBO_MINERVA_PRO".OITW T2 WHERE T2."ItemCode" = T0."ItemCode" AND T2."WhsCode" = 'RQ1') AS RUIO,
    (SELECT T2."OnHand" FROM "EC_SBO_MINERVA_PRO".OITW T2 WHERE T2."ItemCode" = T0."ItemCode" AND T2."WhsCode" = 'RG1') AS RGYE,
    T0."InvntryUom",
    (SELECT T1."Price" FROM "EC_SBO_MINERVA_PRO"."ITM1" T1 WHERE T1."PriceList" = 2 AND T1."ItemCode" = T0."ItemCode") AS PVPMIN,
    (SELECT T1."Price" FROM "EC_SBO_MINERVA_PRO"."ITM1" T1 WHERE T1."PriceList" = 5 AND T1."ItemCode" = T0."ItemCode") AS PVPMAX,
    (SELECT T1."Price" FROM "EC_SBO_MINERVA_PRO"."ITM1" T1 WHERE T1."PriceList" = 6 AND T1."ItemCode" = T0."ItemCode") AS PVPESP
FROM "EC_SBO_MINERVA_PRO".OITM T0
INNER JOIN "EC_SBO_MINERVA_PRO"."OITB" T3 ON T3."ItmsGrpCod" = T0."ItmsGrpCod"
INNER JOIN "EC_SBO_MINERVA_PRO"."OSTC" T1 ON T0."TaxCodeAR" = T1."Code"
WHERE T0."ItemCode" = '${body.ItemCode}'
`;

    const queryVentasCliente = `
SELECT TOP 2 DISTINCT 
    T1."ItemCode", T1."Dscription", T1."Price", T1."Quantity" AS CANTIDAD,
    (T1."Price" * T1."Quantity") AS VENTA, T0."DocDate"
FROM "EC_SBO_MINERVA_PRO".OINV T0
INNER JOIN "EC_SBO_MINERVA_PRO".INV1 T1 ON T0."DocEntry" = T1."DocEntry"
WHERE T1."ItemCode" != ' '
  AND T0."DocType" = 'I'
  AND T0."CardCode" = '${body.CardCode}'
  AND T1."ItemCode" = '${body.ItemCode}'
ORDER BY T0."DocDate" DESC
`;

    conn.connect(dbConnHana, async (err) => {
        if (err) {
            console.error('Error conectando a HANA:', err.message);
            return result(err, null);
        }

        console.log('Conectado a HANA');

        try {
            // Consulta de producto
            const producto = await new Promise((resolve, reject) => {
                conn.exec(queryProducto, (err, res) => {
                    if (err) return reject(err);
                    resolve(res[0]);
                });
            });

            // Consulta de ventas
            const ventas = await new Promise((resolve, reject) => {
                conn.exec(queryVentasCliente, (err, res) => {
                    if (err) return reject(err);
                    resolve(res);
                });
            });
            const response = {
                inforproducto: producto,
                infoventas: ventas
            };

            result(null, response);
        } catch (err) {
            console.error('Error durante las consultas:', err.message);
            result(err, null);
        } finally {
            conn.disconnect((err) => {
                if (err) {
                    return console.error('Error cerrando la conexión:', err.message);
                }
                console.log('Conexión HANA cerrada.');
            });
        }
    });
}

//Listado de productos con su lote y proveedor.
crm.obtenerproductosconlote = function (result) {
    var queryconsultamysql = "CALL obtenerproductosconlote()";
    //console.log(queryconsultamysql);
    dbConnMySQLImpor.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            //console.log(json[0]);

            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                let data = json[0];
                const resultado = [];

                data.forEach(item => {
                    // Buscar si ya existe el producto en el resultado
                    let producto = resultado.find(p => p.codproducto === item.codproducto);

                    if (!producto) {
                        // Si no existe, lo creamos
                        producto = {
                            codproducto: item.codproducto,
                            descripcion: item.descripcion,
                            proveedores: []
                        };
                        resultado.push(producto);
                    }

                    // Buscar si ya existe el proveedor dentro del producto
                    let proveedor = producto.proveedores.find(p => p.nombreproveedor === item.proveedor);

                    if (!proveedor) {
                        // Si no existe, lo creamos
                        proveedor = {
                            nombreproveedor: item.proveedor,
                            lotes: []
                        };
                        producto.proveedores.push(proveedor);
                    }

                    // Agregar el lote
                    proveedor.lotes.push({ lote: item.nlote });
                });
                result(null, resultado);
            }
        }
    });
}

//Obtener información para agendar una reunion.
crm.obtenerinformacionreunion = function (result) {
    try {
        var queryconsultamysql = "CALL informacionparagenerarvisita()";
        dbConnMySQL.query(queryconsultamysql, async function (err, res) {
            if (err) {
                result(err, null);
            }
            else {
                var json = JSON.parse(JSON.stringify(res));
                //console.log(json[0]);

                if (Object.entries(json).length === 0) {
                    result(null, false);
                } else {
                    let respuesta = {
                        asuntoreuniones: json[0],
                        tiporeunion: json[1]
                    }
                    result(null, respuesta);
                }
            }
        });
    } catch (err) {
        console.log(err);
    }


}


module.exports = crm;