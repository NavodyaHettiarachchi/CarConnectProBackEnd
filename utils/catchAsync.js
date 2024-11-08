// catchAsync.js

module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(err => {
      console.log("Error:", err);
      next(err);
    });
  }
}
