const express = require('express');
const cors = require('cors');
// // jwt
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
// middleware 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qtselqx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
     serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
     },
});

// cmnt
// jwt verify start 
const verifyJWT = (req, res, next) => {

     // console.log('hitting verifyJWT');
     // console.log(req.headers.authorization);
     const authorization = req.headers.authorization;

     if (!authorization) {
          return res.status(401).send({ error: true, message: 'unauthorized access' })
     }
     const token = authorization.split(' ')[1];
     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
          if (error) {
               return res.status(403).send({ error: true, message: 'unauthorized access' })
          }
          req.decoded = decoded;
          next();
     })
}
// jwt verify end

async function run() {
     try {

          // server link start
          const serverCollection = client.db('assignment11Db').collection('toysCollection');
          const usersCollection = client.db('assignment11Db').collection('users');
          // server link end 

          // jwt localhost start
          app.post('/jwt', (req, res) => {
               const user = req.body;
               const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: '2h'
               });
               res.send({ token });
          })
          // jwt localhost end

          // search part start
          app.get("/ToySearchText/:text", async (req, res) => {
               const text = req.params.text;
               const result = await serverCollection
                    .find({
                         $or: [
                              { name: { $regex: text, $options: "i" } },
                              { displayName: { $regex: text, $options: "i" } },
                              { category: { $regex: text, $options: "i" } },
                         ],
                    })
                    .toArray();
               res.send(result);
          });
          // search part exit 


          // user information post dataBD start 
          app.post('/users', async (req, res) => {
               const user = req.body;

               // google sign up part start
               const query = { email: user.email }
               const existingUser = await usersCollection.findOne(query);
               if (existingUser) {
                    return res.send({ message: 'user already exists' })
               }
               // google sign up part start

               const result = await usersCollection.insertOne(user)
               res.send(result);
          });
          // user information post dataBD exit 

          // server data post start 
          app.post('/toy', async (req, res) => {
               const newAdd = req.body;
               const result = await serverCollection.insertOne(newAdd)
               res.send(result);
          });

          // server data get start
          app.get('/toy',  async (req, res) => {
               // verifyJWT,
               const decoded = req.decoded;
               console.log(decoded);
               // console.log(req.headers);

               let query = {};
               const sort = req.query.sort;
               if (req.query?.email) {
                    query = { email: req.query.email }
               }
               // data sort part start 
               if (sort) {
                    const result = await serverCollection.find(query).sort({ price: sort }).toArray()
                    res.send(result)
               }
               // data sort part start 

               else {
                    const result = await serverCollection.find(query).toArray();
                    res.send(result);
               }
          })


          // server data get exit

          // jwt added server data get start
          app.get('/toy', verifyJWT, async (req, res) => {
               const decoded = req.decoded;
               if (decoded.email !== req.query.email) {
                    return res.status(403).send({ error: 1, message: 'forbidden access' })
               }

               let query = {};
               const sort = req.query.sort;
               if (req.query?.email) {
                    query = { email: req.query.email }
               }
               // data sort part start 
               if (sort) {
                    const result = await serverCollection.find(query).sort({ price: sort }).toArray()
                    res.send(result)
               }
               // data sort part start 

               else {
                    const result = await serverCollection.find(query).toArray();
                    res.send(result);
               }
          })

          app.get('/toy/:id', async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               const result = await serverCollection.findOne(query);
               res.send(result);
          });
          // jwt added server data get exit

          // server data update start
          app.put('/toy/:id', async (req, res) => {
               const id = req.params.id;
               const filter = { _id: new ObjectId(id) }
               const options = { upsert: true };
               const updateToy = req.body;
               const addToy = {
                    $set: {
                         name: updateToy.name,
                         photoURL: updateToy.photoURL,
                         category: updateToy.category,
                         price: updateToy.price,
                         rating: updateToy.rating,
                         quantity: updateToy.quantity,
                         description: updateToy.description
                    }
               }
               const result = await serverCollection.updateOne(filter, addToy, options);
               res.send(result)
          })
          // server data update end 

          // server data delete start
          app.delete('/toy/:id', async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) }
               const result = await serverCollection.deleteOne(query);
               res.send(result);
          })
          // server data delete exit

          // server all data get start 
          app.get('/toy', async (req, res) => {
               const cursor = serverCollection.find();
               const result = await cursor.toArray();
               res.send(result);
          })
          // server all data get end 


          // Send a ping to confirm a successful connection
          await client.db("admin").command({ ping: 1 });
          console.log("Pinged your deployment. You successfully connected to MongoDB!");
     } finally {
          // Ensures that the client will close when you finish/error
     }
}
run().catch(console.dir);


app.get('/', (req, res) => {
     res.send(`The Toy Marketplace server is running on port ${port}`)
})

app.listen(port, () => {
     console.log(`The Toy Marketplace server is running on port ${port}`);
})
