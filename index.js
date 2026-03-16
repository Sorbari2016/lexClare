import express from "express"; 
import axios from "axios"; 
import bodyParser from "body-parser";
import dotenv from "dotenv"; 

dotenv.config();

const app = express();
const PORT = 4000; 

const API_KEY = process.env.SCH_DICT_API_KEY; 


app.listen(PORT, () => {
    console.log(`API is running at http://localhost:${PORT}`)
});