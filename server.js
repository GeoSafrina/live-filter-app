const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "catalog.json"), "utf8"));

app.use(express.static(path.join(__dirname, "public")));

const SORTS = {
  rating_desc: (a, b) => b.rating - a.rating || a.id - b.id,
  rating_asc: (a, b) => a.rating - b.rating || a.id - b.id,
  duration_asc: (a, b) => a.durationMinutes - b.durationMinutes || a.id - b.id,
  duration_desc: (a, b) => b.durationMinutes - a.durationMinutes || a.id - b.id,
  title: (a, b) => a.id - b.id,
};

// GET /api/meta - filter options
app.get("/api/meta", (req, res) => {
  const uniq = (key) => [...new Set(catalog.map((c) => c[key]))].sort();
  res.json({ categories: uniq("category"), levels: ["Beginner", "Intermediate", "Advanced"], total: catalog.length });
});

// GET /api/catalog?search=&category=A,B&level=X,Y&minRating=&sort=&page=&limit=
app.get("/api/catalog", (req, res) => {
  const search = (req.query.search || "").toString().toLowerCase().trim();
  const categories = (req.query.category || "").toString().split(",").filter(Boolean);
  const levels = (req.query.level || "").toString().split(",").filter(Boolean);
  const minRating = parseFloat(req.query.minRating) || 0;
  const sort = SORTS[req.query.sort] ? req.query.sort : "rating_desc";
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

  let items = catalog.filter(
    (c) =>
      (!search || c.title.toLowerCase().includes(search) || c.category.toLowerCase().includes(search)) &&
      (!categories.length || categories.includes(c.category)) &&
      (!levels.length || levels.includes(c.level)) &&
      c.rating >= minRating
  );
  items.sort(SORTS[sort]);

  const total = items.length;
  const pages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), pages);
  items = items.slice((page - 1) * limit, page * limit);

  // small artificial delay so the loading state is visible in the UI
  setTimeout(() => res.json({ items, total, page, pages, limit }), 250);
});

app.listen(PORT, () => console.log(`Live Query Filter running on port ${PORT}`));
