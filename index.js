const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json())


app.get('/', (req,res)=>{
    res.send('Hello ArtsCart Education')
})

app.listen(port, ()=>{
    console.log(`Server Port Running on:${port}`)
})