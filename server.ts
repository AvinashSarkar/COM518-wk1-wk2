import express, { Request, Response } from "express";
import sqlite3 from "sqlite3";
import path from "path";

const app = express();
app.use(express.json());

app.use(express.static('public'));

const dbPath = path.join(__dirname, "wadsongs.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(err.message);
  else console.log("Connected to wadsongs.db");
});

db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER,
    quantity INTEGER,
    order_date TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);


app.get("/artist/:artist", (req: Request, res: Response) => {
  db.all(
    "SELECT * FROM wadsongs WHERE artist = ?",
    [req.params.artist],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get("/title/:title", (req: Request, res: Response) => {
  db.all(
    "SELECT * FROM wadsongs WHERE title = ?",
    [req.params.title],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get("/artist/:artist/title/:title", (req: Request, res: Response) => {
  const { artist, title } = req.params;
  db.all(
    "SELECT * FROM wadsongs WHERE artist = ? AND title = ?",
    [artist, title],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get("/song/:id", (req: Request, res: Response) => {
  db.get(
    "SELECT * FROM wadsongs WHERE id = ?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Song not found" });
      res.json(row);
    }
  );
});


app.post("/song", (req: Request, res: Response) => {
  const { title, artist, year, downloads, price, quantity } = req.body;

  if (!title || !artist || price == null || quantity == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    `INSERT INTO wadsongs (title, artist, year, downloads, price, quantity)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, artist, year ?? 0, downloads ?? 0, price, quantity],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Song added", id: this.lastID });
    }
  );
});

app.put("/song/:id", (req: Request, res: Response) => {
  const { price, quantity } = req.body;

  db.run(
    "UPDATE wadsongs SET price = ?, quantity = ? WHERE id = ?",
    [price, quantity, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: "Song not found" });
      res.json({ message: "Song updated" });
    }
  );
});

app.delete("/song/:id", (req: Request, res: Response) => {
  db.run(
    "DELETE FROM wadsongs WHERE id = ?",
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: "Song not found" });
      res.json({ message: "Song deleted" });
    }
  );
});

app.post("/song/:id/buy", (req: Request, res: Response) => {
  const songId = req.params.id;

  db.get(
    "SELECT * FROM wadsongs WHERE id = ?",
    [songId],
    (err, song: any) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!song) return res.status(404).json({ error: "Song not found" });
      if (song.quantity <= 0) return res.status(400).json({ error: "Out of stock" });

      db.run("UPDATE wadsongs SET quantity = quantity - 1 WHERE id = ?", [songId]);
      db.run("INSERT INTO orders (song_id, quantity) VALUES (?, 1)", [songId]);

      res.status(201).json({ message: "Purchase successful" });
    }
  );
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
