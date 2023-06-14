const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.PAYMENT_SECRECT_KEY)
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json())


const verifyJWT =(req,res,next)=>{
   const authorization = req.headers.authorization
    if(!authorization){
      return res.status(401).send({error:true, message:"A token is required for authentication"})
    }
    const token = authorization.split(' ')[1]
    // console.log({token})
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
    const classesCollection=client.db('artsCraft').collection('classes');
    const bookingCollection=client.db('artsCraft').collection('booking');
    const enrolledCollection=client.db('artsCraft').collection('enrolled');
    const PaymentCollection=client.db('artsCraft').collection('payment');
   
   
   
   
    app.post('/jwt', (req, res)=>{
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1h'})
      res.send({token})
    })

    const verifyStudent =async(req,res,next)=>{
        const email = req.decoded.email;
        const query={email:email}
        const user = await userCollection.findOne(query)
        if(user?.role !== "student"){
          return res.status(403).send({ error: true, message: 'Invalid User' });
        }
        next();
    } 
    
    const verifyInstructor =async(req,res,next)=>{
      const email=req.decoded.email;
      const query = {email:email}
      const user = await userCollection.findOne(query)
      // console.log(user)
      if(user?.role !=="instructor"){
        return res.status(403).send({ error: true, message: 'Invalid User' });
      }
      next();
    }
    

    const verifyAdmin =async(req,res,next)=>{
      const email=req.decoded.email;
      const query = {email:email}
      const user = await userCollection.findOne(query)
      // console.log(user)
      if(user?.role !=="admin"){
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

   app.post('/booking', async(req,res)=>{ 
       const  newuser = req.body;
       const result = await bookingCollection.insertOne(newuser);
       res.send(result)
       
   })  

   app.post('/create-payment-intent', verifyJWT, async(req,res)=>{
       const {price}= req.body;
       const amount = parseFloat(price*100);
       const  paymentIntent = await stripe.paymentIntents.create({
             amount: amount,
             currency:'usd',
             payment_method_types: ["card"]
       });
       res.send({
        clientSecret: paymentIntent.client_secret,
      });
   })
   
   app.get('/booking', verifyJWT,verifyStudent, async(req,res)=>{
      const query ={email:req.query.email}
       const result = await bookingCollection.find(query).toArray()
       res.send(result)
   }) 
   app.delete('/booking/:id', async(req,res)=>{
       const id = req.params.id;
       const query ={_id: new ObjectId(id)}
       const result = await bookingCollection.deleteOne(query)
       res.send(result)
   })


    app.get('/users/student/:email', verifyJWT, async(req,res)=>{
        const email=req.params.email;
        const query ={email:email};
        const user = await userCollection.findOne(query);
        const result = {student:user?.role==='student'}
        res.send(result)

    })
    
    app.get('/users', verifyJWT,verifyStudent, async(req,res)=>{
        const result = await userCollection.find().toArray();
        res.send(result)
    })

    app.get('/classes/allclasses', async(req,res)=>{
      const query ={status:'approved'}
      const result = await classesCollection.find(query).toArray()
      res.send(result)
    }) 

    app.get('/classes/popularclasses', async(req,res)=>{
      const result = await classesCollection.find().limit(6).sort({_id:-1}).toArray()
      res.send(result)
    }) 


  app.get('/payment', async(req,res)=>{
    const result = await PaymentCollection.find().sort({_id:-1}).toArray()
    res.send(result)
  })
  
  app.get('/booking/newuser', async(req,res)=>{
      const paymentuser = await PaymentCollection.find().toArray();
      const id = paymentuser.map(obj => obj.payment.courseId);
      const userResult =await bookingCollection.find({ _id: { $in: id } }).toArray((err, result) => {
        if (err) {
          console.error('Error querying data:', err);
          res.sendStatus(500);
          return;
        }
    
        res.json(result);
      }); 
     res.send(userResult)
      
  })

  app.post('/payment', async(req,res)=>{
      const user = req.body;
      const result = await PaymentCollection.insertOne(user)
      res.send(result)
  })

//-------------------insttructor
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

    app.get('/users/instructor/:email',verifyJWT, verifyInstructor, async(req,res)=>{
      const email = req.params.email;
      const query = {email:email}
      const user = await userCollection.findOne(query);
      const result = {instructor:user?.role==='instructor'}
      res.send(result)
    })

    app.get('/users/insalldata', async(req,res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
    })
    
    app.get('/users/inslimit', async(req,res)=>{
      const query = {role:'instructor'}
      const result = await userCollection.find(query).limit(6).toArray()
      res.send(result)
    })

   app.post('/classes', async(req,res)=>{
      const claseseData = req.body;
      const result = await classesCollection.insertOne(claseseData);
      res.send(result)
   }) 

  app.get('/classes', verifyJWT, verifyInstructor, async(req,res)=>{
     const email = req.decoded.email;
     const query ={Instructor_email:email}
    const resutl = await classesCollection.find(query).sort({_id:-1}).toArray()
    res.send(resutl)
  })
// ---------------Admin----

app.get('/users/alldata',verifyJWT,verifyAdmin, async(req,res)=>{
  const result = await userCollection.find().sort({_id:-1}).toArray()
  res.send(result)
})


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
  }) 
  app.get('/users/admin/:email',verifyJWT,verifyAdmin, async(req,res)=>{
    const email = req.params.email;
    const query ={email:email}
    const user = await userCollection.findOne(query)
    const result = {admin: user?.role ==='admin'}
    res.send(result)
  }) 
  
  app.get('/classes/admindata',verifyJWT,verifyAdmin, async(req,res)=>{
     const result =await classesCollection.find().sort({_id:-1}).toArray()
     res.send(result)
  })

  app.put('/classes/updatedata/:id', async(req, res)=>{
      const id = req.params.id;
      console.log(id)
      const query = {_id :new ObjectId(id)} 
      const user= req.body;
      console.log(user)
      const options = { upsert: true };
      const doc={
        $set:{
          status:user.status
        }
      }
      const result =await classesCollection.updateOne(query,doc,options)
      res.send(result)
  }) 

app.put('/classes/adminmodal/:id',verifyJWT,verifyAdmin, async(req,res)=>{
    const id=req.params.id;
    const user=req.body;
    const query = {_id : new ObjectId(id)}
    const options = { upsert: true };
    const doc ={
      $set:{
        feedback:user.feedback
      }
    }
    const result = await classesCollection.updateOne(query, doc, options)
    res.send(result)
}) 

app.put('/users/makeadmin/:id', verifyJWT,verifyAdmin, async(req,res)=>{
      const id =req.params.id;
      const filter = {_id : new ObjectId(id)}
      const options = { upsert: true };
      const UpdateDoc = {
          $set:{
              role:"admin"
          }
      }
      const result = await userCollection.updateOne(filter, UpdateDoc, options)
      res.send(result)
})

app.put('/users/makeainstructor/:id',verifyJWT,verifyAdmin, async(req,res)=>{
  const id =req.params.id;
  const filter = {_id : new ObjectId(id)}
  const options = { upsert: true };
  const UpdateDoc = {
      $set:{
          role:"admin"
      }
  }
  const result = await userCollection.updateOne(filter, UpdateDoc, options)
  res.send(result)
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