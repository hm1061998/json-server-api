const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");
const path = require("path");

const pathdb = path.join(__dirname, "database.json");
const pathuser = path.join(__dirname, "users.json");

const server = jsonServer.create();
const router = jsonServer.router(pathdb);
const userdb = JSON.parse(fs.readFileSync(pathuser, "UTF-8"));

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECRET_KEY = "123456789";

const expiresIn = "1h";

// Create a token from a payload
function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

// Verify the token
function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) =>
    decode !== undefined ? decode : err
  );
}

// Check if the user exists in database
function isAuthenticated({ email, password }) {
  return (
    userdb.users.findIndex((user) => {
      return user.email === email && user.password === password;
    }) !== -1
  );
}

const isUserExist = ({ email }) => {
  return (
    userdb.users.findIndex((user) => {
      return user.email === email;
    }) !== -1
  );
};

const getInfoUser = ({ email, password }) => {
  return userdb.users.find((user) => {
    return user.email === email && user.password === password;
  });
};

// Register New User
server.post("/auth/register", (req, res) => {
  console.log("register endpoint called; request body:");
  console.log(req.body);
  const { email, password } = req.body;

  if (isUserExist({ email }) === true) {
    const status = 401;
    const message = "Tên tài khoản đã tồn tại";
    res.status(status).json({ status, message });
    return;
  }

  fs.readFile(pathuser, (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    // Get current users data
    var data = JSON.parse(data.toString());

    // Get the id of last user
    var last_item_id = data.users[data.users.length - 1].id;

    //Add new user
    data.users.push({ id: last_item_id + 1, email: email, password: password }); //add some data
    var writeData = fs.writeFile(
      pathuser,
      JSON.stringify(data),
      (err, result) => {
        // WRITE
        if (err) {
          const status = 401;
          const message = err;
          res.status(status).json({ status, message });
          return;
        }
      }
    );
  });

  // Create token for new user
  const access_token = createToken({ email, password });
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token });
});

// Login to one of the users from ./users.json
server.post("/auth/login", (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const { email, password } = req.body;
  if (isAuthenticated({ email, password }) === false) {
    const status = 401;
    const message = "Tài khoản hoặc mật khẩu không đúng";
    res.status(status).json({ status, message });
    return;
  }
  const access_token = createToken({ email, password });
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token });
});

server.get("/user/current", (req, res) => {
  const verifyTokenResult = verifyToken(req.headers.authorization);

  const user = getInfoUser(verifyTokenResult);
  if (!user) {
    const status = 401;
    const message = "Tài khoản không tồn tại";
    res.status(status).json({ status, message });
    return;
  }

  const currentUser={...user}
  delete currentUser.password
  // console.log({verifyTokenResult})
  res.status(200).json({ currentUser });
});

server.put("/user/update/:id", (req, res) => {
  const { id } = req.params;
  const dataUser = req.body;
  console.log(`update user id = ${id}; request body:`);
  console.log(req.body);
 

  fs.readFile(pathuser, (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    // Get current users data
    let newData = JSON.parse(data.toString());

    newData.users = newData.users.map((user) => {
      if (user.id?.toString() === id?.toString()) {
        return { ...user, ...dataUser };
      }
      return user;
    });

    fs.writeFile(pathuser, JSON.stringify(newData), (err, result) => {
      // WRITE
      if (err) {
        const status = 401;
        const message = err;
        res.status(status).json({ status, message });
        return;
      }
    });
  });

 
  res.status(200).json({ status:200,message:'Cập nhật thông tin tài khoản thành công' });
});

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (req.headers.authorization === undefined) {
    const status = 401;
    const message = "Lỗi thông tin xác thực";
    res.status(status).json({ status, message });
    return;
  }
  try {
    let verifyTokenResult;
    verifyTokenResult = verifyToken(req.headers.authorization);

    if (verifyTokenResult instanceof Error) {
      const status = 401;
      const message = "Token không đúng";
      res.status(status).json({ status, message });
      return;
    }
    next();
  } catch (err) {
    const status = 401;
    const message = "Token hết hạn";
    res.status(status).json({ status, message });
  }
});

server.use(router);

server.listen(process.env.PORT || 8000, () => {
  console.log("Run Auth API Server");
});
