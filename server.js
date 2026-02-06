"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.static('public'));
// DB is in same folder
const dbPath = path_1.default.join(__dirname, "wadsongs.db");
const db = new sqlite3_1.default.Database(dbPath, (err) => {
    if (err)
        console.error(err.message);
    else
        console.log("Connected to wadsongs.db");
});
// Ensure orders table exists (already exists, but safe)
db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER,
    quantity INTEGER,
    order_date TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
// ---------- GET ----------
// All songs by artist
app.get("/artist/:artist", (req, res) => {
    db.all("SELECT * FROM wadsongs WHERE artist = ?", [req.params.artist], (err, rows) => {
        if (err)
            return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// All songs by title
app.get("/title/:title", (req, res) => {
    db.all("SELECT * FROM wadsongs WHERE title = ?", [req.params.title], (err, rows) => {
        if (err)
            return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// Songs by artist AND title
app.get("/artist/:artist/title/:title", (req, res) => {
    const { artist, title } = req.params;
    db.all("SELECT * FROM wadsongs WHERE artist = ? AND title = ?", [artist, title], (err, rows) => {
        if (err)
            return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// Song by ID (single row)
app.get("/song/:id", (req, res) => {
    db.get("SELECT * FROM wadsongs WHERE id = ?", [req.params.id], (err, row) => {
        if (err)
            return res.status(500).json({ error: err.message });
        if (!row)
            return res.status(404).json({ error: "Song not found" });
        res.json(row);
    });
});
// ---------- POST / PUT / DELETE ----------
// Add a song
app.post("/song", (req, res) => {
    const { title, artist, year, downloads, price, quantity } = req.body;
    if (!title || !artist || price == null || quantity == null) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    db.run(`INSERT INTO wadsongs (title, artist, year, downloads, price, quantity)
     VALUES (?, ?, ?, ?, ?, ?)`, [title, artist, year ?? 0, downloads ?? 0, price, quantity], function (err) {
        if (err)
            return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Song added", id: this.lastID });
    });
});
// Update price and quantity
app.put("/song/:id", (req, res) => {
    const { price, quantity } = req.body;
    db.run("UPDATE wadsongs SET price = ?, quantity = ? WHERE id = ?", [price, quantity, req.params.id], function (err) {
        if (err)
            return res.status(500).json({ error: err.message });
        if (this.changes === 0)
            return res.status(404).json({ error: "Song not found" });
        res.json({ message: "Song updated" });
    });
});
// Delete song
app.delete("/song/:id", (req, res) => {
    db.run("DELETE FROM wadsongs WHERE id = ?", [req.params.id], function (err) {
        if (err)
            return res.status(500).json({ error: err.message });
        if (this.changes === 0)
            return res.status(404).json({ error: "Song not found" });
        res.json({ message: "Song deleted" });
    });
});
// Buy song (reduce quantity by 1 + create order)
app.post("/song/:id/buy", (req, res) => {
    const songId = req.params.id;
    db.get("SELECT * FROM wadsongs WHERE id = ?", [songId], (err, song) => {
        if (err)
            return res.status(500).json({ error: err.message });
        if (!song)
            return res.status(404).json({ error: "Song not found" });
        if (song.quantity <= 0)
            return res.status(400).json({ error: "Out of stock" });
        db.run("UPDATE wadsongs SET quantity = quantity - 1 WHERE id = ?", [songId]);
        db.run("INSERT INTO orders (song_id, quantity) VALUES (?, 1)", [songId]);
        res.status(201).json({ message: "Purchase successful" });
    });
});
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
