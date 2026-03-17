import express from "express"; 
import axios from "axios"; 
import bodyParser from "body-parser";
import dotenv from "dotenv"; 

dotenv.config();

const app = express();
const PORT = 3000; 

const API_KEY = process.env.SCH_DICT_API_KEY; 

app.get("/", (req, res) => {
    res.render("index.ejs"); 
})


app.get("/Dictionary", async (req, res) => {
    try {
        const word = req.query.word; 

        if (!word || word.trim() === '') {
            res.status(404).json({
                message: "No word provided, please kindly provide a word"
            })
        }

        const url = `https://www.dictionaryapi.com/api/v3/references/sd4/json/${word}?key=${API_KEY}`
        const response = await axios.get(url); 

    

    } catch(error) {

    }
})

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
});