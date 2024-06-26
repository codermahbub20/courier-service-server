const express = require('express');
const mongoose = require('mongoose');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser')
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000;

const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY )
// Middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rarr4yf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    // await client.connect();

    const packageCollection = client.db("niyamatDB").collection("package");
    const usersCollection = client.db('niyamatDB').collection('users')
    const bookingsCollection = client.db('niyamatDB').collection('booking')



    // Post package in database
    app.post('/package', async (req, res) => {
      const package = req.body;
      const result = await packageCollection.insertOne(package)
      res.send(result);
    });

    // Get all Package
    app.get('/package', async (req, res) => {
      const result = await packageCollection.find().toArray()
      res.send(result)
    })


    // updated package action info
    app.patch('/package/:id', async (req, res) => {
      const id = req.params.id
      console.log(id)
      const {update} = req.body
      console.log(update)
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          update
        }
      }
      const result = await packageCollection.updateOne(query, updatedDoc)
      res.send(result)
    })


    // updated booking package action info
    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id
      console.log(id)
      const {update} = req.body
      console.log(update)
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          update
        }
      }
      const result = await bookingsCollection.updateOne(query, updatedDoc)
      res.send(result)
    })


    app.get('/package/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await packageCollection.findOne(query);
      res.send(result)
    });



    // Save or modify user email, status in DB
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email: email }
      const options = { upsert: true }
      const isExist = await usersCollection.findOne(query)
      console.log('User found?----->', isExist)
      if (isExist) {
        if (user?.status === 'Requested') {
          const result = await usersCollection.updateOne(
            query,
            {
              $set: user,
            },
            options
          )
          return res.send(result)
        } else {
          return res.send(isExist)
        }
      }
      const result = await usersCollection.updateOne(
        query,
        {
          $set: { ...user, timestamp: Date.now() },
        },
        options
      )
      res.send(result)
    })


    // Update user role
app.put('/users/update/:email',  async (req, res) => {
  const email = req.params.email
  const user = req.body
  const query = { email: email }
  const options = { upsert: true }
  const updateDoc = {
    $set: {
      ...user,
      timestamp: Date.now(),
    },
  }
  const result = await usersCollection.updateOne(query, updateDoc, options)
  res.send(result)
})



    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })

    // Get all users
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })


    // Get user role
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const result = await usersCollection.findOne({ email })
      res.send(result)
    })



    // Generate client secret for stripe payment
    app.post('/create-payment-intent',  async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price * 100)
      if (!price || amount < 1) return
      const { client_secret } = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card'],
      })
      res.send({ clientSecret: client_secret })
    })

    // Save booking collection 
    app.post('/bookings',  async (req, res) => {
      const booking = req.body
      const result = await bookingsCollection.insertOne(booking)
      res.send(result)
    })


   // Get all bookings for user
   app.get('/bookings', async (req, res) => {
    const result = await bookingsCollection.find().toArray()
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

app.get('/', (req, res) => {
  res.send('Niyamt Itr Courier Service Running!');
});

app.listen(port, () => {
  console.log(`Courier Service app listening on port ${port}`);
});
