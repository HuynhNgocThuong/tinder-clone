module.exports = function ({ app, dbConnect }) {
  app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Missing username and password." });
    try {
      const sql =
        "SELECT * FROM user_account WHERE user_email = ? and user_password = ?";
      dbConnect.query(sql, [email, password], function (error, result) {
        if (result && result.length != 0) {
          res.status(200).json({
            gender: result[0].user_gender,
            uid: result[0].user_cometchat_uid,
          });
        } else {
          res.status(200).json({
            success: true,
            message: "Your username or password is not correct",
          });
        }
      });
    } catch (error) {
      console.log(error.message);
      res
        .status(500)
        .jsonp({ success: false, message: "Server Internal error." });
    }
  });
};
