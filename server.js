var googleAuth = require('google-auth-library');
var google = require('googleapis');
var fs = require('fs');
var OAuth2 = google.auth.OAuth2;
var CLIENT_ID = "400882850360-5kesr51274f13qp76h283l42l1ql8hp8.apps.googleusercontent.com";
var CLIENT_SECRET = "lkTLOTJQYmIbgdxFxepd2Hhl";
var REDIRECT_URL = "https://termoslp.herokuapp.com/oauthcallback?username=lauchagnr";
var oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
var drive = google.drive({ version: 'v2', auth: oauth2Client });
var bodyParser = require('body-parser');
// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
"https://www.googleapis.com/auth/drive",
"https://www.googleapis.com/auth/drive.file" 
];

//var access_token=""; aver q pasa

var express = require('express')
  , passport = require('passport')
  , flash = require('connect-flash')
  , utils = require('./utils')
  , LocalStrategy = require('passport-local').Strategy
  , RememberMeStrategy = require('passport-remember-me').Strategy;
 var pg = require('pg'); 
 //var uppy = require('uppy-server');

/* Fake, in-memory database of users lpm */

/*var users = [
    { id: 1, username: 'alice', password: 'abc123', email: 'alice@domain.com' }
  , { id: 2, username: 'bob', password: 'abc123', email: 'bob@domain.com' }
];
*/
//Almaceno info del usuario autenticado
var users = [];

function findById(id, fn) {

  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      client.query('SELECT * FROM users where id='+id, function(err, result) {
        done();
        if (err)
         { console.error(err); response.send("Error " + err); }
        else
        { 
          result.rows.forEach(function(r){
            user = {username:r.username,password:r.password,id:r.id}
          });
          if (user){
            client.end();
            return fn(null, user);
          }else{
            client.end();
            fn(new Error('User ' + id + ' does not exist'));
          }
        }
      client.end();
      });
      pg.end();    
    });
}


function findByUsername(username,password,fn) {

    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      client.query('SELECT * FROM users where username= $1 and password= $2',[username,password] , function(err, result) {
        done();
        if (err)
         { console.error(err);}
        else
        { 
          var user = "";
          result.rows.forEach(function(r){
            user = {username:r.username,password:r.password,id:r.id}
          });
          if (user){
                      console.log("Usuario en find username "+user);
            var userObj = {"user":user.username};
            users[(user.id)-1]=userObj;
            client.end();
            return fn(null, user);
          }
          client.end();
          return fn(null, null);
        }
      client.end();
      });
      pg.end();    
    });

}



/* Fake, in-memory database of remember me tokens */

var tokens = {}

function consumeRememberMeToken(token, fn) {
  var uid = tokens[token];
  // invalidate the single-use token
  delete tokens[token];
  return fn(null, uid);
}

function saveRememberMeToken(token, uid, fn) {
  tokens[token] = uid;
  return fn();
}



// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});


// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
  function(username, password, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // Find the user by username.  If there is no user with the given
      // username, or the password is not correct, set the user to `false` to
      // indicate failure and set a flash message.  Otherwise, return the
      // authenticated `user`.
      findByUsername(username,password, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Usuario desconocido ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Password invalido'+user }); }
        return done(null, user);
      })
    });
  }
));

// Remember Me cookie strategy
//   This strategy consumes a remember me token, supplying the user the
//   token was originally issued to.  The token is single-use, so a new
//   token is then issued to replace it.
passport.use(new RememberMeStrategy(
  function(token, done) {
    consumeRememberMeToken(token, function(err, uid) {
      if (err) { return done(err); }
      if (!uid) { return done(null, false); }
      
      findById(uid, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        console.log("-------------Entro al findbyid del strategy ")
        return done(null, user);
      });
    });
  },
  issueToken
));

function issueToken(user, done) {
  var token = utils.randomString(64);
  saveRememberMeToken(token, user.id, function(err) {
    if (err) { return done(err); }
    return done(null, token);
  });
}




