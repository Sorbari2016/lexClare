import express from "express"; 
import axios from "axios"; 
import bodyParser from "body-parser";
import dotenv from "dotenv"; 

dotenv.config();

const app = express();
const PORT = 3000; 

const API_KEY = process.env.SCH_DICT_API_KEY; 

// Use middleware
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.render("index.ejs"); 
})


app.post("/Search", async (req, res) => {
    try {
        const word = req.body.word.trim(); 

        if (!word) {
            return res.status(404).json({
                message: "No word provided, please kindly provide a word"
            })
        }

        const url = `https://www.dictionaryapi.com/api/v3/references/sd4/json/${word}?key=${API_KEY}`
        const response = await axios.get(url); 
        const result = response.data; 
        console.log(result);
        res.render("index.ejs", {lexicon: result})
    } catch(error) {
        console.error("Failed to make request", error)
        res.render("index.ejs", {
            error:"No meaning for word"
        });
    }
})

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
});