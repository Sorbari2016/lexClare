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

// Use static files
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("index.ejs"); 
}); 



// Create method to get only data needed
const simplifyResult = (data, query) => {
    let escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    let pattern = new RegExp(`^${escapedQuery}(:[a-z0-9]+)?$`, 'i'); 
    
    // filter the exact word searched
    let filteredResult = data.filter(
      (result) => pattern.test(result.meta.id)
    ); 

    // Get only properties needed for UI.
    const head = filteredResult[0].hwi;
    const headWord = head.hw.replace(/[^a-zA-Z]/g,'');
    const phonetics = head.prs[0]?.mw || "N/A";
    const sound = head.prs[0].sound.audio;
    const definitions = filteredResult.map((definition) => {
    return { pos: definition.fl, def: definition.shortdef };
  });

  return { hw: headWord, pho: phonetics, sound: sound, meaning: definitions };
};


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
        
        const data = simplifyResult(result, word); 
        console.log(data); 
        res.render("index.ejs", {lexicon: data})
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