var app = express();

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.engine('ejs', require('ejs-locals'));
  app.use(express.logger());
  app.use(express.static(__dirname + '/../../public'));
  app.use('/stylesheets',express.static(__dirname + '/public/stylesheets'));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(flash());
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(passport.authenticate('remember-me'));
  app.use(app.router);
  //app.use(express.json()); 
  //app.use(uppy.app(options));
});



/*
  app.get('/db', function (request, response) {
    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      client.query('SELECT * FROM users order by id', function(err, result) {
        done();
        if (err)
         { console.error(err); response.send("Error " + err); }
        else
         { response.render('pages/db', {results: result.rows} ); }
       client.end();
      });
    pg.end();    
    });
  
  });
*/

app.get('/user',function(req,res){
  res.set("Content-Type","application/json");
  res.json(    
           { "usuario":{ app: ((users[0])? users[0].user : ""),web:((users[1])? users[1].user : "")}
            }
          );
});




app.get('/findName', function(req, res){
  var name = req.query.nombre;
  console.log(name);
  var encontro;
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      var query = client.query('SELECT nombre FROM pedidos where nombre=$1',[name] , function(err, result) {
        done();
        if (err)
         { console.error(err);}
        else
        { 
          result.rows.forEach(function(r){
            console.log("entra aca ",r);
            encontro = r.nombre;
          });
        }        
      client.end();
      });

      query.on('end',function(){
        console.log("encontro ",encontro);
        if (encontro){
          res.status(401).send('Ya existe el nombre');
        }else{
            res.status(201).send('No existe el nombre');      
        }
      });
      pg.end();    
    });
});


function deleteFile(fileId) {
  drive.files.delete({
    'fileId': fileId
  },function(err){

  });
}


//var urlEncodedParser = bodyParser.urlencoded({ extended: true});
//var formidable = require('formidable'),
multer  = require('multer'),
upload = multer();
app.use(upload.array());

app.post('/drivePost',function(req,res){
      
      console.log("req.files "+req.files.photos+req.files.photos.length);
      //console.log(req.body);
      //console.log(req.body.name);
      if(req.files.photos.length > 1){
      req.files.photos.forEach((photo) => {
          drive.files.insert({
            resource: {
                name: photo.name,
                mimeType: 'image/jpeg',
                title: photo.name
              },
            media: {
               mimeType: 'image/jpeg',
               body: fs.createReadStream(photo.path)
               },
            auth: oauth2Client
            },function (err, file) {
              if (err) {
                // Handle error
                console.error(err);
              } else {
                  console.log('File Id: ', file);

                  //console.log('Req body: ', req.body);
                  //console.log('Req files: ', req.files);
                }
              });                              
      });
      }else{
        var photo = req.files.photos;
        drive.files.insert({
            resource: {
                name: photo.name,
                mimeType: 'image/jpeg',
                title: photo.name
              },
            media: {
               mimeType: 'image/jpeg',
               body: fs.createReadStream(photo.path)
               },
            auth: oauth2Client
            },function (err, file) {
              if (err) {
                // Handle error
                console.error(err);
              } else {
/*
                  var fileId = '1sTWaJ_j7PkjzaBWtNc3IzovK5hQf21FbOw9yLeeLPNQ';
                  var permissions = [
                  {
    'type': 'user',
    'role': 'writer',
    'value': 'user@example.com'
  }, {
    'type': 'domain',
    'role': 'writer',
    'value': 'example.com'
  }
];*/

                  console.log('File Id: ', file);
                  /*drive.permissions.insert({
                    resource: permission,
                    fileId: fileId,
                    fields: 'id',
                  });
                  //console.log('Req body: ', req.body);
                  //console.log('Req files: ', req.files);*/
                }
              });         
      }
      res.status(201).send('success upload photos')
});

/*var access_token=[];
access_token[0]="";
access_token[1]="";*/

