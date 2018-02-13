var googleAuth = require('google-auth-library');
var google = require('googleapis');
var fs = require('fs');
var OAuth2 = google.auth.OAuth2;
var CLIENT_ID =   "439187847005-v83ihsnpia82g7o8seoq05i6ck3m2d79.apps.googleusercontent.com";
var CLIENT_SECRET = "5U5oPtnbYthQ0nd4IMOP0siD";
var REDIRECT_URL = "https://frozen-everglades-78768.herokuapp.com/oauthcallback";
var oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
var drive = google.drive({ version: 'v2', auth: oauth2Client });
var bodyParser = require('body-parser');
// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
"https://www.googleapis.com/auth/drive",
"https://www.googleapis.com/auth/drive.file" 
];
 

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
          console.log("Usuario"+user);
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



//algo


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

app.get('/user',function(req,res){
  res.set("Content-Type","application/json");
  res.json(    
           { "usuario":{ cont: ((users[0])? users[0].user: "")}
            }
          );
});

//var urlEncodedParser = bodyParser.urlencoded({ extended: true});
var formidable = require('formidable'),
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })

app.post('/drivePost',function(req,res){

    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
       console.log("fields"+fields + "files" + files);
      for(var photo in files) {
        
        console.log("entra al for con photo "+photo);
        drive.files.insert({
              resource: {
                name: photo.name,
                mimeType: 'image/jpeg'
              },
              media: {
                mimeType: 'image/jpeg',
                body: photo
              },
              auth: oauth2Client
            },function (err, file) {
              if (err) {
                // Handle error
                console.error(err);
              } else {
                console.log('File Id: ', file);
                console.log('Req body: ', req.body);

              }
            });

      }

    res.status(201).send('success upload photos')
    });

});


app.get('/drive',function(req,res){
  var url = oauth2Client.generateAuthUrl({
    access_type: 'online', // 'online' (default) or 'offline' (gets refresh_token)
    scope: scopes // If you only need one scope you can pass it as string
  });
  console.log("Url "+url); //this is the url which will authenticate user and redirect to your local server. copy this and paste into browser
  res.redirect(url);

});

app.get('/oauthcallback',function(req,res){
  console.log("Codigo " + req.query.code);
  oauth2Client.getToken(req.query.code, function (err, tokens) {
  // Now tokens contains an access_token and an optional refresh_token. Save them.
    if (!err) {
      oauth2Client.setCredentials(tokens);
      res.status(201).send('success authenticated')   
    }
  });

});


app.get('/', function(req, res){
  console.log("-------Request User: "+ req.user);
  res.render('index', { user: req.user });
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
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  // clear the remember me cookie when logging out
  res.clearCookie('remember_me');
  users[0]=null;
  req.logout();
  res.redirect('/');
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
