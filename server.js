"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.static("public"));
// Database
const dbPath = path_1.default.join(__dirname, "wadsongs.db");
const db = new sqlite3_1.default.Database(dbPath, (err) => {
    if (err)
        console.error("DB open error:", err.message);
    else
        console.log("Connected to wadsongs.db:", dbPath);
});
// Ensure orders table exists
db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    order_date TEXT DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
    if (err)
        console.error("Orders table create error:", err.message);
});
// Helper: blank string check
function isBlank(value) {
    return value == null || String(value).trim() === "";
}
// Root check
app.get("/", (req, res) => {
    res.send("API OK. Try /artist/Oasis or /hittastic.html");
});
// -------------------- GET endpoints --------------------
// Search by artist
app.get("/artist/:artist", (req, res) => {
    db.all("SELECT * FROM wadsongs WHERE artist = ?", [req.params.artist], (err, rows) => {
        if (err)
            return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// Search by title
app.get("/title/:title", (req, res) => {
    db.all("SELECT * FROM wadsongs WHERE title = ?", [req.params.title], (err, rows) => {
        if (err)
            return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// Search by artist AND title
app.get("/artist/:artist/title/:title", (req, res) => {
    const { artist, title } = req.params;
    db.all("SELECT * FROM wadsongs WHERE artist = ? AND title = ?", [artist, title], (err, rows) => {
        if (err)
            return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// Find by ID (single row)
app.get("/song/:id", (req, res) => {
    db.get("SELECT * FROM wadsongs WHERE id = ?", [req.params.id], (err, row) => {
        if (err)
            return res.status(500).json({ error: err.message });
        if (!row)
            return res.status(404).json({ error: "Song not found" });
        res.json(row);
    });
});
// -------------------- POST / PUT / DELETE --------------------
// POST: add a song (with blank checking for coursework)
app.post("/song", (req, res) => {
    const { title, artist, year, downloads, price, quantity } = req.body;
    // Required fields must exist AND not be blank string
    if (isBlank(title) || isBlank(artist) || isBlank(price) || isBlank(quantity)) {
        return res.status(400).json({ error: "Fields cannot be blank" });
    }
    const yearNum = isBlank(year) ? 0 : Number(year);
    const downloadsNum = isBlank(downloads) ? 0 : Number(downloads);
    const priceNum = Number(price);
    const quantityNum = Number(quantity);
    if (Number.isNaN(priceNum) || Number.isNaN(quantityNum) || Number.isNaN(yearNum) || Number.isNaN(downloadsNum)) {
        return res.status(400).json({ error: "Year/downloads/price/quantity must be numbers" });
    }
    db.run(`INSERT INTO wadsongs (title, artist, year, downloads, price, quantity)
     VALUES (?, ?, ?, ?, ?, ?)`, [String(title).trim(), String(artist).trim(), yearNum, downloadsNum, priceNum, quantityNum], function (err) {
        if (err)
            return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Song added", id: this.lastID });
    });
});
// PUT: update price & quantity
app.put("/song/:id", (req, res) => {
    const { price, quantity } = req.body;
    if (isBlank(price) || isBlank(quantity)) {
        return res.status(400).json({ error: "price and quantity cannot be blank" });
    }
    const priceNum = Number(price);
    const quantityNum = Number(quantity);
    if (Number.isNaN(priceNum) || Number.isNaN(quantityNum)) {
        return res.status(400).json({ error: "price and quantity must be numbers" });
    }
    db.run("UPDATE wadsongs SET price = ?, quantity = ? WHERE id = ?", [priceNum, quantityNum, req.params.id], function (err) {
        if (err)
            return res.status(500).json({ error: err.message });
        if (this.changes === 0)
            return res.status(404).json({ error: "Song not found" });
        res.json({ message: "Song updated" });
    });
});
// DELETE: delete a song
app.delete("/song/:id", (req, res) => {
    db.run("DELETE FROM wadsongs WHERE id = ?", [req.params.id], function (err) {
        if (err)
            return res.status(500).json({ error: err.message });
        if (this.changes === 0)
            return res.status(404).json({ error: "Song not found" });
        res.json({ message: "Song deleted" });
    });
});
// POST: buy a physical copy (decrement stock + create order quantity=1)
app.post("/song/:id/buy", (req, res) => {
    const songId = Number(req.params.id);
    if (Number.isNaN(songId))
        return res.status(400).json({ error: "Invalid song id" });
    db.get("SELECT id, quantity FROM wadsongs WHERE id = ?", [songId], (err, song) => {
        if (err)
            return res.status(500).json({ error: err.message });
        if (!song)
            return res.status(404).json({ error: "Song not found" });
        if (song.quantity <= 0)
            return res.status(400).json({ error: "Out of stock" });
        // Decrement stock then create order
        db.run("UPDATE wadsongs SET quantity = quantity - 1 WHERE id = ?", [songId], function (err2) {
            if (err2)
                return res.status(500).json({ error: err2.message });
            db.run("INSERT INTO orders (song_id, quantity) VALUES (?, ?)", [songId, 1], function (err3) {
                if (err3)
                    return res.status(500).json({ error: err3.message });
                // Return updated quantity + order id
                db.get("SELECT * FROM wadsongs WHERE id = ?", [songId], (err4, updatedSong) => {
                    if (err4)
                        return res.status(500).json({ error: err4.message });
                    res.status(201).json({
                        message: "Purchase successful",
                        orderId: this.lastID,
                        song: updatedSong
                    });
                });
            });
        });
    });
});
// Helpful 404 JSON
app.use((req, res) => {
    res.status(404).json({ error: "Route not found", method: req.method, path: req.path });
});
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
    console.log("Try: http://localhost:3000/hittastic.html");
});