app.get('/access_token',function(req,res){
  //console.log("acc token ----",access_token);
  var usuario="";
  if (req.query) {
    console.log("----------username drive params ",req.query.username);
    usuario = req.query.username;
  }
  if(req.user){
    usuario = req.user.username;
  }
  //console.log(usuario,(access_token[0] != "" && usuario === "lauchagnr"));
  //if (access_token[0] != "" && usuario === "lauchagnr"){
    console.log("-------Entro al access_token ",oauth2Client.credentials,oauth2Client.isTokenExpiring());
    
    if(oauth2Client.credentials.expiry_date){
      if(!oauth2Client.isTokenExpiring() && usuario === "lauchagnr"){
        res.status(201).send('Ya esta autenticado')
      }else{
        res.status(400).send('Necesita autenticarse')
      }
    }else{
      res.status(400).send('Necesita autenticarse')
    }
  //}else{
    //res.status(400).send('Necesita autenticarse')
  //}
});

app.get('/drive',function(req,res){
  //console.log("acc token ----",access_token);
  console.log("-----OAuth2 ",oauth2Client.credentials);
  var usuario="";
  console.log("----------username drive params ",req.query.username);

  if (req.query) {
    usuario = req.query.username;
  }
  if(req.user){
    usuario = req.user.username;
  }
  //console.log("----------username drive ",usuario+" "+access_token[1]);
  if(oauth2Client.credentials.expiry_date){
      if (oauth2Client.isTokenExpiring()){
        console.log("-------Entro");
        var url = oauth2Client.generateAuthUrl({
          access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
          scope: scopes // If you only need one scope you can pass it as string
       
        });
        console.log("Url "+url); //this is the url which will authenticate user and redirect to your local server. copy this and paste into browser
        //req.session['success'] = 'User added successfully';   req.params
        res.redirect(url);
      }else{
        if(usuario === "lauchagnr"){
          res.redirect('/?username=lauchagnr');
        }else{
          console.log("-------Entro");
          var url = oauth2Client.generateAuthUrl({
          access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
          scope: scopes // If you only need one scope you can pass it as string
       
          });
        console.log("Url "+url); //this is the url which will authenticate user and redirect to your local server. copy this and paste into browser
        //req.session['success'] = 'User added successfully';   req.params
        res.redirect(url);
          //res.redirect('/files');
        }
      }
  }else{
        var url = oauth2Client.generateAuthUrl({
          access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
          scope: scopes // If you only need one scope you can pass it as string
       
        });
        console.log("Url "+url); //this is the url which will authenticate user and redirect to your local server. copy this and paste into browser
        //req.session['success'] = 'User added successfully';   req.params
        res.redirect(url);
    }          
});


app.get('/oauthcallback',function(req,res){
  console.log("-----OAuth2 ",oauth2Client);

  //for (key in oauth2Client){
   //     console.log("-----OAuth2 key "+key+" value: "+oauth2Client[key]);
    //  }
  console.log("Codigo " + req.query.code);
  oauth2Client.getToken(req.query.code, function (err, tokens) {
  // Now tokens contains an access_token and an optional refresh_token. Save them.
    if (!err) {
      console.log("------Tokens ",tokens);
      for (key in tokens){
        console.log("-----Refresh token key "+key+" value: "+tokens[key]);
      }
      //tokens.expiry_date=5000000000000;
      oauth2Client.setCredentials(tokens);
        console.log("-----OAuth2 ",oauth2Client.credentials);

      var usuario="";
      
      if(req.user){
        console.log("----------username oauth ",req.user.username);
        usuario = req.user.username;
      }else{
          if (req.query) {
          console.log("----------username oauth params ",req.query.username);
          usuario = req.query.username;
        }
      }

      if(usuario === "lauchagnr"){
        //access_token[0] = tokens.access_token;
        res.redirect('/?username=lauchagnr');
      }
      if(usuario === "admin"){
        //access_token[1] = tokens.access_token;
        res.redirect('/files');
      }
 
    }
  });

});


    function retrieveAllFiles(files,nextPageToken,callback){

      if(!nextPageToken){
          drive.files.list({
                auth: oauth2Client,
                maxResults:4,
                orderBy:'createdDate desc'
              }, function(err, response) {
                if (err) {
                  console.log('The API returned an error: ' + err);
                  return;
                }
                //console.log('Response: '+Object.keys(response.data));
                //console.log('Response files1: '+response.data.items);
                /*response.data.items.forEach(function(file){
                    var fileId = file.id;
                    var createdDate = file.createdDate;
                    if(createdDate<){//si se creo hace mas de dos meses,lo borro
                      deleteFile(fileId);
                    }
                });*/
                files = files.concat(response.data.items);
                //console.log(' filesconcat1: '+files);
                if(response.data.nextPageToken){
                  nextPageToken = response.data.nextPageToken;
                  //console.log('Response nextPageToken1: '+nextPageToken);
                  retrieveAllFiles(files,nextPageToken,callback);
                }else{
                    callback(files);
                }
            });
      }else{
          drive.files.list({
                auth: oauth2Client,
                maxResults:4,
                pageToken:nextPageToken,
                orderBy:'createdDate desc'
              }, function(err, response) {
                if (err) {
                  console.log('The API returned an error: ' + err);
                  return;
                }
                //console.log('Response: '+Object.keys(response.data));
                //console.log('Response files2: '+response.data.items);
                files=files.concat(response.data.items);
                //console.log(' filesconcat2: '+files);                
                if(response.data.nextPageToken){
                  nextPageToken = response.data.nextPageToken;
                  //console.log('Response nextPageToken2: '+nextPageToken);
                  retrieveAllFiles(files,nextPageToken,callback);
                }else{
                    callback(files);
                }
            });
        }
    }


