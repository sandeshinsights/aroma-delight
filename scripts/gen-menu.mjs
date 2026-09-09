import { writeFileSync } from "node:fs";

// Aroma Delight menu, transcribed from
// "Aroma_Delight_price_update - Aroma_Delight_price_update.csv.pdf".
// Prices = the "New Price" column. Obvious spelling errors lightly corrected.
// Struck-through rows dropped (noted). Duplicate rows removed.
// v1 = names + prices only: descriptions and images intentionally blank.

const V = ["Vegetarian"];
const VE = ["Vegetarian", "Vegan"];
const N = ["Non-Vegetarian"];

/** category name -> [ [name, price, tags?], ... ] */
const cats = [
  ["Soups", "Warm, spiced starters", [
    ["Mulligatawny Soup", 5, V],
    ["Chicken Soup", 5, N],
    ["Tomato & Coconut Soup", 5, V],
  ]],
  ["Salads", "Fresh and simple", [
    ["Green Salad", 12, V],
    ["Desi Salad", 8, V],
    ["Grilled Shrimp Salad", 12, N],
    ["Grilled Chicken Salad", 13, N],
  ]],
  ["Vegetarian Appetizers", "Crispy vegetarian starters from the kitchen", [
    ["Vegetable Samosa (2)", 7, V],
    ["Vegetable Pakora (5)", 6, V],
    ["Aloo Tikki (2)", 7, V],
    ["Paneer Pakora", 6, V],
    ["Punjab Vegetarian Platter", 12, V],
    ["Noodle Samosa", 10, V],
    ["Veggie Momo (10)", 15, V],
    ["Paneer Momo (10)", 15, V],
  ]],
  ["Cold Appetizers", "Tangy, chilled chaat and more", [
    ["Chicken Chaat", 10, N],
    ["Bhelpuri", 8, V],
    ["Samosa Chaat", 12, V],
    ["French Fries", 7, V],
  ]],
  ["Non-Veg Appetizers", "Tandoori bites and fritters", [
    ["Meat Samosa", 7, N],
    ["Chicken Pakora", 12, N],
    ["Chicken Tikka", 10, N],
    ["Fish Pakora", 13, N],
    ["Punjab Non-Vegetarian Platter", 13, N],
    ["Chicken Momo (10)", 15, N],
  ]],
  ["South Indian", "Dosas and uttapam", [
    ["Masala Dosa", 17, V],
    ["Chicken Dosa", 17, N],
    ["Lamb Masala Dosa", 17, N],
    ["Vegetable Uttapam", 15, V],
    ["Rumali Roti Dosa", 17, V],
  ]],
  ["Combination Dinners", "Complete meals for one or two", [
    ["Vegetarian Thali", 30, V],
    ["Vegetarian Combo Dinner (for 2)", 50, V],
    ["Non-Vegetarian Dinner (for 1)", 35, N],
    ["Royal Combo Dinner (for 2)", 55, N],
  ]],
  ["Tandoor Specials", "From the clay oven", [
    ["Chicken Tandoori (Half)", 19, N],
    ["Chicken Tandoori (Full)", 30, N],
    ["Tandoori Mixed Grill", 25, N],
    ["Tandoori Shrimp", 24, N],
    ["Tandoori Paneer Tikka", 21, V],
    ["Tandoori Chicken Tikka", 21, N],
    ["Chicken Seekh Kebab", 21, N],
    ["Kali Mirch Tikka", 21, N],
  ]],
  ["Modern Indian", "House creations and contemporary plates", [
    ["Beef Kofta", 20, N],
    ["Mango Chicken", 21, N],
    ["Lamb Kadai", 21, N],
    ["Lamb Bhuna", 21, N],
    ["Garlic Chicken", 20, N],
    ["Garlic Shrimp", 22, N],
    ["Tofu Bhurji", 19, VE],
    ["Chana Paneer Masala", 19, V],
    ["Eggplant Chicken", 19, N],
    ["Murgh Tikka Masala", 27, N],
  ]],
  ["Chicken Dishes", "Served with basmati rice", [
    ["Chicken Curry", 17, N],
    ["Chicken Tikka Masala", 20, N],
    ["Butter Chicken", 19, N],
    ["Chicken Daal", 19, N],
    ["Coconut Chicken Curry", 19, N],
    ["Chicken Tikka Saag", 19, N],
    ["Chicken Vindaloo", 19, N],
    ["Chicken Korma", 19, N],
    ["Chicken Kadai", 19, N],
    ["Chicken Manchurian", 19, N],
    ["Chicken Makhani", 19, N],
    ["Chicken Bhuna", 19, N],
    ["Chicken Do-Piaza", 19, N],
    ["Chilli Chicken", 19, N],
    ["Chicken Madras", 19, N],
  ]],
  ["Lamb Dishes", "Served with basmati rice", [
    ["Lamb Curry", 20, N],
    ["Lamb Korma", 20, N],
    ["Lamb Coconut Curry", 20, N],
    ["Lamb Tikka Masala", 20, N],
    ["Lamb Saag", 20, N],
    ["Lamb Vindaloo", 20, N],
    ["Lamb Roganjosh", 20, N],
    ["Lamb Hyderabadi", 20, N],
    ["Lamb Madras", 20, N],
    ["Keema Mutter", 20, N],
    // dropped: "Lamb Sali Boti" — struck through on the current menu
  ]],
  ["Beef Dishes", "Served with basmati rice", [
    ["Beef Boti Tikka Masala", 20, N],
    ["Beef Curry", 20, N],
    ["Beef Coconut Curry", 20, N],
    ["Beef Vindaloo", 20, N],
    ["Beef Korma", 20, N],
    ["Beef Roganjosh", 20, N],
    ["Beef Saag", 20, N],
    ["Beef Hyderabadi", 20, N],
    ["Beef Madras", 20, N],
    ["Beef Sali Boti", 20, N],
  ]],
  ["Goat Dishes (with Bone)", "Kashmiri-style, served with basmati rice", [
    ["Kashmiri Goat Curry", 20, N],
    ["Kashmiri Goat Vindaloo", 20, N],
    ["Kashmiri Goat Madras", 20, N],
    ["Kashmiri Goat Hyderabadi", 20, N],
    ["Kashmiri Goat Korma", 20, N],
    ["Kashmiri Goat Saag", 20, N],
  ]],
  ["Shrimp or Fish Dishes", "Choose shrimp or fish; served with basmati rice", [
    ["Kerala Shrimp or Fish Curry", 21, N],
    ["Shrimp or Fish Masala", 21, N],
    ["Seafood Masala", 21, N],
    ["Madrasi Shrimp or Fish", 21, N],
    ["Goa Shrimp or Fish Curry", 21, N],
    ["Shrimp or Fish Curry", 21, N],
    ["Shrimp or Fish Saag", 21, N],
    ["Shrimp or Fish Balti", 21, N],
    ["Shrimp or Fish Korma", 21, N],
    ["Shrimp or Fish Vindaloo", 21, N],
    ["Shrimp or Fish Xacuti", 21, N],
    ["Shrimp or Fish Madras", 21, N],
    ["Shrimp or Fish Hyderabadi", 21, N],
    ["Shrimp or Fish Jalfrezi", 21, N],
  ]],
  ["Vegetarian Dishes", "Served with basmati rice", [
    ["Paneer Kadai", 17, V],
    ["Baingan Bhartha", 17, V],
    ["Malai Kofta", 17, V],
    ["Mixed Vegetables", 17, V],
    ["Gobi Achari", 17, V],
    ["Shahi Navratan Korma", 17, V],
    ["Dal Makhani", 16, V],
    ["Bhindi Masala", 17, V],
    ["Paneer Makhani", 17, V],
    ["Paneer Bhurji", 19, V],
    ["Mutter Paneer or Aloo", 19, V],
    ["Saag Paneer or Aloo", 19, V],
    ["Dal Tadka", 17, V],
    ["Chana Masala", 17, V],
    ["Shahi Paneer", 17, V],
    ["Aloo Gobi", 17, V],
    ["Chili Paneer", 17, V],
    ["Vegetable Vindaloo", 17, V],
    ["Aloo Chole", 17, V],
    ["Veggie Tikka Masala", 17, V],
    // dropped: duplicate "Mixed Vegetables" row
  ]],
  ["Tofu (Vegan)", "Fully plant-based; served with basmati rice", [
    ["Tofu Mango", 17, VE],
    ["Tofu Vindaloo", 17, VE],
    ["Tofu Jalfrezi", 17, VE],
    ["Tofu Tikka Masala", 17, VE],
    ["Tofu Curry", 17, VE],
    ["Tofu Saag", 17, VE],
  ]],
  ["Biryani", "Basmati rice specialties, served with raita", [
    ["Vegetable Biryani", 16, V],
    ["Chicken Biryani", 18, N],
    ["Lamb Biryani", 20, N],
    ["Goat Biryani", 20, N],
    ["Beef Biryani", 20, N],
    ["Shrimp Biryani", 21, N],
    ["Special Biryani", 19, N],
    ["Lemon Rice", 16, V],
    ["Kashmiri Peas Pullao", 17, V],
  ]],
  ["Naan", "Fresh from the tandoor", [
    ["Plain Naan", 5, V],
    ["Aloo Naan", 6, V],
    ["Cheese Naan", 7, V],
    ["Peshawari Naan", 7, V],
    ["Garlic Naan", 6, V],
    ["Chicken Coconut Naan", 7, N],
    ["Pista Coconut Naan", 6, V],
    ["Paneer Naan", 6, V],
    ["Royal Special Bread Basket (Lg)", 12, V],
    ["Garlic Chili Naan", 7, V],
    // dropped: "Chicken Naan", "Keema Naan" — struck through on the current menu
  ]],
  ["Special Breads", "Tandoor and griddle breads", [
    ["Chapathi", 6, V],
    ["Tandoori Roti", 5, V],
    ["Poori (2)", 5, V],
    ["Onion Kulcha", 6, V],
    ["Bhathura", 5, V],
    ["Rumali Roti", 5, V],
  ]],
  ["Paratha", "Layered griddle breads", [
    ["Plain Paratha", 6, V],
    ["Gobhi Paratha", 6, V],
    ["Aloo Paratha", 6, V],
    ["Mint Paratha", 6, V],
    ["Lachha Paratha", 6, V],
    ["Keema Paratha", 6, N],
  ]],
  ["Rice & Sides", "Accompaniments", [
    ["Basmati Rice", 6, VE],
    ["Raita", 5, V],
    ["Plain Yogurt", 5, V],
    ["Papadum", 5, VE],
    ["Mixed Pickle", 5, VE],
    ["Mint Chutney", 4, VE],
    ["Onion Chutney", 5, VE],
    ["Tamarind Chutney", 4, VE],
    ["Mango Chutney", 5, VE],
  ]],
  ["Beverages", "Lassis, shakes and more", [
    ["Pistachio Shake", 5, V],
    ["Fruit Juice", 5, VE],
    ["Mango Lassi", 5, V],
    ["Salt or Sweet Lassi", 6, V],
    ["Strawberry Lassi", 5, V],
    ["Milk Shake", 5, V],
    ["Fresh Lemonade", 5, VE],
    ["Soda", 3, VE],
    ["Tea / Coffee", 6, V],
    ["Poland Spring Water", 2, VE],
    ["Perrier Water", 2.5, VE],
  ]],
  ["Desserts", "A sweet finish", [
    ["Carrot Cake", 5, V],
    ["Cheese Cake", 5, V],
    ["Chocolate Cake", 5, V],
    ["Kheer (Rice Pudding)", 5, V],
    ["Ras Malai (2)", 6, V],
    ["Gulab Jamun (2)", 6, V],
    ["Carrot Halwa", 4, V],
    ["Pistachio Ice Cream", 3.5, V],
    ["Vanilla Ice Cream", 4.5, V],
  ]],
];

let id = 0;
const categories = cats.map((c, ci) => {
  const [name, description, items] = c;
  return {
    id: `category-${ci + 1}`,
    name,
    description,
    items: items.map(([n, price, tags]) => {
      id += 1;
      return {
        id: `menu-${id}`,
        name: n,
        price: Number(price.toFixed(2)),
        description: "",
        tags: tags ?? [],
        badge: "",
        image: "",
      };
    }),
  };
});

const menu = {
  banner: "",
  categories,
  chefsSpecials: [],
};

writeFileSync(
  "C:/Projects/aroma-delights/src/data/menu.json",
  JSON.stringify(menu, null, 2) + "\n"
);

console.log(
  `categories: ${categories.length}`,
  `items: ${categories.reduce((n, c) => n + c.items.length, 0)}`
);
