const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express()
const port = process.env.port || 5000

app.use(cors({
  origin:[
    // 'http://localhost:5173',
    //  'http://localhost:5174',
    'https://hot-blogs-client.web.app',
  'https://hot-blogs-client.firebaseapp.com'],
  credentials:true
}))
app.use(express.json())
app.use(cookieParser())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s79pxyc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middleware

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized Access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // console.log('verify theke error', err);
      return res.status(401).send({ message: 'Unauthorized' })
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // await client.connect();

    const database = client.db("hotBlogsDB");
    const blogsCollection = database.collection('blogs');
    const wishlistCollection = database.collection('wishlist')
    const commentsCollection = database.collection('comments')

   


    app.post('/jwt', async (req, res) => {
      const user = req.body;
      // console.log('user for token : ', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          // secure: true,
          secure: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          sameSite:'none',
          maxAge:60*60*1000
        })
        .send({ success: true })
    })

    app.post('/logout', async(req,res) =>{
      const user = req.body;
      // console.log('logging out ', user);
      res.clearCookie('token', {maxAge: 0 ,secure: process.env.NODE_ENV === 'production' ? 'none' : 'strict', sameSite: 'none'}).send({success: 'logged out true'})
    })


     // get methods

    app.get('/wishlist',verifyToken, async (req, res) => {

      // console.log(req.query?.email);
      // console.log('user in the valid token', req.user);
      // console.log(req.query.email);
      // console.log('wishlist get email',req.query.email);

      if(req.query.email !== req.user.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      let query = {};
      if(req.query?.email){
        query = {
          email: req.query.email
        }
      }
      const result = await wishlistCollection.find(query).toArray()
      res.send(result)
    })


    app.get('/blogs', async (req, res) => {
      const cursor = blogsCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/blogs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await blogsCollection.findOne(query)
      res.send(result)
    })

    app.get('/featuredBlogs', async (req, res) => {
      const cursor = await blogsCollection.find().toArray();

      const blogDescriptionLength = cursor.map(blog => blog.longDesLength)
      // console.log(blogDescriptionLength);

      let sortedDescriptionLength = blogDescriptionLength;
      sortedDescriptionLength.sort(function (a, b) {
        return a - b;
      });

      const sortedTopTen = sortedDescriptionLength.reverse().slice(0, 10);
      // console.log(sortedTopTen);

      const query = {
        longDesLength: {
          $in: sortedTopTen
        }
      }

      const result = await blogsCollection.find(query).toArray()
      res.send(result);

    })

    app.get('/recentBlogs', async (req, res) => {
      const cursor = blogsCollection.find()
      const result = await cursor.toArray()

      const blogsPostedTime = result.map(blog => blog.posted_time)
      // console.log(blogsPostedTime);
      let postedTimeArr = blogsPostedTime
      postedTimeArr.sort(function (a, b) {
        return a - b;
      });
      const recent = postedTimeArr.reverse()
      // console.log(recent);
      const recentSixBlogs = recent.slice(0, 6)
      // console.log(recentSixBlogs);
      const query = {
        posted_time: {
          $in: recentSixBlogs
        }
      }
      const recentBlogs = await blogsCollection.find(query).toArray()
      // console.log(recentBlogs);
      res.send(recentBlogs)
    })

    app.get('/blogs/:title', async (req, res) => {
      const title = req.params.title.toLowerCase;
      const query = { title: title }
      const result = await blogsCollection.findOne(query)
      res.send(result)
    })

    app.get('/:category', async (req, res) => {
      const category = req.params.category;
      const query = { category: category }
      const result = await blogsCollection.find(query).toArray();
      res.send(result)
    })

    // post methods

    app.post('/blogs', async (req, res) => {
      const newBlog = req.body;
      // console.log(newBlog);
      const result = await blogsCollection.insertOne(newBlog)
      // console.log(result);
      res.send(result)
    })

    app.post('/comments', async (req, res) => {
      const newComment = req.body;
      const result = await commentsCollection.insertOne(newComment)
      res.send(result)
    })

    app.get('/comments/:blog_id', async (req, res) => {
      const blog_id = req.params.blog_id;
      const query = { blog_id: blog_id }
      const result = await commentsCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/wishlist', async (req, res) => {
      const myWishlist = req.body;
      const result = await wishlistCollection.insertOne(myWishlist)
      res.send(result)
    })

    // delete method

    app.delete('/wishlist/:id', async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id:new ObjectId(id) };
      // console.log(query);
      const result = await wishlistCollection.deleteOne(query)
      res.send(result)
    })

    // update method

    app.put('/blogs/:id', async (req, res) => {
      const id = req.params.id;
      const blog = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedBlog = {
        $set: {
          title: blog.title,
          img: blog.img,
          category: blog.category,
          short_description: blog.short_description,
          long_description: blog.long_description
        }
      }
      const result = await blogsCollection.updateOne(filter, updatedBlog, options)
      res.send(result)
    })


    // await client.db("admin").command({ ping: 1 });
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