app.get('/files', function(req, res){
  if(req.user){
      console.log("-------Request User del /files: "+ req.user);
      var pedido;
      var info;
      var urls;
      //global.info=[];

      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      var query = client.query('select * from pedidos where finalizado=$1 order by idpedido limit 1',[false], function(err, result) {
        
        if (err)
         { console.error(err);}
        else
        { 
          
          result.rows.forEach(function(r,index){
            //console.log("---Entra al foreach: ",Object.keys(r));
  
            if(r.nombre != null){
              //console.log("---Entra al if: ",r.idpedido);
              pedido={nombre:r.nombre,id:r.idpedido,desc:r.descripcion,termo:r.termo,yerbera:r.yerbera,azucarera:r.azucarera,mate:r.mate};
              console.log("---Entra al if: ",r.nombre," ",pedido.nombre);
            }
          
          });
         } 
          done();
          client.end();
        });
      
      query.on('end',function(){
          var files=[];
       
          if(pedido){
          retrieveAllFiles(files,null,function(files){
            
            console.log("---------files"+files);
            if (files.length == 0) {
              console.log('No files found.');
            } else {

               urls=[];//Download urls
              info=[];
              console.log('Files:');
          
             
              var file_act;
            
              var first=true;
          
              for (var i = 0; i < files.length; i++) {
                var file = files[i];
                console.log('%s (%s)', file.title, file.id);

                var ok = pedido.nombre === (file.title.substring(0,(file.title.length)-6)); //Se fija si en algun valor de nombres esta el del archivo
                console.log("-----ok ",ok);
                
                //file_act=file.title;

                if(ok){
                    if(first){
                      file_act=file.title;
                      console.log("entra al if first");
                      first=false;
                    }
                    //if(file.title.includes(file_act.substring(0,(file_act.length)-6))){
                    if(file.title.substring(0,(file.title.length)-6) === file_act.substring(0,(file_act.length)-6)){
             

                    urls.push("https://drive.google.com/uc?export=download&id="+file.id);
                    info.push({image:{href:"https://drive.google.com/uc?export=view&id="+file.id,name:file.title,downloadUrl:"https://drive.google.com/uc?export=download&id="+file.id}}); //"https://drive.google.com/open?id="
                    
                  }else{
                    break;
                  }

              }
            }
              res.render('files', { user: req.user,info:info,urls:urls,pedido:pedido});
            }
          });
        }
          else{
              res.render('files', { user: req.user,message:"No quedan pedidos por realizar"});

          }

          });
      pg.end();
    });   //Cierra pg.connect
  }else{
    res.render('files',{user:req.user});
  }
});

