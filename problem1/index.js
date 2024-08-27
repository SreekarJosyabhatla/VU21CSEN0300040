const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;
const cache = {};
let accessToken = null;
const fetchAccessToken = async () => {
  try {
    const response = await axios.post("http://20.244.56.144/test/auth", {
      companyName: "gitamUniversity",
      clientID: "86a3d007-f23b-4f17-a7bb-08cf7753a8bb",
      clientSecret: "slOfIlQpJLSpoRAE",
      ownerName: "SreekarSarmaJosyabhatla",
      ownerEmail: "sjosyabh@gitam.in",
      rollNo: "VU21CSEN0300040",
    });
    accessToken = response.data.access_token;
    console.log("Access token obtained:", accessToken);
  } catch (error) {
    console.error("Error fetching access token:", error.message);
  }
};
fetchAccessToken();
const fetchProducts = async (
  company,
  categoryname,
  minPrice,
  maxPrice,
  top
) => {
  if (!accessToken) {
    await fetchAccessToken();
  }

  try {
    const response = await axios.get(
      `http://20.244.56.144/test/companies/${company}/categories/${categoryname}/products`,
      {
        params: {
          top: top,
          minPrice: minPrice,
          maxPrice: maxPrice,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching products from ${company}:`, error.message);
    return [];
  }
};
app.get("/categories/:categoryname/products", async (req, res) => {
  const categoryname = req.params.categoryname;
  const n = parseInt(req.query.n) || 10;
  const page = parseInt(req.query.page) || 1;
  const minPrice = parseInt(req.query.minPrice) || 0;
  const maxPrice = parseInt(req.query.maxPrice) || 100000;
  const sort_by = req.query.sort_by || "rating";
  const order = req.query.order || "desc";
  const cacheKey = `${categoryname}-${n}-${page}-${minPrice}-${maxPrice}-${sort_by}-${order}`;
  if (cache[cacheKey]) {
    return res.json(cache[cacheKey]);
  }
  const companyList = ["AMZ", "FLP", "SNP", "MYN", "AZO"];
  let products = [];

  for (const company of companyList) {
    const companyProducts = await fetchProducts(
      company,
      categoryname,
      minPrice,
      maxPrice,
      n
    );
    products = products.concat(companyProducts);
  }
  products.sort((a, b) => {
    const sortOrder = order === "asc" ? 1 : -1;
    return (a[sort_by] > b[sort_by] ? 1 : -1) * sortOrder;
  });
  const start = (page - 1) * n;
  const paginatedProducts = products.slice(start, start + n);
  const responseProducts = paginatedProducts.map((product, index) => ({
    id: `${categoryname}-${index + start}`,
    ...product,
  }));
  cache[cacheKey] = responseProducts;

  res.json(responseProducts);
});
app.get("/categories/:categoryname/products/:productid", (req, res) => {
  const categoryname = req.params.categoryname;
  const productid = req.params.productid;
  const product = Object.values(cache)
    .flat()
    .find((p) => p.id === productid);

  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: "Product not found" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
