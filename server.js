var googleAuth = require('google-auth-library');
var google = require('googleapis');
var fs = require('fs');
var OAuth2 = google.auth.OAuth2;
var CLIENT_ID = "400882850360-5kesr51274f13qp76h283l42l1ql8hp8.apps.googleusercontent.com";
var CLIENT_SECRET = "lkTLOTJQYmIbgdxFxepd2Hhl";
var REDIRECT_URL = "https://termoslp.herokuapp.com/oauthcallback";
var oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
var drive = google.drive({ version: 'v2', auth: oauth2Client });
var bodyParser = require('body-parser');
// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
"https://www.googleapis.com/auth/drive",
"https://www.googleapis.com/auth/drive.file" 
];

var access_token="";

var express = require('express')
  , passport = require('passport')
  , flash = require('connect-flash')
  , utils = require('./utils')
  , LocalStrategy = require('passport-local').Strategy
  , RememberMeStrategy = require('passport-remember-me').Strategy;
 var pg = require('pg'); 
 //var uppy = require('uppy-server');

/* Fake, in-memory database of users */

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
          result.rows.forEach(function(r){
            user = {username:r.username,password:r.password,id:r.id}
          });
          console.log("Usuario en find username "+user);
          if (user){
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
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid password'+user }); }
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


function listFiles(auth) {
  
 var service = google.drive('v2');
  service.files.list({
    auth: oauth2Client,
    maxResults: 10,
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var files = response.items;
    if (files.length == 0) {
      console.log('No files found.');
    } else {
      console.log('Files:');
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        console.log('%s (%s)', file.title, file.id);
      }
    }
  });

}


app.get('/files',function(req,res){
      
      //console.log("req.files "+file.photos);
      //console.log(req.body);
      //console.log(req.body.name);
          drive.files.list({
            auth: oauth2Client,
            maxResults: 10,
          }, function(err, response) {
            if (err) {
              console.log('The API returned an error: ' + err);
              return;
            }
            var files = response.items;
            if (files.length == 0) {
              console.log('No files found.');
            } else {
              console.log('Files:');
              for (var i = 0; i < files.length; i++) {
                var file = files[i];
                console.log('%s (%s)', file.title, file.id);
                document.write("<a href='https://drive.google.com/open?id="+file.id+"'>"+file.name + '</a> <br>');
              }
            }
          });
      res.status(201).send('success upload photos')
});


//var urlEncodedParser = bodyParser.urlencoded({ extended: true});
//var formidable = require('formidable'),
multer  = require('multer'),
upload = multer();
app.use(upload.array());

app.post('/drivePost',function(req,res){
      
      //console.log("req.files "+file.photos);
      //console.log(req.body);
      //console.log(req.body.name);
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
      res.status(201).send('success upload photos')
});


app.get('/drive',function(req,res){
  console.log("acc token ----",access_token);
  if (access_token === ""){
    console.log("-------Entro");
    var url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
      scope: scopes // If you only need one scope you can pass it as string
    });
    console.log("Url "+url); //this is the url which will authenticate user and redirect to your local server. copy this and paste into browser
    res.redirect(url);
  }
  else{
    res.redirect('/');
  }

});

app.get('/logueado',function(req,res){
  
    res.status(201).send('Usuario logueado correctamente');

});

app.get('/oauthcallback',function(req,res){
  console.log("Codigo " + req.query.code);
  oauth2Client.getToken(req.query.code, function (err, tokens) {
  // Now tokens contains an access_token and an optional refresh_token. Save them.
    if (!err) {
      console.log("------Tokens ",tokens);
      for (key in tokens){
        console.log("-----Refresh token key "+key+" value: "+tokens[key]);
      }
      oauth2Client.setCredentials(tokens);
      access_token = tokens.access_token;
      res.redirect('/');   
    }
  });

});

/*var EventEmitter = require("events").EventEmitter;
var body = new EventEmitter();
body.on('pass', function (mensaje) {
  info2=mensaje;
}
global.info2="";*/