//aver
      var pedidos;
      var info;
      var urls;
      var nombres;
      var cantPedidos;

app.get('/files/realizados/:id', function(req, res) {
  var desde = parseInt(req.params.id,10);
  var limite;
  if (desde == cantPedidos){ //Si queda 1 solo pedido
      console.log("---entra al 1 solo pedido",cantPedidos);
      limite = cantPedidos;
  }
  if( desde > cantPedidos){ //Si se mostraron todos los pedidos
      res.render('filesRealizados',{ user: req.user,desde:desde,message:"No quedan pedidos realizados"});
  }
  else{
    if((desde+2) < cantPedidos){ //Si quedan mas de 3 pedidos 
      console.log("---quedan mas de 3 pedidos ",limite,req.params.id);
      limite = desde+2;
      console.log("---limiteee ",limite);
    }else{
      console.log("---quedan cant pedidos ",limite,desde,cantPedidos)
      limite = cantPedidos;
    }
      console.log("---pedidos ",pedidos," ",cantPedidos," ",limite);
      res.render('filesRealizados', { user: req.user,info:info,urls:urls,nombres:nombres,pedidos:pedidos,desde:desde,nuevo:limite});
  }
  
});


app.get('/files/realizados', function(req, res){
  if(req.user){
      console.log("-------Request User del /files/realizados: "+ req.user);
      //global.info=[];
      pedidos = [];
      nombres = [];
      var start = Date.now();            
      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
          
            var query = client.query('select * from pedidos where finalizado=$1 order by idpedido desc',[true], function(err, result) {       
            if (err)
             { console.error(err);}
            else
            {               
              result.rows.forEach(function(r,index){
                //console.log("---Entra al foreach: ",Object.keys(r));      
                if(r.nombre != null){
                  //console.log("---Entra al if: ",r.idpedido);
                  pedidos.push({nombre:r.nombre,id:r.idpedido,desc:r.descripcion,termo:r.termo,yerbera:r.yerbera,azucarera:r.azucarera,mate:r.mate});
                  nombres.push({nombre:r.nombre});

                  //console.log("---Resultado query 1 : nombre ",r.nombre," pedidos ",pedidos," length ",pedidos.length);
                }              
              });
              cantPedidos=pedidos.length;
             } 
              done();             
            }); //end query
            
            query.on('end',function(){
              if(pedidos.length == 0){
                console.log("---entra al render ");
                done();
                 
                res.render('filesRealizados', { user: req.user,message:"No quedan pedidos realizados"});                             
              }else{
                          var files=[];                       
                              retrieveAllFiles(files,null,function(files){
                              var end1= Date.now();  
                              console.log("------Tiempo retrieve files ",((end1 - start) / 1000));            
                                  console.log("---------files"+files);
                                  if (files.length == 0) {
                                    console.log('No files found.');
                                  } else {
                                     urls=[];//Download urls
                                     info=[];
                                    console.log('Files:');
                                    var ind = 0;
                                    info[ind]=[];
                                    urls[ind]=[];
                                    var file_act;
                                    var cant = 0;
                                    var first=true;
                                        for (var i = 0; i < files.length; i++) {
                                        var file = files[i];
                                        console.log('%s (%s)', file.title, file.id);
                                        /*Object.keys(file).forEach(function(k){
                                          console.log('--- keys', k);
                                        });
                                        */
                                        for (var q = 0; q < nombres.length; q++) {
                                          //var ok = nombres.some(a =>a.nombre.includes(file.title.substring(0,(file.title.length)-6))); //Se fija si en algun valor de nombres esta el del archivo
                                          ok = (nombres[q].nombre === (file.title.substring(0,(file.title.length)-6)));
                                          //console.log("-----ok ",ok);                                 
                                          //file_act=file.title;
                                          if(ok){
                                              if(first){
                                                file_act=file.title;
                                                //console.log("entra al if first");
                                                first=false;
                                              }
                                              if(file.title.substring(0,(file.title.length)-6) === (file_act.substring(0,(file_act.length)-6))) {                                            
                                                cant+=1;
                                                //console.log("---cant1",cant);                                            
                                                info[ind][0]=cant;                                               
                                                urls[ind].push("https://drive.google.com/uc?export=download&id="+file.id);
                                                info[ind].push({image:{href:file.thumbnailLink.substring(0,(file.thumbnailLink.length)-4)+'s350',name:file.title,downloadUrl:"https://drive.google.com/uc?export=download&id="+file.id}}); //"https://drive.google.com/uc?export=view&id="                                            
                                              }else{
                                                  file_act=file.title;
                                                  //console.log("---cant2",cant);
                                                  //info[ind].push(cant);
                                                  //console.log("---info cant",info[ind][info[ind].length-1]);
                                                  cant=1;
                                                  ind+=1;
                                                  info[ind]=[];
                                                  urls[ind]=[];
                                                  if(!info[ind][0]){
                                                    info[ind][0]=cant;
                                                  }               
                                                  urls[ind].push("https://drive.google.com/uc?export=download&id="+file.id);
                                                  info[ind].push({image:{href:file.thumbnailLink.substring(0,(file.thumbnailLink.length)-4)+'s350',name:file.title,downloadUrl:"https://drive.google.com/uc?export=download&id="+file.id}}); //"https://drive.google.com/open?id="
                                                }
                                          } //end if ok
                                      }
                                      } //end for
                                      var end2= Date.now();  
                                      console.log("------Tiempo despues de los for ",((end2 - start) / 1000));
                                      res.redirect('/files/realizados/1');
                                  }//end else
                              });//end retrieveAllFiles
                }//end else (if pedidos.length)
            });//end ond end          
      pg.end();
      }); //end pg connect
  }else{ //end if req.user
    res.render('filesRealizados',{user:req.user});
  } 
});

      /*
        <% if(info){ %>
        <div class="row">
    <% for (var i = 0; i < (info.length); i++) { %> 
    <%  console.log("---- info2 "+info.length+"  "+info[i]);%>
      <% for (var q = 1; q <= (info[i][0]); q++) { %> 
        <%  console.log("---- info3 "+info[i][q]);%>

            <div class="col-sm-6 col-md-4">
                <div class="thumbnail">
                    <a class="lightbox" href=<%=info[i][q].image.downloadUrl%>>
                        <img src='<%=info[i][q].image.href %>' class='img-responsive'>
                    </a>
                    <div class="caption">
                        <h4><%=info[i][q].image.name %></h4>
                    </div>
                </div>
            </div>

    <% } %>
    <% if(urls){ %>

      <center> <button class="btn btn-lg btn-warning btn-block descargas" onclick="downloadAll('<%= urls[i] %>')">Descargar todas</button>
      </center>
    <% } %>
        </div>
        <% }} %>
*/
   
