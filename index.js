const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json())


const verifyJWT =(req,res,next)=>{
   const authorization = req.headers.authorization
    if(!authorization){
      return res.status(401).send({error:true, message:"A token is required for authentication"})
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token,process.env.ACCESS_SECRET_TOKEN, (error, decoded)=>{
      if(error){
        return res.status(401).send({error:true, message:"Invalid Token"})
      }
      req.decoded =decoded;
      next()
    })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vxcd8cz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection=client.db('artsCraft').collection('users');
    app.post('/jwt', (req, res)=>{
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1h'})
      res.send({token})
    })

    const verifyStudent =async(req,res,next)=>{
        const email = req.decoded.email;
        const query={email:email}
        const user = await userCollection.findOne(query)
        if(user.role !== "student"){
          return res.status(403).send({ error: true, message: 'Invalid User' });
        }
        next();
    } 
    
    const verifyInstructor =async(req,res,next)=>{
      const email=req.decoded.email;
      const query = {email:email}
      const user = await userCollection.findOne(query)
      if(user?.role !=="instructor"){
        return res.status(403).send({ error: true, message: 'Invalid User' });
      }
      next();
    }
    
    
    // ----------------------Student-----------------------------
    app.post('/users', async(req, res)=>{
        const body = req.body;
        const query = {email : body.email};
        const stayUser = await userCollection.findOne(query)
        if(stayUser){
            return 
        }
        const result = await userCollection.insertOne(body)
        res.send(result)
    })
    
    app.get('/users', verifyJWT, verifyStudent,async(req,res)=>{
        const result = await userCollection.find().toArray();
        res.send(result)
    })

    app.put('/users/:id', async(req,res)=>{
        const id = req.params.id;
        const filter = {_id : new ObjectId(id)}
        const options = { upsert: true };
        const UpdateDoc = {
            $set:{
                role:"instructor"
            }
        }
        const result = await userCollection.updateOne(filter, UpdateDoc, options)
        res.send(result)
    }) 
// =-------------------insttructor
    app.get('/users/instructor/:email',verifyJWT, verifyInstructor, async(req,res)=>{
      const email = req.params.email;
      const query = {email:email}
      const user = await userCollection.findOne(query);
      const result = {instructor:user?.role=='instructor'}
      res.send(result)
    })

// ---------------Admin----
    
    app.put('/users/admin/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)}
      const options = { upsert: true };
      const UpdateDoc = {
          $set:{
              role:"admin"
          }
      }
      const result = await userCollection.updateOne(filter, UpdateDoc, options)
      res.send(result)

      app.get('/users/admin/:email', verifyJWT, async(req,res)=>{
        const email = req.params.email;
        const query ={email:email}
        const user = await userCollection.findOne(query)
        const result = {admin: user?.role =='admin'}
        res.send(result)
      })
  }) 
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req,res)=>{
    res.send('Hello ArtsCart Education')
})

app.listen(port, ()=>{
    console.log(`Server Port Running on:${port}`)
})