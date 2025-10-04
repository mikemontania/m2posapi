
const { SignedXml } = require("xml-crypto");
const { cleanCertificate } = require("./service/signxml.service");
const agregarFirmaXml = async (xmlData, certificado) => {
  try {
    console.log(certificado)
    const { cert, key, password } = certificado;

    const targetNode = xmlData.includes("<DE") ? "DE" : "rEve";

    console.log('xmlData =',xmlData )
    console.log('certificado =',{ cert, key, password } )
    

    const sig = new SignedXml({
      publicKey: cert,
      privateKey: key,
      passphrase: password,
      getKeyInfoContent: (publicKey, prefix) => {
        const certContent = cleanCertificate(cert); // Limpiar el certificado
        return `<X509Data><X509Certificate>${certContent}</X509Certificate></X509Data>`;
      }
    });

    // Verifica que el XML de entrada es el correcto
    //console.log("XML de entrada:", xmlData);


    sig.addReference(
      /*"#" + idAtributo, */ {
        xpath: `//*[local-name()='${targetNode}']`,
        digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
        transforms: [
          "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
          "http://www.w3.org/2001/10/xml-exc-c14n#"
          //"http://www.w3.org/2000/09/xmldsig#enveloped-signature",
         // "http://www.w3.org/2001/10/xml-exc-c14n#",
        ],
      });
      sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
     // sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#WithComments";
      sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";  
    // Calcular la firma
    sig.computeSignature(xmlData, {
      location: {
        reference: `//*[local-name()='${targetNode}']`,
        action: "after", 
      },
    });
    
    // Obtener el XML firmado 
    return sig.getSignedXml();
  } catch (error) {
    console.error("Error al firmar el XML:", error);
    throw error;
  }
};
module.exports = { agregarFirmaXml};