app.get('/login', function(req, res){
   console.log("-------Request User del login: "+ req.user);
   
      res.render('login', { user: req.user, message: req.flash('error') });

});

app.get('/', function(req, res){
         res.redirect('/login');

      /*if(req.user){
       console.log("-------Request User del /: "+ req.user);
       res.render('index', { user: req.user, message: req.flash('error') });
      }
      else{
        if(req.query.username){
          console.log("-------Request User del /: "+ req.query);
          res.render('index', { user: req.query, message: req.flash('error') });
        }else{
          var userObj= {username:'admin'};
          console.log("-------Request User del /: "+ userObj.username);
          res.render('index', { user: userObj, message: req.flash('error') });
        }
      }*/
   
});

// POST /login
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
//
//   curl -v -d "username=bob&password=secret" http://127.0.0.1:3000/login
app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res, next) {
    // Issue a remember me cookie if the option was checked
    if (!req.body.remember_me) {     
      console.log('------Post login '+req.user);
      return next(); 
    }
    console.log('------Post login '+req.user);

    issueToken(req.user, function(err, token) {
      if (err) { return next(err); }
      res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: 604800000 });
      return next();
    });
  },
  function(req, res) {
   console.log('------Post login 2 '+req.user.username);
   
    if(req.user.username === "lauchagnr"){
        res.redirect('/');
    }
    if(req.user.username === "admin"){
        res.redirect('/drive');
    }
      
   });

