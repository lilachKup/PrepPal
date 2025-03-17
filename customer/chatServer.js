import express, {text} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import bodyParser from "body-parser";
dotenv.config(); // טוען את משתני הסביבה מקובץ .env


const openAI = new OpenAI({
    apiKey: process.env.VITE_OPENAI_API_KEY,
})


const app = express();
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.status(200).json({ message: "Server is running" });
});


app.post("/send", (req, res) => {
    const {text} = req.body;
    console.log("got msg", text);

});

app.post('/chat', async (req, res) => {
    console.log("body: ", req.body);
    const { msg } = req.body;
    console.log("got msg", msg);


    const completion = await openAI.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 0.1,
        max_tokens: 50,
        messages: [{role: 'user', content: msg}],
    });
    console.log(completion.choices[0].message, 'completed');
    res.send({ content: completion.choices[0].message.content });})

app.use((req,res,next, error) => {
    console.log(error);
    next();
});

process.on("uncaughtException", (err) => {
    console.error(err)
})

process.on("unhandledRejection", (err) => {
    console.error(err);
})

process.on("uncaughtException", (err) => {
    console.error(err);
})

app.listen(5001, () => {
    console.log("Server running on http://localhost:5001");
});