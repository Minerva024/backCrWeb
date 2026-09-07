'use strict'
const nodemailer = require('nodemailer');
const moment = require('moment');

this.enviar_ingreso_muestra = (auxmailvendedor, slpname, auxcardname, auxproducto, auxcantidad) => {
    // Armo el codigo html para el correo:

    let htmlbody = `
    <title>Solicitud de Muestra</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f9; padding:30px 0;">
        <tr>
            <td align="center">

                <table width="600" cellpadding="0" cellspacing="0" border="0"
                    style="background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td style="background-color:#0d6efd; padding:25px; text-align:center;">
                            <h1 style="color:#ffffff; margin:0; font-size:24px;">
                                Solicitud de Muestra
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding:30px; color:#333333;">

                            <p style="font-size:15px; margin-top:0;">
                                Estimados/as,
                            </p>

                            <p style="font-size:15px; line-height:1.6;">
                                Se ha realizado una nueva solicitud de muestra con la siguiente información:
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                style="border-collapse:collapse; margin-top:20px;">

                                <tr>
                                    <td
                                        style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef; width:35%;">
                                        <strong>Vendedor</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${slpname}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Cliente</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${auxcardname}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Producto</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${auxproducto}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Cantidad</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${auxcantidad}
                                    </td>
                                </tr>

                            </table>

                            <p style="margin-top:30px; font-size:14px; color:#6c757d;">
                                Este correo ha sido generado automáticamente por el CRM.
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td
                            style="background-color:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#6c757d;">
                            © 2026 - CRM Minerva S.A
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    `;

    var maillistto = [
        'dchaves@minerva.com.ec',
        'carmas@minerva.com.ec'];


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
        auxmailvendedor
    ];
    let mail_options;
    mail_options = {
        to: maillistto,
        cc: maillistcc,
        subject: 'Muestra: ' + auxcardname,
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

this.enviar_estado_muestra = (auxmailvendedor, slpname, auxcardname, auxproducto, auxcantidad, auxestado) => {
    // Armo el codigo html para el correo:

    let htmlbody = `
    <title>Solicitud de Muestra</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f9; padding:30px 0;">
        <tr>
            <td align="center">

                <table width="600" cellpadding="0" cellspacing="0" border="0"
                    style="background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td style="background-color:#0d6efd; padding:25px; text-align:center;">
                            <h1 style="color:#ffffff; margin:0; font-size:24px;">
                                Solicitud de Muestra
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding:30px; color:#333333;">

                            <p style="font-size:15px; margin-top:0;">
                                Estimados/as,
                            </p>

                            <p style="font-size:15px; line-height:1.6;">
                                La solicitud de muestra ha cambiado de estado:
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                style="border-collapse:collapse; margin-top:20px;">

                                <tr>
                                    <td
                                        style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef; width:35%;">
                                        <strong>Vendedor</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${slpname}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Cliente</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${auxcardname}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Producto</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${auxproducto}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Cantidad</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${auxcantidad}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Estado</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${auxestado}
                                    </td>
                                </tr>

                            </table>

                            <p style="margin-top:30px; font-size:14px; color:#6c757d;">
                                Este correo ha sido generado automáticamente por el CRM.
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td
                            style="background-color:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#6c757d;">
                            © 2026 - CRM Minerva S.A
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    `;

    var maillistto = [
        //'sbahamonde@minerva.com.ec',
        auxmailvendedor
    ];


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


    /*var maillistcc = [
        auxmailvendedor
    ];*/
    let mail_options;
    mail_options = {
        to: maillistto,
        //cc: maillistcc,
        subject: 'Muestra: ' + auxcardname,
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

this.enviar_preparar_muestra = (auxmailvendedor, slpname, auxcardname, auxproducto, auxcantidad, auxciudadsalida) => {
    // Armo el codigo html para el correo:

    let htmlbody = `
    <title>Solicitud de Muestra</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f9; padding:30px 0;">
        <tr>
            <td align="center">

                <table width="600" cellpadding="0" cellspacing="0" border="0"
                    style="background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td style="background-color:#0d6efd; padding:25px; text-align:center;">
                            <h1 style="color:#ffffff; margin:0; font-size:24px;">
                                Preparación de Muestra
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding:30px; color:#333333;">

                            <p style="font-size:15px; margin-top:0;">
                                Estimados/as,
                            </p>

                            <p style="font-size:15px; line-height:1.6;">
                                Se solicita la preparación de la siguiente muestra:
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                style="border-collapse:collapse; margin-top:20px;">

                                <tr>
                                    <td
                                        style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef; width:35%;">
                                        <strong>Vendedor</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${slpname}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Cliente</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${auxcardname}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Producto</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${auxproducto}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Cantidad</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${auxcantidad}
                                    </td>
                                </tr>

                            </table>

                            <p style="margin-top:30px; font-size:14px; color:#6c757d;">
                                Este correo ha sido generado automáticamente por el CRM.
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td
                            style="background-color:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#6c757d;">
                            © 2026 - CRM Minerva S.A
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    `;

    var maillistto = [];
    if(auxciudadsalida == 'UIO'){
        maillistto = [
            'fpilataxi@minerva.com.ec',
            'jalba@minerva.com.ec',
            'epazmino@minerva.com.ec'
        ]
    }else{
        maillistto = [
            'lespinoza@minerva.com.ec',
            'cramos@minerva.com.ec',
            'kcachott@minerva.com.ec'
        ]
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


    /*var maillistcc = [
        auxmailvendedor
    ];*/
    let mail_options;
    mail_options = {
        to: maillistto,
        //cc: maillistcc,
        subject: 'Muestra: ' + auxcardname,
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


this.enviar_registro_muestra = (auxlotes, producto, cantidad) => {
    // Armo el codigo html para el correo:
    let table = "";
    auxlotes.forEach(element => {
        table += ` 
            <tr> 
                <td style="padding:10px;border:1px solid #ddd;">${element["lote"]}</td> 
                <td style="padding:10px;border:1px solid #ddd;">${element["cantidad"]} gr</td>
		<td style="padding:10px;border:1px solid #ddd;">${element["comentario"]} gr</td>   
            </tr> `;
    });
    let htmlbody = `
        <title>Registro de Muestra</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f9; padding:30px 0;">
        <tr>
            <td align="center">

                <table width="600" cellpadding="0" cellspacing="0" border="0"
                    style="background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td style="background-color:#c62828; padding:25px; text-align:center;">
                            <h1 style="color:#ffffff; margin:0; font-size:24px;">
                                Registro de Muestra
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding:30px; color:#333333;">

                            <p style="font-size:15px; margin-top:0;">
                                Estimados/as,
                            </p>

                            <p style="font-size:15px; line-height:1.6;">
                                Se ha realizado el ingreso al sistema de muestras el siguiente producto: 
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                style="border-collapse:collapse; margin-top:20px;">

                                <tr>
                                    <td
                                        style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef; width:35%;">
                                        <strong>Producto</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${producto}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Cantidad Total</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        ${cantidad} gr
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background-color:#f8f9fa; border:1px solid #e9ecef;">
                                        <strong>Lote/s</strong>
                                    </td>
                                    <td style="padding:12px; border:1px solid #e9ecef;">
                                        <table>
                                        <tr> 
                ${table}
            </tr> 
                                        </table>
                                    </td>
                                </tr>


                            </table>

                            <p style="margin-top:30px; font-size:14px; color:#6c757d;">
                                Este correo ha sido generado automáticamente por el CRM.
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td
                            style="background-color:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#6c757d;">
                            © 2026 - CRM Minerva S.A
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    `;

    var maillistto = [];
    maillistto = [
        'dchaves@minerva.com.ec',
        'dbenitez@minerva.com.ec',
        'vvelasquez@minerva.com.ec',
        'bgavinalez@minerva.com.ec',
        'mmales@minerva.com.ec',
        'emontalvo@minerva.com.ec',
        'canton@minerva.com.ec',
        'ecardenas@minerva.com.ec',
        'csuarez@minerva.com.ec',
        'carmas@minerva.com.ec',
        'jger@minerva.com.ec',
        'grodriguez@minerva.com.ec',
    ]


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
        'fpilataxi@minerva.com.ec',
        'jalba@minerva.com.ec',
        'epazmino@minerva.com.ec',
        'kcachott@minerva.com.ec',
        'lespinoza@minerva.com.ec',
        'cramos@minerva.com.ec',
        'lmartinez@minerva.com.ec'
    ];
    let mail_options;
    mail_options = {
        to: 'comercial@minerva.com.ec',
        //to: maillistto,
        cc: maillistcc,
        subject: 'Registro de Muestra: ' + producto,
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