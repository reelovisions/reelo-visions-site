module.exports = (req, res) => {
  res.setHeader("X-Ping", "ok");
  res.setHeader("Content-Type", "application/json");
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, msg: "make-demo API up" }));
};
