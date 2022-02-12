const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const multer = require('multer');
require('dotenv').config()

app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer().array());
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Setup DataBase
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema;

let User = mongoose.model('User', new Schema({
  username: String
}))

let Excer = mongoose.model('Excer', new Schema({
  username: {type: Schema.Types.ObjectId, ref: 'User'},
  description: String,
  duration: Number,
  date: Date
}))

const createUser = (username, done) => {
  var new_user = new User();
  new_user.username = username;
  new_user.save((err, data) => {
    done(err, data)
  })
}

const getAllUser = (done) => {
  User.find({}, (err, data)=> {
    done(err, data)
  })
}

const getUserById = (id, done) => {
  User.findById(id, (err, data)=>{
    done(err, data)
  })
}

const getUserByName = (username, done) => {
  User.findOne({username: username}, (err, data) => {
    done(err, data)
  })
}

const createExcer = (body, id, done) => {
  if(!body.description || !body.duration){
    done({error: "Please Fill Description and Duration Fields"}, null)
  }
  else {
    var new_excer = new Excer();
    new_excer.username = id
    new_excer.description = body.description
    new_excer.duration = body.duration
    if(!body.date) { body.date = new Date() }
    new_excer.date = new Date(body.date)
    new_excer.save((err, data)=>{
      done(err, data)
    })
  }
}

const getExcersById = (id, query, done)=>{
  if(!query.to) query.to = new Date()
  if(!query.from) query.from = new Date('1900-1-1')
  console.log(query.to + " " + query.from)
  Excer.find({
    username: id, 
    date: { $gte: query.from, $lte: query.to }
  })
  .limit(parseInt(query.limit))
  .exec((err, data) => {
      done(err, data)
    }
  );
}

const newUser = (req, res) => {
  var username = req.body.username
  if(username){
    getUserByName(username, (err, found_user)=>{
      if(err) {
        res.json({error: "Fill Username Field"})
      } else if(found_user) {
        res.json({username: found_user.username, _id: found_user._id})
      } else {
        createUser(username, (err, new_user)=>{
          res.json({username: new_user.username, _id: new_user._id})
        })
      }
    })
  } else {
    res.json({error: "Fill Username Field"})
  }
};

const allUsers = (req, res) => {
  getAllUser((err, data) => {
    var result = []
    for(let i=0; i<data.length; i++){
      result.push({username: data[i].username, _id: data[i]._id})
    }
    res.json(result)
  })
};

app.route('/api/users').get(allUsers).post(newUser)

app.post('/api/users/:_id/exercises', (req, res)=> {
  var id = req.params._id;
  getUserById(id, (err, user)=> {
    if(err){ res.json({error: "This Id Not Found for Saved Users"}) }
    else {
      createExcer(req.body, id, (err, excer)=>{
        if(err) {
          res.send(err)
        } else {
          res.json({
            _id: user._id, 
            username: user.username,
            date: excer.date.toDateString(),
            duration: excer.duration,
            description: excer.description
          })
        }
      })
    }
  })
})

app.get('/api/users/:_id/logs', (req, res)=>{
  id = req.params._id;
  getUserById(id, (err, user)=>{
    if(err){
      res.json({error: "Not Valid Id"})
    } else {
      getExcersById(id, req.query, (err, log)=>{
        if(err) { res.send(err) }
        else {
          var result = []
          for(let i=0; i<log.length; i++){
            result.push({
              description: log[i].description,
              duration: log[i].duration,
              date: log[i].date.toDateString()
            })
          }
          res.json({
            _id: user._id,
            username: user.username,
            count: log.length,
            log: result
          })
        }
      })
    }
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
