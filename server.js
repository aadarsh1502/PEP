const app = require("./app");

const PORT = process.env.PORT || 3000;
const INSTANCE_ID = process.env.INSTANCE_ID || "default";

app.listen(PORT, () => {
  console.log(`Server [${INSTANCE_ID}] running on port ${PORT}`);
});
