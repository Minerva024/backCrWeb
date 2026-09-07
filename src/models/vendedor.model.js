'use strict';

const moment = require('moment');
moment.locale('es');
const { ingresarofertadeventa } = require('../conexionservicelayersap/solicitudessap');
var dbConnMySQL = require('./../../config/configMySQL');
var dbConnHana = require('./../../config/configSapHana');
const hana = require('@sap/hana-client');
const mailer = require('./../templates/ofertaventa');
const configsql = require('../../config/configsql');

var Vendedor = function (vendedor) {
    this.slpcode = vendedor.slpcode,
        this.slpname = vendedor.slpname,
        this.email = vendedor.email,
        this.mobil = vendedor.mobil
}
//Verificar el ingreso del vendedor.
Vendedor.loginvendedor = async function (body, result) {
    var queryconsultamysql = "CALL ingresousuario('" + body["cedula"] + "','" + body["token"] + "')";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, 'FALSE');
            } else {
                if (json[0] != undefined) {
                    let respuesta = json[0][0]['mail'];
                    var queryconsultahana = "SELECT T0.\"SlpCode\", T0.\"SlpName\", T0.\"Email\", T0.\"Mobil\" FROM \"EC_SBO_MINERVA_PRO\".\"OSLP\" T0 WHERE T0.\"Email\"='" + respuesta + "'";
                    const conn = hana.createConnection();
                    conn.connect(dbConnHana, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('Conectado a HANA -- Login de Vendedor');
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
                } else {
                    result(null, 'FALSE');
                }
            }
        }
    });

}
// Listar los clientes de cada vendedor.
Vendedor.listarclientesvendedor = function (auxslpcode, result) {
    if (auxslpcode != 0) {
        var queryconsultahana = "SELECT T0.\"CardCode\", T0.\"CardType\", T0.\"CardName\", T0.\"Phone1\", T0.\"Cellular\" FROM \"EC_SBO_MINERVA_PRO\".OCRD T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T1 ON T0.\"SlpCode\" = T1.\"SlpCode\" WHERE T0.\"SlpCode\" = " + auxslpcode + " and T0.\"validFor\"='Y' and (T0.\"CardType\" = 'C' or T0.\"CardType\" = 'L' ) ORDER BY T0.\"CardName\" asc";
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


        //Ingresar el log de ingreso a clientes
        var queryconsultamysql = "INSERT INTO logaccesoinfocliente (fecha, hora, slpcode) VALUES (date(now()),time(now())," + auxslpcode + ")";
        dbConnMySQL.query(queryconsultamysql);
    } else {
        var queryconsultahana = "SELECT T0.\"CardCode\", T0.\"CardType\", T0.\"CardName\", T0.\"Phone1\", T0.\"Cellular\" FROM \"EC_SBO_MINERVA_PRO\".OCRD T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T1 ON T0.\"SlpCode\" = T1.\"SlpCode\" WHERE T0.\"validFor\"='Y' and (T0.\"CardType\" = 'C' or T0.\"CardType\" = 'L' ) ORDER BY T0.\"CardName\" asc";
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

}
// Listado de producto activos de SAP.
Vendedor.listarproductos = function (result) {
    let productos = [];
    var queryconsultahana = "SELECT T0.\"ItemCode\", T0.\"ItemName\", T3.\"ItmsGrpNam\", T1.\"Code\", T1.\"Rate\", (SELECT T2.\"OnHand\"  FROM \"EC_SBO_MINERVA_PRO\".OITW T2 where T2.\"ItemCode\" = T0.\"ItemCode\" and T2.\"WhsCode\" = 'Q01') as BUIO, (SELECT T2.\"OnHand\"  FROM \"EC_SBO_MINERVA_PRO\".OITW T2 where T2.\"ItemCode\" = T0.\"ItemCode\" and T2.\"WhsCode\" = 'G01') as BGYE, T0.\"InvntryUom\", (SELECT T1.\"Price\" FROM \"EC_SBO_MINERVA_PRO\".\"ITM1\" T1 WHERE T1.\"PriceList\" = 2 and T1.\"ItemCode\" = T0.\"ItemCode\"  ) as PVPMIN, (SELECT T1.\"Price\" FROM \"EC_SBO_MINERVA_PRO\".\"ITM1\" T1 WHERE T1.\"PriceList\" = 5 and T1.\"ItemCode\" = T0.\"ItemCode\"  ) as PVPMAX, (SELECT T1.\"Price\" FROM \"EC_SBO_MINERVA_PRO\".\"ITM1\" T1 WHERE T1.\"PriceList\" = 6 and T1.\"ItemCode\" = T0.\"ItemCode\"  ) as PVPESP FROM \"EC_SBO_MINERVA_PRO\".OITM T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".\"OITB\" T3 on T3.\"ItmsGrpCod\" = T0.\"ItmsGrpCod\" INNER JOIN \"EC_SBO_MINERVA_PRO\".\"OSTC\" T1 on T0.\"TaxCodeAR\"=T1.\"Code\" WHERE T0.\"validFor\" =  'Y' and ( T0.\"ItmsGrpCod\" = 101 or T0.\"ItmsGrpCod\" = 112 or T0.\"ItmsGrpCod\" = 125 or T0.\"ItmsGrpCod\" = 102 or T0.\"ItmsGrpCod\" = 126 or T0.\"ItmsGrpCod\" = 113 or T0.\"ItmsGrpCod\" = 128 or T0.\"ItmsGrpCod\" = 114 or T0.\"ItmsGrpCod\" = 115 or T0.\"ItmsGrpCod\" = 129 or T0.\"ItmsGrpCod\" = 116 or T0.\"ItmsGrpCod\" = 127 or T0.\"ItmsGrpCod\" = 123 or T0.\"ItmsGrpCod\" = 124 ) ORDER BY T0.\"ItemName\" asc;";
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar productos');
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
                res.forEach(element => {
                    let producto = {
                        InvntryUom: element["InvntryUom"],
                        ItemCode: element["ItemCode"],
                        ItemName: element["ItemName"],
                        ItmsGrpNam: element["ItmsGrpNam"],
                        Code: element["Code"],
                        Rate: parseFloat(element["Rate"]),
                        BUIO: parseFloat(element["BUIO"]),
                        BGYE: parseFloat(element["BGYE"]),
                        PVPMIN: parseFloat(element["PVPMIN"]),
                        PVPMAX: parseFloat(element["PVPMAX"]),
                        PVPESP: parseFloat(element["PVPESP"])
                    }
                    productos.push(producto);
                });
                result(null, productos);
            });
        }
    }

    );

    //Ingresar el log de ingreso a clientes
    var queryconsultamysql = "INSERT INTO logaccesoproductos (fecha, hora) VALUES (date(now()),time(now()))";
    dbConnMySQL.query(queryconsultamysql);
}
// Listado de producto activos de SAP.
Vendedor.obtenerproducto = function (auxitemcode, result) {
    let productos = [];
    var queryconsultahana = "SELECT T0.\"ItemCode\", T0.\"ItemName\", T3.\"ItmsGrpNam\", T1.\"Code\", T1.\"Rate\", T0.\"AvgPrice\", (SELECT T2.\"OnHand\"  FROM \"EC_SBO_MINERVA_PRO\".OITW T2 where T2.\"ItemCode\" = T0.\"ItemCode\" and T2.\"WhsCode\" = 'Q01') as BUIO, (SELECT T2.\"OnHand\"  FROM \"EC_SBO_MINERVA_PRO\".OITW T2 where T2.\"ItemCode\" = T0.\"ItemCode\" and T2.\"WhsCode\" = 'G01') as BGYE, (SELECT T2.\"OnHand\"  FROM \"EC_SBO_MINERVA_PRO\".OITW T2 where T2.\"ItemCode\" = T0.\"ItemCode\" and T2.\"WhsCode\" = 'RQ1') as RUIO, (SELECT T2.\"OnHand\"  FROM \"EC_SBO_MINERVA_PRO\".OITW T2 where T2.\"ItemCode\" = T0.\"ItemCode\" and T2.\"WhsCode\" = 'RG1') as RGYE, T0.\"InvntryUom\", (SELECT T1.\"Price\" FROM \"EC_SBO_MINERVA_PRO\".\"ITM1\" T1 WHERE T1.\"PriceList\" = 2 and T1.\"ItemCode\" = T0.\"ItemCode\"  ) as PVPMIN, (SELECT T1.\"Price\" FROM \"EC_SBO_MINERVA_PRO\".\"ITM1\" T1 WHERE T1.\"PriceList\" = 5 and T1.\"ItemCode\" = T0.\"ItemCode\"  ) as PVPMAX, (SELECT T1.\"Price\" FROM \"EC_SBO_MINERVA_PRO\".\"ITM1\" T1 WHERE T1.\"PriceList\" = 6 and T1.\"ItemCode\" = T0.\"ItemCode\"  ) as PVPESP FROM \"EC_SBO_MINERVA_PRO\".OITM T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".\"OITB\" T3 on T3.\"ItmsGrpCod\" = T0.\"ItmsGrpCod\" INNER JOIN \"EC_SBO_MINERVA_PRO\".\"OSTC\" T1 on T0.\"TaxCodeAR\"=T1.\"Code\" WHERE T0.\"ItemCode\" = '" + auxitemcode + "';";
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar productos');
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
                /*res.forEach(element => {
                    let producto = {
                        InvntryUom: element["InvntryUom"],
                        ItemCode: element["ItemCode"],
                        ItemName: element["ItemName"],
                        ItmsGrpNam: element["ItmsGrpNam"],
                        Code: element["Code"],
                        Rate: parseFloat(element["Rate"]),
                        BUIO: parseFloat(element["BUIO"]),
                        BGYE: parseFloat(element["BGYE"]),
                        PVPMIN: parseFloat(element["PVPMIN"]),
                        PVPMAX: parseFloat(element["PVPMAX"]),
                        PVPESP: parseFloat(element["PVPESP"])
                    }
                    productos.push(producto);       
                });*/
                result(null, res);
            });
        }
    }

    );
}
// Listado de producto activos de SAP.
Vendedor.obtenerimportacionesproducto = function (auxitemcode, result) {
    let productos = [];
    var queryconsultahana = "SELECT T0.\"NumAtCard\" AS MI, T1.\"ItemCode\" AS CODIGO_ARTICULO, T2.\"ItemName\" AS ARTICULO, T1. \"Quantity\" AS CANTIDAD_UN, T0.\"DocDueDate\" AS FECHA_BODEGA, T0.\"U_Comment\" AS TIPO_FECHA, T0.\"U_DESTINY\" AS DESTINO FROM \"EC_SBO_MINERVA_PRO\".OPOR T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".POR1 T1 ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OITM T2 ON T1.\"ItemCode\" = T2.\"ItemCode\" WHERE T0.\"DocStatus\" = 'O' and CAST(T0.\"U_Comment\" as NVARCHAR) = 'FC' and T1.\"ItemCode\" = '" + auxitemcode + "' ORDER BY T0.\"DocDueDate\" asc;";
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar productos');
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
//Realizar el ingreso de una oferta de venta mediante el Service Layer.
Vendedor.ingresareoferta = async function (oferta, result) {
    
// ********** Agergado para controlar logs por RM

  console.log("======================================");
    console.log("[OFERTA] Solicitud recibida");
    console.log("[OFERTA] Fecha:", new Date().toISOString());
    console.log("[OFERTA] Cliente:", oferta["CardCode"]);
    console.log("[OFERTA] Vendedor:", oferta["SlpCode"]);

// Fin de lineas


// *******************************  Debo ingresar la oferta con el service layer ***************************
    var fechaentrega = moment(oferta['Datepickup'], "DD/MM/YYYY").format();
    var itemofsap = [];
    oferta['DocumentLines'].forEach(element => {
        var aux = {
            "ItemCode": element['ItemCode'],
            "Quantity": element['Quantity'],
            "UnitPrice": element['UnitPrice'],
            "TaxCode": element['TaxCode']
        }
        itemofsap.push(aux);
    });
    var auxofertaslsap = {
        "CardCode": oferta['CardCode'],
        "Series": 147,
        "DocDueDate": fechaentrega.substring(0, fechaentrega.indexOf('T')),
        "Comments": oferta['Nota'],
        "DocumentLines": itemofsap
    }
   
// *****agregado solo esta linea RM

console.log("[OFERTA] Iniciando registro en SAP...");
console.log("[OFERTA] L�neas enviadas a SAP:");
console.log(JSON.stringify(auxofertaslsap.DocumentLines, null, 2));

// termina la linea

// Agregado por RM
console.log("[OFERTA] Datos enviados a SAP:");
console.log(JSON.stringify(auxofertaslsap, null, 2));
// Fin de linea
 let ingresado = await ingresarofertadeventa(auxofertaslsap);

// **** agrega otra linea RM
console.log("[OFERTA] SAP respondi�:", ingresado);
// termina linea    


//result(null, false);

    // *******************************  Ingreso provisional a una base de datos ***************************
    let ingresadooferta = false;
    var queryconsultamysql = "CALL ingresarofertaventa('" + (oferta["CardName"]).replace(/'/g, "\\'") + "','" + oferta["CardCode"] + "','" + moment(oferta["Datepickup"], 'DDMMYYYY').format('l') + "'," + oferta["SlpCode"] + ",'" + oferta["Nota"] + "','" + oferta["Bodega"] + "')";


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
                ingresadooferta = true;
                let contador = 0;
                oferta["DocumentLines"].forEach(element => {
                    var queryconsultamysql2 = "CALL ingresaritemoferta('" + element["ItemCode"] + "','" + element["ItemName"] + "'," + element["Quantity"] + "," + element["UnitPrice"] + "," + element["Rate"] + "," + json[0][0]["idoferta"] + ")";
                    dbConnMySQL.query(queryconsultamysql2, async function (err, res) {
                        if (!err) {
                            var json = JSON.parse(JSON.stringify(res));
                            if (Object.entries(json).length === 0) {
                            } else {
                                contador = contador + 1;
                            }
                        } else {
                            console.log(err);
                        }
                    });
                });
                //Realizo la consulta del datos del vendedor para enviar el correo.
                var queryconsultamysqlcorreo = "SELECT * FROM usuarios WHERE slpcode = " + oferta["SlpCode"];

                dbConnMySQL.query(queryconsultamysqlcorreo, async function (err, res) {
                    if (err) {
                        result(err, null);
                    }
                    else {
                        var json = JSON.parse(JSON.stringify(res));
                        if (Object.entries(json).length === 0) {

                        } else {
                            mailer.enviar_mail(json[0]["mail"], json[0]["nombres"] + " " + json[0]["apellidos"], oferta["CardCode"], oferta["CardName"], oferta["Datepickup"], oferta["DocumentLines"], oferta["Nota"], oferta["Bodega"]);
                        }
                    }
                });
// Agregar otra linea RM
console.log("[OFERTA] Finalizando proceso correctamente");
// fin de linea 
                result(null, true);

            }
        }
    });
}
//Realizar el ingreso de una oferta de venta mediante el Service Layer.
Vendedor.ingresarcotizacion = async function (oferta, result) {
    let ingresadocotizacion = false;
    if (oferta["realizadopor"] == undefined) {
        var queryconsultamysql = "CALL ingresarcotizacioncrm('" + (oferta["CardName"]).replace(/'/g, "\\'") + "','" + oferta["CardCode"] + "','" + moment(oferta["Datepickup"], 'DDMMYYYY').format('l') + "'," + oferta["SlpCode"] + ",'" + oferta["Nota"] + "','" + oferta["Bodega"] + "','')";
    } else {
        var queryconsultamysql = "CALL ingresarcotizacioncrm('" + (oferta["CardName"]).replace(/'/g, "\\'") + "','" + oferta["CardCode"] + "','" + moment(oferta["Datepickup"], 'DDMMYYYY').format('l') + "'," + oferta["SlpCode"] + ",'" + oferta["Nota"] + "','" + oferta["Bodega"] + "','" + oferta["realizadopor"] + "')";
    }
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            console.log(err);

            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            let idcotizacion = json[0][0]["idcotizacion"];
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                ingresadocotizacion = true;
                let contador = 0;
                oferta["DocumentLines"].forEach(element => {
                    var queryconsultamysql2 = "CALL ingresaritemcotizacion('" + element["ItemCode"] + "','" + element["ItemName"] + "'," + parseFloat(element["Quantity"]).toFixed(2) + "," + parseFloat(element["UnitPrice"]).toFixed(2) + "," + element["Rate"] + "," + json[0][0]["idcotizacion"] + ")";
                    dbConnMySQL.query(queryconsultamysql2, async function (err, res) {
                        if (!err) {
                            var json = JSON.parse(JSON.stringify(res));
                            if (Object.entries(json).length === 0) {
                            } else {
                                contador = contador + 1;
                            }
                        } else {
                            console.log(err);
                        }
                    });
                });
                //Realizo la consulta del datos del vendedor para enviar el correo.
                var queryconsultamysqlcorreo = "SELECT * FROM usuarios WHERE slpcode = " + oferta["SlpCode"];
                dbConnMySQL.query(queryconsultamysqlcorreo, async function (err, res) {
                    if (err) {
                        result(err, null);
                    }
                    else {
                        var json = JSON.parse(JSON.stringify(res));
                        if (Object.entries(json).length === 0) {
                            result(err, null);
                        } else {
                            //Despues de haber realizado el almacenamiento en la base de datos hago el codigo para el PDF.
                            //Declaracion de variables:
                            let fechaactual = moment().format();
                            let fechaentrega = moment(oferta["Datepickup"], "DD/MM/YYYY").format();
                            let subtotal0 = 0;
                            let subtotal5 = 0;
                            let subtotal15 = 0;
                            let subtotal = 0;
                            let impuestos = 0;
                            // *******************************  Genero la base de la estrutura del PDF para enviar ***************************
                            let table = "";
                            //Genero cada una de las filas de la tabla de los productos.
                            oferta["DocumentLines"].forEach((element) => {
                                let aux = "<tr><td>" + element["ItemName"] + "</td><td>" + element["Quantity"] + "</td><td>" + element["UnitPrice"] + "</td><td>" + element["Rate"] + "</td><td>" + (parseFloat(element["Quantity"]) * parseFloat(element["UnitPrice"])).toFixed(2) + "</td></tr>";
                                table += aux;
                                impuestos = impuestos + (parseFloat(element["Quantity"]) * parseFloat(element["UnitPrice"]) * (parseFloat(element["Rate"]) / 100));
                                subtotal = subtotal + (parseFloat(element["Quantity"]) * parseFloat(element["UnitPrice"]));
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
                                <td style="width: 45%; border-right: 0; background-image: url(https://vacaciones.minerva.com.ec:8090/assets/Imagenes/LogoMinerva.png); background-size: contain; background-repeat: no-repeat;">
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
                            <h2 style="text-align: center;">COTIZACIÓN No. `+ idcotizacion + `</h2>
                            </div>
                            <table style="border-style: hidden;">
                            <tr style="border-style: hidden;">
                                <td style="border-style: hidden;">
                                <strong>Fecha del documento:</strong> `+ fechaactual.substring(0, fechaactual.indexOf('T')) + `
                                </td>
                                <td style="border-style: hidden;">
                                <strong>Válido hasta:</strong> `+ fechaentrega.substring(0, fechaentrega.indexOf('T')) + `
                                </td>
                            </tr>
                            <tr style="border-style: hidden;">
                                <td style="border-style: hidden;">
                                <strong>RUC/CI:</strong> `+ oferta['CardCode'].substring(1, oferta['CardCode'].length) + `
                                </td>
                                <td style="border-style: hidden;">
                                <strong>Cliente:</strong> `+ oferta['CardName'] + `
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
                                <p><strong>Representante de Ventas: </strong>`+ json[0]["nombres"] + " " + json[0]["apellidos"] + ` </p>
                                <p><strong>Correo: </strong>`+ json[0]["mail"] + `</p>
                                <p>Esta propuesta tiene validez de 8 días</p>
                                <p style="text-align: right;">Cotización generada desde el CRM Móvil.</p>
                            </div>

                            </body>`;


                            let auxresp = {
                                "idcotizacion": idcotizacion,
                                "cardname": oferta['CardName'],
                                "codigopdf": bodyhtml
                            }
                            //mailer.enviar_mail(json[0]["mail"], json[0]["nombres"] + " " + json[0]["apellidos"], oferta["CardCode"], oferta["CardName"], oferta["Datepickup"], oferta["DocumentLines"], oferta["Nota"], oferta["Bodega"]);

                            result(null, auxresp);
                        }
                    }
                });



            }
        }
    });
}
// Obtener la información de un cliente.
Vendedor.obtenercliente = function (cardcode, result) {
    let cliente;
    var queryconsultahana = "SELECT T0.\"CardCode\", T0.\"CreateDate\", T0.\"CardName\", T1.\"GroupName\", T2.\"IndName\", T4.\"PymntGroup\", T0.\"CreditLine\", T5.\"descript\", T0.\"E_Mail\", T0.\"Phone1\", T0.\"Phone2\", T0.\"Cellular\", T0.\"City\", (T6.\"FirstName\" || ' ' || T6.\"LastName\") as Contact, T7.\"Street\" FROM \"EC_SBO_MINERVA_PRO\".OCRD T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRG T1 ON T0.\"GroupCode\" = T1.\"GroupCode\" LEFT JOIN \"EC_SBO_MINERVA_PRO\".OOND T2 ON T0.\"IndustryC\" = T2.\"IndCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCTG T4 ON T0.\"GroupNum\" = T4.\"GroupNum\" LEFT JOIN \"EC_SBO_MINERVA_PRO\".OTER T5 ON T0.\"Territory\" = T5.\"territryID\" LEFT JOIN \"EC_SBO_MINERVA_PRO\".OCPR T6 ON T0.\"CardCode\"= T6.\"CardCode\" and T6.\"Name\"='COMPRAS' LEFT JOIN \"EC_SBO_MINERVA_PRO\".CRD1 T7 ON T0.\"CardCode\"= T7.\"CardCode\" and T7.\"LicTradNum\" <> '0' WHERE (T0.\"CardType\" = 'C' OR T0.\"CardType\" = 'L') and T0.\"CardCode\"='" + cardcode + "'";
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Obtener datos del cliente.');
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
                result(null, res[0]);
            });
        }
    }

    );
}
// Obtener la cartera del cliente.
Vendedor.obtenercartera = function (cardcode, result) {
    var queryconsultahana = "SELECT T2.\"SlpCode\", T2.\"SlpName\", T0.\"DocEntry\", T0.\"DocNum\", T0.\"FolioNum\", T0.\"CardName\", T0.\"DocDueDate\", T0.\"DocDate\", (DAYS_BETWEEN (T0.\"DocDueDate\", current_date)) AS \"DIAS\", T0.\"DocTotal\", T0.\"PaidToDate\",(T0.\"DocTotal\"-T0.\"PaidToDate\") AS \"SALDO\", T1.\"Balance\" AS \"TOTAL\" from \"EC_SBO_MINERVA_PRO\".OINV T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T1 ON T0.\"CardCode\" = T1.\"CardCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T2 ON T0.\"SlpCode\" = T2.\"SlpCode\" where T0.\"DocStatus\" = 'O' and T1.\"CardCode\" = '" + cardcode + "' order by T0.\"DocDueDate\" asc";
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Obteniendo la cartera del cliente.');
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
// Obtener los productos del cliente.
Vendedor.obtenerproductosxcliente = function (cardcode, result) {
    var queryconsultahana = "SELECT DISTINCT T1.\"ItemCode\", T1.\"Dscription\", T1.\"Price\", T1.\"Quantity\" AS CANTIDAD, (T1.\"Price\"*T1.\"Quantity\") AS VENTA, T0.\"DocDate\" FROM \"EC_SBO_MINERVA_PRO\".OINV T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".INV1 T1 ON T0.\"DocEntry\" = T1.\"DocEntry\" WHERE T1.\"ItemCode\" != ' ' and T0.\"DocType\"  = 'I' and T0.\"CardCode\" = '" + cardcode + "' ORDER BY T0.\"DocDate\" DESC";

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
                    //Creo el objeto 
                    let auxproducto = {
                        ItemCode: element["ItemCode"],
                        Dscription: element["Dscription"],
                        Price: element["Price"],
                        Cantidad: element["CANTIDAD"],
                        Venta: element["VENTA"],
                        DocDate: element["DocDate"]
                    }
                    // Si es el primer objeto agrego sin restriccion
                    if (productoscliente.length == 0) {
                        productoscliente.push(auxproducto);
                    } else {
                        let existe = false;
                        //Recorro el listado de producto buscando si ya se ha ingresado el producto
                        for (let index = 0; index < productoscliente.length; index++) {
                            if (productoscliente[index]["ItemCode"] == auxproducto["ItemCode"]) {
                                existe = true;
                            }
                        }
                        if (!existe) {
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
// Obtener las fechas y el precio de la compra de los ultimos productos.
Vendedor.obtenerultimascomprasproductocliente = function (datos, result) {
    var queryconsultahana = "SELECT TOP 6 DISTINCT T1.\"ItemCode\", T1.\"Dscription\", T1.\"Price\", T1.\"Quantity\" AS CANTIDAD, (T1.\"Price\"*T1.\"Quantity\") AS VENTA, T0.\"DocDate\" FROM \"EC_SBO_MINERVA_PRO\".OINV T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".INV1 T1 ON T0.\"DocEntry\" = T1.\"DocEntry\" WHERE T1.\"ItemCode\" != ' ' and T0.\"DocType\"  = 'I' and T0.\"CardCode\" = '" + datos["CardCode"] + "' and T1.\"ItemCode\" = '" + datos["ItemCode"] + "'  ORDER BY T0.\"DocDate\"  DESC";

    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Obteniendo las compras de los productos por cliente.');
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
                let productoscliente = res;
                result(null, productoscliente);
            });
        }
    }

    );
}
// Listar los pagos de los clientes.
Vendedor.listarpagosrecibidos = function (auxcardcode, result) {
    //var queryconsultahana = "SELECT T0.\"CardCode\", T0.\"CardName\", T1.\"CheckNum\", T1.\"DueDate\", T2.\"BankName\", T1.\"CheckSum\", T0.\"Comments\" FROM \"EC_SBO_MINERVA_PRO\".ORCT T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".RCT1 T1 ON T0.\"DocEntry\" = T1.\"DocNum\" INNER JOIN \"EC_SBO_MINERVA_PRO\".ODSC T2 ON T1.\"BankCode\" = T2.\"BankCode\" WHERE T0.\"CardCode\" ='" + auxcardcode + "' and T0.\"Series\"=141 and T0.\"Canceled\" = 'N' ORDER BY T1.\"DueDate\" asc";
    var queryconsultahana = "SELECT T0.\"NoDocSum\",T1.\"U_Comment\",T0.\"CardCode\", T0.\"CardName\", T1.\"CheckNum\", T1.\"DueDate\", T2.\"BankName\", T1.\"CheckSum\", T0.\"Comments\", T0.\"U_Factura_1\", T0.\"U_Factura_2\", T0.\"U_Factura_3\", T0.\"U_Factura_4\", T0.\"U_Factura_5\", T0.\"U_Factura_6\", T0.\"U_Valor_F1\", T0.\"U_Valor_F2\", T0.\"U_Valor_F3\", T0.\"U_Valor_F4\", T0.\"U_Valor_F5\", T0.\"U_Valor_F6\" FROM \"EC_SBO_MINERVA_PRO\".ORCT T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".RCT1 T1 ON T0.\"DocEntry\" = T1.\"DocNum\" INNER JOIN \"EC_SBO_MINERVA_PRO\".ODSC T2 ON T1.\"BankCode\" = T2.\"BankCode\" WHERE T0.\"CardCode\" ='" + auxcardcode + "' and T0.\"Series\"=141 and T0.\"Canceled\" = 'N' ORDER BY T1.\"DueDate\" asc";
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar pagos recibidos x cliente');
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


//Obtener el presupuesto del vendedor
Vendedor.obtenerventas = async function (slpcode, result) {
    let mes = (new Date().getMonth() + 1).toString();
    let anio = (new Date().getFullYear()).toString();
    var queryconsultamysql = "SELECT valor FROM presupuesto WHERE nmes = " + mes + " and anio=" + anio + " and idvendedor=" + slpcode;
    var queryconsultsql = "select monto from vendedor.vnd_meta where mes=" + mes + " and anio=" + anio + " and idVendedor=" + slpcode;
    let respuesta;
    var sql = require("mssql");
    /*sql.connect(configsql, async function (err) {
        if (err) {
            console.log(err);
        } else {
            const resultsql = await new sql.Request().query(queryconsultsql);
            let auxpresupuesto = resultsql.recordset;
            var queryconsultahana = "SELECT  CEDULA, VENDEDOR, CLIENTE, sum(cantidad) - sum (cantidadNC) as \"CANTIDAD\", Sum(TotFac) - SUM(TotNC) as  \"IMPORTE_DE_VENTAS\", Sum(GBrutaFac)-SUM(GbrutaNC) as \"GANANCIA\", Round((Sum(GBrutaFac)-SUM(GbrutaNC)) / case when  (Sum(TotFac) - SUM(TotNC))= 0 then 1 else (Sum(TotFac) - SUM(TotNC)) end  *100,2) as \"MARGEN\", FECHA_VENTA FROM (SELECT T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, T0.\"CardName\" AS CLIENTE, SUM (T1.\"InvQty\") as cantidad, 0 as cantidadNC, Sum(T1.\"LineTotal\") as TotFac, SUM(T1.\"GrssProfit\") as GBrutaFac, 0 as TotNc, 0 as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\" FROM \"EC_SBO_MINERVA_PRO\".OINV T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".INV1 T1  ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE   (T0.\"DocDate\" >='" + (new Date().getFullYear()) + "-" + ((new Date().getMonth() + 1).toString().padStart(2, '0')) + "-" + "01" + "') and T4.\"SlpCode\" = " + slpcode + " Group by T4.\"SlpCode\", T4.\"SlpName\",T0.\"CardName\" ,T0.\"DocDate\" Union SELECT  T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, T0.\"CardName\" AS CLIENTE, 0 as cantidad , SUM(T1.\"InvQty\") as cantidadNC, 0 as TotFac, 0 as GBrutaFac, Sum(T1.\"LineTotal\") as TotNc, SUM(T1.\"GrssProfit\") as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\" FROM \"EC_SBO_MINERVA_PRO\".ORIN T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".RIN1 T1  ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE  (T0.\"DocDate\" >='" + (new Date().getFullYear()) + "-" + ((new Date().getMonth() + 1).toString().padStart(2, '0')) + "-" + "01" + "') and T4.\"SlpCode\" = " + slpcode + " Group by T4.\"SlpCode\", T4.\"SlpName\",T0.\"CardName\",T0.\"DocDate\") T Group by  CEDULA, VENDEDOR, CLIENTE, FECHA_VENTA ORDER BY FECHA_VENTA;";
            const conn = hana.createConnection();
            conn.connect(dbConnHana, async function (err) {
                if (err) {
                    console.log(err);
                    result(null, false);
                } else {
                    console.log('Conectado a HANA -- Obtener datos del cliente.');
                    conn.exec(queryconsultahana, async function (err, res) {
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
                        let venta = 0;
                        let ganancia = 0;

                        res.forEach(element => {
                            venta = venta + parseFloat(element["IMPORTE_DE_VENTAS"]);
                            ganancia = ganancia + parseFloat(element["GANANCIA"]);
                        });
                        if (auxpresupuesto.length == 0) {
                            respuesta = {
                                "Venta": venta.toFixed(2),
                                "Margen": parseFloat((ganancia / venta) * 100).toFixed(2),
                                "Presupuesto": 0
                            }
                        } else {
                            respuesta = {
                                "Venta": venta.toFixed(2),
                                "Margen": parseFloat((ganancia / venta) * 100).toFixed(2),
                                "Presupuesto": (auxpresupuesto[0]["monto"]).toFixed(2)
                            }
                        }
                        sql.close();
                        result(null, respuesta);
                    });

                }
            }
            );
        }
    });*/
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            console.log(err);
            return (err);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            let auxpresupuesto = json;
            var queryconsultahana = "SELECT  CEDULA, VENDEDOR, CLIENTE, sum(cantidad) - sum (cantidadNC) as \"CANTIDAD\", Sum(TotFac) - SUM(TotNC) as  \"IMPORTE_DE_VENTAS\", Sum(GBrutaFac)-SUM(GbrutaNC) as \"GANANCIA\", Round((Sum(GBrutaFac)-SUM(GbrutaNC)) / case when  (Sum(TotFac) - SUM(TotNC))= 0 then 1 else (Sum(TotFac) - SUM(TotNC)) end  *100,2) as \"MARGEN\", FECHA_VENTA FROM (SELECT T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, T0.\"CardName\" AS CLIENTE, SUM (T1.\"InvQty\") as cantidad, 0 as cantidadNC, Sum(T1.\"LineTotal\") as TotFac, SUM(T1.\"GrssProfit\") as GBrutaFac, 0 as TotNc, 0 as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\" FROM \"EC_SBO_MINERVA_PRO\".OINV T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".INV1 T1  ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE   (T0.\"DocDate\" >='" + (new Date().getFullYear()) + "-" + ((new Date().getMonth() + 1).toString().padStart(2, '0')) + "-" + "01" + "') and T4.\"SlpCode\" = " + slpcode + " Group by T4.\"SlpCode\", T4.\"SlpName\",T0.\"CardName\" ,T0.\"DocDate\" Union SELECT  T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, T0.\"CardName\" AS CLIENTE, 0 as cantidad , SUM(T1.\"InvQty\") as cantidadNC, 0 as TotFac, 0 as GBrutaFac, Sum(T1.\"LineTotal\") as TotNc, SUM(T1.\"GrssProfit\") as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\" FROM \"EC_SBO_MINERVA_PRO\".ORIN T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".RIN1 T1  ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE  (T0.\"DocDate\" >='" + (new Date().getFullYear()) + "-" + ((new Date().getMonth() + 1).toString().padStart(2, '0')) + "-" + "01" + "') and T4.\"SlpCode\" = " + slpcode + " Group by T4.\"SlpCode\", T4.\"SlpName\",T0.\"CardName\",T0.\"DocDate\") T Group by  CEDULA, VENDEDOR, CLIENTE, FECHA_VENTA ORDER BY FECHA_VENTA;";
            const conn = hana.createConnection();
            conn.connect(dbConnHana, async function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Conectado a HANA -- Obtener datos del cliente.');
                    conn.exec(queryconsultahana, async function (err, res) {
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
                        let venta = 0;
                        let ganancia = 0;

                        res.forEach(element => {
                            venta = venta + parseFloat(element["IMPORTE_DE_VENTAS"]);
                            ganancia = ganancia + parseFloat(element["GANANCIA"]);
                        });
                        let respuesta;
                        console.log(auxpresupuesto);
                        if (auxpresupuesto.length == 0) {
                            respuesta = {
                                "Venta": venta.toFixed(2),
                                "Margen": parseFloat((ganancia / venta) * 100).toFixed(2),
                                "Presupuesto": 0
                            }
                        } else {
                            respuesta = {
                                "Venta": venta.toFixed(2),
                                "Margen": parseFloat((ganancia / venta) * 100).toFixed(2),
                                "Presupuesto": (auxpresupuesto[0]["valor"]).toFixed(2)
                            }
                        }

                        result(null, respuesta);
                    });
                }
            }

            );


        }
    });
}


/********************************************
        Nuevo servicio de agendamiento de reunion
************************************************************ */
//Nuevo servicio de agendamiento de reunion
Vendedor.agendarvisitan = async function (visita, result) {
    console.log(visita);
    
    var queryconsultamysql = "CALL ingresarvisitan('" + visita["cardname"] + "','" + visita["fecha"] + "'," + visita["idvendedor"] + ",'" + visita["cardcode"] + "','" + visita["hora"] + "','" + visita["persona_reunion"] + "'," + visita["idtiporeunion"] + "," + visita["idasuntoreunion"] + ")";
    console.log(queryconsultamysql);
    
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            console.log(err);
            
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            console.log(json);

            if (Object.entries(json[0]).length === 0) {
                result(null, false);

            } else {
                if (json[0][0]['resultado'] == true) {
                    result (null, true)
                } else {
                    result(null, false);
                }
            }
        }
    });
}

//Ingreso de una visita a un cliente antiguo
Vendedor.agendarvisita = async function (visita, result) {
    var queryconsultamysql = "CALL agregarvisita(" + visita["SlpCode"] + ",'" + visita["CardName"] + "','" + visita["FechaVisita"] + "','" + visita["HoraVisita"] + "','" + visita["Descripcion"] + "','" + visita["CardCode"] + "')";

    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
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

Vendedor.agendarvisita = async function (visita, result) {
    var queryconsultamysql = "CALL agregarvisita(" + visita["SlpCode"] + ",'" + visita["CardName"] + "','" + visita["FechaVisita"] + "','" + visita["HoraVisita"] + "','" + visita["Descripcion"] + "','" + visita["CardCode"] + "')";

    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
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
//Ingreso de una visita a un cliente
Vendedor.agregarubicacionvisita = async function (ubicacionvisita, result) {
    var queryconsultamysql = "CALL ingresarubicacion(" + ubicacionvisita["idvisita"] + ",'" + ubicacionvisita["latitud"] + "','" + ubicacionvisita["longitud"] + "')";

    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
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


//Listar las visitas a los clientes por vendedor
Vendedor.listarvisitas = async function (body, result) {
    moment.locale('es');

    var queryconsultamysql = "CALL listarvisitasvendedor(" + body["SlpCode"] + ",'" + (body["fechaInicio"]).substring(0, (body["fechaInicio"]).indexOf("T")) + "','" + (body["fechafin"]).substring(0, (body["fechafin"]).indexOf("T")) + "')";
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
                result(null, json);
            }
        }
    });
    //Ingresar el log de ingreso a agenda
    var queryconsultamysql = "INSERT INTO logagenda (fecha, hora, slpcode) VALUES (date(now()),time(now())," + body["SlpCode"] + ")";
    dbConnMySQL.query(queryconsultamysql);
}


/* ---------------------------Servicios para el listar visitas-------------------------- */
//Listar las visitas a los clientes por vendedor y por cliente
Vendedor.listarvisitasxclientexvendedor = async function (datos, result) {
    var queryconsultamysql = "CALL listarvisitasxvendedorxcliente(" + datos["SlpCode"] + ",'" + datos["CardCode"] + "')";


    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                result(null, json[0]);
            }
        }
    });
}

Vendedor.listarvisitasxclientexvendedorn = function (datos, result) {
    var queryconsultamysql = "CALL listarvisitasxvendedorxclienten(" + datos["SlpCode"] + ",'" + datos["CardCode"] + "')";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
            return;
        }    
        try {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
                return;
            }
            // Crear array de promesas para todas las consultas
            const promesas = json[0].map(element => {
                return new Promise((resolve, reject) => {
                    var querymysqlresumenvisitas = "CALL listarcomentarios(" + element["idvisita"] + ")";
                    dbConnMySQL.query(querymysqlresumenvisitas, function (err, res) {
                        if (err) {
                            reject(err);
                        } else {
                            var json2 = JSON.parse(JSON.stringify(res));
                            element.resumen = json2[1];
                            element.comentarios = json2[0];
                            resolve(element);
                        }
                    });
                });
            });
            // Esperar a que todas las consultas se completen
            const respuesta = await Promise.all(promesas);
            result(null, respuesta);
        } catch (error) {
            result(error, null);
        }
    });
};

//Agregar comentario a la visita
/*Vendedor.agregarcomentario = async function (comentario, result) {
    var queryconsultamysql = "CALL agregarcomentario('" + comentario["descripcion"] + "'," + comentario["idvisita"] + ")";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                let resp = [];
                json[0].forEach(element => {
                    let aux = element;


                    resp.push(aux);
                    var queryconsultamysqlcomentresumen = "CALL listarcomentarios(" + element.idvisita + ")";
                    try {
                        dbConnMySQL.query(queryconsultamysqlcomentresumen, async function (err, res2) {
                            if (err) {
                                result(err, null);
                            } else {
                                aux["comentarios"] = [{idcomentario:1}];
                                aux["resumen"] = res2[1];
                            }
                        })
                    } catch (err) {
                        console.log(err);

                    }

                });
                result(null, resp);
            }
        }
    });*/

Vendedor.listarvisitasxclientexvendedorn = async function (datos, result) {
    try {
        // Consulta principal
        const queryconsultamysql = `CALL listarvisitasxvendedorxclienten(${datos["SlpCode"]}, '${datos["CardCode"]}')`;

        dbConnMySQL.query(queryconsultamysql, async function (err, res) {
            if (err) return result(err, null);

            let json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                return result(null, false);
            }

            try {
                // Generamos promesas para cada visita
                let promesas = json[0].map(element => {
                    return new Promise((resolve, reject) => {
                        let aux = element;
                        let querycoment = `CALL listarcomentarios(${element.idvisita})`;

                        dbConnMySQL.query(querycoment, (err2, res2) => {
                            if (err2) return reject(err2);

                            aux["comentarios"] = res2[0]; // comentarios
                            aux["resumen"] = res2[1];     // resumen
                            resolve(aux);
                        });
                    });
                });

                // Esperamos a que todas las promesas terminen
                const resp = await Promise.all(promesas);
                result(null, resp);

            } catch (error) {
                result(error, null);
            }
        });
    } catch (error) {
        result(error, null);
    }
};

/*--------------------------------------------------------------------------------------- */
//Agregar comentario a la visita
Vendedor.agregarcomentario = async function (comentario, result) {
    console.log(comentario);
    
    var queryconsultamysql = "CALL agregarcomentario('" + comentario["comentario"] + "'," + comentario["idvisita"] + ",'" + comentario["ingresadopor"] + "')";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                /*
                En este espacio debo generar los servicios necesarios para generar las notificaciones automáticas a los teléfonos de cada vendedor
                1. Realizar la consulta para obtener los datos de la visita y del vendedor para enviar la notificacion.
                2. Generar el uso de servicios para notificar al vendedor
                 */
                result(null, true);
            }
        }
    });
}

//Agregar comentario a la visita
Vendedor.agregardetallereunion = async function (comentario, result) {
    console.log(comentario);
    
    var queryconsultamysql = "CALL agregardetallereunion('" + comentario["detalle"] + "'," + comentario["idvisita"] + ",'" + comentario["ingresadopor"] + "')";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                /*
                En este espacio debo generar los servicios necesarios para generar las notificaciones automáticas a los teléfonos de cada vendedor
                1. Realizar la consulta para obtener los datos de la visita y del vendedor para enviar la notificacion.
                2. Generar el uso de servicios para notificar al vendedor
                 */
                result(null, true);
            }
        }
    });
}


//Eliminar una visita agendada
Vendedor.eliminarvisita = async function (body, result) {
    var queryconsultamysql = "CALL eliminarvisita(" + body['idvisita'] + ")";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
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
//Funcion para listar los comentarios de un evento
Vendedor.listarcomentarios = async function (idvisita, result) {
    var queryconsultamysql = "CALL listarcomentarios(" + idvisita + ")";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {                
                result(null, json);
            }
        }
    });
}
// ---------------------------- Algunos servicios para la parte web ------------------------
Vendedor.listarvendedores = async function (result) {
    var queryconsultamysql = "CALL listarvendedores()";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                result(null, json[0]);
            }
        }
    });
}
// Listar las oferta de cada vendedor.
Vendedor.listarofertasventa = function (body, result) {
    console.log("Consulto las ofertas de venta");
    var queryconsultamysql = "CALL listarofertasventa(" + body['slpcode'] + ",'" + (body["fechainicio"]).substring(0, (body["fechainicio"]).indexOf("T")) + "','" + (body["fechafin"]).substring(0, (body["fechafin"]).indexOf("T")) + "')";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));

            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                result(null, json[0]);
            }
        }
    });
}
// Listar los items de cada vendedor.
Vendedor.listaritemsofertaventa = function (auxidofertaventa, result) {
    console.log("Consulto las ofertas de venta");
    var queryconsultamysql = "CALL listaritemsofertaventa(" + auxidofertaventa + ")";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                let respuesta = {
                    items: json[0],
                    ivatotal: json[1][0]["ivatotal"],
                    totaloferta: json[2][0]["total"]
                }
                result(null, respuesta);
            }
        }
    });
}
//Informe de uso aplicación
Vendedor.informeuosapp = function (body, result) {
    var queryconsultamysql = "CALL informeusoappcomercial('" + body["fechainicio"] + "','" + body["fechafin"] + "')";
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
                result(null, respuesta);
            }
        }
    });
}
//Funcion para el ingreso de lead de la feria.
Vendedor.ingresarleadferia = function (body, result) {
    var queryconsultamysql = "CALL ingresarleadferia('" + body["nombre"] + "','" + body["telefono"] + "','" + body['negocio'] + "','" + body['correo'] + "','" + body['ciudad'] + "','" + body['productos'] + "','" + body['vendedor'] + "')";
    dbConnMySQL.query(queryconsultamysql, async function (err, res) {
        if (err) {
            result(err, null);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            if (Object.entries(json).length === 0) {
                result(null, false);
            } else {
                let respuesta = json[0];
                result(null, respuesta[0]);
            }
        }
    });
}
//Funcion para listar las cotizaciones del vendedor.
Vendedor.listarcotizaciones = function (body, result) {
    var queryconsultamysql = "CALL listarcotizacionesxvendedor(" + body["SlpCode"] + ")";
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
                result(null, respuesta[0]);
            }
        }
    });
}
//Funcion para generar el pdf de una cotización
Vendedor.generarcotizacion = function (auxidcotizacion, result) {
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
                    <td style="width: 45%; border-right: 0; background-image: url(https://vacaciones.minerva.com.ec:8090/assets/Imagenes/LogoMinerva.png); background-size: contain; background-repeat: no-repeat;">
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
                </div>

                </body>`;


                let auxresp = {
                    "idcotizacion": respuesta[0][0]['idcotizacion'],
                    "cardname": respuesta[0][0]['cardname'],
                    "codigopdf": bodyhtml
                }

                result(null, auxresp);
            }
        }
    });
}
//Funcion para obtener los pedidos con estatus de autorizacion
Vendedor.listarpedidosstatusautorizacion = function (auxslpcode, result) {
    var queryconsultahana = "SELECT DISTINCT T4.\"DocTotal\",T4.\"DocDueDate\",T4.\"DocNum\",T5.\"U_NAME\", T4.\"CardCode\", T4.\"CardName\", T0.\"DocDate\" , T1.\"Remarks\" , T0.\"DraftEntry\" , T0.\"MaxReqr\" , T3.\"Name\", true as DRAFT, CASE WHEN T1.\"Status\" = 'N' THEN 'Rechazado' WHEN T1.\"Status\" = 'W' THEN 'Pendiente' WHEN T1.\"Status\" = 'Y' THEN 'Aprobada' END \"Status\" FROM \"EC_SBO_MINERVA_PRO\".OWDD T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".ODRF T4 ON T4.\"DocEntry\" = T0.\"DraftEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".WDD1 T1 ON T0.\"WddCode\" = T1.\"WddCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OWTM T3 ON T0.\"WtmCode\" = T3.\"WtmCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OUSR T5 ON T5.\"USERID\" = T0.\"OwnerID\" WHERE T4.\"DocStatus\" = 'O'  and T4.\"SlpCode\"=" + auxslpcode + " and T4.\"ObjType\"=17 and T4.\"WddStatus\" != 'N' UNION SELECT DISTINCT T4.\"DocTotal\",T4.\"DocDueDate\",T4.\"DocNum\",T5.\"U_NAME\", T4.\"CardCode\", T4.\"CardName\", T0.\"DocDate\" , T1.\"Remarks\" , T0.\"DocEntry\",  T0.\"MaxReqr\" , T3.\"Name\", false as DRAFT,CASE WHEN T1.\"Status\" = 'N' THEN 'Rechazado' WHEN T1.\"Status\" = 'W' THEN 'Pendiente' WHEN T1.\"Status\" = 'Y' THEN 'Aprobada' END \"Status\" FROM \"EC_SBO_MINERVA_PRO\".OWDD T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".ORDR T4 ON T4.\"DocEntry\" = T0.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".WDD1 T1 ON T0.\"WddCode\" = T1.\"WddCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OWTM T3 ON T0.\"WtmCode\" = T3.\"WtmCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OUSR T5 ON T5.\"USERID\" = T0.\"OwnerID\" WHERE T4.\"DocStatus\" = 'O' and T4.\"SlpCode\"=" + auxslpcode + " ORDER BY T0.\"DocDate\" DESC";
    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Status de los pedidos.');
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
                //Debo tratar los datos para la visualizacion en la app movil.
                let respuesta = [];

                res.forEach(element => {
                    if (respuesta.length == 0) {
                        //Agrego el primer elemento
                        let aux = {
                            "Ingresado": element['U_NAME'],
                            "CardCode": element['CardCode'],
                            "CardName": element['CardName'],
                            "DocNum": element['DocNum'],
                            "DocDate": element['DocDate'],
                            "DocDueDate": element['DocDueDate'],
                            "isDraft": element['DRAFT'],
                            "DocTotal": element['DocTotal'],
                            "Authorization": []
                        }
                        //Recorro la respuesta buscando las autorizaciones de ese pedido.
                        res.forEach(element2 => {
                            if (element["DocNum"] == element2["DocNum"] && element["CardCode"] == element2["CardCode"] && element["DocDueDate"] == element2["DocDueDate"]) {
                                //Agrego el primer item.
                                if (aux["Authorization"].length == 0) {
                                    let auth = {
                                        "Type": element2["Name"],
                                        "Status": element2["Status"],
                                        "Comments": element2["Remarks"],
                                    }
                                    aux["Authorization"].push(auth);
                                } else {
                                    //Si ya estan registradas authorizaciones debo revisar si se trata de la misma o una diferente
                                    let existia = false;
                                    for (let index = 0; index < aux["Authorization"].length; index++) {
                                        const auxstatus = aux["Authorization"][index];
                                        //Verifico si ya existe la autorizacion
                                        if (element2["Name"] == auxstatus["Type"] && element["DocNum"] == aux["DocNum"] && element["CardCode"] == element2["CardCode"] && element["DocDueDate"] == element2["DocDueDate"]) {
                                            existia = true;
                                            //Si ya existe la autorizacion debo verificar si el status es diferente
                                            if (auxstatus["Status"] != "Aprobada") {
                                                //Verifico cual es el nuevo status
                                                if (auxstatus["Comments"] == null) {
                                                    //Verifico cual es el nuevo status
                                                    aux["Authorization"][index]["Comments"] = element2["Remarks"];

                                                }
                                                if (element2["Status"] == "Aprobada") {
                                                    aux["Authorization"][index]["Status"] = element2["Status"];
                                                    break;
                                                }
                                            }

                                        }
                                    }
                                    if (!existia) {

                                        let auth = {
                                            "Type": element2["Name"],
                                            "Status": element2["Status"],
                                            "Comments": element2["Remarks"],
                                        }
                                        aux["Authorization"].push(auth);
                                    }
                                }
                            }
                        });
                        respuesta.push(aux);
                    } else {
                        let existepedido = false;
                        //Verifico que ya no este creado en el listado de respuesta
                        for (let index = 0; index < respuesta.length; index++) {
                            const elementa = respuesta[index];
                            if (elementa["DocNum"] == element["DocNum"] && elementa["CardCode"] == element["CardCode"] && elementa["DocDueDate"] == element["DocDueDate"]) {
                                existepedido = true;
                                break;
                            }
                        }
                        //Verfico si ya existia el pedido
                        if (!existepedido) {
                            let aux = {
                                "Ingresado": element['U_NAME'],
                                "CardCode": element['CardCode'],
                                "CardName": element['CardName'],
                                "DocNum": element['DocNum'],
                                "DocDate": element['DocDate'],
                                "DocDueDate": element['DocDueDate'],
                                "isDraft": element['DRAFT'],
                                "DocTotal": element['DocTotal'],
                                "Authorization": []
                            }
                            //Recorro la respuesta buscando las autorizaciones de ese pedido.
                            res.forEach(element2 => {
                                if (element["DocNum"] == element2["DocNum"] && element["CardCode"] == element2["CardCode"] && element["DocDueDate"] == element2["DocDueDate"]) {
                                    //Agrego el primer item.
                                    if (aux["Authorization"].length == 0) {
                                        let auth = {
                                            "Type": element2["Name"],
                                            "Status": element2["Status"],
                                            "Comments": element2["Remarks"],
                                        }
                                        aux["Authorization"].push(auth);
                                    } else {
                                        //Si ya estan registradas authorizaciones debo revisar si se trata de la misma o una diferente
                                        let existia = false;
                                        for (let index = 0; index < aux["Authorization"].length; index++) {
                                            const auxstatus = aux["Authorization"][index];
                                            //Verifico si ya existe la autorizacion
                                            if (element2["Name"] == auxstatus["Type"]) {
                                                existia = true;
                                                //Si ya existe la autorizacion debo verificar si el status es diferente
                                                if (auxstatus["Comments"] == null) {
                                                    //Verifico cual es el nuevo status
                                                    aux["Authorization"][index]["Comments"] = element2["Remarks"];

                                                }
                                                if (auxstatus["Status"] != "Aprobada") {
                                                    //Verifico cual es el nuevo status
                                                    if (element2["Status"] == "Aprobada") {
                                                        aux["Authorization"][index]["Status"] = element2["Status"];

                                                        break;
                                                    }

                                                }


                                            }
                                        }
                                        if (!existia) {
                                            let auth = {
                                                "Type": element2["Name"],
                                                "Status": element2["Status"],
                                                "Comments": element2["Remarks"],
                                            }

                                            aux["Authorization"].push(auth);
                                        }
                                    }
                                }
                            });
                            respuesta.push(aux);
                        }
                    }

                });

                result(null, respuesta);
            });
        }
    }

    );
}
//Funcion para rechazar una cotizacion.
Vendedor.rechazarcotizacion = function (aux, result) {
    var queryconsultamysql = "CALL rechazarcotizacion(" + aux["idcotizacion"] + ",'" + aux["motivo"] + "')";
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
                result(null, true);
            }
        }
    });
}
//Funcion para aprobar una cotizacion.
Vendedor.aprobarcotizacion = function (auxidcotizacion, result) {
    var queryconsultamysql = "CALL aprobarcotizacion(" + auxidcotizacion + ")";
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
                //Debo obtener los datos de la respuesta para realizar el ingreso de la cotizacion a oferta de venta de la base de datos
                // y a traves del service layer de SAP.
                //console.log(json[0][0]); //Aqui se encuentran los datos general de la cotizacion
                //console.log(json[1]); //Aqui se encuentran los datos de los items de la cotizacion.
                //Debo realizar el ingreso de la cotizacion a oferta de venta de la base de
                /**************************** PROCESO DE INGRESAR UNA OFERTA DE VENTA EN BASE DE DATOS Y SAP ****************************** */
                //Realizar el ingreso de una oferta de venta mediante el Service Layer.
                // *******************************  Debo ingresar la oferta con el service layer ***************************
                //let ingresado = ingresarofertadeventa(oferta);
                var fechaentrega = moment(json[0][0]["fechaentrega"], "DD/MM/YYYY").format();
                var itemofsap = [];
                json[1].forEach(element => {
                    var aux = {
                        "ItemCode": element['itemcode'],
                        "Quantity": element['quantity'],
                        "UnitPrice": element['unitprice'],
                        "TaxCode": element['tax']
                    }
                    itemofsap.push(aux);
                });
                var auxofertaslsap = {
                    "CardCode": json[0][0]['cardcode'],
                    "Series": 147,
                    "DocDueDate": fechaentrega.substring(0, fechaentrega.indexOf('T')),
                    "Comments": json[0][0]['nota'],
                    "DocumentLines": itemofsap
                }

                let ingresado = await ingresarofertadeventa(auxofertaslsap);

                // *******************************  Ingreso provisional a una base de datos ***************************
                let ingresadooferta = false;
                var queryconsultamysql = "CALL ingresarofertaventacotizacion('" + (json[0][0]["cardname"]).replace(/'/g, "\\'") + "','" + json[0][0]["cardcode"] + "','" + moment(json[0][0]["fechaentrega"], 'DDMMYYYY').format('l') + "'," + json[0][0]["slpcode"] + ",'" + json[0][0]["nota"] + "','" + json[0][0]["bodega"] + "')";


                dbConnMySQL.query(queryconsultamysql, async function (err, res) {
                    if (err) {
                        console.log(err);

                        result(err, null);
                    }
                    else {
                        var jsonmysql = JSON.parse(JSON.stringify(res));
                        if (Object.entries(json).length === 0) {
                            result(null, false);
                        } else {
                            ingresadooferta = true;
                            let contador = 0;
                            (json[1]).forEach(element => {
                                var queryconsultamysql2 = "CALL ingresaritemoferta('" + element["itemcode"] + "','" + element["itemname"] + "'," + element["quantity"] + "," + element["unitprice"] + "," + element["tax"] + "," + jsonmysql[0][0]["idoferta"] + ")";
                                dbConnMySQL.query(queryconsultamysql2, async function (err, res) {
                                    if (!err) {
                                        var json = JSON.parse(JSON.stringify(res));
                                        if (Object.entries(json).length === 0) {
                                        } else {
                                            contador = contador + 1;
                                        }
                                    } else {
                                        console.log(err);
                                    }
                                });
                            });
                            //Realizo la consulta del datos del vendedor para enviar el correo.
                            var queryconsultamysqlcorreo = "SELECT * FROM usuarios WHERE slpcode = " + json[0][0]["slpcode"];
                            dbConnMySQL.query(queryconsultamysqlcorreo, async function (err, res) {
                                if (err) {
                                    result(err, null);
                                }
                                else {
                                    var jsonvendedor = JSON.parse(JSON.stringify(res));
                                    if (Object.entries(json).length === 0) {

                                    } else {
                                        mailer.enviar_mail_cotizacion(jsonvendedor[0]["mail"], jsonvendedor[0]["nombres"] + " " + jsonvendedor[0]["apellidos"], json[0][0]["cardcode"], json[0][0]["cardname"], json[0][0]["fechaentrega"], json[1], json[0][0]["nota"], json[0][0]["bodega"]);
                                    }
                                }
                            });
                        }
                    }
                });
                /************************************************************************************************************************** */
                result(null, true);
            }
        }
    });
}
// Listar los pagos de los clientes.
Vendedor.listarventaspormesesxvendedor = function (result) {
    let fechaactual = (moment().format()).substring(0, (moment().format()).indexOf("T"));
    let anioantes = parseInt(fechaactual.substring(0, fechaactual.indexOf("-"))) - 1;
    var queryconsultahana = "SELECT  CEDULA, VENDEDOR, EXTRACT(MONTH FROM FECHA_VENTA) AS MES, EXTRACT(YEAR FROM FECHA_VENTA) AS ANIO, sum(cantidad) - sum (cantidadNC) as \"CANTIDAD\", Sum(TotFac) - SUM(TotNC) as  \"IMPORTE DE VENTAS\", Sum(GBrutaFac)-SUM(GbrutaNC) as \"GANANCIA\", Round((Sum(GBrutaFac)-SUM(GbrutaNC)) / case when  (Sum(TotFac) - SUM(TotNC))= 0 then 1 else (Sum(TotFac) - SUM(TotNC)) end  *100,2) as \"% MARGEN\", CIUDAD FROM (SELECT T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, SUM (T1.\"InvQty\") as cantidad, 0 as cantidadNC, Sum(T1.\"LineTotal\") as TotFac, SUM(T1.\"GrssProfit\") as GBrutaFac, 0 as TotNc, 0 as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\", T4.\"U_Ciudad\" AS \"CIUDAD\" FROM \"EC_SBO_MINERVA_PRO\".OINV T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".INV1 T1 ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE   (T0.\"DocDate\" >='" + anioantes + "-01-01' and T0.\"DocDate\" <='" + fechaactual + "') Group by T4.\"SlpCode\", T4.\"SlpName\", T0.\"DocDate\",T4.\"U_Ciudad\" Union SELECT T4.\"SlpCode\" AS CEDULA, T4.\"SlpName\" AS VENDEDOR, 0 as cantidad , SUM(T1.\"InvQty\")as cantidadNC, 0 as TotFac,  0 as GBrutaFac, Sum(T1.\"LineTotal\") as TotNc, SUM(T1.\"GrssProfit\") as GbrutaNC, T0.\"DocDate\" AS \"FECHA_VENTA\", T4.\"U_Ciudad\" AS \"CIUDAD\" FROM \"EC_SBO_MINERVA_PRO\".ORIN T0 INNER JOIN \"EC_SBO_MINERVA_PRO\".RIN1 T1  ON T0.\"DocEntry\" = T1.\"DocEntry\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OSLP T4 ON T0.\"SlpCode\" = T4.\"SlpCode\" INNER JOIN \"EC_SBO_MINERVA_PRO\".OCRD T5 ON T0.\"CardCode\" = T5.\"CardCode\" WHERE  (T0.\"DocDate\" >='" + anioantes + "-01-01' and T0.\"DocDate\" <='" + fechaactual + "') Group by T4.\"SlpCode\", T4.\"SlpName\",T0.\"CardName\",T0.\"DocDate\", T4.\"U_Ciudad\") T Group by  CEDULA, VENDEDOR, EXTRACT(MONTH FROM FECHA_VENTA),EXTRACT(YEAR FROM FECHA_VENTA), CIUDAD ORDER BY ANIO,MES";

    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Conectado a HANA -- Listar ventas x vendedor x mes');
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
//Obtener presupuestos;
Vendedor.obtenerpresupuestos = async function (result) {
    let mes = (new Date().getMonth() + 1).toString();
    let anio = (new Date().getFullYear()).toString();
    
	var queryconsultmysql = `SELECT idvendedor,anio,nmes as mes,valor as monto  FROM presupuesto;`;
    let respuesta;

     dbConnMySQL.query(queryconsultmysql, async function (err, res) {
        if (err) {
            console.log(err);
            return (err);
        }
        else {
            var json = JSON.parse(JSON.stringify(res));
            let auxpresupuesto = json;
            result(null, auxpresupuesto);
        }
    });
    /*var sql = require("mssql");
    sql.connect(configsql, async function (err) {
        if (err) {
            console.log(err);
        } else {
            const resultsql = await new sql.Request().query(queryconsultsql);
            let auxpresupuesto = resultsql.recordsets;
            //console.log(resultsql.recordsets);

            respuesta = auxpresupuesto;
            sql.close();
            result(null, respuesta);
        };
    });*/

}
// Listar los pagos de los clientes.
Vendedor.procesoalmacenado = function (result) {
    let fechaactual = (moment().format()).substring(0, (moment().format()).indexOf("T"));
    let anioantes = parseInt(fechaactual.substring(0, fechaactual.indexOf("-"))) - 1;
    var queryconsultahana = "CALL \"EC_SBO_MINERVA_PRO\".\"EXX_SP_LEG_DET_RETE_RECIBIDAS\"('2026-01-01','" + fechaactual + "','TODOS')";


    const conn = hana.createConnection();
    conn.connect(dbConnHana, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Proceso almacenado de MSA');
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

function obtenerlibrolegalcompras() {
    return new Promise((resolve, reject) => {
        // Primer día del mes anterior
        const fechaInicio = moment()
            .subtract(1, 'month')
            .startOf('month')
            .format('YYYY-MM-DD');

        // Último día del mes anterior
        const fechaFin = moment()
            .subtract(1, 'month')
            .endOf('month')
            .format('YYYY-MM-DD');

        const queryconsultahana = `
            CALL "EC_SBO_MINERVA_PRO"."EXX_SP_LIBRO_LEG_COMPRAS_TOT"(
                '${fechaInicio}',
                '${fechaFin}',
                'SI',
                'NO'
            )
        `;

        console.log(queryconsultahana);
        

        const conn = hana.createConnection();

        conn.connect(dbConnHana, function (err) {

            if (err) {
                console.error('Error conectando a HANA:', err);
                return reject(err);
            }

            console.log('Proceso almacenado de MSA');

            conn.exec(queryconsultahana, function (err, res) {

                // cerrar conexión siempre
                conn.disconnect((disconnectErr) => {
                    if (disconnectErr) {
                        console.error('Error cerrando conexión:', disconnectErr);
                    } else {
                        console.log('Conexión cerrada.');
                    }
                });

                if (err) {
                    console.error('Error ejecutando consulta:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}
function obtenerlibrolegalexportaciones() {
    return new Promise((resolve, reject) => {
        // Primer día del mes anterior
        const fechaInicio = moment()
            .subtract(1, 'month')
            .startOf('month')
            .format('YYYY-MM-DD');

        // Último día del mes anterior
        const fechaFin = moment()
            .subtract(1, 'month')
            .endOf('month')
            .format('YYYY-MM-DD');

        const queryconsultahana = `
            CALL "EC_SBO_MINERVA_PRO"."EXX_SP_LIBRO_LEG_EXPORTACION"(
                '${fechaInicio}',
                '${fechaFin}',
                'SI',
                'NO'
            )
        `;

        console.log(queryconsultahana);
        

        const conn = hana.createConnection();

        conn.connect(dbConnHana, function (err) {

            if (err) {
                console.error('Error conectando a HANA:', err);
                return reject(err);
            }

            console.log('Proceso almacenado de MSA');

            conn.exec(queryconsultahana, function (err, res) {

                // cerrar conexión siempre
                conn.disconnect((disconnectErr) => {
                    if (disconnectErr) {
                        console.error('Error cerrando conexión:', disconnectErr);
                    } else {
                        console.log('Conexión cerrada.');
                    }
                });

                if (err) {
                    console.error('Error ejecutando consulta:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}
function obtenerlibrolegalventas() {
    //EXX_SP_LIBRO_LEG_ESTABLECIMIENTOS_RESUMEN(fechinicio,fechafin)
    return new Promise((resolve, reject) => {
        // Primer día del mes anterior
        const fechaInicio = moment()
            .subtract(1, 'month')
            .startOf('month')
            .format('YYYY-MM-DD');

        // Último día del mes anterior
        const fechaFin = moment()
            .subtract(1, 'month')
            .endOf('month')
            .format('YYYY-MM-DD');

        const queryconsultahana = `
            CALL "EC_SBO_MINERVA_PRO"."EXX_SP_LIBRO_LEG_VENTAS"(
                '${fechaInicio}',
                '${fechaFin}'
            )
        `;

         const queryconsultahana2 = `
            CALL ""EXX_SP_LIBRO_LEG_ESTABLECIMIENTOS_RESUMEN"(
                '${fechaInicio}',
                '${fechaFin}'
            )
        `;

        console.log(queryconsultahana);
        

        const conn = hana.createConnection();

        conn.connect(dbConnHana, function (err) {

            if (err) {
                console.error('Error conectando a HANA:', err);
                return reject(err);
            }

            console.log('Proceso almacenado de MSA');

            conn.exec(queryconsultahana, function (err, res) {

                // cerrar conexión siempre
                conn.disconnect((disconnectErr) => {
                    if (disconnectErr) {
                        console.error('Error cerrando conexión:', disconnectErr);
                    } else {
                        console.log('Conexión cerrada.');
                    }
                });

                if (err) {
                    console.error('Error ejecutando consulta:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}
function obtenerlibrolegalventasdetalladas() {
    return new Promise((resolve, reject) => {
        // Primer día del mes anterior
        const fechaInicio = moment()
            .subtract(1, 'month')
            .startOf('month')
            .format('YYYY-MM-DD');

        // Último día del mes anterior
        const fechaFin = moment()
            .subtract(1, 'month')
            .endOf('month')
            .format('YYYY-MM-DD');

        const queryconsultahana = `
            CALL "EC_SBO_MINERVA_PRO"."EXX_SP_LIBRO_LEG_VENTAS_DETALLE"(
                '${fechaInicio}',
                '${fechaFin}',
                'SI',
                'NO',
                'TODOS'
            )
        `;

        console.log(queryconsultahana);
        

        const conn = hana.createConnection();

        conn.connect(dbConnHana, function (err) {

            if (err) {
                console.error('Error conectando a HANA:', err);
                return reject(err);
            }

            console.log('Proceso almacenado de MSA');

            conn.exec(queryconsultahana, function (err, res) {

                // cerrar conexión siempre
                conn.disconnect((disconnectErr) => {
                    if (disconnectErr) {
                        console.error('Error cerrando conexión:', disconnectErr);
                    } else {
                        console.log('Conexión cerrada.');
                    }
                });

                if (err) {
                    console.error('Error ejecutando consulta:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}
function obtenerlibrolegalretencionesefectuadas() {
    return new Promise((resolve, reject) => {
        // Primer día del mes anterior
        const fechaInicio = moment()
            .subtract(1, 'month')
            .startOf('month')
            .format('YYYY-MM-DD');

        // Último día del mes anterior
        const fechaFin = moment()
            .subtract(1, 'month')
            .endOf('month')
            .format('YYYY-MM-DD');

        const queryconsultahana = `
            CALL "EC_SBO_MINERVA_PRO"."EXX_SP_LIBRO_LEG_DET_RETE_EFECTUADAS"(
                '${fechaInicio}',
                '${fechaFin}',
                'NO',
                'SI',
                'NO'
            )
        `;

        console.log(queryconsultahana);
        

        const conn = hana.createConnection();

        conn.connect(dbConnHana, function (err) {

            if (err) {
                console.error('Error conectando a HANA:', err);
                return reject(err);
            }

            console.log('Proceso almacenado de MSA');

            conn.exec(queryconsultahana, function (err, res) {

                // cerrar conexión siempre
                conn.disconnect((disconnectErr) => {
                    if (disconnectErr) {
                        console.error('Error cerrando conexión:', disconnectErr);
                    } else {
                        console.log('Conexión cerrada.');
                    }
                });

                if (err) {
                    console.error('Error ejecutando consulta:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}

Vendedor.libroslegales = async function(params, result) {
     try {
        const librolegalcompras = await obtenerlibrolegalcompras();
        const librolegalexportaciones = await obtenerlibrolegalexportaciones();
        const librolegalventas = await obtenerlibrolegalventas();
        const librolegalventasdetalladas = await obtenerlibrolegalventasdetalladas();
        const librolegalretencionesefectuadas = await obtenerlibrolegalretencionesefectuadas();

        const datos = {
            librolegalcompras: librolegalcompras,
            librolegalexportaciones:librolegalexportaciones,
            librolegalventas:librolegalventas,
            librolegalventasdetalladas:librolegalventasdetalladas,
            librolegalretencionesefectuadas:librolegalretencionesefectuadas
        }

        result(null, datos);
    } catch (error) {
        console.error('❌ Error obteniendo los libros legales:', error);
        result(error, null);
    }
}

//Funcion para obtener la informacion de tipos de reuniones y tipos de asuntos de reuniones.
Vendedor.obtenerinformacionreunion = function (result) {
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

function obtenerlibrolegalcomprascrismo() {
    return new Promise((resolve, reject) => {
        // Primer día del mes anterior
        const fechaInicio = moment()
            .subtract(1, 'month')
            .startOf('month')
            .format('YYYY-MM-DD');

        // Último día del mes anterior
        const fechaFin = moment()
            .subtract(1, 'month')
            .endOf('month')
            .format('YYYY-MM-DD');

        const queryconsultahana = `
            CALL "EC_SBO_CRISMOART_PRO"."EXX_SP_LIBRO_LEG_COMPRAS_TOT"(
                '${fechaInicio}',
                '${fechaFin}',
                'SI',
                'NO'
            )
        `;

        console.log(queryconsultahana);
        

        const conn = hana.createConnection();

        conn.connect(dbConnHana, function (err) {

            if (err) {
                console.error('Error conectando a HANA:', err);
                return reject(err);
            }

            console.log('Proceso almacenado de MSA');

            conn.exec(queryconsultahana, function (err, res) {

                // cerrar conexión siempre
                conn.disconnect((disconnectErr) => {
                    if (disconnectErr) {
                        console.error('Error cerrando conexión:', disconnectErr);
                    } else {
                        console.log('Conexión cerrada.');
                    }
                });

                if (err) {
                    console.error('Error ejecutando consulta:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}
function obtenerlibrolegalventascrismo() {
    //EXX_SP_LIBRO_LEG_ESTABLECIMIENTOS_RESUMEN(fechinicio,fechafin)
    return new Promise((resolve, reject) => {
        // Primer día del mes anterior
        const fechaInicio = moment()
            .subtract(1, 'month')
            .startOf('month')
            .format('YYYY-MM-DD');

        // Último día del mes anterior
        const fechaFin = moment()
            .subtract(1, 'month')
            .endOf('month')
            .format('YYYY-MM-DD');

        const queryconsultahana = `
            CALL "EC_SBO_CRISMOART_PRO"."EXX_SP_LIBRO_LEG_VENTAS"(
                '${fechaInicio}',
                '${fechaFin}'
            )
        `;

         const queryconsultahana2 = `
            CALL ""EXX_SP_LIBRO_LEG_ESTABLECIMIENTOS_RESUMEN"(
                '${fechaInicio}',
                '${fechaFin}'
            )
        `;

        console.log(queryconsultahana);
        

        const conn = hana.createConnection();

        conn.connect(dbConnHana, function (err) {

            if (err) {
                console.error('Error conectando a HANA:', err);
                return reject(err);
            }

            console.log('Proceso almacenado de MSA');

            conn.exec(queryconsultahana, function (err, res) {

                // cerrar conexión siempre
                conn.disconnect((disconnectErr) => {
                    if (disconnectErr) {
                        console.error('Error cerrando conexión:', disconnectErr);
                    } else {
                        console.log('Conexión cerrada.');
                    }
                });

                if (err) {
                    console.error('Error ejecutando consulta:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}
function obtenerlibrolegalventasdetalladascrismo() {
    return new Promise((resolve, reject) => {
        // Primer día del mes anterior
        const fechaInicio = moment()
            .subtract(1, 'month')
            .startOf('month')
            .format('YYYY-MM-DD');

        // Último día del mes anterior
        const fechaFin = moment()
            .subtract(1, 'month')
            .endOf('month')
            .format('YYYY-MM-DD');

        const queryconsultahana = `
            CALL "EC_SBO_CRISMOART_PRO"."EXX_SP_LIBRO_LEG_VENTAS_DETALLE"(
                '${fechaInicio}',
                '${fechaFin}',
                'SI',
                'NO',
                'TODOS'
            )
        `;

        console.log(queryconsultahana);
        

        const conn = hana.createConnection();

        conn.connect(dbConnHana, function (err) {

            if (err) {
                console.error('Error conectando a HANA:', err);
                return reject(err);
            }

            console.log('Proceso almacenado de MSA');

            conn.exec(queryconsultahana, function (err, res) {

                // cerrar conexión siempre
                conn.disconnect((disconnectErr) => {
                    if (disconnectErr) {
                        console.error('Error cerrando conexión:', disconnectErr);
                    } else {
                        console.log('Conexión cerrada.');
                    }
                });

                if (err) {
                    console.error('Error ejecutando consulta:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}
function obtenerlibrolegalretencionesefectuadascrismo() {
    return new Promise((resolve, reject) => {
        // Primer día del mes anterior
        const fechaInicio = moment()
            .subtract(1, 'month')
            .startOf('month')
            .format('YYYY-MM-DD');

        // Último día del mes anterior
        const fechaFin = moment()
            .subtract(1, 'month')
            .endOf('month')
            .format('YYYY-MM-DD');

        const queryconsultahana = `
            CALL "EC_SBO_CRISMOART_PRO"."EXX_SP_LIBRO_LEG_DET_RETE_EFECTUADAS"(
                '${fechaInicio}',
                '${fechaFin}',
                'NO',
                'SI',
                'SI'
            )
        `;

        console.log(queryconsultahana);
        

        const conn = hana.createConnection();

        conn.connect(dbConnHana, function (err) {

            if (err) {
                console.error('Error conectando a HANA:', err);
                return reject(err);
            }

            console.log('Proceso almacenado de MSA');

            conn.exec(queryconsultahana, function (err, res) {

                // cerrar conexión siempre
                conn.disconnect((disconnectErr) => {
                    if (disconnectErr) {
                        console.error('Error cerrando conexión:', disconnectErr);
                    } else {
                        console.log('Conexión cerrada.');
                    }
                });

                if (err) {
                    console.error('Error ejecutando consulta:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}
function obtenerlibrolegalretencionesrecibidascrismo() {
    return new Promise((resolve, reject) => {
        let fechaactual = (moment().format()).substring(0, (moment().format()).indexOf("T"));
        const queryconsultahana = `
            CALL "EC_SBO_CRISMOART_PRO"."EXX_SP_LEG_DET_RETE_RECIBIDAS"(
                '2026-01-01',
                '${fechaactual}',
                'TODOS'
            )
        `;

        console.log(queryconsultahana);
        

        const conn = hana.createConnection();

        conn.connect(dbConnHana, function (err) {

            if (err) {
                console.error('Error conectando a HANA:', err);
                return reject(err);
            }

            console.log('Proceso almacenado de MSA');

            conn.exec(queryconsultahana, function (err, res) {

                // cerrar conexión siempre
                conn.disconnect((disconnectErr) => {
                    if (disconnectErr) {
                        console.error('Error cerrando conexión:', disconnectErr);
                    } else {
                        console.log('Conexión cerrada.');
                    }
                });

                if (err) {
                    console.error('Error ejecutando consulta:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}

Vendedor.libroslegalescrismo = async function(params, result) {
     try {
        const librolegalcompras = await obtenerlibrolegalcomprascrismo();
        const librolegalventas = await obtenerlibrolegalventascrismo();
        const librolegalventasdetalladas = await obtenerlibrolegalventasdetalladascrismo();
        const librolegalretencionesefectuadas = await obtenerlibrolegalretencionesefectuadascrismo();
        const librolegalretencionesrecibidas = await obtenerlibrolegalretencionesrecibidascrismo();

        const datos = {
            librolegalcompras: librolegalcompras,
            librolegalventas:librolegalventas,
            librolegalventasdetalladas:librolegalventasdetalladas,
            librolegalretencionesefectuadas:librolegalretencionesefectuadas,
            librolegalretencionesrecibidas:librolegalretencionesrecibidas
        }

        result(null, datos);
    } catch (error) {
        console.error('❌ Error obteniendo los libros legales:', error);
        result(error, null);
    }
}


module.exports = Vendedor;