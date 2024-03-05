import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import dotenv from "dotenv"

dotenv.config();

const app = express();
const port = process.env.PORT;

const db = new pg.Client({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.DB_PORT
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let blogs = [];

async function loadBlog(){
    const result = await db.query("SELECT * FROM publish");
    blogs = [];
    result.rows.forEach((blog) => {
        blogs.push(blog);
    });
}


app.get("/", async (req, res) =>{
    await loadBlog();  
    res.render("index.ejs",{
        blogs
    });
});

let thisBlog = [];

app.get("/view", async (req, res) =>{
    const id = req.query.id;
    const result = await db.query("SELECT * FROM publish WHERE id = $1", [id]);
    thisBlog = result.rows[0];
    res.render("view.ejs",{
        thisBlog
    });
});

app.get("/login", (req, res) =>{
    res.render("login.ejs");
});

app.get("/registration", (req, res) =>{
    res.render("registration.ejs");
});


app.post("/login", async (req, res) => {
    const userBlogs = [];
    const username = req.body.username;
    const password = req.body.password;
    const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
    if(result.rows != null){
        if(password == result.rows[0].password){
            const userId = result.rows[0].id;
            //console.log(userId);
            const userResult = await db.query("SELECT p.id, p.title, p.text, p.userid FROM publish p JOIN users ON users.id = p.userid WHERE users.id = $1",
            [userId]);
            if(userResult != null){
                userResult.rows.forEach((blog) => {
                    userBlogs.push(blog);
                  });
            }
            await loadBlog();
            res.render("user.ejs", {
                blogs,
                userBlogs,
                logger: userId,
            });
        }else{            
            res.redirect("/login");
        }
    }else{
        res.render("registration.ejs");
    }
});

app.post("/registration", async (req, res) => {
    const userBlogs = [];
    const username = req.body.username;
    const password = req.body.password;
    const checkPassword = req.body.checkPassword;
    if(username != null && password != null){
        const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        if(result.rows[0] == null){
            if(password === checkPassword){
                const reg = await db.query("INSERT INTO users (username, password) VALUES($1, $2) RETURNING *", [username, password]);
                if(reg != null){
                    await loadBlog();
                    const userId = reg.rows[0].id;
                    res.render("user.ejs", {
                        blogs,
                        userBlogs,
                        logger: userId,
                });
                }else{
                    console.log("insert not sucessful");
                }
            }else{
                res.redirect("/registration");
            }
        }else{
            res.render("login.ejs");
        }
    }
});


app.get("/update", async (req, res) => {
    const id = req.query.id;
    const result = await db.query("SELECT * FROM publish WHERE id = $1", [id]);
    const theBlog = result.rows[0];
    res.render("update.ejs", {theBlog});
});

app.post("/update", async (req, res) => {
    const userBlogs = [];
    const update = req.body.update;
    if(update != null){
        const id = req.body.id;
        db.query("UPDATE publish SET text = $1 WHERE id = $2 RETURNING *", [update, id]);
        const getUser = await db.query("SELECT userid FROM publish WHERE id = $1", [id]);
        const userId = getUser.rows[0].userid;
        const userResult = await db.query("SELECT p.id, p.title, p.text, p.userid FROM publish p JOIN users ON users.id = p.userid WHERE users.id = $1",
        [userId]);
        userResult.rows.forEach((blog) => {
            userBlogs.push(blog);
        });
        await loadBlog();
        res.render("user.ejs", {
            blogs,
            userBlogs,
            logger: userId,
        });
    }
});

app.post("/delete", async (req, res) => {
    const userBlogs = [];
    const id = req.body.id;
    const result = await db.query("SELECT userid FROM publish WHERE id = $1", [id]);
    const userId = result.rows[0].userid;
    await db.query("DELETE FROM publish WHERE id = $1", [id]);
    const userResult = await db.query("SELECT p.id, p.title, p.text, p.userid FROM publish p JOIN users ON users.id = p.userid WHERE users.id = $1",
        [userId]);
        userResult.rows.forEach((blog) => {
            userBlogs.push(blog);
        });
        await loadBlog();
        res.render("user.ejs", {
            blogs,
            userBlogs,
            logger: userId,
        });
});

let creatorId = "";

app.get("/create", (req, res) => {
    creatorId = req.query.id;
    //console.log(creatorId);
    res.render("create.ejs");
});

app.post("/create", async (req, res) => {
    const userBlogs = [];
    const title = req.body.title;
    const text = req.body.text;
    if(title != null & text != null){
        await db.query("INSERT INTO publish (title, text, userid) VALUES($1, $2, $3)", [title, text, creatorId]);
    }
    const userResult = await db.query("SELECT p.id, p.title, p.text, p.userid FROM publish p JOIN users ON users.id = p.userid WHERE users.id = $1",
        [creatorId]);
        userResult.rows.forEach((blog) => {
            userBlogs.push(blog);
        });
        await loadBlog();
        res.render("user.ejs", {
            blogs,
            userBlogs,
            logger: creatorId,
        });
});

app.get("/logout", (req, res) => {
    res.redirect("/");
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});