app.get('/logout', function(req, res){
  // clear the remember me cookie when logging out
  res.clearCookie('remember_me');
  if(req.user){
    console.log("user logout"+req.user.username);
    if(users[1]){
      if(req.user.username == users[1].user){
        console.log("entra"+users[1]+(req.user.username == users[1].user));
        users[1]=null;
        req.logout();
        res.redirect('/login');
      }
    }
  }
  if(req.query){
        console.log("user logout"+req.query.username);
      if(users[0]){
        if(req.query.username == users[0].user){
          users[0]=null;
          req.logout();
          res.status(201).send('Logout correcto');
        }
      }
  }
  
});

app.post('/pedidoEnviado',function(req,res){
      console.log("----------Info del pedido ",req.body);
      var nombreP = req.body.nombre;
      var descripcionP = (req.body.descripcion !='') ? (req.body.descripcion) : 'Sin descripcion';
      var termoP;
      var yerberaP;
      var mateP;
      var azucareraP;
      if(req.body.checkedCompleto == 'true'){
        termoP = true;
        yerberaP = true;
        mateP = true;
        azucareraP = true;   
      }else{
        termoP = (req.body.checkedTermo == 'true');
        yerberaP = (req.body.checkedYerbera =='true');
        mateP = (req.body.checkedMate == 'true');
        azucareraP = (req.body.checkedAzucarera == 'true');
      }
      
      var idPedido; //id del ultimo pedido traido de la base
      console.log("-----------Valor en termoP ",termoP);
            console.log("-----------Valor en termoP2 ",yerberaP);
      console.log("-----------Valor en termoP3 ",mateP);
      console.log("-----------Valor en termoP4 ",azucareraP);


      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
       
      var query = client.query('select idpedido from pedidos order by idpedido desc limit 1', function(err, result) {
        
        if (err)
         { console.error(err);}
        else
        { 
          if(!idPedido)
            idPedido = 1;
          result.rows.forEach(function(r){
            //console.log("---Entra al foreach: ",Object.keys(r));
            console.log("---Entra al foreach: "+idPedido+" "+r+" "+r.idpedido);
            if(r.idpedido != null){
              //console.log("---Entra al if: ",r.idpedido);
              idPedido = (r.idpedido) + 1;
              console.log("---Entra al if: ",idPedido);
            }
            else{
              idPedido = 1;
              console.log("---Entra al else: ",idPedido);

            }
          
          });
         } 
          console.log("---Resultado select: "+idPedido);
          done();
        });
        
      query.on('end', function(){
          client.query('insert into pedidos(idpedido,nombre,descripcion,termo,mate,yerbera,azucarera,finalizado) values ($1,$2,$3,$4,$5,$6,$7,$8)',[idPedido,nombreP,descripcionP,termoP,mateP,yerberaP,azucareraP,false] , function(err, result) {
          console.log("Valor de idPedido",idPedido);
          if (err){ 
            console.error(err);
          }
          else
          { 
            console.log("---Entra al else de insert ",result.rows);
            result.rows.forEach(function(r){
            console.log("---Resultado insert: "+r);
            });
            
          }
          done();
        client.end();
        });
      });

      pg.end();    
    });
    res.status(201).send('Pedido recibido');
     
});

app.post('/filesPost',function(req,res){
      console.log("----------Info del pedido ",req.body);
      
      var idPedido = req.body.pedidoId;
      if(idPedido){
        pg.connect(process.env.DATABASE_URL, function(err, client, done) {
         
        var query = client.query('update pedidos set finalizado=$1 where idpedido=$2',[true,idPedido],function(err, result) {
          
          if (err)
           { console.error(err);}
       
    
            done();
        });
      
        
      

      pg.end();    
    });
    }
    res.redirect('/files');
     
});



app.listen(process.env.PORT, function() {
  console.log('Express server listening on port 8081');
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
