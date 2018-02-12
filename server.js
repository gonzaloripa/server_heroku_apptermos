var googleAuth = require('google-auth-library');
var google = require('googleapis');
var fs = require('fs');
var OAuth2 = google.auth.OAuth2;
var CLIENT_ID =   "439187847005-v83ihsnpia82g7o8seoq05i6ck3m2d79.apps.googleusercontent.com";
var CLIENT_SECRET = "5U5oPtnbYthQ0nd4IMOP0siD";
var REDIRECT_URL = "https://frozen-everglades-78768.herokuapp.com/";
var oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
var drive = google.drive({ version: 'v3', auth: oauth2Client });
// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
"https://www.googleapis.com/auth/drive",
"https://www.googleapis.com/auth/drive.file" 
];
 
var url = oauth2Client.generateAuthUrl({
  access_type: 'online', // 'online' (default) or 'offline' (gets refresh_token)
  scope: scopes // If you only need one scope you can pass it as string
});
console.log(url); //this is the url which will authenticate user and redirect to your local server. copy this and paste into browser
 
module.exports.googleDrive = (function () {
  var getTokens = function(code) {
    oauth2Client.getToken(code, function(err, tokens) {
      // Now tokens contains an access_token and an optional refresh_token. Save them.
      if(!err) {
        console.log("tokens: ",tokens);
        //refresh_token
        oauth2Client.setCredentials(tokens);
            return createFolder('test',null,next);
        }
      else {
        console.log("error: ",err);
      }
    });
  };
 
 
//creating the folder in drive
  function createFolder(name,folderId,next) {
    var folderIds=[];
    if(folderId !== null){
      folderIds.push(folderId);
    }
    var fileMetadata = {
      'name' : name,
      'mimeType' : 'application/vnd.google-apps.folder',
       parents: folderIds
    };
    drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    }, function(err, file) {
      if(err) {
        console.log("error creating folder: ",err);
        next(err);
      } else {
        console.log('Folder Id: ', file.id);
        next(err,file.id);
      }
    });
  }
  return {
    getTokens:getTokens
  };
})();
