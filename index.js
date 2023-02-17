require('dotenv').config({path: './config.env'});
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
let db = new sqlite3.Database('./db/blog.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the blog database.');
});

// // Regular expression to check email and password
const regexEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/gi;
const regexPwd=  /^[0-9]{5,15}$/;


const app = express();

var port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log('app is listening to port 3000');
});

app.use(express.json());
app.use(cookieParser());

const authenticate = (req, res, next) => {
  try {
      const decodedToken = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);

      //Check user by id
      db.get(`SELECT id FROM User 
              WHERE id = ?`, [decodedToken._id], (err, row) => {
          if (err) {
              res.sendStatus(401);
              return;
          }
          //if user exists proceed to next resource
          if(row){
              req.user = row.id;
              next();
          } else {
              res.sendStatus(401);
              return;
          }
      });
      
  } catch (e) {
      console.log(e);
      res.sendStatus(401);
      return;
  }
};

app.post('/login', (req, res)=>{
  //validate email and password
  try{
    if(!regexEmail.test(req.body.login) || !regexPwd.test(req.body.password)){
        res.status(400).end("incorrect login or password");
        return;
    }
  } catch {
    res.status(400).end("incorrect login or password");
        return;
  }

  //query user from database
  db.get(`SELECT id, email, password 
          FROM User 
          WHERE email = ? AND password = ?`, [req.body.login, parseInt(req.body.password)], (err, row) => {
    if (err) {
      console.log(err);
      res.sendStatus(400);
      return;
    }
    //if user found send jwt token to stay authenticated
    if(row){
      const token = jwt.sign({_id: row.id}, process.env.JWT_SECRET, {expiresIn: '7d'});
      res.cookie('jwt', token);
      res.send();
      return;
    } else {
      res.sendStatus(400);
      return;
    }
  });
});

app.post('/register', (req, res)=>{
  //validate email and password
  try{
    if(!regexEmail.test(req.body.login) || !regexPwd.test(req.body.password)){
      res.status(400).end("incorrect login or password");
      return;
    }
  } catch {
    res.status(400).end("incorrect login or password");
      return;
  }

  //check if user with such email exists or not
  db.get(`SELECT id FROM User 
          WHERE email = ?`, [req.body.login], (err, row) => {
    if (err) {
      res.sendStatus(400);
      return;
    }
    //send notification to client if user already registered 
    if(row){
      res.status(400).end('user exists');
      return;
    } else {
      //if new user insert data into database
      db.run(`INSERT INTO User(email, password) VALUES(?, ?)`, [req.body.login, parseInt(req.body.password)], function(err) {
        if (err) {
          console.log(err);
          res.sendStatus(500);
          return;
        }
        //send jwt token for new user to stay authenticated
        const token = jwt.sign({_id: this.lastID}, process.env.JWT_SECRET, {expiresIn: '7d'});
        res.cookie('jwt', token);
        res.send();
        return;
      });
    }
  });

});

app.post('/newPost', authenticate, (req, res)=>{
  db.run(`INSERT INTO Post(title, content, author) VALUES(?, ?, ?)`, [req.body.title, req.body.content, req.user], function(err) {
    if (err) {
      res.sendStatus(400);
      return;
    }
    res.sendStatus(200);
    return;
  });
});

app.get('/post', authenticate, (req, res)=>{
  let postId = parseInt(req.query.id);
  if(isNaN(postId)){
    res.sendStatus(400);
    return;
  }

  db.get(`SELECT title, content, email FROM Post 
          JOIN User ON Post.author = User.id
          WHERE Post.id = ?`, [postId], (err, row) => {
    if (err) {
      res.sendStatus(500);
      return;
    }
    if(row){
      res.send(row);
      return;
    } else {
      res.sendStatus(404);
      return;
    }
  });
});

app.get('/userPosts', (req, res)=>{
  let userId = parseInt(req.query.id);
  let range = parseInt(req.query.range);
  let skip = parseInt(req.query.skip);
  if(isNaN(userId)){
    res.sendStatus(400);
    return;
  }
  if(isNaN(range) || isNaN(skip)){
    range = 5;
    skip = 0;
  }

  db.all(`SELECT title, content, email FROM Post 
          JOIN User ON Post.author = User.id
          WHERE Post.author = ? 
          LIMIT ?, ?`, [userId, skip, range], (err, row) => {
    if (err) {
      res.sendStatus(500);
      return;
    }
    if(row){
      res.send(row);
      return;
    } else {
      res.sendStatus(404);
      return;
    }
  });
});

app.get('/users', (req, res)=>{
  let range = parseInt(req.query.range);
  let skip = parseInt(req.query.skip);
  if(isNaN(range) || isNaN(skip)){
    range = 5;
    skip = 0;
  }
  db.all(`SELECT id, email FROM User LIMIT ?, ?`, [skip, range], (err, row) => {
    if (err) {
      res.sendStatus(500);
      return;
    }
    if(row){
      res.send(row);
      return;
    } else {
      res.sendStatus(404);
      return;
    }
  });
});