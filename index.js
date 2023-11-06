const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.port || 5000

app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s79pxyc.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();

    const database = client.db("hotBlogsDB");
    const blogsCollection = database.collection('blogs');
    const wishlistCollection = database.collection('wishlist')

// get methods

    app.get('/wishlist', async (req,res) =>{
      const cursor = wishlistCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/blogs',async(req,res) =>{
        const cursor = blogsCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })

    app.get('/recentBlogs', async(req,res) =>{
        const cursor = blogsCollection.find()
        const result = await cursor.toArray()

        const blogsPostedTime = result.map(blog =>  blog.posted_time)
        // console.log(blogsPostedTime);
        let postedTimeArr = blogsPostedTime
        postedTimeArr.sort(function (a, b) {
            return a - b;
        });
        const recent = postedTimeArr.reverse()
        // console.log(recent);
        const recentSixBlogs = recent.slice(0,6)
        // console.log(recentSixBlogs);
        const query = {
            posted_time : {
                $in : recentSixBlogs
            }
        }
        const recentBlogs = await blogsCollection.find(query).toArray()
        // console.log(recentBlogs);
        res.send(recentBlogs)
    })

    app.get('/blogs/:title', async(req, res) =>{
      const title = req.params.title.toLowerCase;
      const query = {title : title}
      const result = await blogsCollection.findOne(query)
      res.send(result)
    })

    app.get('/:category',async (req,res) =>{
      const category = req.params.category;
      const query = {category : category}
      const result = await blogsCollection.find(query).toArray();
      res.send(result)
    })

    // post methods

    app.post('/blogs',async(req,res) =>{
      const newBlog = req.body;
      // console.log(newBlog);
      const result = await blogsCollection.insertOne(newBlog)
      // console.log(result);
      res.send(result)
    })

    app.post('/wishlist', async(req,res) =>{
      const myWishlist = req.body;
      const result = await wishlistCollection.insertOne(myWishlist)
      res.send(result)
    })

   
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})