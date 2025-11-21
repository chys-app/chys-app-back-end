// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("test");

// Delete all products created today
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const result = db.getCollection("products").deleteMany({
  createdAt: {
    $gte: today,
    $lt: tomorrow
  }
});

print(`Deleted ${result.deletedCount} products created today`);
