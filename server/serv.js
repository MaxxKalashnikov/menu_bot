require('dotenv').config()
const express = require('express');
const cors = require('cors');
const {menuRouter} = require("./index.js")

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:  false}))
app.use('/', menuRouter);
const port = 3001
app.listen(port);