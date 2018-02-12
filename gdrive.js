//Instalación normal mediante NPM
var googleapis = require('googleapis');
var googleAuth = require('google-auth-library');
var fs = require('fs');
 
var drive = googleapis.drive('v2');
 
 
//Leer fichero privado con credenciales del servicio
//var credenciales = JSON.parse(fs.readFileSync('BizlogicGinDriverTest-8dcae6048b60.json', 'utf8'));
 
//Crear objeto de autorización JWT
var jwtClient = new googleapis.auth.JWT(
        "termosservice@termoslp-194720.iam.gserviceaccount.com", // bizgindrive3@bizlogicgindrive.iam.gserviceaccount.com
        null,
        "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCth21nuzIeaIt7\nKffcIIC/gZR0mbg6/efLDM7ynsdIrN8MRX+a7FNicr7SXex228txyy+iZKOugQv5\nipwGDu3GYbzBhw7vGxfsUVFdsEz0rXgOyaPOSigVSixt2Nk5JNjquh5WQJuJ4rZO\nLyejskgfYYw2Kdf85lCLvn4W+e9y2rkegu9ecE8GvtRY+kFCt3lg7APHlUiNnfSl\nhh1hXF/Mi6xvBAvPOWdcHM6AD2GW14jF4Ml0ZeQieuMuEs/5Ac6T80X/iP2NLB9f\nEHdWY2vFjnQo9hA2qJWi+B20qlt/zNlc4dy4L9u5Ce9ZQ6FuHt/Fe4Q6Pzm3lODd\n5sysNefnAgMBAAECggEAAOnamJYysFhKi65v4JfHNbrf5jE8+AqIItiBamONlwNZ\n9T2Ua2NdGQKToJXf/cwwaPvx10ACYJPLVVf2dE210LqI/NfSK04QNS1EaWLZNNyI\n6kMDer2HMn1+eGGQ2y0neyzZpgiXCQXJgeXbpo/0sz2XOF3GBk3MFMA+963/JbKg\n2K3HyyABKtqWXK/7pSefOS5cUWW3Ah2kcvukyRnhOQBIsLLaaKkJ3nk1kuhsujHY\n9CSsy9HqsP8AFNEF7BQWNC1g8EgHUEHGAdx3kOxoLqTKjtalSI5SIc4wiDLAQJ60\nzSr9cXKfDQaJumph8+lDsmYUhwPH1trbdEuVRpkk6QKBgQDWZCiEt4Wt9Uen0vu9\nlA1opgjqTzUEochSqWdUw0H7nvxOkCDms8r/IkTXIZTo4Xy75vfyx1GDQIm6zRDY\ndrIX1zPMMro7EmVEEGQec+mU0WylJJsV4/HGLrUHVCQ91bYL+DSiKBlZwfttiEqz\n8W0UcYfh9lQP5EGvgbL4FxW2ZQKBgQDPNRCa9DzHBEp98VUVwoA7K/v1SliLSBr2\n2qj5CfIU3odu80LJdOKDTRQJFz6jSVV+9u4T5a/TOD8DadWjlZj3GRHBSX4t3Kj6\nvl4d+X+yjn5pokGojOLSVB28TcNesA5Tyzs+sLB6zozVszWAMNirq60yJgJGSwRO\n7ZzGWXOqWwKBgHeXm3qdHTby0ivt53vTML+ljueVk4+n56Uk1n1UBmSkRT5V6+SF\nesFjjl8rXnOiBQCUUM/fG7tJrwrDBZiabbIa28wWqAf3tQGI2zCZnDzlreNZTiGh\n6+aPe3BBIY5Uvp5isImcMLf/G4/4LSO/kweKZTBJRo8u1u1ePkViKzx5AoGBAJWM\nMwPjKspoqmrjdwlRa8NJJ3wNwIIl9HAduL6lEvdE9HJ7V8SWe7VQOBmnkSnAj9gm\n2AW8TH4hpjkMdYivO8t7aHkcVdk73Sm7o6n2nNd+SHZtCP5hUIOE+kEhztPUNUL8\n9zFzzKuVz8ecpAx1NKwSJ9p93D5nfiCJFhGCFhzpAoGBAM3ByRwIGFdgZg/gOJs2\nbHe2MqDg5IZ9XBhcokOcfYZzm/vOi/XTXPlY2rwtz6hyf1WHdxL/YRd/mu3HPupl\nN+O8AfLtsjB1eDmPFeh7PoYnso/Cfw3l/cE/0ezDwCa9DfQqBiTHKTt++xdbPJDz\niMmzlFK/5OcqKoXdlTfvl5Fa\n-----END PRIVATE KEY-----\n",  // -----BEGIN PRIVATE KEY-----\nMIIEvQIBA......
        ['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/drive.file']);
 
//Solicitar token autorización
jwtClient.authorize(function (err, tokens) {
if (err) {
    console.error('Error de autorización: ' + err);
    return;
}
console.log('Autorización correcta para cliente ' + "113636978818554836691");
    // Hacer petición autorizada para listar ficheros
        /*drive.files.insert({
          resource: {
            name: 'testimage.jpeg',
            mimeType: 'image/jpeg'
          },
          media: {
            mimeType: 'image/jpeg',
            body: fs.createReadStream('/home/dssd/Imágenes/index.jpeg') // read streams are awesome!
          },
          auth: jwtClient
        },function (err, file) {
          if (err) {
            // Handle error
            console.error(err);
          } else {
            console.log('File Id: ', file);
          }
        });*/


        drive.files.list({
        auth: jwtClient,
        supportsTeamDrives: true,
        includeTeamDriveItems: true//,
        ,spaces: 'drive'
    }, function (err, resp) {
        if (err) {
          console.log("respuesta "+resp);
            console.error('Ha habido un error en la petición: ' + err);
            return;
        }
 
        console.log('Petición correcta. Obteniendo ficheros:');
 
        for(var i=0; i<resp.files.length; i++){
            var fileItem = resp.files[i];
 
            drive.files.get({auth: jwtClient, fileId: fileItem.id }, function (err, resp){
                if (err) {
                    console.error('Ha habido un error obteniendo el fichero: ' + err);
                    return;
                }
 
                console.log('----------------------------' );
                console.log('Id:        ' + resp.id);
                console.log('Nombre:    ' + resp.name);
                console.log('MIME type: ' + resp.mimeType);
            });
        }

}); // authorize
});