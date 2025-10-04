"use strict";

const jszip = require("jszip"); 
const fs = require("fs");
const https = require("https");
const axios = require("axios"); 
const wsdlEnvioLote = `${process.env.SIFEN_URL}de/ws/async/recibe-lote.wsdl`;  
const { crearRespuesta, crearRespuesta1 } = require("./service/respuesta.service");
const { normalizeXML } = require("./service/util");
 
const enviarXml = (id, xmlfirmado, certificado) => {
    let respuesta = {}
    const config = {
        debug: true,  // Para activar logs de depuración
         
    }
    return new Promise(async (resolve, reject) => {
        try {
            let defaultConfig = {
                debug: false,
                timeout: 90000,
                ...config,
            };
           
            const { cert, key } = certificado;
            if (!xmlfirmado) {
                return reject("no se recibio xml");
            }
 
            let rLoteDE = xmlfirmado.replace('<?xml version="1.0" encoding="UTF-8"?>', "")
            rLoteDE = `<rLoteDE>\n${rLoteDE }\n</rLoteDE>\n`
      
           const zip = new jszip(); 
           zip.file("lote.xml", rLoteDE); 
           const zipAsBase64 = await zip.generateAsync({ type: "base64" });

 
 
            const httpsAgent = new https.Agent({
                cert: Buffer.from(cert, "utf8"),
                key: Buffer.from(key, "utf8"),
            });
            console.log('zipAsBase64',zipAsBase64)
            //    <?xml version="1.0" encoding="UTF-8"?>\n\
            let soapXMLData = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsd="http://ekuatia.set.gov.py/sifen/xsd">\n\
                    <soap:Header/>\n\
                    <soap:Body>\n\
                        <xsd:rEnvioLote>
                            <xsd:dId>${id}</xsd:dId>\n\
                            <xsd:xDE>${zipAsBase64}</xsd:xDE>\n\
                        </xsd:rEnvioLote>\n\
                    </soap:Body>\n\
                </soap:Envelope>`;
                soapXMLData = normalizeXML(soapXMLData);
                soapXMLData= soapXMLData.replace(/>\s+</g, '><').trim();
             
            const headers = {
                headers: {
                    "User-Agent": "facturaSend",
                    "Content-Type": "application/soap+xml",
                },
                httpsAgent,
                timeout: defaultConfig.timeout,
            }
           // console.log(headers)
            console.log(wsdlEnvioLote)
            axios.post(wsdlEnvioLote, soapXMLData, headers)
                .then(async (respuestaSuccess) => {
                    console.log(`✅ then =>`,respuestaSuccess);
                    let respuesta;
                    if (respuestaSuccess.status === 200) {
                        if (respuestaSuccess.data.startsWith("<?xml")) {
                             respuesta = await crearRespuesta1(respuestaSuccess.data, '')
                        } else {
                            respuesta = await crearRespuesta1("Error de la SET BIG-IP logout page", respuestaSuccess.data);
                        }
                    } else {
                        respuesta = await crearRespuesta1("Error de conexión con la SET", respuestaSuccess.data);
                    }
                    console.log(respuesta); // Aquí puedes guardar la respuesta en una base de datos o archivo si lo necesitas
                    resolve(respuesta);
                })
                .catch(async (err) => {
                    console.error(`❌ error al realizar envio de lote`,err);
                    if (err.response?.data.startsWith("<?xml")) {
                        
                        respuesta = await crearRespuesta1(err.response?.data, '')
                    } else {
                        respuesta = await crearRespuesta1("Error en la solicitud a la SET", err.response?.data || err.response||err||null);
                        console.error(respuesta); // Puedes guardar este error en logs
                        reject(respuesta);
                    }
                });

        } catch (error) {
            let respuestaError = await crearRespuesta("Error interno", error.message);
            reject(respuestaError);
        }
    });
}


const enviarLote = (id, xmls, certificado) => {
    let respuesta = {}
    const config = {
        debug: true,  // Para activar logs de depuración
         saveRequestFile: './soap_request.xml',  // Opcional: guarda la solicitud SOAP
        // saveFile: './file.xml',  // Opcional: file
    }
    return new Promise(async (resolve, reject) => {
        try {
            let defaultConfig = {
                debug: false,
                timeout: 90000,
                ...config,
            };
            console.log("xmls recibido:" );
            if (!Array.isArray(xmls)) {
                return reject("Error: xmls no es un array");
            }
            const { cert, key } = certificado;
            if (!xmls.length) {
                return reject("No se envió datos en el array de Documentos electrónicos XMLs");
            }

            if (xmls.length > 50) {
                return reject("Sólo se permiten un máximo de 50 Documentos electrónicos XML por lote");
            } 
            let rLoteDEXml = "<rLoteDE>\n";

            for (let i = 0; i < xmls.length; i++) {
                let xml = xmls[i].replace('<?xml version="1.0" encoding="UTF-8"?>', "")
                //xml = xml.split("\n").slice(1).join("\n"); //Retirar xml
                rLoteDEXml += `${xml}\n`;
            }
            rLoteDEXml += `</rLoteDE>`;
            const zip = new jszip();
            zip.file("lote.xml", rLoteDEXml);
            const zipAsBase64 = await zip.generateAsync({ type: "base64" });


            const httpsAgent = new https.Agent({
                cert: Buffer.from(cert, "utf8"),
                key: Buffer.from(key, "utf8"),
            });
            console.log('zipAsBase64',zipAsBase64)
            //    <?xml version="1.0" encoding="UTF-8"?>\n\
            let soapXMLData = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsd="http://ekuatia.set.gov.py/sifen/xsd">\n\
                    <soap:Header/>\n\
                    <soap:Body>\n\
                        <xsd:rEnvioLote>
                            <xsd:dId>${id}</xsd:dId>\n\
                            <xsd:xDE>${zipAsBase64}</xsd:xDE>\n\
                        </xsd:rEnvioLote>\n\
                    </soap:Body>\n\
                </soap:Envelope>`;
                soapXMLData = normalizeXML(soapXMLData);
                soapXMLData= soapXMLData.replace(/>\s+</g, '><').trim();
            if (soapXMLData) {
                console.log("url", wsdlEnvioLote);
                console.log("soapXMLData", soapXMLData);
            }
            //Escribo el archivo para verificacion
           // if (soapXMLData)  fs.writeFileSync(`./soap_request_${id}.xml`, soapXMLData);
           

            const headers = {
                headers: {
                    "User-Agent": "facturaSend",
                    "Content-Type": "application/soap+xml",
                },
                httpsAgent,
                timeout: defaultConfig.timeout,
            }
           // console.log(headers)
            console.log(wsdlEnvioLote)
            axios.post(wsdlEnvioLote, soapXMLData, headers)
                .then(async (respuestaSuccess) => {
                    console.log(`✅ then =>`,respuestaSuccess);
                    let respuesta;
                    if (respuestaSuccess.status === 200) {
                        if (respuestaSuccess.data.startsWith("<?xml")) {
                             respuesta = await crearRespuesta1(respuestaSuccess.data, '')
                        } else {
                            respuesta = await crearRespuesta1("Error de la SET BIG-IP logout page", respuestaSuccess.data);
                        }
                    } else {
                        respuesta = await crearRespuesta1("Error de conexión con la SET", respuestaSuccess.data);
                    }
                    console.log(respuesta); // Aquí puedes guardar la respuesta en una base de datos o archivo si lo necesitas
                    resolve(respuesta);
                })
                .catch(async (err) => {
                    console.error(`❌ error al realizar envio de lote`,err);
                    if (err.response?.data.startsWith("<?xml")) {
                        
                        respuesta = await crearRespuesta1(err.response?.data, '')
                    } else {
                        respuesta = await crearRespuesta1("Error en la solicitud a la SET", err.response?.data || err.response||err||null);
                        console.error(respuesta); // Puedes guardar este error en logs
                        reject(respuesta);
                    }
                });

        } catch (error) {
            let respuestaError = await crearRespuesta("Error interno", error.message);
            reject(respuestaError);
        }
    });
}

module.exports = {
    enviarLote ,
    enviarXml
};