app.get('/', function(req, res){
  if(req.user){
      console.log("-------Request User del /: "+ req.user);
      global.nombres=[];
      global.info=[];

      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      var query = client.query('select nombre,idpedido from pedidos where finalizado=$1 order by idpedido',[false], function(err, result) {
        
        if (err)
         { console.error(err);}
        else
        { 
          
          result.rows.forEach(function(r,index){
            //console.log("---Entra al foreach: ",Object.keys(r));
  
            if(r.nombre != null){
              //console.log("---Entra al if: ",r.idpedido);
              nombres[index]={nombre:r.nombre,id:r.idpedido};
              console.log("---Entra al if: ",r.nombre," ",nombres[index].nombre);
            }
          
          });
         } 
          done();
          client.end();
        });

      query.on('end',function(){
        drive.files.list({
            auth: oauth2Client,
            maxResults: 10,
          }, function(err, response) {
            if (err) {
              console.log('The API returned an error: ' + err);
              return;
            }
            console.log('Response: '+Object.keys(response.data));
            var files = response.data.items;
            if (files.length == 0) {
              console.log('No files found.');
            } else {

              console.log('Files:');
              for (var i = 0; i < files.length; i++) {
                var file = files[i];
                console.log('%s (%s)', file.title, file.id);

                var ok = files.some(a =>a.title.includes(file.title.substring(0,(str.length)-7))); //Se fija si en algun valor de nombres esta el del archivo
                console.log("-----ok ",ok);
                if(ok){
                  info[i]={cantFiles:files.length,nombres:nombres,image:{href:"https://drive.google.com/uc?export=view&id="+file.id,name:file.title,downloadUrl:"https://drive.google.com/uc?export=download&id="+file.id}}; //"https://drive.google.com/open?id="
                  //document.write("<a href='https://drive.google.com/open?id="+file.id+"'>"+file.name + '</a> <br>');
                  console.log("------Info "+info[i]+" "+info[i].cantFiles+" "+info[i].image);
                  //body.emit('pass',"Termino");
                }

              }
              res.render('index', { user: req.user,info:info });
            }
          })
      });
  
  });   //console.log("",info2);
  }else{
    res.render('index',{user:""});
  }
});

app.get('/login', function(req, res){
   console.log("-------Request User del login: "+ req.user);
  res.render('login', { user: req.user, message: req.flash('error') });
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
    if (!req.body.remember_me) { return next(); }
    
    issueToken(req.user, function(err, token) {
      if (err) { return next(err); }
      res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: 604800000 });
      return next();
    });
  },
  function(req, res) {
    res.redirect('/drive');
  });

app.get('/logout', function(req, res){
  // clear the remember me cookie when logging out
  res.clearCookie('remember_me');
  console.log("user logout"+req.user.username);
  if(users[0]){
  if(req.user.username == users[0].user){
    users[0]=null;
  }}
  if(users[1]){
  if(req.user.username == users[1].user){
      console.log("entra"+users[1]+(req.user.username == users[1].user));
    users[1]=null;
  }}
  req.logout();
  res.redirect('/login');
});

app.post('/pedidoEnviado',function(req,res){
      console.log("----------Info del pedido ",req.body);
      var nombreP = req.body.nombre;
      var descripcionP = req.body.descripcion;
      var termoP = (req.body.chekedTermo == 'true');
      var yerberaP = (req.body.checkedYerbera =='true');
      var mateP = (req.body.checkedMate == 'true');
      var azucareraP = (req.body.checkedAzucarera == 'true');
      var idPedido; //id del ultimo pedido traido de la base

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
          client.query('insert into pedidos(idpedido,nombre,descripcion,termo,mate,yerbera,azucarera) values ($1,$2,$3,$4,$5,$6,$7)',[idPedido,nombreP,descripcionP,termoP,mateP,yerberaP,azucareraP] , function(err, result) {
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
