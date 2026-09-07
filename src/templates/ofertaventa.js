'use strict'
const nodemailer = require('nodemailer');
const moment = require('moment');

this.enviar_mail = (auxmailvendedor, slpname,auxcardcode, auxcardname, auxfechaentrega, auxproductos, auxnota, auxbodega) => {
    // Armo el codigo html para el correo:
    
    let table = "";
    /*auxproductos.forEach(element => {
        let aux = "<tr><td>" + element["ItemCode"] + "</td><td>" + element["ItemName"] + "</td><td>" + element["Quantity"] + "</td><td>" + element["UnitPrice"] + "</td></tr>";
        table += aux;
    });
    let htmlbody = "<h3>Estimados/as</h3><p>Por favor realizar el ingreso de la siguiente orden:</p><p><p><b>Vendedor: </b>"+slpname+"</p>" +
        "<b>CLIENTE: </b>" + auxcardname + "</p><p><b>RUC/CI: </b>" + auxcardcode + "</p><p><b>FECHA ENTREGA: </b>" + auxfechaentrega + "</p><p><b>BODEGA: </b>"+auxbodega+"</p>" +
        "<table style=\"text-align: center;width: 100%;\"><tr><th scope=\"col\">Item</th><th scope=\"col\">Descripción</th><th scope=\"col\">Cantidad</th><th scope=\"col\">P. Unit</th></tr>" + table + "</table><p><b>Nota: </b></p><p>"+auxnota+"</p><p>Saludos Cordiales.</p>";*/

	auxproductos.forEach(element => { 
        table += ` 
            <tr> 
                <td style="padding:10px;border:1px solid #ddd;">${element["ItemCode"]}</td> 
                <td style="padding:10px;border:1px solid #ddd;">${element["ItemName"]}</td> 
                <td style="padding:10px;border:1px solid #ddd;text-align:center;">${element["Quantity"]}</td> 
                <td style="padding:10px;border:1px solid #ddd;text-align:right;"> 
                ${parseFloat(element["UnitPrice"]).toFixed(2)} 
                </td> 
            </tr> `; 
    });


    let htmlbody = ` 
        <div style="font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f9; padding:30px;"> 
            <div style="max-width:800px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #dcdcdc;"> 
                <div style="background:#c62828; color:white; padding:20px;"> 
                    <h2 style="margin:0;">Ingreso de Orden de Venta</h2> 
                </div> 
            <div style="padding:25px; color:#333;"> 
                <p>Estimados/as,</p> 
                <p> Por favor realizar el ingreso de la siguiente orden de venta: </p> 
                <table style="width:100%; margin-bottom:20px; border-collapse:collapse;"> 
                    <tr> 
                        <td style="padding:8px;"><b>Vendedor:</b></td> 
                        <td>${slpname}</td> 
                    </tr> 
                    <tr> 
                        <td style="padding:8px;"><b>Cliente:</b></td> 
                        <td>${auxcardname}</td> 
                    </tr> 
                    <tr> 
                        <td style="padding:8px;"><b>RUC / CI:</b></td> 
                        <td>${auxcardcode}</td> </tr> <tr> 
                        <td style="padding:8px;"><b>Fecha Entrega:</b></td> 
                        <td>${auxfechaentrega}</td> 
                    </tr> 
                </table> 
                <table style="width:100%; border-collapse:collapse; margin-top:20px;"> 
                    <thead> 
                        <tr style="background-color:#eeeeee;"> 
                            <th style="padding:12px;border:1px solid #ddd;">Item</th> 
                            <th style="padding:12px;border:1px solid #ddd;"> Descripción </th> 
                            <th style="padding:12px;border:1px solid #ddd;"> Cantidad </th> 
                            <th style="padding:12px;border:1px solid #ddd;"> P. Unit </th> 
                        </tr> 
                    </thead> 
                    <tbody> ${table} 
                    </tbody> 
                </table> 
            <div style="margin-top:25px;"> 
                <p> <b>Nota:</b> </p> 
                <div style=" background:#f8f8f8; padding:15px; border-left:4px solid #c62828; border-radius:5px; "> 
                    ${auxnota || 'Sin observaciones'} 
                </div> 
            </div> 
            <div style="margin-top:35px;"> 
                <p>Saludos Cordiales.</p> 
            </div> 
            </div> 
            </div> 
        </div> `;



    var maillistto= [];
    if(auxbodega == 'UIO'){
        maillistto = [
            'jger@minerva.com.ec',
            'carmas@minerva.com.ec',
            'grodriguez@minerva.com.ec'
        ];
    }else if(auxbodega == 'GYE'){
        maillistto = [
            'jger@minerva.com.ec',
            'carmas@minerva.com.ec',
            'grodriguez@minerva.com.ec'
        ];
    }else{
        maillistto = [
                    'jger@minerva.com.ec',
                    'carmas@minerva.com.ec',
                    'grodriguez@minerva.com.ec',        ];
        
    }
        

    let transporter = nodemailer.createTransport({
        service: 'Gmail',
        host: 'smtp.gmail.com',  //Servidor de Office
        port: 465,  // secure SMTP
        secure: true, //false for TLS
        auth: {
            user: 'notificacionminerva@gmail.com',
            pass: 'gkvp gcub rhix muet'
        },
    });
    

    var maillistcc = [
        //'fescobar@minerva.com.ec',
        auxmailvendedor
    ];
    let mail_options;
    mail_options = {
        //from: 'notificacionminerva@gmail.com',
        //to: 'sbahamonde@minerva.com.ec',
        to: maillistto,
        cc: maillistcc,
        subject: 'OV: ' + auxcardname,
        html: `${htmlbody}`
    };
    transporter.sendMail(mail_options, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('El correo se envio correctamente ' + info.response);
        }
    });
};
this.enviar_mail_cotizacion = (auxmailvendedor, slpname,auxcardcode, auxcardname, auxfechaentrega, auxproductos, auxnota, auxbodega) => {
    // Armo el codigo html para el correo:
    
     let table = "";
    /*auxproductos.forEach(element => {
        let aux = "<tr><td>" + element["itemcode"] + "</td><td>" + element["itemname"] + "</td><td>" + element["quantity"] + "</td><td>" + element["unitprice"] + "</td></tr>";
        table += aux;
    });
    let htmlbody = "<h3>Estimados/as</h3><p>Por favor realizar el ingreso de la siguiente orden:</p><p><p><b>Vendedor: </b>" + slpname + "</p>" +
        "<b>CLIENTE: </b>" + auxcardname + "</p><p><b>RUC/CI: </b>" + auxcardcode + "</p><p><b>FECHA ENTREGA: </b>" + auxfechaentrega + "</p>" +
        "<table style=\"text-align: center;width: 100%;\"><tr><th scope=\"col\">Item</th><th scope=\"col\">Descripción</th><th scope=\"col\">Cantidad</th><th scope=\"col\">P. Unit</th></tr>" + table + "</table><p><b>Nota: </b></p><p>" + auxnota + "</p><p>Saludos Cordiales.</p>";*/

    auxproductos.forEach(element => { 
        table += ` 
            <tr> 
                <td style="padding:10px;border:1px solid #ddd;">${element["itemcode"]}</td> 
                <td style="padding:10px;border:1px solid #ddd;">${element["itemname"]}</td> 
                <td style="padding:10px;border:1px solid #ddd;text-align:center;">${element["quantity"]}</td> 
                <td style="padding:10px;border:1px solid #ddd;text-align:right;"> 
                ${parseFloat(element["unitprice"]).toFixed(2)} 
                </td> 
            </tr> `; 
    });


    let htmlbody = ` 
        <div style="font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f9; padding:30px;"> 
            <div style="max-width:800px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #dcdcdc;"> 
                <div style="background:#c62828; color:white; padding:20px;"> 
                    <h2 style="margin:0;">Ingreso de Orden de Venta</h2> 
                </div> 
            <div style="padding:25px; color:#333;"> 
                <p>Estimados/as,</p> 
                <p> Por favor realizar el ingreso de la siguiente orden de venta: </p> 
                <table style="width:100%; margin-bottom:20px; border-collapse:collapse;"> 
                    <tr> 
                        <td style="padding:8px;"><b>Vendedor:</b></td> 
                        <td>${slpname}</td> 
                    </tr> 
                    <tr> 
                        <td style="padding:8px;"><b>Cliente:</b></td> 
                        <td>${auxcardname}</td> 
                    </tr> 
                    <tr> 
                        <td style="padding:8px;"><b>RUC / CI:</b></td> 
                        <td>${auxcardcode}</td> </tr> <tr> 
                        <td style="padding:8px;"><b>Fecha Entrega:</b></td> 
                        <td>${auxfechaentrega}</td> 
                    </tr> 
                </table> 
                <table style="width:100%; border-collapse:collapse; margin-top:20px;"> 
                    <thead> 
                        <tr style="background-color:#eeeeee;"> 
                            <th style="padding:12px;border:1px solid #ddd;">Item</th> 
                            <th style="padding:12px;border:1px solid #ddd;"> Descripción </th> 
                            <th style="padding:12px;border:1px solid #ddd;"> Cantidad </th> 
                            <th style="padding:12px;border:1px solid #ddd;"> P. Unit </th> 
                        </tr> 
                    </thead> 
                    <tbody> ${table} 
                    </tbody> 
                </table> 
            <div style="margin-top:25px;"> 
                <p> <b>Nota:</b> </p> 
                <div style=" background:#f8f8f8; padding:15px; border-left:4px solid #c62828; border-radius:5px; "> 
                    ${auxnota || 'Sin observaciones'} 
                </div> 
            </div> 
            <div style="margin-top:35px;"> 
                <p>Saludos Cordiales.</p> 
            </div> 
            </div> 
            </div> 
        </div> `;    var maillistto= [];
    if(auxbodega == 'UIO'){
        maillistto = [
            'jger@minerva.com.ec',
            'carmas@minerva.com.ec',
            'grodriguez@minerva.com.ec'
        ];
    }else if(auxbodega == 'GYE'){
        maillistto = [
            'jger@minerva.com.ec',
            'carmas@minerva.com.ec',
            'grodriguez@minerva.com.ec'
        ];
    }else{
        maillistto = [
                    'jger@minerva.com.ec',
                    'carmas@minerva.com.ec',
                    'grodriguez@minerva.com.ec',        ];
        
    }
        

    let transporter = nodemailer.createTransport({
        service: 'Gmail',
        host: 'smtp.gmail.com',  //Servidor de Office
        port: 465,  // secure SMTP
        secure: true, //false for TLS
        auth: {
            user: 'notificacionminerva@gmail.com',
            pass: 'gkvp gcub rhix muet'
        },
    });
    

    var maillistcc = [
        //'fescobar@minerva.com.ec',
        auxmailvendedor
    ];
    let mail_options;
    mail_options = {
        //from: 'notificacionminerva@gmail.com',
        //to: 'sbahamonde@minerva.com.ec',
        to: maillistto,
        cc: maillistcc,
        subject: 'OV: ' + auxcardname,
        html: `${htmlbody}`
    };
    transporter.sendMail(mail_options, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('El correo se envio correctamente ' + info.response);
        }
    });
};

module.exports = this;